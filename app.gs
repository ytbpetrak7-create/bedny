const SHEET_ID = "1K5T_SGfE-krTwfAluVsXv8VqPRl5GaPT1S2vf8f3ezw";
const STEAM_API_KEY = "9BF03DB2AF38585766A60108DE4F66A1";
const ADMIN_TRADE_LINK = "https://steamcommunity.com/tradeoffer/new/?partner=1724748264&token=DhhVwMmS";
const BOT_TRADE_LINK = "https://steamcommunity.com/tradeoffer/new/?partner=724294414&token=GYHge3_G";

function doGet(e) {
  return doPost(e);
}

function doPost(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("OK");
  }
  const action = e.parameter.action;
  const params = e.parameter;
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  var userSheet = ss.getSheetByName("Users");
  if (userSheet) {
    userSheet.getRange("C:C").setNumberFormat("0");
  }
  
  // force steam api auth
  if (STEAM_API_KEY) {
    try { UrlFetchApp.fetch("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + STEAM_API_KEY + "&steamids=0"); } catch (ef) {}
  }
  
  let result = "Unknown action";
  
  switch (action) {
    case "register":
      result = register(ss, params.username, params.password, params.ref);
      break;
    case "login":
      result = login(ss, params.username, params.password);
      break;
    case "getPoints":
      result = getPoints(ss, params.username);
      break;
    case "useCode":
      result = useCode(ss, params.username, params.code);
      break;
    case "open":
      result = openBox(ss, params.username, params.box);
      break;
    case "openMultiple":
      result = openBoxMultiple(ss, params.username, params.box, parseInt(params.count) || 1);
      break;
    case "getInventory":
      result = getInventory(ss, params.username);
      break;
    case "addToInventory":
      result = addToInventory(ss, params.username, params.item);
      break;
    case "getBoxInfo":
      result = getBoxInfo(ss, params.box);
      break;
    case "deleteInventoryItem":
      result = deleteInventoryItem(ss, params.username, params.item, params.row);
      break;
    case "isAdmin":
      result = isAdmin(ss, params.username);
      break;
    case "getProfile":
      result = getProfile(ss, params.username);
      break;
    case "saveProfilePic":
      result = saveProfilePic(ss, params.username, params.url);
      break;
    case "steamLoginComplete":
      result = steamLoginComplete(ss, params.steamId, params.name, params.pic);
      break;
    case "saveTradeLink":
      result = saveTradeLink(ss, params.username, params.link);
      break;
    case "getAdminTradeLink":
      result = ADMIN_TRADE_LINK || "NOT_SET";
      break;
    case "getTradeOffers":
      result = getTradeOffers();
      break;
    case "sellItem":
      result = sellItem(ss, params.username, params.row, params.price);
      break;
    case "sellAll":
      result = sellAll(ss, params.username);
      break;
    case "requestWithdraw":
      result = requestWithdraw(ss, params.username, params.itemName, params.row);
      break;
    case "getWithdrawals":
      result = getWithdrawals(ss);
      break;
    case "completeWithdrawal":
      result = completeWithdrawal(ss, params.row);
      break;
    case "approveWithdrawal":
      result = approveWithdrawal(ss, params.row);
      break;
    case "depositSkin":
      result = depositSkin(ss, params.username, params.items);
      break;
    case "getBotTradeLink":
      result = BOT_TRADE_LINK || "NOT_SET";
      break;
    case "applyReferral":
      result = applyReferral(ss, params.username, params.code);
      break;
    case "hasReferral":
      result = hasReferral(ss, params.username);
      break;
    case "getReferralStats":
      result = getReferralStats(ss, params.username);
      break;
    case "getRefCode":
      result = getRefCode(ss, params.username);
      break;
    case "requestRefCode":
      result = requestRefCode(ss, params.username, params.code);
      break;
    case "getPendingRefCodes":
      result = getPendingRefCodes(ss);
      break;
    case "approveRefCode":
      result = approveRefCode(ss, params.row);
      break;
    case "claimDailyReward":
      result = claimDailyReward(ss, params.username);
      break;
    case "getDailyStatus":
      result = getDailyStatus(ss, params.username);
      break;
  }
  
  return ContentService.createTextOutput(result);
}

function getSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function register(ss, username, password, referralCode) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    usersSheet.appendRow(["username", "password", "points", "registered", "profilePic"]);
  }
  
  usersSheet.getRange("C:C").setNumberFormat("0");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === username.trim()) {
      return "EXISTS";
    }
  }
  
  usersSheet.appendRow([username.trim(), password, 0, new Date()]);
  
  if (referralCode && referralCode.trim() !== "" && referralCode.trim() !== username.trim()) {
    applyReferral(ss, username.trim(), referralCode.trim());
  }
  
  return "OK";
}

