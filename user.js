const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUc5iolEv9NkfKbC6C4m3FiHRBByPE68CX1aLJ26qtaFPkkIz6seLORBssZic00acLeA/exec";

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

async function getInventory() {
  const uid = localStorage.getItem("userid");
  return await callScript("getInventory", { userid: uid });
}

function createPointsDisplay() {
  var pointsDiv = document.createElement("div");
  pointsDiv.id = "pointsDisplay";
  document.body.prepend(pointsDiv);
  updatePoints();
  
  var invLink = document.createElement("a");
  invLink.href = "inventory.html";
  invLink.id = "inventoryLink";
  invLink.textContent = "Inventář";
  document.body.appendChild(invLink);
}

async function updatePoints() {
  var points = await getPoints();
  var el = document.getElementById("pointsDisplay");
  if (el) {
    el.textContent = "Body: " + points;
  }
}
