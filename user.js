const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyDGR71IHnnDsdAsUeFph2EO1RfA7_dNuX_oshtVPzUb1bmBKGQf5VcTiNELnGLBjnZdw/exec";

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

async function open(boxName) {
  const uid = localStorage.getItem("userid");
  return await callScript("open", { userid: uid, box: boxName });
}
// openbox zapise do listu Drops jmeno itemu  userid a datum otevreni bedny