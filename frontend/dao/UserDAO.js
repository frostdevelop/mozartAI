const mongodb = require('mongodb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
//const ObjectId = mongodb.ObjectId

let users

class UserDao{
  static async injectDB(conn){ 
    if(users){
      return
    }
    try{
      users = await conn.db('mozart').collection('users')
    }
    catch(e){
      console.error(`unable to establish connection to userDAO: ${e}`)
    }
  }
  static async addUser(username,password){
    const userTaken = await UserDao.checkUsername(username);
    console.log(password);
    if(!(userTaken)){
      try{
        const userDoc = {
          username: username,
          uuid: crypto.randomUUID(),
          password: await bcrypt.hash(password,10),
        }
        return await users.insertOne(userDoc)
      }
      catch(e){
        console.error(`unable to sign up ${e}`)
        return e;
      }
    }else{
      return null;
    }
  }
  static async updateUser(uuid, user){
    try{
      const updateResponse = await users.updateOne(
        {uuid:uuid}, //new mongodb.Binary(Buffer.from(uuid),mongodb.Binary.SUBTYPE_UUID) nvm
        {$set:{username:user.name, password:user.password}}
      )
      return updateResponse
    }
    catch(e){
      console.error(`unable to update review: ${e}`)
      return e;
    }
  }
  static async deleteUser(uuid){
    try{
      const deleteResponse = await users.deleteOne({
        uuid: uuid,
      });
      return deleteResponse
    }
    catch(e){
      console.error(`unable to delete review: ${e}`)
      return e;
    }
  }
  static async checkUser(username, password){
    try{
      const user = await users.findOne({username: username,});
      if(user && await bcrypt.compare(password, user.password)){return user.uuid;}
      return null;
    }
    catch(e){
      console.error(`unable to find user: ${e}`)
      return e;
    }
  }
  static async getUUID(username){
    try{
      const user = await users.findOne({username: username,});
      if(user){
        return user.uuid;
      }
      return null;
    }catch(e){
      console.error(`unable to find user: ${e}`);
      return e;
    }
  }
  static async checkUsername(username){
    try{
      const user = await users.findOne({username: username,});
      console.log(user);
      if(user){
        return true;
      }
      return false;
    }catch(e){
      console.error(`unable to find user: ${e}`);
      return e;
    }
  }
  static async removeUser(uuid){
    try{
      const deleteResponse = await users.deleteOne({
        uuid: uuid,
      });
      return deleteResponse;
    }catch(e){
      console.error(`unable to remove user: ${e}`);
      return e;
    }
  }
}

module.exports = UserDao;