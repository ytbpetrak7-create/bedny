const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwI7pHAWX-V8dN4ATWdTHSlZIaPXCPX-0wfAi2sWB35BIpLarE5Bm3gcxd6FtTkzUZDTQ/exec";

let userid = localStorage.getItem("userid");
if (!userid) {
  userid = Math.random().toString(36).substring(2);
  localStorage.setItem("userid", userid);
  registerUser(userid);
}

async function callScript(action, params = {}) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set("action", action);
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }
  const response = await fetch(url.toString());
  return response.text();
}

async function registerUser(uid) {
  return await callScript("registerUser", { userid: uid });
}

async function getPoints() {
  const uid = localStorage.getItem("userid");
  return await callScript("getPoints", { userid: uid });
}

async function useCode(code) {
  const uid = localStorage.getItem("userid");
  return await callScript("useCode", { code: code, userid: uid });
}

async function open() {
  const uid = localStorage.getItem("userid");
  return await callScript("open", { userid: uid });
}