const UserDAO = require('../../dao/UserDAO');
const axios = require('axios');

module.exports = async (req,res)=>{
  if(req.body.username && req.body.password){
    const success = await UserDAO.addUser(req.body.username,req.body.password);
    //console.log("Success: "+success);
    //console.dir(success);
    if(success && !(success instanceof Error)){
      try{
        const dbres = await axios.post(process.env.MOZART_SERVER+'/acc',success.uuid,{headers:{"Content-Type":"text/plain"}}); //adds stuff into the chat database.
        if(dbres.status == 201){
          res.status(201).send();
        }else{
          await UserDAO.removeUser(success.uuid);
          res.status(503).send();
        }
      }catch(e){
        console.log('Sign up Error: '+e);
        await UserDAO.removeUser(success.uuid);
        res.status(503).send();
      }
    }else{
      res.status(500).send();
    }
  }else{
    res.status(400).send();
  }
}