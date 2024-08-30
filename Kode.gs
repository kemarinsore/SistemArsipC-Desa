function doGet(request) {
  var page = request.parameter.page || 'Login';  // Mengambil parameter 'page' dari URL, default ke 'Login'
  
  var htmlOutput;
  
  if (page === 'Index') {
    htmlOutput = HtmlService.createTemplateFromFile('Index');  // Menggunakan template Index
  } else {
    htmlOutput = HtmlService.createTemplateFromFile('Login');  // Menggunakan template Login
  }

  htmlOutput.message = '';  // Tambahkan variabel template jika diperlukan

  return htmlOutput.evaluate()
    .setTitle('C Desa - Kedung Pomahan Kulon')
    .setFaviconUrl('https://drive.google.com/uc?export=view&id=masukan_id#.ico')  // URL favicon, pastikan formatnya benar
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**  INCLUDE HTML PARTS, EG. JAVASCRIPT, CSS, OTHER HTML FILES */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function globalVariables() {
  var varArray = {
    spreadsheetId: "test",
    dataRange: "Data!A2:M",
    idRange: "Data!A2:A",
    lastCol: "M",
    insertRange: "Data!A1:M1",
    sheetID: "0",
  };
  return varArray;
}

/**  PROCESS FORM */
function processForm(formObject) {
  /**--Execute if form passes an ID and if is an existing ID */
  if (formObject.RecId && checkID(formObject.RecId)) {
    /**--Update Data */
    updateData(
      getFormValues(formObject),
      globalVariables().spreadsheetId,
      getRangeByID(formObject.RecId)
    );
  } else {
    /**--Execute if form does not pass an ID
     **--Append Form Data */
    appendData(
      getFormValues(formObject),
      globalVariables().spreadsheetId,
      globalVariables().insertRange
    );
  }

  //Return last 10 rows
  return getAllData();
}

var folder1 = DriveApp.getFolderById('test'); //ganti fd dengan id folder

/**  GET FORM VALUES AS AN ARRAY */
function getFormValues(formObject) {
  var fileUrl = "";
  /**  ADD OR REMOVE VARIABLES ACCORDING TO YOUR FORM */
  if (formObject.myFile1) {
    var blob = formObject.myFile1;
    var file = folder1.createFile(blob);
    fileUrl = file.getUrl();
  }

  var newId;
  if (formObject.RecId && checkID(formObject.RecId)) {
    newId = formObject.RecId.toString();
  } else {
    newId = (getMaxId() + 1).toString();
  }

  var values = [
    [
      newId,
      formObject.nama,
      formObject.persil,
      formObject.no,
      formObject.kelas,
      formObject.ipeda,
      formObject.luas,
      formObject.satuan,
      formObject.klasifikasi,
      formObject.waktu,
      fileUrl,
      formObject.metode,
      new Date().toLocaleString(),
    ],
  ];

  return values;
}

/** 
## CRUD FUNCTIONS ----------------------------------------------------------------------------------------
*/

/**  CREATE/ APPEND DATA */
function appendData(values, spreadsheetId, range) {
  var valueRange = Sheets.newRowData();
  valueRange.values = values;
  var appendRequest = Sheets.newAppendCellsRequest();
  appendRequest.sheetID = spreadsheetId;
  appendRequest.rows = valueRange;
  var results = Sheets.Spreadsheets.Values.append(
    valueRange,
    spreadsheetId,
    range,
    {
      valueInputOption: "RAW",
    }
  );
}

/**  READ DATA */
function readData(spreadsheetId, range) {
  var result = Sheets.Spreadsheets.Values.get(spreadsheetId, range);
  return result.values;
}

/**  UPDATE DATA */
function updateData(values, spreadsheetId, range) {
  var valueRange = Sheets.newValueRange();
  valueRange.values = values;
  var result = Sheets.Spreadsheets.Values.update(
    valueRange,
    spreadsheetId,
    range,
    {
      valueInputOption: "RAW",
    }
  );
}

/** DELETE DATA */
function deleteData(ID) {
  Logger.log("Deleting ID: " + ID);
  var rowIndex = getRowIndexByID(ID);
  Logger.log("Row index: " + rowIndex);

  if (rowIndex !== null) {
    var deleteRange = {
      sheetId: globalVariables().sheetID,
      dimension: "ROWS",
      startIndex: rowIndex - 1, // Google Sheets API is zero-indexed
      endIndex: rowIndex,
    };

    try {
      var deleteRequest = [
        {
          deleteDimension: {
            range: deleteRange,
          },
        },
      ];

      Sheets.Spreadsheets.batchUpdate(
        {
          requests: deleteRequest,
        },
        globalVariables().spreadsheetId
      );

      Logger.log("Row deleted: " + rowIndex);
      return getAllData();
    } catch (e) {
      Logger.log("Error deleting row: " + e.toString());
    }
  } else {
    Logger.log("Row index not found for ID: " + ID);
    return getAllData();
  }
}

/** 
## HELPER FUNCTIONS FOR CRUD OPERATIONS --------------------------------------------------------------
*/

/**  CHECK FOR EXISTING ID, RETURN BOOLEAN */
function checkID(ID) {
  var idList = readData(
    globalVariables().spreadsheetId,
    globalVariables().idRange
  ).reduce(function (a, b) {
    return a.concat(b);
  });
  return idList.includes(ID);
}

/**  GET DATA RANGE A1 NOTATION FOR GIVEN ID */
function getRangeByID(id) {
  if (id) {
    var idList = readData(
      globalVariables().spreadsheetId,
      globalVariables().idRange
    );
    for (var i = 0; i < idList.length; i++) {
      if (id == idList[i][0]) {
        return "Data!A" + (i + 2) + ":" + globalVariables().lastCol + (i + 2);
      }
    }
  }
}

/**  GET RECORD BY ID */
function getRecordById(id) {
  if (id && checkID(id)) {
    var result = readData(globalVariables().spreadsheetId, getRangeByID(id));
    return result;
  }
}

/**  GET ROW NUMBER FOR GIVEN ID */
function getRowIndexByID(id) {
  if (id) {
    var idList = readData(
      globalVariables().spreadsheetId,
      globalVariables().idRange
    );
    for (var i = 0; i < idList.length; i++) {
      if (id == idList[i][0]) {
        var rowIndex = parseInt(i + 2);
        return rowIndex;
      }
    }
  }
  return null;
}

/**  GET ALL RECORDS */
function getAllData() {
  var data = readData(
    globalVariables().spreadsheetId,
    globalVariables().dataRange
  );
  return data;
}

/**  GET MAX ID */
function getMaxId() {
  var idList = readData(globalVariables().spreadsheetId, globalVariables().idRange);
  var maxId = 0;
  for (var i = 0; i < idList.length; i++) {
    var currentId = parseInt(idList[i][0], 10);
    if (currentId > maxId) {
      maxId = currentId;
    }
  }
  return maxId;
}

/*GET DROPDOWN LIST KELAS */
function getDropdownListKelas(range) {
  var list = readData(globalVariables().spreadsheetId, range);
  return list;
}

function getNewHtml(e) {
  var html = HtmlService.createTemplateFromFile("Index") // uses templated html
    .evaluate()
    .getContent();
  return html;
}

function myURL() {
   return ScriptApp.getService().getUrl();
}

function cekLogin(username, password) {
   var usernames = ['admin1', 'admin2']; //user array
   var passwords = ['admin1', 'admin2']; //password array
   var cek = '';
   if (cek == '') {
      for (var i = 0; i < usernames.length; i++) {
         if (username == usernames[i] && password == passwords[i]) {
            cek = 'TRUE';
         }
      }
   }
   if (cek == '') {
      cek = 'FALSE';
   }
   return cek;
}

function doPost(e) {
   Logger.log(JSON.stringify(e));
   if (e.parameter.LoginButton == 'Login') {
      var username = e.parameter.username;
      var password = e.parameter.password;
      var validasi = cekLogin(username, password);

      if (validasi == 'TRUE') {
         var htmlOutput = HtmlService.createTemplateFromFile('Index');
         htmlOutput.username = username;
         htmlOutput.message = '';
         return htmlOutput.evaluate()
         .addMetaTag('viewport', 'width=device-width , initial-scale=1')
         .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      } else {
         var htmlOutput = HtmlService.createTemplateFromFile('Login');
         htmlOutput.message = 'Login Gagal!';
         return htmlOutput.evaluate()
         .addMetaTag('viewport', 'width=device-width , initial-scale=1')
         .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      }
   }
}