function login(ss, username, password) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === username.trim() && data[i][1].toString().trim() === password.trim()) {
      return "OK";
    }
  }
  
  return "FAIL";
}

function getPoints(ss, username) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === username.trim()) {
      return data[i][2].toString();
    }
  }
  
  return "0";
}

function useCode(ss, username, code) {
  const codesSheet = getSheet(ss, "Codes");
  const data = codesSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    codesSheet.appendRow(["code", "points", "status", "usedBy"]);
    return "INVALID";
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === code && data[i][2] !== "USED") {
      const points = data[i][1];
      
      const usersSheet = getSheet(ss, "Users");
      const userData = usersSheet.getDataRange().getValues();
      for (let j = 1; j < userData.length; j++) {
        if (userData[j][0].toString().trim() === username.trim()) {
          usersSheet.getRange(j + 1, 3).setValue(Number(userData[j][2]) + Number(points));
          codesSheet.getRange(i + 1, 3).setValue("USED");
          codesSheet.getRange(i + 1, 4).setValue(username);
          return points.toString();
        }
      }
      
      return "USER_NOT_FOUND";
    }
  }
  
  return "INVALID";
}

function openBox(ss, username, box) {
  var sheetName = box === "Boxes2" ? "Boxes2" : "Boxes1";
  const boxesSheet = getSheet(ss, sheetName);
  const data = boxesSheet.getDataRange().getValues();
  const boxItems = [];
  
  for (let i = 1; i < data.length; i++) {
    boxItems.push({
      name: data[i][2],
      image: (data[i][0] || "").toString().trim(),
      chance: Number(data[i][1]),
      sellPrice: Number(data[i][3]) || 0
    });
  }
  
  if (boxItems.length === 0) return "EMPTY_BOX";
  
  const costMap = { "Boxes1": 2, "Boxes2": 6 };
  const cost = costMap[box] || 0;
  
  const usersSheet = getSheet(ss, "Users");
  const userData = usersSheet.getDataRange().getValues();
  let userRow = -1;
  let userPoints = 0;
  
  for (let j = 1; j < userData.length; j++) {
    if (userData[j][0].toString().trim() === username.trim()) {
      userRow = j + 1;
      userPoints = userData[j][2];
      break;
    }
  }
  
  if (userPoints < cost) {
    return "NOT_ENOUGH";
  }
  
  usersSheet.getRange(userRow, 3).setValue(userPoints - cost);
  var xpGain = box === "Boxes1" ? 20 : 250;
  var xp = Number(userData[userRow - 1][9]) || 0;
  usersSheet.getRange(userRow, 10).setValue(xp + xpGain);
  var refXp = Math.floor(xpGain * 0.01);
  var referrer = userData[userRow - 1][7];
  if (referrer) {
    for (var r = 1; r < userData.length; r++) {
      if (userData[r][0] && userData[r][0].toString().trim() === referrer.toString().trim()) {
        var rXp = Number(userData[r][9]) || 0;
        usersSheet.getRange(r + 1, 10).setValue(rXp + refXp);
        break;
      }
    }
  }
  payReferrerCommission(ss, usersSheet, userData, userRow, cost);
  
  let totalChance = 0;
  boxItems.forEach(item => totalChance += item.chance);
  
  let value = Math.random() * totalChance;
  let selectedItem = boxItems[0];
  
  for (const item of boxItems) {
    value -= item.chance;
    if (value <= 0) {
      selectedItem = item;
      break;
    }
  }
  
  addToInventory(ss, username, selectedItem.name);
  
  return selectedItem.name + "|" + selectedItem.image + "|" + selectedItem.sellPrice;
}

