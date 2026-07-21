// Código para colar no Apps Script da sua planilha
// Extensões > Apps Script
//
// IMPORTANTE: Este código suporta JSONP (parâmetro callback) para bypassar
// restrições de CORS quando o site é acessado de origens diferentes
// (ex.: GitHub Pages). Também aceita POST tanto como JSON no body
// (via fetch/sendBeacon) quanto como form-encoded (via form submission).

function doGet(e) {
  var action = e.parameter.action;
  var callback = e.parameter.callback; // Suporte a JSONP
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "get") {
    var data = {};
    
    // Buscar Fretes
    var sheetFretes = sheet.getSheetByName("Fretes");
    if (sheetFretes) {
      data.fretes = getRowsData(sheetFretes);
    }
    
    // Buscar Motoristas
    var sheetMotoristas = sheet.getSheetByName("Motoristas");
    if (sheetMotoristas) {
      data.motoristas = getRowsData(sheetMotoristas);
    }
    
    // Buscar Entregas
    var sheetEntregas = sheet.getSheetByName("Entregas");
    if (sheetEntregas) {
      data.entregas = getRowsData(sheetEntregas);
    }
    
    // Buscar Configuracoes
    var sheetConfig = sheet.getSheetByName("Configuracoes");
    if (sheetConfig) {
      var rows = sheetConfig.getDataRange().getValues();
      if (rows.length > 1 && rows[1][0]) {
        try {
          data.config = JSON.parse(rows[1][0]);
        } catch(err) {
          data.config = {};
        }
      }
    }
    
    var jsonOutput = JSON.stringify({ status: "success", data: data });
    
    // JSONP: se callback foi fornecido, envolve a resposta na função
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + jsonOutput + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(jsonOutput)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var postData = null;
  
  // Tenta ler como JSON no body (enviado via fetch/sendBeacon com text/plain)
  if (e.postData && e.postData.contents) {
    try {
      postData = JSON.parse(e.postData.contents);
    } catch(err) {
      // Não é JSON puro — pode ser form-encoded
    }
  }
  
  // Se não conseguiu parsear como JSON, tenta ler como form-encoded
  // (enviado via form submission em iframe — o campo se chama "data")
  if (!postData && e.parameter && e.parameter.data) {
    try {
      postData = JSON.parse(e.parameter.data);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid data format" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  if (!postData) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = postData.action;
  var data = postData.data;
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "save") {
    // Salvar Fretes
    if (data.fretes) {
      saveRowsData(sheet, "Fretes", data.fretes);
    }
    
    // Salvar Motoristas
    if (data.motoristas) {
      saveRowsData(sheet, "Motoristas", data.motoristas);
    }
    
    // Salvar Entregas
    if (data.entregas) {
      saveRowsData(sheet, "Entregas", data.entregas);
    }
    
    // Salvar Configuracoes
    if (data.config) {
      var sheetConfig = sheet.getSheetByName("Configuracoes");
      if (!sheetConfig) {
        sheetConfig = sheet.insertSheet("Configuracoes");
      } else {
        sheetConfig.clear();
      }
      sheetConfig.appendRow(["JSON_DATA"]);
      sheetConfig.appendRow([JSON.stringify(data.config)]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper para ler dados da planilha e converter em Array de Objetos
function getRowsData(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  
  var headers = rows[0];
  var data = [];
  
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

// Helper para salvar dados na planilha
function saveRowsData(ss, sheetName, dataList) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  if (dataList.length === 0) return;
  
  // Pegar cabeçalhos de todas as chaves únicas nos objetos
  var headers = [];
  dataList.forEach(function(item) {
    Object.keys(item).forEach(function(key) {
      if (headers.indexOf(key) === -1 && typeof item[key] !== 'object') {
        headers.push(key);
      }
    });
  });
  
  sheet.appendRow(headers);
  
  var values = dataList.map(function(item) {
    return headers.map(function(h) {
      return item[h] || "";
    });
  });
  
  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}
