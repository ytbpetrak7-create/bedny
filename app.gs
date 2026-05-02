function doGet(e) {
  return ContentService.createTextOutput("OK");
}

function doPost(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("OK");
  }
  const action = e.parameter.action;
  const params = e.parameter;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
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
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      return ContentService.createTextOutput("EXISTS");
    }
  }
  
  usersSheet.appendRow([username, password, 0, new Date()]);
  return ContentService.createTextOutput("OK");
}

function login(ss, username, password) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return ContentService.createTextOutput("OK");
    }
  }
  
  return ContentService.createTextOutput("FAIL");
}

function getPoints(ss, username) {
  const usersSheet = getSheet(ss, "Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      return ContentService.createTextOutput(data[i][2].toString());
    }
  }
  
  return ContentService.createTextOutput("0");
}

function useCode(ss, username, code) {
  const codesSheet = getSheet(ss, "Codes");
  const data = codesSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    codesSheet.appendRow(["code", "points", "status", "usedBy"]);
    return ContentService.createTextOutput("INVALID");
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === code && data[i][2] !== "USED") {
      const points = data[i][1];
      
      const usersSheet = getSheet(ss, "Users");
      const userData = usersSheet.getDataRange().getValues();
      for (let j = 1; j < userData.length; j++) {
        if (userData[j][0] === username) {
          usersSheet.getRange(j + 1, 3).setValue(userData[j][2] + points);
          codesSheet.getRange(i + 1, 3).setValue("USED");
          codesSheet.getRange(i + 1, 4).setValue(username);
          return ContentService.createTextOutput(points.toString());
        }
      }
      
      return ContentService.createTextOutput("USER_NOT_FOUND");
    }
  }
  
  return ContentService.createTextOutput("INVALID");
}

function openBox(ss, username, box) {
  const boxesSheet = getSheet(ss, "Boxes");
  const data = boxesSheet.getDataRange().getValues();
  const boxItems = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === box) {
      boxItems.push({
        name: data[i][1],
        image: data[i][2],
        chance: Number(data[i][3])
      });
    }
  }
  
  if (boxItems.length === 0) return ContentService.createTextOutput("EMPTY_BOX");
  
  const costMap = { "Boxes1": 100, "Boxes2": 250 };
  const cost = costMap[box] || 0;
  
  const usersSheet = getSheet(ss, "Users");
  const userData = usersSheet.getDataRange().getValues();
  let userRow = -1;
  let userPoints = 0;
  
  for (let j = 1; j < userData.length; j++) {
    if (userData[j][0] === username) {
      userRow = j + 1;
      userPoints = userData[j][2];
      break;
    }
  }
  
  if (userPoints < cost) {
    return ContentService.createTextOutput("NOT_ENOUGH");
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
  
  return ContentService.createTextOutput(selectedItem.name + "|" + selectedItem.image);
}

function getInventory(ss, username) {
  const invSheet = getSheet(ss, "Inventory");
  const data = invSheet.getDataRange().getValues();
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      items.push({
        name: data[i][1],
        date: data[i][2]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(items));
}

function addToInventory(ss, username, item) {
  const invSheet = getSheet(ss, "Inventory");
  const data = invSheet.getDataRange().getValues();
  
  if (data.length === 0) {
    invSheet.appendRow(["username", "item", "date"]);
  }
  
  invSheet.appendRow([username, item, new Date()]);
  return ContentService.createTextOutput("ADDED");
}