function openBoxMultiple(ss, username, box, count) {
  var sheetName = box === "Boxes2" ? "Boxes2" : "Boxes1";
  const boxesSheet = getSheet(ss, sheetName);
  const data = boxesSheet.getDataRange().getValues();
  const boxItems = [];
  
  for (let i = 1; i < data.length; i++) {
    boxItems.push({
      name: data[i][2],
      image: (data[i][0] || "").toString().trim(),
      chance: Number(data[i][1]),
      sellPrice: Number(data[i][3]) || 0
    });
  }
  
  if (boxItems.length === 0) return "EMPTY_BOX";
  
  const costMap = { "Boxes1": 2, "Boxes2": 6 };
  const cost = (costMap[box] || 0) * count;
  
  const usersSheet = getSheet(ss, "Users");
  const userData = usersSheet.getDataRange().getValues();
  let userRow = -1;
  let userPoints = 0;
  
  for (let j = 1; j < userData.length; j++) {
    if (userData[j][0].toString().trim() === username.trim()) {
      userRow = j + 1;
      userPoints = userData[j][2];
      break;
    }
  }
  
  if (userRow === -1) return "USER_NOT_FOUND";
  if (userPoints < cost) return "NOT_ENOUGH";
  
  usersSheet.getRange(userRow, 3).setValue(userPoints - cost);
  var xpPerBox = box === "Boxes1" ? 20 : 250;
  var xpGain = xpPerBox * count;
  var xp = Number(userData[userRow - 1][9]) || 0;
  usersSheet.getRange(userRow, 10).setValue(xp + xpGain);
  var refXp = Math.floor(xpGain * 0.01);
  var referrer = userData[userRow - 1][7];
  if (referrer) {
    for (var r = 1; r < userData.length; r++) {
      if (userData[r][0] && userData[r][0].toString().trim() === referrer.toString().trim()) {
        var rXp = Number(userData[r][9]) || 0;
        usersSheet.getRange(r + 1, 10).setValue(rXp + refXp);
        break;
      }
    }
  }
  payReferrerCommission(ss, usersSheet, userData, userRow, cost);
  
  let totalChance = 0;
  boxItems.forEach(item => totalChance += item.chance);
  
  var results = [];
  for (let n = 0; n < count; n++) {
    let value = Math.random() * totalChance;
    let selectedItem = boxItems[0];
    for (const item of boxItems) {
      value -= item.chance;
      if (value <= 0) {
        selectedItem = item;
        break;
      }
    }
    addToInventory(ss, username, selectedItem.name);
    results.push(selectedItem.name + "|" + selectedItem.image + "|" + selectedItem.sellPrice);
  }
  
  return results.join(";");
}

function getInventory(ss, username) {
  const invSheet = getSheet(ss, "Inventory");
  const data = invSheet.getDataRange().getValues();
  const items = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      items.push({
        name: data[i][1],
        date: data[i][2],
        row: i + 1
      });
    }
  }
  
  return JSON.stringify(items);
}

function addToInventory(ss, username, item) {
  const invSheet = getSheet(ss, "Inventory");
  const data = invSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    invSheet.appendRow(["username", "item", "date"]);
  }
  
  invSheet.appendRow([username, item, new Date()]);
  return "ADDED";
}

function payReferrerCommission(ss, usersSheet, userData, userRow, spent) {
  var referrer = userData[userRow - 1][7];
  if (!referrer) return;
  referrer = referrer.toString().trim();
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][0] && userData[i][0].toString().trim() === referrer) {
      var pts = Number(userData[i][2]) || 0;
      var commission = spent * 0.01;
      usersSheet.getRange(i + 1, 3).setValue(pts + commission);
      break;
    }
  }
}

function getBoxInfo(ss, box) {
  var sheetName = box === "Boxes2" ? "Boxes2" : "Boxes1";
  const boxesSheet = getSheet(ss, sheetName);
  const data = boxesSheet.getDataRange().getValues();
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1] && data[i][2]) {
      items.push({ name: data[i][2], image: (data[i][0] || "").toString().trim(), chance: Number(data[i][1]), sellPrice: Number(data[i][3]) || 0, rare: Number(data[i][4]) || 0 });
    }
  }
  
  return JSON.stringify(items);
}

