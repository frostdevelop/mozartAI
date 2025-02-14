export default class MOZUSERAPI{
  static async hash(text){const encoder = new TextEncoder();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))).map(b => b.toString(16).padStart(2, '0')).join('');};
  static async login(username,password){
    const res = await fetch('/auth/v1/session',{
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body:JSON.stringify({
        username:username,
        password:await MOZUSERAPI.hash(password),
      }),
    });
    return res.status;
  }
  static async signup(username,password){
    const res = await fetch('/auth/v1/acc',{
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body:JSON.stringify({
        username:username,
        password:await MOZUSERAPI.hash(password),
      }),
    });
    return res.status;
  }
  static async logout(){
    const res = await fetch('/auth/v1/session',{method: 'DELETE',});
    return res.status;
  }
  static async checkusername(username){
    const res = await fetch('/auth/v1/checkusername',{
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body:JSON.stringify({
        username:username,
      }),
    });
    if(res.status == 200){
      return Boolean(parseInt(await res.text()));
    }else{
      return res.status;
    }
  }
}