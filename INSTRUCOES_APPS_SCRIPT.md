# Configuração do Google Apps Script para Sincronização com o Google Sheets

Este documento detalha os passos necessários para configurar o Google Apps Script na sua planilha do Google Sheets, permitindo a sincronização de dados em tempo real com o seu site.

## 1. Acessar o Google Apps Script

1. Abra sua planilha do Google Sheets: [Planilha do FreteControl](https://docs.google.com/spreadsheets/d/156g1zzB_ytpcs8Jf7nCAVVMtnUcHlmjLpEml4pG12ZY/edit?usp=sharing)
2. No menu superior, clique em **Extensões** > **Apps Script**.

## 2. Inserir o Código do Script

1. Na janela do Google Apps Script, você verá um arquivo `Código.gs` (ou similar). Apague todo o conteúdo existente neste arquivo.
2. Copie o código completo do arquivo `google_apps_script.gs` que foi gerado no seu repositório local. O conteúdo é o seguinte:

```javascript
// Código para colar no Apps Script da sua planilha
// Extensões > Apps Script

function doGet(e) {
  var action = e.parameter.action;
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
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var postData = JSON.parse(e.postData.contents);
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
```

3. Cole o código no editor do Apps Script.
4. Salve o projeto clicando no ícone de disquete ou pressionando `Ctrl + S` (ou `Cmd + S` no Mac).

## 3. Implantar o Projeto como Aplicativo Web

1. No menu superior, clique em **Implantar** > **Nova implantação**.
2. Ao lado de "Tipo", clique no ícone de engrenagem e selecione **Aplicativo da Web**.
3. Configure os seguintes campos:
    * **Descrição da implantação:** `FreteControl API` (ou um nome de sua preferência)
    * **Executar como:** `Eu` (seu e-mail)
    * **Quem tem acesso:** `Qualquer pessoa`
4. Clique em **Implantar**.
5. O Google pode solicitar autorização para executar o script. Siga as instruções para conceder as permissões necessárias. Isso geralmente envolve:
    * Clicar em **Revisar permissões**.
    * Selecionar sua conta Google.
    * Clicar em **Avançado** (se aparecer).
    * Clicar em **Ir para FreteControl API (não seguro)**.
    * Clicar em **Permitir**.
6. Após a implantação bem-sucedida, você verá uma caixa de diálogo com o **URL do aplicativo da Web**. Copie este URL. Ele será algo como `https://script.google.com/macros/s/SEU_ID_UNICO/exec`.

## 4. Configurar o Site com o URL do Apps Script

1. No seu site, na aba de **Administração** (o painel que você quer melhorar).
2. No campo **API Key OU URL do Apps Script**, cole o URL do aplicativo da Web que você copiou no passo anterior.
3. Certifique-se de que o **ID da Planilha** esteja correto (ele pode ser encontrado na URL da sua planilha, por exemplo, `156g1zzB_ytpcs8Jf7nCAVVMtnUcHlmjLpEml4pG12ZY` na URL fornecida).
4. Salve as configurações no site.

## 5. Criar as Abas na Planilha

Para que o script funcione corretamente, sua planilha deve ter as seguintes abas (sheets) com os respectivos cabeçalhos na primeira linha:

### Aba: `Fretes`

| id | oc | tipoFrete | valorCombinado | motoristaId | motoristaNome | placa | dataCarregamento | dataEntrega | cliente | regiao | toneladas | numEntregas | valorTonelada | valorEntregas | valorExtraEntregas | valorTotal | observacoes | status | createdAt | updatedAt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

### Aba: `Motoristas`

| id | nome | tipo | proprietarioId | placa | cnh | telefone | veiculo | observacoes | senha | primeiroAcesso | createdAt |
|---|---|---|---|---|---|---|---|---|---|---|---|

### Aba: `Entregas`

| id | freteId | endereco | bairro | cidade | regiao | distanciaKm | numEntregas | toneladas | ordem | concluida | observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|

### Aba: `Configuracoes`

| JSON_DATA |
|---|