function deleteInventoryItem(ss, username, item, row) {
  const invSheet = getSheet(ss, "Inventory");
  invSheet.deleteRow(Number(row));
  return "DELETED";
}

function isAdmin(ss, username) {
  const adminSheet = getSheet(ss, "Admins");
  const data = adminSheet.getDataRange().getValues();
  
  if (data.length === 0) return "NO";
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      return "YES";
    }
  }
  
  return "NO";
}

function getProfile(ss, username) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      var pts = data[i][2];
      if (pts instanceof Date) {
        pts = (pts.getTime() / 86400000) + 25569;
      }
      return JSON.stringify({
        username: data[i][0],
        points: Number(pts),
        registered: data[i][3],
        profilePic: data[i][4] || "",
        tradeLink: data[i][6] || "",
        xp: Number(data[i][9]) || 0
      });
    }
  }
  
  return "NOT_FOUND";
}

function saveProfilePic(ss, username, url) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  if (data.length > 0 && data[0].length < 5) {
    usersSheet.getRange(1, 5).setValue("profilePic");
  }
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      usersSheet.getRange(i + 1, 5).setValue(url);
      return "SAVED";
    }
  }
  
  return "NOT_FOUND";
}

function sellItem(ss, username, row, price) {
  const invSheet = getSheet(ss, "Inventory");
  const invData = invSheet.getDataRange().getValues();
  
  var itemName = "";
  var foundRow = -1;
  for (var i = 0; i < invData.length; i++) {
    if (invData[i][0] && invData[i][0].toString().trim() === username.trim() && (i + 1) === Number(row)) {
      itemName = invData[i][1];
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow === -1) return "NOT_FOUND";
  
  invSheet.deleteRow(foundRow);
  
  const usersSheet = getSheet(ss, "Users");
  const userData = usersSheet.getDataRange().getValues();
  for (var j = 1; j < userData.length; j++) {
    if (userData[j][0].toString().trim() === username.trim()) {
      usersSheet.getRange(j + 1, 3).setValue(Number(userData[j][2]) + Number(price));
      break;
    }
  }
  
  return "SOLD";
}

function sellAll(ss, username) {
  var boxesInfo = JSON.parse(getBoxInfo(ss, "Boxes1"));
  var boxes2Info = JSON.parse(getBoxInfo(ss, "Boxes2"));
  var priceMap = {};
  boxesInfo.forEach(function(item) { priceMap[item.name] = item.sellPrice; });
  boxes2Info.forEach(function(item) { priceMap[item.name] = item.sellPrice; });
  
  var invSheet = getSheet(ss, "Inventory");
  var invData = invSheet.getDataRange().getValues();
  
  var toSell = [];
  for (var i = invData.length - 1; i >= 1; i--) {
    if (invData[i][0] && invData[i][0].toString().trim() === username.trim()) {
      var name = invData[i][1] ? invData[i][1].toString().trim() : "";
      var price = priceMap[name] || 0;
      if (price > 0) {
        toSell.push({ row: i + 1, price: price });
      }
    }
  }
  
  if (toSell.length === 0) return "NOTHING";
  
  var totalEarned = 0;
  for (var s = 0; s < toSell.length; s++) {
    invSheet.deleteRow(toSell[s].row);
    totalEarned += toSell[s].price;
  }
  
  var usersSheet = getSheet(ss, "Users");
  var userData = usersSheet.getDataRange().getValues();
  for (var j = 1; j < userData.length; j++) {
    if (userData[j][0].toString().trim() === username.trim()) {
      var pts = Number(userData[j][2]) || 0;
      usersSheet.getRange(j + 1, 3).setValue(pts + totalEarned);
      break;
    }
  }
  
  return "SOLD|" + toSell.length + "|" + totalEarned;
}

function requestWithdraw(ss, username, itemName, row) {
  const invSheet = getSheet(ss, "Inventory");
  const invData = invSheet.getDataRange().getValues();
  var foundRow = -1;
  if (row) {
    for (var i = 0; i < invData.length; i++) {
      if (invData[i][0] && invData[i][0].toString().trim() === username.trim() && (i + 1) === Number(row)) {
        foundRow = i + 1;
        break;
      }
    }
  }
  if (foundRow === -1) {
    for (var i = 0; i < invData.length; i++) {
      if (invData[i][0] && invData[i][0].toString().trim() === username.trim() && invData[i][1] && invData[i][1].toString().trim() === itemName.trim()) {
        foundRow = i + 1;
        break;
      }
    }
  }
  if (foundRow === -1) return "NOT_FOUND";
  
  var usersSheet = getSheet(ss, "Users");
  var userData = usersSheet.getDataRange().getValues();
  var tradeLink = "";
  for (var j = 0; j < userData.length; j++) {
    if (userData[j][0] && userData[j][0].toString().trim() === username.trim()) {
      tradeLink = userData[j][6] || "";
      break;
    }
  }
  
  var wSheet = getSheet(ss, "Withdrawals");
  if (wSheet.getLastRow() === 0) {
    wSheet.appendRow(["username", "item", "status", "date", "tradeLink"]);
  }
  wSheet.appendRow([username, itemName, "pending", new Date(), tradeLink]);
  
  invSheet.deleteRow(foundRow);
  return "WITHDRAW_REQUESTED";
}

function getWithdrawals(ss) {
  var wSheet = getSheet(ss, "Withdrawals");
  var data = wSheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2] !== "done") {
      items.push({ row: i + 1, username: data[i][0], item: data[i][1], status: data[i][2], date: data[i][3], tradeLink: data[i][4] || "" });
    }
  }
  return JSON.stringify(items);
}

