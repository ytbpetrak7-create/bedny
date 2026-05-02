const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-GevnjXbo3CX0UuRPmBCr0nw6dkP6Trlane3shNnRIHDEUEKP9AGH2-WzNAGDVhDfAA/exec";

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(username) {
  localStorage.setItem("user", JSON.stringify({ username: username }));
}

function clearUser() {
  localStorage.removeItem("user");
}

async function callScript(action, params = {}) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set("action", action);
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow'
  });
  if (!response.ok) {
    throw new Error('Chyba spojení: ' + response.status);
  }
  return response.text();
}

async function register(username, password) {
  return await callScript("register", { username: username, password: password });
}

async function login(username, password) {
  return await callScript("login", { username: username, password: password });
}

async function getPoints() {
  const user = getCurrentUser();
  if (!user) return "0";
  return await callScript("getPoints", { username: user.username });
}

async function useCode(code) {
  const user = getCurrentUser();
  if (!user) return "Not logged in";
  return await callScript("useCode", { code: code, username: user.username });
}

async function open(boxName) {
  const user = getCurrentUser();
  if (!user) return "Not logged in";
  return await callScript("open", { username: user.username, box: boxName });
}

async function getInventory() {
  const user = getCurrentUser();
  if (!user) return "[]";
  return await callScript("getInventory", { username: user.username });
}

async function addToInventory(itemName) {
  const user = getCurrentUser();
  if (!user) return "Not logged in";
  return await callScript("addToInventory", { username: user.username, item: itemName });
}

function createPointsDisplay() {
  var pointsDiv = document.createElement("div");
  pointsDiv.id = "pointsDisplay";
  pointsDiv.textContent = "Body: Načítání...";
  document.body.prepend(pointsDiv);
  
  var logoutBtn = document.createElement("a");
  logoutBtn.href = "#";
  logoutBtn.id = "logoutLink";
  logoutBtn.textContent = "Odhlásit";
  logoutBtn.style.position = "fixed";
  logoutBtn.style.bottom = "20px";
  logoutBtn.style.right = "20px";
  logoutBtn.style.color = "#ff4444";
  logoutBtn.style.textDecoration = "none";
  logoutBtn.style.fontSize = "14px";
  logoutBtn.style.fontWeight = "bold";
  logoutBtn.onclick = function(e) {
    e.preventDefault();
    clearUser();
    window.location.href = "login.html";
  };
  document.body.appendChild(logoutBtn);
  
  updatePoints();
}

async function updatePoints() {
  var points = await getPoints();
  var el = document.getElementById("pointsDisplay");
  if (el) {
    el.textContent = "Body: " + points;
  }
}
