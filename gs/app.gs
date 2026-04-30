var SPREADSHEET_ID = "1K5T_SGfE-krTwfAluVsXv8VqPRl5GaPT1S2vf8f3ezw";
var SHEET_USERS = "Users";
var SHEET_CODES = "Codes";
var SHEET_BOXES = "Boxes";

function doGet(e) {
  var action = e.parameter.action;
  var result = "";

  if (action == "registerUser") {
    result = registerUser(e.parameter.userid);
  } else if (action == "getPoints") {
    result = getPoints(e.parameter.userid);
  } else if (action == "useCode") {
    result = useCode(e.parameter.code, e.parameter.userid);
  } else if (action == "open") {
    result = openBox(e.parameter.userid, e.parameter.box);
  } else if (action == "getInventory") {
    result = getInventory(e.parameter.userid);
  } else {
    result = " Neznámá akce";
  }

  return ContentService
    .createTextOutput(result)
    .setMimeType(ContentService.MimeType.TEXT);
}

function registerUser(userid) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_USERS);
    sheet.appendRow(["userid", "datum registrace", "počet bodů"]);
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userid) {
      return "Uživatel již existuje";
    }
  }
  
  sheet.appendRow([userid, new Date(), 0]);
  return "OK";
}

function getPoints(userid) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_USERS);
  
  if (!sheet) return "0";
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userid) {
      return data[i][2].toString();
    }
  }
  
  return "0";
}

function useCode(code, userid) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_CODES);
  
  if (!sheet) return "List Codes nenalezen";
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == code) {
      if (data[i][2] == true) {
        return "Kód již byl použit";
      }
      
      var points = data[i][1];
      sheet.getRange(i + 1, 3).setValue(true);
      sheet.getRange(i + 1, 4).setValue(new Date());
      sheet.getRange(i + 1, 5).setValue(userid);
      
      var usersSheet = ss.getSheetByName(SHEET_USERS);
      var usersData = usersSheet.getDataRange().getValues();
      for (var j = 1; j < usersData.length; j++) {
        if (usersData[j][0] == userid) {
          var currentPoints = usersData[j][2];
          usersSheet.getRange(j + 1, 3).setValue(currentPoints + points);
          break;
        }
      }
      
      return points.toString();
    }
  }
  
  return "Kód nenalezen";
}

function getInventory(userid) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Drops");
  
  if (!sheet) return "[]";
  
  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == userid) {
      items.push({
        name: data[i][0],
        date: data[i][2]
      });
    }
  }
  
  return JSON.stringify(items);
}

function initBoxSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return;
  
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(["image", "chance", "name"]);
  
  if (sheetName == "Boxes1") {
    var items = [
      ["mandrel nov.jpg", 25, "nova Mandrel"],
      ["m249.jpg", 25, "M249 Sage Camo"],
      ["snad spryvny glock.png", 20, "Glock-18 Ocean Topo"],
      ["usps.png", 15, "usp-s PC-GRN"],
      ["eagle.png", 15, "desert eagle Tilted"],
      ["emka.png", 5, "m4a1-s Nitro"],
      ["acheron awp.jpg", 2, "awp Acheron"]
    ];
    for (var i = 0; i < items.length; i++) {
      sheet.appendRow(items[i]);
    }
  } else if (sheetName == "Boxes2") {
    var items2 = [
      ["mac 10 ens.png", 25, "mac 10 Ensnared"],
      ["", 25, "M4A4 | Etch Lord"],
      ["", 20, "Desert Eagle | Urban Rubble"],
      ["", 15, "M4A1-S | Night Terror"],
      ["", 15, "MAC-10 | Light Box"],
      ["", 5, "Glock-18 | Winterized"],
      ["", 2, "CZ75-Auto | Copper Fiber"]
    ];
    for (var j = 0; j < items2.length; j++) {
      sheet.appendRow(items2[j]);
    }
  }
}

function pickItem(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    initBoxSheet(sheetName);
    sheet = ss.getSheetByName(sheetName);
  }
  
  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    items.push({
      image: data[i][0],
      chance: data[i][1],
      name: data[i][2]
    });
  }
  
  if (items.length === 0) return null;
  
  var value = Math.random() * 1000;
  var finalItem;
  while (true) {
    var item = items.pop();
    items.unshift(item);
    value -= item.chance;
    if (value <= 0) {
      finalItem = item;
      break;
    }
  }
  return finalItem;
}

function getBoxPrice(boxName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("BoxConfig");
  
  if (!sheet) {
    sheet = ss.insertSheet("BoxConfig");
    sheet.appendRow(["name", "price"]);
    sheet.appendRow(["Boxes1", 2]);
    sheet.appendRow(["Boxes2", 5]);
    return boxName == "Boxes2" ? 5 : 2;
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == boxName) {
      return data[i][1];
    }
  }
  
  return 2;
}

function openBox(userid, boxName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName(SHEET_USERS);
  
  if (!usersSheet) return "Uživatel nenalezen";
  
  var priceFromSheet = getBoxPrice(boxName);
  
  var usersData = usersSheet.getDataRange().getValues();
  var userPoints = 0;
  var userRow = -1;
  
  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][0] == userid) {
      userPoints = usersData[i][2];
      userRow = i + 1;
      break;
    }
  }
  
  if (userPoints < priceFromSheet) {
    return "Nedostatek bodů";
  }
  
  var pickedItem = pickItem(boxName);
  if (!pickedItem) {
    if (ss.getSheetByName(boxName)) {
      return "Sheet '" + boxName + "' vytvořen. Přidej položky (image, chance, name).";
    }
    return "List nenalezen";
  }
  
  usersSheet.getRange(userRow, 3).setValue(userPoints - priceFromSheet);
  
  var dropsSheet = ss.getSheetByName("Drops");
  if (!dropsSheet) {
    dropsSheet = ss.insertSheet("Drops");
    dropsSheet.appendRow(["item", "userid", "datum"]);
  }
  dropsSheet.appendRow([pickedItem.name, userid, new Date()]);
  
  return pickedItem.name + "|" + pickedItem.image;
}