function completeWithdrawal(ss, row) {
  var wSheet = getSheet(ss, "Withdrawals");
  wSheet.getRange(Number(row), 3).setValue("done");
  return "COMPLETED";
}

function approveWithdrawal(ss, row) {
  var wSheet = getSheet(ss, "Withdrawals");
  wSheet.getRange(Number(row), 3).setValue("approved");
  return "APPROVED";
}

function saveTradeLink(ss, username, link) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  if (data.length > 0 && data[0].length < 7) {
    usersSheet.getRange(1, 7).setValue("tradeLink");
  }
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      usersSheet.getRange(i + 1, 7).setValue(link);
      return "SAVED";
    }
  }
  
  return "NOT_FOUND";
}

function steamLoginComplete(ss, steamId, name, pic) {
  return findOrCreateSteamUser(ss, steamId, name, pic);
}

function getTradeOffers() {
  if (!STEAM_API_KEY) return "NO_KEY";
  try {
    var url = "https://api.steampowered.com/IEconService/GetTradeOffers/v1/?key=" +
      STEAM_API_KEY + "&get_received_offers=1&active_only=1&language=en";
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    return res.getContentText();
  } catch (e) {
    return "ERROR: " + e.message;
  }
}

function fetchSteamPlayer(steamId) {
  try {
    var apiUrl = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" +
      STEAM_API_KEY + "&steamids=" + steamId;
    var apiRes = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    var apiData = JSON.parse(apiRes.getContentText());
    if (apiData.response && apiData.response.players && apiData.response.players.length > 0) {
      return apiData.response.players[0];
    }
  } catch (e) {
  }
  return null;
}

