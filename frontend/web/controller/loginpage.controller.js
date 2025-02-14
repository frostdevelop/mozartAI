const tokenSys = require('../../deps/tokensys');

module.exports = async (req,res)=>{
  if(req.signedCookies["token"]){
    const uuid = await tokenSys.verifyToken(req.signedCookies["token"]);
    if(!(uuid instanceof Error)){
      res.redirect(req.query.redir ?? '/dashboard');
    }else{
      res.cookie("token", "", {expires: new Date(0)});
      res.render('login',{error: "Invalid token.",mode:req.loginmode});
    }
  }else{
    res.render('login',{error:"",mode:req.loginmode});
  }
}