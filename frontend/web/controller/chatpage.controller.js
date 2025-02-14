const tokenSys = require('../../deps/tokensys');

module.exports = async (req,res)=>{
  if(req.signedCookies["token"]){
    console.log("Verify:"+req.signedCookies["token"]);
    const uuid = await tokenSys.verifyToken(req.signedCookies["token"]);
    if(uuid && !(uuid instanceof Error)){
      console.log("UUID:"+uuid);
      res.render('chat',{user:req.cookies.username});
    }else{
      console.log("Invalid Token");
      res.redirect('/login?redir=%2Fchat'); 
    }
  }else{
    res.render('chat',{user:null});
    //res.redirect('/login?redir=%2Fchat'); //encodeURICompoenent
  }
}