function findOrCreateSteamUser(ss, steamId, clientName, clientPic) {
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    usersSheet.appendRow(["username", "password", "points", "registered", "profilePic", "steamId"]);
  } else if (data[0].length < 6) {
    usersSheet.getRange(1, 6).setValue("steamId");
  }
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][5] && data[i][5].toString().trim() === steamId.toString().trim()) {
      var pic = data[i][4] || "";
      var name = data[i][0];
      var updated = false;
      if (STEAM_API_KEY) {
        var player = fetchSteamPlayer(steamId);
        if (player) {
          if (player.avatarfull && player.avatarfull !== pic) {
            usersSheet.getRange(i + 1, 5).setValue(player.avatarfull);
            pic = player.avatarfull;
            updated = true;
          }
          if (player.personaname && player.personaname !== name) {
            usersSheet.getRange(i + 1, 1).setValue(player.personaname);
            name = player.personaname;
            updated = true;
          }
        }
      }
      if (!updated && clientName && clientName !== name) {
        usersSheet.getRange(i + 1, 1).setValue(clientName);
        name = clientName;
      }
      if (!updated && clientPic && clientPic !== pic) {
        usersSheet.getRange(i + 1, 5).setValue(clientPic);
        pic = clientPic;
      }
      return name + "|" + pic;
    }
  }
  
  var personaName = clientName || steamId;
  var avatarUrl = clientPic || "";
  
  if (STEAM_API_KEY) {
    var player = fetchSteamPlayer(steamId);
    if (player) {
      personaName = player.personaname || personaName;
      avatarUrl = player.avatarfull || avatarUrl;
    }
  }
  
  var baseName = personaName;
  var suffix = 1;
  while (true) {
    var found = false;
    for (var j = 1; j < data.length; j++) {
      if (data[j][0] && data[j][0].toString().trim() === personaName.trim()) {
        found = true;
        break;
      }
    }
    if (!found) break;
    personaName = baseName + suffix;
    suffix++;
  }
  
  usersSheet.appendRow([personaName, "", 0, new Date(), avatarUrl, steamId.toString()]);
  return personaName + "|" + avatarUrl;
}

function authorizeExternalRequest() {
  if (!STEAM_API_KEY) return;
  var res = UrlFetchApp.fetch("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + STEAM_API_KEY + "&steamids=76561197960435530");
  Logger.log("Auth OK: " + res.getResponseCode());
}

function depositSkin(ss, username, itemNames) {
  if (!username || !itemNames) return "MISSING_PARAMS";
  
  var usersSheet = getSheet(ss, "Users");
  var userData = usersSheet.getDataRange().getValues();
  var userRow = -1;
  var currentPts = 0;
  
  for (var i = 0; i < userData.length; i++) {
    if (userData[i][0] && userData[i][0].toString().trim() === username.trim()) {
      userRow = i + 1;
      currentPts = Number(userData[i][2]) || 0;
      break;
    }
  }
  if (userRow === -1) return "USER_NOT_FOUND";
  
  var prices = {};
  var depSheet = getSheet(ss, "DepositSkins");
  var depData = depSheet.getDataRange().getValues();
  for (var i = 1; i < depData.length; i++) {
    if (depData[i][0]) {
      var key = depData[i][0].toString().trim().toLowerCase();
      var p = Number(depData[i][1]) || 0;
      if (p > 0) prices[key] = p;
    }
  }
  
  var names = itemNames.split(";").map(function(n) { return n.trim(); });
  var total = 0;
  var credited = [];
  var notFound = [];
  
  for (var j = 0; j < names.length; j++) {
    var name = names[j];
    var price = prices[name.toLowerCase()];
    if (price > 0) {
      total += price;
      credited.push(name);
    } else {
      notFound.push(name);
    }
  }
  
  if (total > 0) {
    var bonus = 0;
    var referredBy = userData[userRow - 1][7] || "";
    if (referredBy) {
      bonus = Math.round(total * 0.10 * 100) / 100;
    }
    usersSheet.getRange(userRow, 3).setValue(currentPts + total + bonus);
    return JSON.stringify({ total: total, bonus: bonus, credited: credited, notFound: notFound });
  }
  
  return JSON.stringify({ total: total, bonus: 0, credited: credited, notFound: notFound });
}

function applyReferral(ss, username, code) {
  if (!username || !code) return "MISSING";
  if (code.trim().toUpperCase() === username.trim().toUpperCase()) return "SAME_USER";
  
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  
  var referrerUsername = null;
  for (var i = 1; i < data.length; i++) {
    var uname = data[i][0] ? data[i][0].toString().trim() : "";
    var customCode = data[i][8] ? data[i][8].toString().trim().toUpperCase() : "";
    if (uname === code.trim() || customCode === code.trim().toUpperCase()) {
      referrerUsername = uname;
      break;
    }
  }
  
  if (!referrerUsername) {
    var refSheet = getSheet(ss, "RefCodes");
    var refData = refSheet.getDataRange().getValues();
    for (var i = 1; i < refData.length; i++) {
      if (refData[i][1] && refData[i][1].toString().trim().toUpperCase() === code.trim().toUpperCase() && refData[i][2] && refData[i][2].toString().trim() === "approved") {
        referrerUsername = refData[i][0].toString().trim();
        break;
      }
    }
  }
  
  if (!referrerUsername) return "REFERRER_NOT_FOUND";
  
  var newData = usersSheet.getDataRange().getValues();
  for (var i = 1; i < newData.length; i++) {
    if (newData[i][0] && newData[i][0].toString().trim() === username.trim()) {
      if (newData[i][7]) return "ALREADY_REFERRED";
      usersSheet.getRange(i + 1, 8).setValue(referrerUsername);
      var pts = Number(newData[i][2]) || 0;
      usersSheet.getRange(i + 1, 3).setValue(pts + 6);
      return "OK";
    }
  }
  return "USER_NOT_FOUND";
}

function hasReferral(ss, username) {
  if (!username) return "NO";
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var uname = data[i][0] ? data[i][0].toString().trim() : "";
    if (uname === username.trim()) {
      return data[i][7] ? "YES" : "NO";
    }
  }
  return "NO";
}

