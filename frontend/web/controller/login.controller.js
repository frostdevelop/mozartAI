const UserDAO = require('../../dao/UserDAO');
const tokensys = require('../../deps/tokensys');

module.exports = async (req,res)=>{
  if(req.body.username && req.body.password){
    const uuid = await UserDAO.checkUser(req.body.username,req.body.password);
    if(uuid && !(uuid instanceof Error)){
      res.cookie('uuid', uuid,{secure:true,path:"/"});
      res.cookie('username', req.body.username,{secure:true,path:"/"});
      res.cookie('token', await tokensys.generateToken(uuid),{signed:true,httpOnly:true,secure:true,path:"/"}).status(201).send();
    }else{
      res.status(500).send();
    }
  }else{
    res.status(400).send();
  }
};