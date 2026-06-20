const SHEET_ID = "1K5T_SGfE-krTwfAluVsXv8VqPRl5GaPT1S2vf8f3ezw";
const STEAM_API_KEY = "9BF03DB2AF38585766A60108DE4F66A1";

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
  
  let result = "Unknown action";
  
  switch (action) {
    case "register":
      result = register(ss, params.username, params.password);
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
      result = steamLoginComplete(ss, params.steamId);
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

function register(ss, username, password) {
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
  const boxesSheet = getSheet(ss, "Boxes1");
  const data = boxesSheet.getDataRange().getValues();
  const boxItems = [];
  
  for (let i = 1; i < data.length; i++) {
    boxItems.push({
      name: data[i][2],
      image: data[i][0],
      chance: Number(data[i][1])
    });
  }
  
  if (boxItems.length === 0) return "EMPTY_BOX";
  
  const costMap = { "Boxes1": 2, "Boxes2": 250 };
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
  
  return selectedItem.name + "|" + selectedItem.image;
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

function getBoxInfo(ss, box) {
  const boxesSheet = getSheet(ss, "Boxes1");
  const data = boxesSheet.getDataRange().getValues();
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1] && data[i][2]) {
      items.push({ name: data[i][2], image: data[i][0], chance: Number(data[i][1]) });
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
        profilePic: data[i][4] || ""
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

function steamLoginComplete(ss, steamId) {
  return findOrCreateSteamUser(steamId);
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

function findOrCreateSteamUser(steamId) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var usersSheet = getSheet(ss, "Users");
  var data = usersSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    usersSheet.appendRow(["username", "password", "points", "registered", "profilePic", "steamId"]);
  } else if (data[0].length < 6) {
    usersSheet.getRange(1, 6).setValue("steamId");
  }
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][5] && data[i][5].toString().trim() === steamId.toString().trim()) {
      if (STEAM_API_KEY) {
        var player = fetchSteamPlayer(steamId);
        if (player && player.avatarfull && player.avatarfull !== (data[i][4] || "")) {
          usersSheet.getRange(i + 1, 5).setValue(player.avatarfull);
        }
      }
      return data[i][0] + "|" + (data[i][4] || "");
    }
  }
  
  var personaName = steamId;
  var avatarUrl = "";
  
  if (STEAM_API_KEY) {
    var player = fetchSteamPlayer(steamId);
    if (player) {
      personaName = player.personaname || steamId;
      avatarUrl = player.avatarfull || "";
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
