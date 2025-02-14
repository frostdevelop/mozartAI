const mongodb = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const client = new mongodb.MongoClient(process.env.MOZART_DB_SERVER,{
    serverApi: {
        version: mongodb.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

(async ()=>{
    try{
        await client.connect();
        await client.db('mozart').command({ping: 1});
        let users = await client.db('mozart').collection('users');
        const user = await users.findOne({username: 'lol',});
        console.log(user);
        const userDoc = {
        username: "test",
        uuid: "test",
        password: "test",
        }
        console.log(await users.insertOne(userDoc))
        console.log('On')
    }finally{
        await client.close();
    }
})()