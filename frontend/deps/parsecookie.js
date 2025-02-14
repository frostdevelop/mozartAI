module.exports = (str)=>{
  if(str){
    const cookies = str.split('; ');
    const obj = {};
    for(let i=0;i<cookies.length;i++){
      const cookie = cookies[i].split('=');
      obj[cookie[0]] = cookie[1];
    }
    return obj;
  }else{
    return {};
  }
}