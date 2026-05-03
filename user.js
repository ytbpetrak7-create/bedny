<<<<<<< HEAD
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-GevnjXbo3CX0UuRPmBCr0nw6dkP6Trlane3shNnRIHDEUEKP9AGH2-WzNAGDVhDfAA/exec";

let username = localStorage.getItem("username");
if (!username) {
  username = prompt("Zadejte své uživatelské jméno:");
  while (!username || username.trim() === "") {
    alert("Uživatelské jméno nesmí být prázdné!");
    username = prompt("Zadejte své uživatelské jméno:");
  }
  username = username.trim();
  localStorage.setItem("username", username);
  registerUser(username);
=======
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySDn3of-ofSTDapJUuOpDMnHLkWJp-7bWCCNNOMtLV3Tn7RAZugPhxiKBdIdo9KUZDqg/exec";

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(username) {
  localStorage.setItem("user", JSON.stringify({ username: username }));
}

function clearUser() {
  localStorage.removeItem("user");
>>>>>>> 84dbbd4f7d28b93ce6018d36f618e1b94473f755
}

async function callScript(action, params = {}) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set("action", action);
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }
<<<<<<< HEAD
  const response = await fetch(url.toString());
  if (response.redirected) {
    console.warn("Request was redirected, possible old URL");
=======
  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow'
  });
  if (!response.ok) {
    throw new Error('Chyba spojení: ' + response.status);
>>>>>>> 84dbbd4f7d28b93ce6018d36f618e1b94473f755
  }
  return response.text();
}

<<<<<<< HEAD
function getUsername() {
  return localStorage.getItem("username");
}

async function registerUser(uname) {
  const response = await callScript("registerUser", { userid: uname });
  console.log("Registrace:", response);
  return response;
}

async function getPoints() {
  const uname = getUsername();
  return await callScript("getPoints", { userid: uname });
}

async function useCode(code) {
  const uname = getUsername();
  return await callScript("useCode", { code: code, userid: uname });
}

async function open(boxName) {
  const uname = getUsername();
  return await callScript("open", { userid: uname, box: boxName });
}

async function getInventory() {
  const uname = getUsername();
  return await callScript("getInventory", { userid: uname });
=======
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
>>>>>>> 84dbbd4f7d28b93ce6018d36f618e1b94473f755
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
  console.log("updatePoints: body =", points);
  var el = document.getElementById("pointsDisplay");
  if (el) {
    if (isNaN(points) || points === "OK" || points === "Odpověď: OK") {
      el.textContent = "Body: načítání...";
    } else {
      el.textContent = "Body: " + points;
    }
  }
}
