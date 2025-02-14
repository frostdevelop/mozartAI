const UserDAO = require('../../dao/UserDAO');
const tokensys = require('../../deps/tokensys');

module.exports = async (req,res)=>{
  if(req.signedCookies["token"]){
    const removed = await tokensys.removeToken(req.signedCookies["token"]);
    if(removed && !(removed instanceof Error)){
      res.cookie('uuid', '',{expires: new Date(0)});
      res.cookie('username', '',{expires: new Date(0)});
      res.cookie("token", "", {expires: new Date(0)}).status(201).send();
    }else{
      res.status(500).send();
    }
  }else{
    res.status(400).send();
  }
}