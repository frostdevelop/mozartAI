const martinp = document.getElementsByClassName("mart-inp")[0];
const martmsgs = document.getElementById("mart-msgs");
const martsbtn = martinp.parentElement.getElementsByClassName("mart-sendbtn")[0];
const socket = io();

class msgSys{
  constructor(msginp,msgcont,msgsen,socket){
    const cookies = document.cookie.split("; ");
    this.username = 'Guest';
    for(let i=0;i<cookies.length;i++){
      const cookie = cookies[i].split("=");
      if(cookie[0] == "username"){
        this.username = cookie[1];
      }
    }
    this.msginp = msginp;
    this.msgcont = msgcont.getElementsByClassName('scrollarea')[0];
    this.msgsen = msgsen;
    this.sendMsgWrap = this.sendMsgWrap.bind(this);
    this.socket = socket;
    this.msginp.addEventListener("keydown", (key) => {
      if (key.key === "Enter" && !(key.shiftKey)) {
        key.preventDefault();
        this.sendMsgWrap();
      }
    });
    this.msgsen.addEventListener("click",this.sendMsgWrap)
    this.msginp.addEventListener("input", e => {
      switch(e.inputType){
        case "insertLineBreak":
        case "insertFromPaste":
        case "insertFromDrop":
        case "historyUndo":
        case "deleteByCut":
        case "deleteContentBackward":
          this.msginp.rows = Math.min(this.msginp.value.split(/\r*\n/).length,5);
      }
    });
    socket.on('recieve',msg=>{
      this.sendMsg('Mozart','/img/mozart.png',msg);
    });
    socket.on('history',msgs=>{
      for(let i = 0;i < msgs.length;i++){
        this.sendMsg(msgs[i].user.name,msgs[i].user.pfp,msgs[i].msg);
      }
    });
    socket.on('error',err=>{
      this.sendMsg('System','/img/warning.png','Sorry, a '+err.type+' error occured. '+err.message);
      console.log(err);
    });
  }
  static questionRGX = /!([^\:\s]+)\s*\:({[^}]+})/g;
  static ltxRGX = /\$([^\s\$]+)\$/g;
  sendMsgWrap(){
    if(this.msginp.value.length > 0){
      socket.emit('send',this.msginp.value);
      this.sendMsg(this.username,"/img/user.png",this.msginp.value);
      this.msginp.value = "";
      this.msginp.rows = 1;
    }
  }
  sendMsg(name,pfp,msg){
    if(msg!=""){
      const msgelm = document.createElement("div");
      msgelm.className = "mart-msg";
      const pfpelm = document.createElement("img");
      pfpelm.className = "mart-pfp";
      pfpelm.src = pfp;
      const textcont = document.createElement("div");
      textcont.className = "text";
      const nameelm = document.createElement("span");
      const datestuff = (new Date(Date.now())).toString().split(" ");
      datestuff.length = 5;
      datestuff
      nameelm.innerText = name + " • " + datestuff.splice(1).join(" ");
      nameelm.className = "name";
      const contentelm = document.createElement("span");
      contentelm.innerText = msg;
      contentelm.className = "content";
      textcont.appendChild(nameelm);
      textcont.appendChild(document.createElement("br"));
      textcont.appendChild(contentelm);
      msgelm.appendChild(pfpelm);
      msgelm.appendChild(textcont);
      this.msgcont.appendChild(msgelm);
      try{
        msgSys.processMsg(contentelm);
      }catch(e){console.error(e.stack);contentelm.innerText = msg;}
      msgelm.scrollIntoView();
    }else{
      console.warn("No message in sendMsg")
    }
  }
  static formatTxt(str){
    return DOMPurify.sanitize(marked.parse(str),{FORBID_TAGS: ['button','input','form','svg','dialog','select']});
  }
  static processLtx(str){
    let ostr = "";
    let parsed;
    let ind = 0;
    while(parsed = msgSys.ltxRGX.exec(str)){
      ostr += msgSys.formatTxt(str.substring(ind,parsed.index));
      try{
        ostr += katex.renderToString(parsed[1]);
      }catch(e){
        console.error(e.stack)
      }
      ind = msgSys.ltxRGX.lastIndex;
    }
    // alert(str.substring(ind));
    // alert(ind);
    msgSys.ltxRGX.lastIndex = 0;
    return ostr+msgSys.formatTxt(str.substring(ind));
  }
  static processMsg(msgelm){
    let remained = msgelm.innerText;
    msgelm.innerText = "";
    let parsed;
    while(parsed = msgSys.questionRGX.exec(remained)){
      msgelm.innerHTML += msgSys.processLtx(remained.substring(0,parsed.index));
      remained = remained.substr(parsed.index+parsed[0].length);
      switch(parsed[1]){
        case 'short-ans':
        //alert(JSON.parse(exp[2]));
        this.addQuestion(msgelm,0,JSON.parse(parsed[2]));
        break;
        case 'multc':
        this.addQuestion(msgelm,1,JSON.parse(parsed[2]));
        break;
        case 'selec':
        this.addQuestion(msgelm,2,JSON.parse(parsed[2]));
        break;
        case 'block':
        this.addQuestion(msgelm,3,{question: parsed[2].substr(2,parsed[2].length-4)});
        break;
        default:
        alert(parsed[1]);
        msgelm.innerHTML += msgSys.processLtx(parsed[0]);
        break;
      }
      //this.addQuestion(msgelm,parsed[1],parsed[2]);
      msgSys.questionRGX.lastIndex = 0;
      /*
      //alert(remained.substr(parseexp.lastIndex));
      //alert(parsed.index)
      alert(remained);
      alert((/!([^\:\s]+)\s*\:({[^}]+})/g).exec(remained));
      alert(remained);
      alert(parseexp.exec(remained));
      */
    }
    msgelm.innerHTML += msgSys.processLtx(remained);
    /*
    const exps = otext.matchAll(/!([^\:\s]+)\s*\:({[^}]+})/g);
    let lastEnd = 0;
    for(const exp of exps){
      msgelm.appendChild(document.createTextNode(otext.substring(lastEnd,exp.index)));
      this.addQuestion(msgelm,exp[1],JSON.parse(exp[2]));
      alert(otext.substr(exp.index + exp[0].length));
      msgelm.appendChild(document.createTextNode(otext.substr(exp.index + exp[0].length)));
    }
    */
  }
  addQuestion(msgelm,type,obj){
    //alert(type);
    const qcont = document.createElement('div');
    qcont.className = 'mart-question-cont';
    const qelm = document.createElement('div');
    //qelm.value = type;
    qelm.className = "mart-question contsolid";
    const promptelm = document.createElement('span');
    promptelm.className = 'prompt';
    promptelm.innerText = obj.question;
    qelm.appendChild(promptelm);
    switch(type){
      case 0:
      const anscont = document.createElement('div');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = 'Answer';
      const submitbtn = document.createElement('button');
      submitbtn.className = 'button blue';
      submitbtn.innerText = 'Submit';
      anscont.appendChild(inp);
      anscont.appendChild(submitbtn);
      qelm.appendChild(anscont);
      const answer = document.createElement('span');
      answer.className = 'answer';
      answer.innerText = obj.answer;
      qelm.appendChild(answer);
      if(obj.verify){
        submitbtn.addEventListener('click',()=>{
          inp.classList.contains('red') && inp.classList.remove('red');
          inp.classList.contains('green') && inp.classList.remove('green');
          if(inp.value != obj.answer){inp.classList.add('red');/*setTimeout(()=>{inp.classList.remove('red')},500);*/}else{inp.classList.add('green');/*setTimeout(()=>{inp.classList.remove('green')},500)*/;answer.classList.add('sho');}
        });
      }else{
        submitbtn.addEventListener('click',()=>{answer.classList.toggle('sho');});
      }
      break;
      case 1:
      const radios = new Array(obj.answers.length);
      for(let i=0;i<obj.answers.length;i++){
        const label = document.createElement('label');
        label.className = 'contsolid';
        const radio = document.createElement('input');
        radio.type = 'radio';
        label.appendChild(radio);
        radios[i] = radio;
        label.appendChild(document.createTextNode(" "+obj.answers[i]));
        qelm.appendChild(label);
        radio.addEventListener('change',()=>{
          for(let j=0;j<radios.length;j++){
            if(j!=i){
              radios[j].checked = false;
            }
          }
        });
      }
      const btncont = document.createElement('div');
      btncont.className = 'contsolid';
      const subbtn = document.createElement('button');
      subbtn.className = 'button blue';
      subbtn.innerText = 'Submit';
      subbtn.addEventListener('click',()=>{
        if(radios[obj.answer].checked){
          radios[obj.answer].parentElement.classList.add('green');
          for(let i=0;i<radios.length;i++){
            if(i!=obj.answer){
              radios[i].parentElement.classList.add('red');
            }
          }
        }else{
          for(let i=0;i<radios.length;i++){
            if(radios[i].checked){
              radios[i].parentElement.classList.add('red');
            }
          }
        }
      });
      const rstbtn = document.createElement('button');
      rstbtn.className = 'button blue';
      rstbtn.innerText = 'Reset';
      rstbtn.addEventListener('click',()=>{
        for(let i=0;i<radios.length;i++){
          radios[i].checked = false;
          radios[i].parentElement.classList.contains('red') && radios[i].parentElement.classList.remove('red');
          radios[i].parentElement.classList.contains('green') && radios[i].parentElement.classList.remove('green');
        }
      });
      btncont.appendChild(subbtn);
      btncont.appendChild(rstbtn);
      qelm.appendChild(btncont);
      break;
      case 2:
      const sels = new Array(obj.answers.length);
      for(let i=0;i<obj.answers.length;i++){
        const label = document.createElement('label');
        label.className = 'contsolid';
        const chkbx = document.createElement('input');
        chkbx.type = 'checkbox';
        label.appendChild(chkbx);
        sels[i] = chkbx;
        label.appendChild(document.createTextNode(" "+obj.answers[i]));
        qelm.appendChild(label);
      }
      const btnconts = document.createElement('div');
      btnconts.className = 'contsolid';
      const subbtns = document.createElement('button');
      subbtns.className = 'button blue';
      subbtns.innerText = 'Submit';
      subbtns.addEventListener('click',()=>{
        let amtcorr = 0;
        for(let i=0;i<obj.answer.length;i++){
          const corrsel = sels[obj.answer[i]];
          if(corrsel.checked){
            corrsel.parentElement.classList.add('green');
            amtcorr++;
          }
        }
        if(amtcorr == obj.answer.length){
          for(let i=0;i<sels.length;i++){
            if(!obj.answer.includes(i)){
              sels[i].parentElement.classList.add('red');
            }
          }
        }else{
          for(let i=0;i<sels.length;i++){
            if(sels[i].checked && !obj.answer.includes(i)){
              sels[i].parentElement.classList.add('red');
            }
          }
        }
      });
      const rstbtns = document.createElement('button');
      rstbtns.className = 'button blue';
      rstbtns.innerText = 'Reset';
      rstbtns.addEventListener('click',()=>{
        for(let i=0;i<sels.length;i++){
          sels[i].checked = false;
          sels[i].parentElement.classList.contains('red') && sels[i].parentElement.classList.remove('red');
          sels[i].parentElement.classList.contains('green') && sels[i].parentElement.classList.remove('green');
        }
      });
      btnconts.appendChild(subbtns);
      btnconts.appendChild(rstbtns);
      qelm.appendChild(btnconts);
      break;
      case 3:
      break;
    }
    qcont.appendChild(qelm);
    msgelm.appendChild(qcont);
  }
  //Add lestiners for q on function. also highlight the right green ad wrong red?
}
//try{
const messages = new msgSys(martinp,martmsgs,martsbtn,socket);
//}catch(e){alert(e)}