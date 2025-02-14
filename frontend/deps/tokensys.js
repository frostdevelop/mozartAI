const crypto = require('crypto');
const redis = require('redis');

class TokenSys{
  //static tokenDB = {};
  static injectRedis(client){
    if(TokenSys.client){
      return
    }
    TokenSys.client = client;
  }
  static async generateToken(uuid){
    const token = crypto.randomBytes(32).toString('hex');
    try{
      await TokenSys.client.set(token, uuid);
      return token;
    }catch(e){
      console.error("Token Error:"+e);
      return e;
    }
    /*
    return new Promise((res,rej)=>{
      TokenSys.client.set(token, uuid,(err,reply)=>{
        if(err){
          console.error("Token Write Error: "+err);
          rej(err);
        }
        res(token);
      });
    });
    */
    //tokenDB[token] = uuid;
  }
  static async verifyToken(token){
    try{
      const uuid = await TokenSys.client.get(token);
      return uuid;
    }catch(e){
      console.error("Token Error:"+e);
      return e;
    }
    /*
    return new Promise((res,rej)=>{
      TokenSys.client.get(token,(err,reply)=>{
        if(err){
          console.error("Token Read Error: "+err);
          rej({error:err});
        }
        if(reply){
          res(reply);
        }else{
          rej({error:"Token not found"});
        }
      });
    });
    */
    //return tokenDB[token];
  }
  static async removeToken(token){
    try{
      return await TokenSys.client.del(token);
    }catch(e){
      console.error("Token Error:"+e);
      return e;
    }
    /*
    return new Promise((res,rej)=>{
      TokenSys.client.del(token,(err,reply)=>{
        if(err){
          console.error("Token Remove Error: "+err);
          rej(err);
        }
        res(reply);
      });
    });
    */
    //delete tokenDB[token];
  }
}

module.exports = TokenSys;