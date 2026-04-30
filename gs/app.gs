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

function pickItem(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return null;
  
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

function openBox(userid, boxName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ss.getSheetByName(SHEET_USERS);
  
  if (!usersSheet) return "Uživatel nenalezen";
  
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
  
  if (userPoints < 2) {
    return "Nedostatek bodů";
  }
  
  var pickedItem = pickItem(boxName);
  if (!pickedItem) return "List nenalezen";
  
  usersSheet.getRange(userRow, 3).setValue(userPoints - 2);
  
  var dropsSheet = ss.getSheetByName("Drops");
  if (!dropsSheet) {
    dropsSheet = ss.insertSheet("Drops");
    dropsSheet.appendRow(["item", "userid", "datum"]);
  }
  dropsSheet.appendRow([pickedItem.name, userid, new Date()]);
  
  return pickedItem.name + "|" + pickedItem.image;
}