function getRefCode(ss, username) {
  if (!username) return "MISSING";
  
  var refSheet = getSheet(ss, "RefCodes");
  var refData = refSheet.getDataRange().getValues();
  for (var i = 1; i < refData.length; i++) {
    var u = refData[i][0] ? refData[i][0].toString().trim() : "";
    var c = refData[i][1] ? refData[i][1].toString().trim() : "";
    var s = refData[i][2] ? refData[i][2].toString().trim() : "";
    if (u === username.trim()) {
      if (s === "approved") return c;
      if (s === "pending") return "pending:" + c;
    }
  }
  
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      var code = data[i][8] ? data[i][8].toString().trim() : "";
      if (code) return code;
      break;
    }
  }
  return "";
}

function getReferralStats(ss, username) {
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  var referred = [];
  var totalXp = 0;
  var totalEarned = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][7] && data[i][7].toString().trim() === username.trim()) {
      referred.push(data[i][0].toString().trim());
      var refXp = Number(data[i][9]) || 0;
      totalXp += refXp;
      totalEarned += refXp * 0.01;
    }
  }
  return JSON.stringify({ count: referred.length, users: referred, totalXp: totalXp, earned: Math.floor(totalEarned * 100) / 100 });
}

function requestRefCode(ss, username, code) {
  if (!username || !code) return "MISSING";
  code = code.trim().toUpperCase();
  if (code.length !== 4) return "INVALID_LENGTH";
  
  var refSheet = getSheet(ss, "RefCodes");
  var refData = refSheet.getDataRange().getValues();
  
  for (var i = 1; i < refData.length; i++) {
    if (refData[i][1] && refData[i][1].toString().trim().toUpperCase() === code) {
      if (refData[i][2] === "approved") return "CODE_TAKEN";
      if (refData[i][0] && refData[i][0].toString().trim() === username.trim()) return "ALREADY_REQUESTED";
    }
  }
  
  var usersSheet = getSheet(ss, "Users");
  var userData = usersSheet.getDataRange().getValues();
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][8] && userData[i][8].toString().trim().toUpperCase() === code) {
      return "CODE_TAKEN";
    }
  }
  
  refSheet.appendRow([username, code, "pending", new Date()]);
  return "OK";
}

function getPendingRefCodes(ss) {
  var refSheet = getSheet(ss, "RefCodes");
  var data = refSheet.getDataRange().getValues();
  var pending = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().trim() === "pending") {
      pending.push({
        username: data[i][0],
        code: data[i][1],
        date: data[i][3],
        row: i + 1
      });
    }
  }
  return JSON.stringify(pending);
}

