import UserAPI from "/js/userapi.js";
const loginpagebtn = document.getElementById("mart-login-page-button");
const signuppagebtn = document.getElementById("mart-sign-up-page-button");
const loginpage = document.getElementById("mart-login-page");
const signuppage = document.getElementById("mart-sign-up-page");
const loginusername = document.getElementById("mart-login-username");
const loginpassword = document.getElementById("mart-login-password");
const loginerror = document.getElementById("mart-login-error");
const signupusername = document.getElementById("mart-sign-up-username");
const signuppassword = document.getElementById("mart-sign-up-password");
const signuperror = document.getElementById("mart-sign-up-error");
let timeout;

loginpagebtn.addEventListener("click", () => {
  loginpage.classList.contains("hid") && loginpage.classList.remove("hid");
  signuppage.classList.add("hid");
  loginpagebtn.classList.contains("inferior") &&
    loginpagebtn.classList.remove("inferior");
  signuppagebtn.classList.add("inferior");
});

signuppagebtn.addEventListener("click", () => {
  signuppage.classList.contains("hid") && signuppage.classList.remove("hid");
  loginpage.classList.add("hid");
  signuppagebtn.classList.contains("inferior") &&
    signuppagebtn.classList.remove("inferior");
  loginpagebtn.classList.add("inferior");
});

loginpassword.addEventListener("input", () => {
  loginpassword.classList.contains("invalid") &&
    loginpassword.classList.remove("invalid");
});

loginusername.addEventListener("input", () => {
  loginusername.classList.contains("invalid") &&
    loginusername.classList.remove("invalid");
});

signuppassword.addEventListener("input", () => {
  signuppassword.classList.contains("invalid") &&
    signuppassword.classList.remove("invalid");
});

signupusername.addEventListener("input", () => {
  signupusername.classList.contains("invalid") &&
    signupusername.classList.remove("invalid");
  if (signupusername.value.length > 32) {
    signuperror.innerText = "Username too long!";
  } else if (signupusername.value.length < 3) {
    signuperror.innerText = "Username too short!";
  } else {
    signuperror.innerText = "";
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      UserAPI.checkusername(signupusername.value).then((res) => {
        res = parseInt(res);
        if (res > 1) {
          signuperror.innerText = "An error occurred. Please try again.";
        } else if (res) {
          signuperror.innerText = "Username already exists!";
        }
      });
    }, 2500);
  }
});

loginpage.addEventListener("submit", (e) => {
  e.preventDefault();
  const uservalid = loginusername.value.length < 1;
  const passvalid = loginpassword.value.length < 1;
  if (uservalid || passvalid) {
    uservalid && loginusername.classList.add("invalid");
    passvalid && loginpassword.classList.add("invalid");
    loginerror.innerText = "Please enter a username and password!";
  } else {
    loginerror.innerText = "Logging in...";
    UserAPI.login(loginusername.value, loginpassword.value).then((res) => {
      if (res == 201) {
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("redir") ?? "/dashboard";
      } else if (res == 500) {
        loginerror.innerText = "Invalid username or password.";
      } else {
        loginerror.innerText = "An error occured. Please try again later.";
      }
    });
  }
});

signuppage.addEventListener("submit", (e) => {
  e.preventDefault();
  const uservalid = signupusername.value.length < 1;
  const passvalid = signuppassword.value.length < 1;
  if (uservalid || passvalid) {
    uservalid && signupusername.classList.add("invalid");
    passvalid && signuppassword.classList.add("invalid");
    signuperror.innerText = "Please fill out all fields.";
  } else if (
    signupusername.value.length <= 32 &&
    signupusername.value.length > 3
  ) {
    signuperror.innerText = "Signing up...";
    UserAPI.signup(signupusername.value, signuppassword.value).then((res) => {
      //alert(res);
      if (res == 201) {
        loginpagebtn.click();
      } else if (res == 500) {
        signuperror.innerText = "Username already exists.";
      } else {
        signuperror.innerText = "An error occured. Please try again later.";
      }
    });
  }
});
