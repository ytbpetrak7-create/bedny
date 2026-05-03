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
  invLink.style.cssText = "position:fixed;top:50px;right:10px;color:#fff;background:#007bff;padding:8px 16px;text-decoration:none;z-index:9999;font-size:14px;border-radius:5px;";
  document.body.appendChild(invLink);
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