function approveRefCode(ss, row) {
  var refSheet = getSheet(ss, "RefCodes");
  refSheet.getRange(Number(row), 3).setValue("approved");
  
  var data = refSheet.getDataRange().getValues();
  var username = data[Number(row) - 1][0].toString().trim();
  var code = data[Number(row) - 1][1].toString().trim();
  
  var usersSheet = getSheet(ss, "Users");
  var userData = usersSheet.getDataRange().getValues();
  for (var i = 1; i < userData.length; i++) {
    if (userData[i][0] && userData[i][0].toString().trim() === username) {
      usersSheet.getRange(i + 1, 9).setValue(code);
      break;
    }
  }
  return "OK";
}

var DAILY_REWARDS = [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70];

function claimDailyReward(ss, username) {
  if (!username) return "MISSING";
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  var userRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      userRow = i + 1;
      break;
    }
  }
  if (userRow === -1) return "USER_NOT_FOUND";

  var now = new Date();
  var dd = now.getDate(); var mm = now.getMonth() + 1; var yyyy = now.getFullYear();
  var todayNum = yyyy * 10000 + mm * 100 + dd;

  var rawLast = data[userRow - 1][10];
  var lastClaimNum = 0;
  if (rawLast) {
    if (rawLast instanceof Date) {
      lastClaimNum = rawLast.getFullYear() * 10000 + (rawLast.getMonth() + 1) * 100 + rawLast.getDate();
    } else {
      var parsed = parseInt(rawLast.toString().trim(), 10);
      if (!isNaN(parsed)) lastClaimNum = parsed;
    }
  }
  var streak = Number(data[userRow - 1][11]) || 0;

  if (lastClaimNum) {
    if (lastClaimNum === todayNum) return "ALREADY_CLAIMED";
    var lastY = Math.floor(lastClaimNum / 10000);
    var lastM = Math.floor((lastClaimNum % 10000) / 100) - 1;
    var lastD = lastClaimNum % 100;
    var lastDate = new Date(lastY, lastM, lastD);
    var todayDate = new Date(yyyy, mm - 1, dd);
    var diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      if (streak > 7) streak = 1;
    } else {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  var reward = DAILY_REWARDS[streak] || 0.10;
  var pts = Number(data[userRow - 1][2]) || 0;
  usersSheet.getRange(userRow, 3).setValue(pts + reward);
  usersSheet.getRange(userRow, 11).setValue(streak);
  usersSheet.getRange(userRow, 12).setValue(todayNum);

  return JSON.stringify({ streak: streak, reward: reward });
}

function getDailyStatus(ss, username) {
  if (!username) return "MISSING";
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  var userRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === username.trim()) {
      userRow = i + 1;
      break;
    }
  }
  if (userRow === -1) return "USER_NOT_FOUND";

  var now = new Date();
  var dd = now.getDate(); var mm = now.getMonth() + 1; var yyyy = now.getFullYear();
  var todayNum = yyyy * 10000 + mm * 100 + dd;

  var rawLast = data[userRow - 1][10];
  var lastClaimNum = 0;
  if (rawLast) {
    if (rawLast instanceof Date) {
      lastClaimNum = rawLast.getFullYear() * 10000 + (rawLast.getMonth() + 1) * 100 + rawLast.getDate();
    } else {
      var parsed = parseInt(rawLast.toString().trim(), 10);
      if (!isNaN(parsed)) lastClaimNum = parsed;
    }
  }
  var streak = Number(data[userRow - 1][11]) || 0;
  var claimed = false;

  if (lastClaimNum) {
    if (lastClaimNum === todayNum) {
      claimed = true;
    } else {
      var lastY = Math.floor(lastClaimNum / 10000);
      var lastM = Math.floor((lastClaimNum % 10000) / 100) - 1;
      var lastD = lastClaimNum % 100;
      var lastDate = new Date(lastY, lastM, lastD);
      var todayDate = new Date(yyyy, mm - 1, dd);
      var diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) streak = 0;
    }
  }

  var nextDay = claimed ? streak + 1 : (streak || 0) + 1;
  if (nextDay > 7) nextDay = 1;
  var nextReward = DAILY_REWARDS[nextDay] || 0.10;

  return JSON.stringify({ claimed: claimed, streak: streak, nextDay: nextDay, nextReward: nextReward });
}
