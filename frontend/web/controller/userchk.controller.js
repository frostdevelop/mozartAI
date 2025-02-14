const UserDAO = require('../../dao/UserDAO');

module.exports = async (req,res)=>{
  if(req.body.username){
    const exists = await UserDAO.checkUsername(req.body.username);
    if(!exists.error){
      res.send(Number(exists).toString());
    }else{
      res.status(500).send(exists);
    }
  }else{
    res.status(400).send();
  }
}