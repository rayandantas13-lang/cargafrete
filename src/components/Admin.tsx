"use client";

import { useEffect, useState } from "react";
import type { AppConfig, Municipio } from "@/lib/config";
import { defaultConfig } from "@/lib/config";
import { getConfig, saveConfig, exportAllData, importData, clearAllData, syncFromSheets, syncToSheets } from "@/lib/store";

export default function Admin() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [cfg, setCfg] = useState<AppConfig>(defaultConfig);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    // Verifica localStorage para admin
    const token = localStorage.getItem("admin_token");
    if (token && token.startsWith("YWRtaW46")) {
      setAutenticado(true);
    } else {
      setAutenticado(false);
    }
    setCfg(getConfig());
  }, []);

  const login = () => {
    setErroLogin("");
    const currentCfg = getConfig();
    if (senha === currentCfg.senhaAdmin) {
      const token = btoa(`admin:${Date.now()}`);
      localStorage.setItem("admin_token", token);
      setAutenticado(true);
    } else {
      setErroLogin("Senha incorreta");
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setAutenticado(false);
    setSenha("");
  };

  const salvar = () => {
    setSalvando(true);
    saveConfig(cfg);
    setMsg("✓ Configurações salvas com sucesso!");
    setSalvando(false);
    setTimeout(() => setMsg(""), 4000);
  };

  const exportar = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fretes-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importData(data);
        setMsg("✓ Dados importados com sucesso!");
      } catch {
        setMsg("✗ Erro ao importar JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleSyncFromSheets = async () => {
    setSyncStatus("Sincronizando...");
    const res = await syncFromSheets();
    if (res.ok) {
      setSyncStatus(`✓ ${res.count || 0} fretes carregados da planilha! Recarregue a página.`);
    } else {
      setSyncStatus(`✗ Erro: ${res.error}`);
    }
    setTimeout(() => setSyncStatus(""), 5000);
  };

  const handleSyncToSheets = async () => {
    setSyncStatus("Enviando...");
    const res = await syncToSheets();
    setSyncStatus(`✓ Dados preparados para Sheets (${(res as any)?.method || 'ok'})`);
    setTimeout(() => setSyncStatus(""), 4000);
  };

  const handleClear = () => {
    if (!confirm("Apagar TODOS os dados?")) return;
    clearAllData();
    setCfg(defaultConfig);
    setMsg("🗑️ Dados apagados");
  };

  // ---- Municípios dinâmicos ----
  const municipios = cfg.municipios || [];

  const updateMunicipio = (i: number, patch: Partial<Municipio>) => {
    const novos = [...municipios];
    novos[i] = { ...novos[i], ...patch };
    setCfg({ ...cfg, municipios: novos });
  };

  const addMunicipio = () => {
    const novo: Municipio = {
      value: "municipio_" + Date.now().toString(36),
      label: "Novo Município",
      valorEntrega: 0,
      valorExtra: cfg.tarifas.valorExtraApos7Entregas,
      limiteEntregas: cfg.tarifas.limiteEntregas,
      distanciaKm: 0,
      combinado: false,
    };
    setCfg({ ...cfg, municipios: [...municipios, novo] });
  };

  const removeMunicipio = (i: number) => {
    if (!confirm("Remover este município das configurações?")) return;
    setCfg({ ...cfg, municipios: municipios.filter((_, idx) => idx !== i) });
  };

  if (autenticado === null) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-500">Verificando...</div></div>;

  if (!autenticado) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔒</div>
            <h1 className="text-2xl font-bold">Área Administrativa</h1>
            <p className="text-sm text-slate-500 mt-1">Senha para acessar configurações</p>
          </div>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="Senha" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-3 focus:ring-2 focus:ring-blue-500" autoFocus />
          {erroLogin && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">⚠️ {erroLogin}</div>}
          <button onClick={login} disabled={!senha} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-2.5 rounded-lg font-medium">Entrar</button>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border"><p className="text-xs text-slate-600 text-center">Senha padrão: <code className="bg-white px-2 py-0.5 rounded border">admin123</code></p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold">⚙️ Administração</h1></div>
        <button onClick={logout} className="text-slate-600 hover:text-slate-900 text-sm bg-white border border-slate-200 px-4 py-2.5 rounded-lg w-full sm:w-auto text-center font-medium transition-all">🚪 Sair</button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2 text-sm">{msg}</div>}
      {syncStatus && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-2 text-sm">{syncStatus}</div>}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">🔐 Senha Admin</h2>
        <input type="password" value={cfg.senhaAdmin} onChange={(e) => setCfg({ ...cfg, senhaAdmin: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 max-w-md" />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">💰 Valores das Tarifas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">Valor por Tonelada (R$)</label><input type="number" step="0.01" value={cfg.tarifas.valorTonelada} onChange={(e) => setCfg({ ...cfg, tarifas: { ...cfg.tarifas, valorTonelada: parseFloat(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" /></div>
          <div><label className="block text-sm font-medium mb-1">Valor extra padrão (novos municípios)</label><input type="number" step="0.01" value={cfg.tarifas.valorExtraApos7Entregas} onChange={(e) => setCfg({ ...cfg, tarifas: { ...cfg.tarifas, valorExtraApos7Entregas: parseFloat(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" /></div>
          <div><label className="block text-sm font-medium mb-1">Limite de entregas padrão (novos municípios)</label><input type="number" value={cfg.tarifas.limiteEntregas} onChange={(e) => setCfg({ ...cfg, tarifas: { ...cfg.tarifas, limiteEntregas: parseInt(e.target.value) || 7 } })} className="w-full border rounded-lg px-3 py-2" /></div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 border-t pt-4">
          <div>
            <h3 className="font-medium">📍 Municípios e Tarifas por Entrega</h3>
            <p className="text-xs text-slate-500 mt-1">Cada município tem seu valor por entrega, seu limite (X) e seu valor extra acima de X. Marque <strong>Combinado</strong> para destinos de valor negociado (sem cálculo automático).</p>
          </div>
          <button onClick={addMunicipio} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto text-center transition whitespace-nowrap">+ Adicionar município</button>
        </div>

        <div className="space-y-3">
          {municipios.map((m, i) => (
            <div key={m.value} className={`border rounded-lg p-4 space-y-3 ${m.combinado ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <input value={m.label} onChange={(e) => updateMunicipio(i, { label: e.target.value })} placeholder="Nome do município" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 font-medium bg-white" />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={m.combinado} onChange={(e) => updateMunicipio(i, { combinado: e.target.checked })} className="w-4 h-4" />
                    🤝 Combinado
                  </label>
                  <button onClick={() => removeMunicipio(i)} className="text-red-600 hover:text-red-800 text-sm whitespace-nowrap">Remover</button>
                </div>
              </div>
              {m.combinado ? (
                <p className="text-xs text-amber-700">Destino de valor combinado: o valor do frete será digitado manualmente no cadastro do frete (não há cálculo automático de entregas).</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Valor por entrega (R$)</label><input type="number" step="0.01" value={m.valorEntrega} onChange={(e) => updateMunicipio(i, { valorEntrega: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Limite de entregas (X)</label><input type="number" value={m.limiteEntregas} onChange={(e) => updateMunicipio(i, { limiteEntregas: parseInt(e.target.value) || 0 })} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Valor extra acima de X (R$)</label><input type="number" step="0.01" value={m.valorExtra} onChange={(e) => updateMunicipio(i, { valorExtra: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Distância (km)</label><input type="number" step="0.1" value={m.distanciaKm} onChange={(e) => updateMunicipio(i, { distanciaKm: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white" /></div>
                </div>
              )}
            </div>
          ))}
          {municipios.length === 0 && <p className="text-sm text-slate-400">Nenhum município cadastrado. Clique em "Adicionar município".</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">🔗 Integrações</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
          <p className="font-bold">Como configurar a integração com Google Sheets:</p>

          <div className="bg-white rounded p-3 border">
            <p className="font-semibold">Opção 1: Mais simples - API Key (somente leitura da planilha)</p>
            <ol className="list-decimal ml-5 space-y-1 mt-1">
              <li>Crie planilha no Google Sheets, copie ID da URL: docs.google.com/spreadsheets/d/ID_AQUI/edit</li>
              <li>Em console.cloud.google.com - APIs - Ative Sheets API - Credenciais - Criar API Key</li>
              <li>Cole API Key e Spreadsheet ID abaixo</li>
              <li>Deixe planilha com acesso "Qualquer pessoa com link pode visualizar"</li>
              <li>Clique em Sincronizar da Planilha para carregar</li>
            </ol>
          </div>

          <div className="bg-white rounded p-3 border">
            <p className="font-semibold">Opção 2: Completa (recomendada) - Apps Script (leitura e escrita total)</p>
            <ol className="list-decimal ml-5 space-y-1 mt-1">
              <li>Na planilha: <b>Extensões - Apps Script</b></li>
              <li>Apague código e cole o código fornecido abaixo</li>
              <li>Clique em <b>Implantar - Nova implantação</b> - Tipo: <b>App da Web</b> - Acesso: <b>Qualquer pessoa</b> - Implantar</li>
              <li>Copie a URL do App e cole no campo <b>API Key</b> abaixo (sim, no campo API Key!)</li>
              <li>Pronto! O app salva direto na planilha.</li>
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">🔑 API Key OU URL do Apps Script (cole URL https://script.google.com/... aqui para modo completo)</label>
            <input value={cfg.googleSheets.apiKey} onChange={(e) => setCfg({ ...cfg, googleSheets: { ...cfg.googleSheets, apiKey: e.target.value } })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" placeholder="AIzaSy... OU https://script.google.com/macros/s/.../exec" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">📄 ID da Planilha</label>
            <input value={cfg.googleSheets.spreadsheetId} onChange={(e) => setCfg({ ...cfg, googleSheets: { ...cfg.googleSheets, spreadsheetId: e.target.value } })} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="1aBcDeFg..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">📑 Nome da aba Fretes</label>
            <input value={cfg.googleSheets.sheetFretes} onChange={(e) => setCfg({ ...cfg, googleSheets: { ...cfg.googleSheets, sheetFretes: e.target.value } })} className="w-full border rounded-lg px-3 py-2" placeholder="Fretes" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <button onClick={handleSyncFromSheets} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto text-center transition">📥 Sincronizar da Planilha</button>
          <button onClick={handleSyncToSheets} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto text-center transition">📤 Enviar para Planilha</button>
          <button onClick={exportar} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto text-center transition">💾 Exportar JSON</button>
          <label className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer w-full sm:w-auto text-center block transition">📂 Importar JSON<input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
          <button onClick={handleClear} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto text-center transition">🗑️ Limpar dados</button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium">📜 Código Apps Script (cole no Apps Script da planilha)</summary>
          <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">{`// Código para colar no Apps Script da sua planilha
// Extensões > Apps Script

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'get') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const fretesSheet = ss.getSheetByName('Fretes') || ss.insertSheet('Fretes');
    const motoristasSheet = ss.getSheetByName('Motoristas') || ss.insertSheet('Motoristas');
    
    // Ler Fretes (se tiver cabeçalho)
    const fretesData = fretesSheet.getDataRange().getValues();
    // Implementação simples: retorna tudo como JSON salvo em uma célula ou Properties
    
    // Para simplificar, usamos PropertiesService para armazenar JSON completo
    const props = PropertiesService.getScriptProperties();
    const data = {
      fretes: JSON.parse(props.getProperty('fretes') || '[]'),
      motoristas: JSON.parse(props.getProperty('motoristas') || '[]'),
      entregas: JSON.parse(props.getProperty('entregas') || '[]')
    };
    
    return ContentService.createTextOutput(JSON.stringify({ok:true, data:data}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ok:false}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    
    if (body.data) {
      if (body.data.fretes) props.setProperty('fretes', JSON.stringify(body.data.fretes));
      if (body.data.motoristas) props.setProperty('motoristas', JSON.stringify(body.data.motoristas));
      if (body.data.entregas) props.setProperty('entregas', JSON.stringify(body.data.entregas));
      
      // Também escreve em abas visíveis para conferência
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName('Fretes');
      if (!sheet) sheet = ss.insertSheet('Fretes');
      sheet.clear();
      if (body.data.fretes && body.data.fretes.length > 0) {
        const headers = ['id','oc','motoristaNome','placa','cliente','regiao','toneladas','numEntregas','valorTotal','status','dataCarregamento'];
        sheet.appendRow(headers);
        body.data.fretes.forEach(f => {
          sheet.appendRow([f.id, f.oc, f.motoristaNome, f.placa, f.cliente, f.regiao, f.toneladas, f.numEntregas, f.valorTotal, f.status, f.dataCarregamento]);
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`}</pre>
        </details>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">📍 Origem Padrão</h2>
        <input value={cfg.origemRota} onChange={(e) => setCfg({ ...cfg, origemRota: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Goiânia, GO" />
      </div>

      <div className="flex justify-end gap-3 pb-8">
        <button onClick={salvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-lg font-medium shadow-sm w-full sm:w-auto text-center">{salvando ? "Salvando..." : "💾 Salvar Configurações"}</button>
      </div>
    </div>
  );
}
