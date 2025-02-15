const express = require('express');
const dotenv = require('dotenv');
const ejs = require('ejs');
const socketio = require('socket.io');
const mongodb = require('mongodb');
const crypto = require('crypto');
//const util = require('util');
const cookieparse = require('cookie-parser');
const parsecookie = require('./deps/parsecookie');
const axios = require('axios');
const redis = require('redis');
const tokenSys = require('./deps/tokensys');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = socketio(server);
const UserDAO = require('./dao/UserDAO');
const authRouter = require('./web/router/auth.router');
const reqLogMiddleware = require('./web/middleware/logReqs.middleware');
const loginPage = require('./web/controller/loginpage.controller');
const chatPage = require('./web/controller/chatpage.controller');

dotenv.config();

const redisClient = redis.createClient({
  host: '127.0.0.1',
  port: 6379,
});

redisClient.on('ready',()=>{
  console.log('Redis is ready!');
});

redisClient.on('connect',()=>{
  console.log('Connected to Redis!');
});

redisClient.on('error',err=>{
  console.error('Redis Error: '+err);
});

function makeTempSession(socket){
  console.log('Creating temp...')
  uuid = 'temp'+crypto.randomUUID();
  axios.post(process.env.MOZART_SERVER+'/acc',uuid,{headers:{"Content-Type":"text/plain"}}).then(res=>{
    if(res.status != 201){
      socket.emit('error',{type:'acc',status:res.status,message:res.statusText});
    }
  }).catch(e=>{
    console.error('Acc error:'+e);
    socket.emit('error',{type:'acc',status:0,message:"Internal server request failed"});
  });
  return uuid
}

app.use(express.json());
app.set('view engine','ejs');
app.use(cookieparse(process.env.COOKIE_SECRET));
if(process.env.LOG ?? false){
  app.use(reqLogMiddleware);
}
app.use(express.static('./public'));
app.use('/auth/v1',authRouter);
if(process.env.PROXY ?? false){
  app.enable('trust proxy');
}

if(!process.env.MOZART_SERVER){
  console.error('Missing Internal server environment variable!');
  process.exit(1);
}

app.get('/',(req,res)=>{
  res.render('main',{user:req.cookies.username});
});

app.get('/chat',chatPage);
app.get('/login',(req,res,next)=>{req.loginmode = 0;next()},loginPage);
app.get('/signup',(req,res,next)=>{req.loginmode = 1;next()},loginPage);
app.get('/dashboard',(req,res)=>{res.redirect('/chat');});

io.on('connection',socket=>{
  //console.log(socket.id);
  //const token = socket.request.headers.cookie.split(';').find(x=>x.startsWith('token')).split('=')[1];
  //console.log(socket.request.headers.cookie);
  let socketuuid = null;
  let tempid = true;
  const cookies = parsecookie(socket.request.headers.cookie);
  //console.log(cookies);
  if(cookies && 'token' in cookies){
    const sockettoken = cookieparse.signedCookie(decodeURIComponent(cookies.token), process.env.COOKIE_SECRET);
    const username = 'username' in cookies ? cookies.username : 'User';
    //console.log(sockettoken);
    tokenSys.verifyToken(sockettoken).then(uuid=>{
      if(uuid && !(uuid instanceof Error)){
        tempid = false;
        socketuuid = uuid;
        console.log('Connected: '+socketuuid);
        axios.get(process.env.MOZART_SERVER+'/msg',{params:{uuid:uuid}}).then(res=>{
          if(res.status == 200){
            //console.log(res.data);
            const historyres = [];
            for(let i=0;i<res.data.length;i++){
              historyres.push({'msg':res.data[i].message,'user':(res.data[i].sender==1 ? {'name':'Mozart','pfp':'/img/mozart.png'} : {'name':username,'pfp':'/img/user.png'})});
            }
            socket.emit('history',historyres);
          }else{
            socket.emit('error',{type:'history',status:res.status,message:res.statusText});
          }
        }).catch(e=>{
          console.error('History req failed: '+e);
          socket.emit('error',{type:'history',status:0,message:"Internal server request failed"});
        });
      }else{
        console.error('Invalid Token: '+sockettoken);
        socketuuid = makeTempSession(socket);
      }
    });
  }else{
    console.log('No token');
    socketuuid = makeTempSession(socket);
  };

  socket.on('send',msg=>{
    axios.post(process.env.MOZART_SERVER+'/msg',msg,{headers:{"Content-Type":"text/plain","uuid":socketuuid}}).then(res=>{
      //console.log(res.data);
      if(res.status == 200){
        socket.emit('recieve',res.data);
      }else{
        socket.emit('error',{type:'send',status:res.status,message:res.statusText});
      }
    }).catch(e=>{
      console.error('Send error:'+e);
      socket.emit('error',{type:'send',status:0,message:"Internal server request failed"});
    });
  });
  
  socket.on('disconnect',()=>{
    console.log('Disconnected: '+socketuuid);
    if(tempid){
      axios.delete(process.env.MOZART_SERVER+'/acc',{headers:{"uuid":socketuuid}}).then(res=>{
        if(res.status == 201){
          console.log('Deleted account: '+socketuuid);
        }else{
          console.error('DeleteTempError: '+res.status);
        }
      }).catch(e=>{
        console.error('DeleteTempError: '+e);
      });
    }
  });
});

(async ()=>{
  const client = new mongodb.MongoClient(process.env.MOZART_DB_SERVER,{
    serverApi: {
      version: mongodb.ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  try{
    console.log('Connecting to Redis...')
    await redisClient.connect();
    tokenSys.injectRedis(redisClient);
    
    console.log('Connecting to mongodb...')
    await client.connect();
    console.log('Mongodb successfully connected.\nConnecting to database...')
    await UserDAO.injectDB(client);
    console.log('Database successfully connected.');

    console.log('Starting server...');
    server.listen(process.env.PORT,err=>{
      if(err){
        console.error('Mozart startup error: '+err);
      }else{
        console.log('Mozart online on port: '+process.env.PORT.toString());
      }
    });
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})()