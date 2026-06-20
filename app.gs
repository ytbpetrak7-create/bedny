const SHEET_ID = "1K5T_SGfE-krTwfAluVsXv8VqPRl5GaPT1S2vf8f3ezw";

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
    usersSheet.appendRow(["username", "password", "points", "registered"]);
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
