function writeToBody(msg) {
  let body = document.querySelector("body");
  let newb = document.createElement("div");
  newb.innerText = msg;
  body.appendChild(newb);
}

window.addEventListener("DOMContentLoaded", function() {
  writeToBody("JavaScript is go!");
});

chrome.runtime.sendMessage({topic: "ping"}, function(response) {
  writeToBody(response.msg);
});

chrome.identity.getAuthToken({"interactive": true}, function(token) {
  writeToBody("Auth token (" + token + ") is go!");
});

chrome.identity.getProfileUserInfo(function(userInfo) {
  writeToBody("Profile user email (" + userInfo.email + ") is go!");
});
