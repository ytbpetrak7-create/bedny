const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5al-Sa2-qBteSMjSCh8qLmCmVfIZwPQr0vecHS-pEP3CFTlQIJkquoWWgzdHqiN769w/exec";

async function callScript(action, params = {}) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set("action", action);
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }
  const response = await fetch(url.toString());
  return response.text();
}

function getCurrentUser() {
  return localStorage.getItem("username");
}

function setCurrentUser(name) {
  localStorage.setItem("username", name);
}

function getUsername() {
  return localStorage.getItem("username");
}

async function registerUser(uname) {
  const response = await callScript("register", { username: uname });
  console.log("Registrace:", response);
  return response;
}

async function register(username, password) {
  return await callScript("register", { username: username, password: password });
}

async function login(username, password) {
  return await callScript("login", { username: username, password: password });
}

async function getPoints() {
  const uname = getUsername();
  return await callScript("getPoints", { username: uname });
}

async function useCode(code) {
  const uname = getUsername();
  return await callScript("useCode", { code: code, username: uname });
}

async function open(boxName) {
  const uname = getUsername();
  return await callScript("open", { username: uname, box: boxName });
}

async function getInventory() {
  const uname = getUsername();
  return await callScript("getInventory", { username: uname });
}

async function getBoxInfo(boxName) {
  return await callScript("getBoxInfo", { box: boxName });
}

function createPointsDisplay() {
  var pointsDiv = document.createElement("div");
  pointsDiv.id = "pointsDisplay";
  pointsDiv.style.cssText = "position:fixed;top:10px;right:10px;background:#333;color:#fff;padding:10px;z-index:9999;font-size:16px;border-radius:5px;";
  document.body.prepend(pointsDiv);
  updatePoints();
  
  var invLink = document.createElement("a");
  invLink.href = "inventory.html";
  invLink.id = "inventoryLink";
  invLink.textContent = "Inventář";
  invLink.style.cssText = "position:fixed;top:80px;right:10px;color:#fff;background:#007bff;padding:8px 16px;text-decoration:none;z-index:9999;font-size:14px;border-radius:5px;";
  document.body.appendChild(invLink);
}

async function updatePoints() {
  var points = await getPoints();
  console.log("updatePoints: body =", points);
  var el = document.getElementById("pointsDisplay");
  if (el) {
    var trimmed = points.trim();
    if (isNaN(trimmed) || trimmed === "OK" || trimmed === "Odpověď: OK") {
      el.textContent = "Body: načítání...";
    } else {
      el.textContent = "Body: " + trimmed;
    }
  }
}
