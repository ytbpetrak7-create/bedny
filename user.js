const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2LnSOimbN0atJuomoLm4kVa5a_NqeEDGQNxm8uSQYMuGGnNEax_UBbouur74W-LmXaA/exec";

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

async function openMultiple(boxName, count) {
  const uname = getUsername();
  return await callScript("openMultiple", { username: uname, box: boxName, count: count });
}

async function getInventory() {
  const uname = getUsername();
  return await callScript("getInventory", { username: uname });
}

async function getBoxInfo(boxName) {
  return await callScript("getBoxInfo", { box: boxName });
}

async function deleteInventoryItem(item, row) {
  const uname = getUsername();
  return await callScript("deleteInventoryItem", { username: uname, item: item, row: row });
}

async function isAdmin() {
  const uname = getUsername();
  return await callScript("isAdmin", { username: uname });
}

async function getProfile() {
  const uname = getUsername();
  return await callScript("getProfile", { username: uname });
}

async function saveProfilePic(url) {
  const uname = getUsername();
  return await callScript("saveProfilePic", { username: uname, url: url });
}

async function saveTradeLink(link) {
  const uname = getUsername();
  return await callScript("saveTradeLink", { username: uname, link: link });
}

async function getAdminTradeLink() {
  return await callScript("getAdminTradeLink");
}

async function getTradeOffers() {
  return await callScript("getTradeOffers");
}

async function sellItem(row, price) {
  const uname = getUsername();
  return await callScript("sellItem", { username: uname, row: row, price: price });
}

function createPointsDisplay() {
  var pointsDiv = document.createElement("div");
  var profilLink = document.createElement("a");
  profilLink.href = "profil.html";
  profilLink.id = "profilePic";
  profilLink.style.cssText = "position:fixed;top:10px;right:10px;width:50px;height:50px;border-radius:50%;background:#6f42c1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:bold;text-decoration:none;z-index:9999;overflow:hidden;";
  profilLink.textContent = getCurrentUser().charAt(0).toUpperCase();
  document.body.appendChild(profilLink);

  pointsDiv.id = "pointsDisplay";
  pointsDiv.style.cssText = "position:fixed;top:18px;right:75px;background:#333;color:#fff;padding:8px 12px;z-index:9999;font-size:14px;border-radius:5px;cursor:pointer;";
  pointsDiv.onclick = function() { window.location.href = "zamobr.html"; };
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
  console.log("updatePoints: Kč =", points);
  var el = document.getElementById("pointsDisplay");
  if (el) {
    var trimmed = points.trim();
    if (isNaN(trimmed) || trimmed === "OK" || trimmed === "Odpověď: OK") {
      el.textContent = "Kč: načítání...";
    } else {
      el.textContent = "Kč: " + trimmed;
    }
  }
}
