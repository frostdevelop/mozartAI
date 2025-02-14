const nav = document.getElementById('mart-main-nav');
let prevsh = 0;
document.addEventListener('scroll',()=>{
  if(window.scrollY > prevsh){
    nav.classList.add('hidden');
  }else{
    nav.classList.contains('hidden') && nav.classList.remove('hidden');
  }
  prevsh = window.scrollY;
})