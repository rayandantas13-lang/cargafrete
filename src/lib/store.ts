// Store principal - usa localStorage + Google Sheets como banco de dados
import { defaultConfig, mergeConfigWithEnv, type AppConfig } from "./config";

// Tipos
export type TipoCadastro = "proprietario" | "funcionario";

export interface Motorista {
  id: string;
  nome: string;
  tipo: TipoCadastro;
  /** Preenchido quando o cadastro é de um funcionário. */
  proprietarioId?: string | null;
  placa: string;
  cnh?: string;
  telefone?: string;
  veiculo?: string;
  observacoes?: string;
  senha?: string;
  primeiroAcesso?: boolean;
  createdAt: string;
}

export interface Entrega {
  id: string;
  freteId: string;
  endereco: string;
  bairro?: string;
  cidade?: string;
  regiao?: string;
  distanciaKm: number;
  /** Quantidade de entregas atendidas nesta rota (uma rota pode agrupar várias entregas). */
  numEntregas?: number;
  /** Peso destinado a esta rota, em toneladas. */
  toneladas?: number;
  ordem: number;
  concluida: boolean;
  observacoes?: string;
}

export interface Anexo {
  id: string;
  freteId: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  dataUrl: string;
  createdAt: string;
}

export interface Frete {
  id: string;
  oc: string;
  /** Tipo do frete: "padrao" (cálculo automático) ou "combinado" (valor negociado). */
  tipoFrete?: "padrao" | "combinado";
  /** Valor total negociado manualmente quando tipoFrete === "combinado". */
  valorCombinado?: number;
  motoristaId?: string | null;
  motoristaNome?: string | null;
  placa?: string | null;
  dataCarregamento?: string | null;
  dataEntrega?: string | null;
  cliente?: string | null;
  regiao: string;
  toneladas: number;
  numEntregas: number;
  valorTonelada: number;
  valorEntregas: number;
  valorExtraEntregas: number;
  valorTotal: number;
  observacoes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  entregas?: Entrega[];
  anexos?: Anexo[];
}

const KEYS = {
  fretes: "fretecontrol_fretes",
  motoristas: "fretecontrol_motoristas",
  entregas: "fretecontrol_entregas",
  anexos: "fretecontrol_anexos",
  config: "fretecontrol_config",
  sheetsCache: "fretecontrol_sheets_cache",
};

// Helpers
function isBrowser() {
  return typeof window !== "undefined";
}

function load<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function nowISO() {
  return new Date().toISOString();
}

// CONFIG
export function getConfig(): AppConfig {
  // Carrega o que estiver salvo no navegador e, para os campos de conexão com a
  // planilha que estiverem em branco, aplica o fallback das variáveis de ambiente.
  // Assim um dispositivo novo (localStorage vazio) já recebe a URL do Apps Script
  // e o ID da planilha pré-configurados, sem necessidade de digitação manual.
  return mergeConfigWithEnv(load<AppConfig>(KEYS.config, defaultConfig));
}

export function saveConfig(cfg: AppConfig) {
  save(KEYS.config, cfg);
  queueSheetsSync();
}

// Motoristas
export function getMotoristas(): Motorista[] {
  // Registros antigos eram os donos dos caminhões; mantemos compatibilidade.
  return load<Motorista[]>(KEYS.motoristas, []).map((m) => ({
    ...m,
    tipo: m.tipo || "proprietario",
    proprietarioId: m.proprietarioId || null,
  }));
}

export function saveMotorista(data: Omit<Motorista, "id" | "createdAt"> & { id?: string }): Motorista {
  const lista = getMotoristas();
  if (data.id) {
    const idx = lista.findIndex((m) => m.id === data.id);
    if (idx >= 0) {
      lista[idx] = {
        ...lista[idx],
        ...data,
        senha: data.senha !== undefined ? data.senha : lista[idx].senha,
      } as Motorista;
      save(KEYS.motoristas, lista);
      queueSheetsSync();
      return lista[idx];
    }
  }
  const senhaInicial = Math.random().toString(36).substring(2, 8).toUpperCase();
  const novo: Motorista = {
    id: uid(),
    nome: data.nome,
    tipo: data.tipo || "proprietario",
    proprietarioId: data.tipo === "funcionario" ? data.proprietarioId || null : null,
    placa: data.placa,
    cnh: data.cnh,
    telefone: data.telefone,
    veiculo: data.veiculo,
    observacoes: data.observacoes,
    senha: data.senha || senhaInicial,
    primeiroAcesso: true,
    createdAt: nowISO(),
  };
  lista.push(novo);
  save(KEYS.motoristas, lista);
  queueSheetsSync();
  return novo;
}

export function updateMotoristaSenha(motoristaId: string, novaSenha: string) {
  const lista = getMotoristas();
  const idx = lista.findIndex((m) => m.id === motoristaId);
  if (idx >= 0) {
    lista[idx].senha = novaSenha;
    lista[idx].primeiroAcesso = false;
    save(KEYS.motoristas, lista);
    queueSheetsSync();
  }
}

export function deleteMotorista(id: string) {
  const lista = getMotoristas().filter((m) => m.id !== id);
  save(KEYS.motoristas, lista);
  queueSheetsSync();
}

// Fretes
export interface SessaoAcesso {
  role: "admin" | "proprietario" | "motorista";
  id?: string;
}

export function getFretes(): Frete[] {
  const fretes = load<Frete[]>(KEYS.fretes, []);
  return [...fretes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Admin vê tudo; proprietário vê seus fretes e os de seus funcionários; funcionário só os próprios. */
export function getFretesVisiveis(sessao: SessaoAcesso): Frete[] {
  const todos = getFretes();
  if (sessao.role === "admin" || !sessao.id) return sessao.role === "admin" ? todos : [];
  const motoristas = getMotoristas();
  const usuario = motoristas.find((m) => m.id === sessao.id);
  if (!usuario) return [];
  if (usuario.tipo === "proprietario") {
    const ids = new Set(motoristas.filter((m) => m.id === usuario.id || m.proprietarioId === usuario.id).map((m) => m.id));
    return todos.filter((f) => f.motoristaId && ids.has(f.motoristaId));
  }
  return todos.filter((f) => f.motoristaId === usuario.id);
}

export function getFreteById(id: string): (Frete & { entregas: Entrega[]; anexos: Anexo[] }) | null {
  const fretes = load<Frete[]>(KEYS.fretes, []);
  const frete = fretes.find((f) => f.id === id);
  if (!frete) return null;
  const entregas = getEntregasByFreteId(id);
  const anexos = getAnexosByFreteId(id);
  return { ...frete, entregas, anexos };
}

export function saveFrete(data: {
  id?: string;
  oc: string;
  tipoFrete?: "padrao" | "combinado";
  valorCombinado?: number;
  motoristaId?: string | null;
  motoristaNome?: string | null;
  placa?: string | null;
  cliente?: string | null;
  regiao: string;
  toneladas: number;
  numEntregas: number;
  valorTonelada: number;
  valorEntregas: number;
  valorExtraEntregas: number;
  valorTotal: number;
  dataCarregamento?: string | null;
  dataEntrega?: string | null;
  observacoes?: string | null;
  status?: string;
  entregas?: Omit<Entrega, "id" | "freteId" | "ordem" | "concluida">[];
  anexos?: Omit<Anexo, "id" | "freteId" | "createdAt">[];
}): Frete {
  const fretes = load<Frete[]>(KEYS.fretes, []);
  let frete: Frete;

  if (data.id) {
    const idx = fretes.findIndex((f) => f.id === data.id);
    if (idx >= 0) {
      frete = {
        ...fretes[idx],
        oc: data.oc,
        tipoFrete: data.tipoFrete || "padrao",
        valorCombinado: data.valorCombinado,
        motoristaId: data.motoristaId ?? null,
        motoristaNome: data.motoristaNome ?? null,
        placa: data.placa ?? null,
        cliente: data.cliente ?? null,
        regiao: data.regiao,
        toneladas: data.toneladas,
        numEntregas: data.numEntregas,
        valorTonelada: data.valorTonelada,
        valorEntregas: data.valorEntregas,
        valorExtraEntregas: data.valorExtraEntregas,
        valorTotal: data.valorTotal,
        dataCarregamento: data.dataCarregamento ?? null,
        dataEntrega: data.dataEntrega ?? null,
        observacoes: data.observacoes ?? null,
        status: data.status || fretes[idx].status,
        updatedAt: nowISO(),
      };
      fretes[idx] = frete;
    } else {
      // cria novo mesmo com id fornecido
      frete = {
        id: data.id,
        oc: data.oc,
        tipoFrete: data.tipoFrete || "padrao",
        valorCombinado: data.valorCombinado,
        motoristaId: data.motoristaId ?? null,
        motoristaNome: data.motoristaNome ?? null,
        placa: data.placa ?? null,
        cliente: data.cliente ?? null,
        regiao: data.regiao,
        toneladas: data.toneladas,
        numEntregas: data.numEntregas,
        valorTonelada: data.valorTonelada,
        valorEntregas: data.valorEntregas,
        valorExtraEntregas: data.valorExtraEntregas,
        valorTotal: data.valorTotal,
        dataCarregamento: data.dataCarregamento ?? null,
        dataEntrega: data.dataEntrega ?? null,
        observacoes: data.observacoes ?? null,
        status: data.status || "pendente",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      fretes.push(frete);
    }
  } else {
    frete = {
      id: uid(),
      oc: data.oc,
      tipoFrete: data.tipoFrete || "padrao",
      valorCombinado: data.valorCombinado,
      motoristaId: data.motoristaId ?? null,
      motoristaNome: data.motoristaNome ?? null,
      placa: data.placa ?? null,
      cliente: data.cliente ?? null,
      regiao: data.regiao,
      toneladas: data.toneladas,
      numEntregas: data.numEntregas,
      valorTonelada: data.valorTonelada,
      valorEntregas: data.valorEntregas,
      valorExtraEntregas: data.valorExtraEntregas,
      valorTotal: data.valorTotal,
      dataCarregamento: data.dataCarregamento ?? null,
      dataEntrega: data.dataEntrega ?? null,
      observacoes: data.observacoes ?? null,
      status: data.status || "pendente",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    fretes.push(frete);
  }

  save(KEYS.fretes, fretes);

  // Entregas
  if (data.entregas) {
    // remover antigas
    const todasEntregas = load<Entrega[]>(KEYS.entregas, []).filter((e) => e.freteId !== frete.id);
    const novasEntregas: Entrega[] = data.entregas
      .filter((e) => e.endereco?.trim())
      .map((e, i) => ({
        id: uid(),
        freteId: frete.id,
        endereco: e.endereco,
        bairro: (e as any).bairro || "",
        cidade: (e as any).cidade || "",
        regiao: (e as any).regiao || frete.regiao,
        distanciaKm: (e as any).distanciaKm || 0,
        numEntregas: (e as any).numEntregas || 1,
        toneladas: (e as any).toneladas || 0,
        ordem: i,
        concluida: false,
        observacoes: (e as any).observacoes || "",
      }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .map((e, i) => ({ ...e, ordem: i }));

    save(KEYS.entregas, [...todasEntregas, ...novasEntregas]);
  }

  // Anexos
  if (data.anexos) {
    const todosAnexos = load<Anexo[]>(KEYS.anexos, []);
    for (const a of data.anexos) {
      todosAnexos.push({
        id: uid(),
        freteId: frete.id,
        nomeOriginal: a.nomeOriginal,
        mimeType: a.mimeType,
        tamanhoBytes: a.tamanhoBytes,
        dataUrl: a.dataUrl,
        createdAt: nowISO(),
      });
    }
    save(KEYS.anexos, todosAnexos);
  }

  queueSheetsSync();
  return frete;
}

export function updateFreteStatus(id: string, status: string) {
  const fretes = load<Frete[]>(KEYS.fretes, []);
  const idx = fretes.findIndex((f) => f.id === id);
  if (idx >= 0) {
    fretes[idx].status = status;
    fretes[idx].updatedAt = nowISO();
    save(KEYS.fretes, fretes);
    queueSheetsSync();
  }
}

export function deleteFrete(id: string) {
  save(KEYS.fretes, load<Frete[]>(KEYS.fretes, []).filter((f) => f.id !== id));
  save(KEYS.entregas, load<Entrega[]>(KEYS.entregas, []).filter((e) => e.freteId !== id));
  save(KEYS.anexos, load<Anexo[]>(KEYS.anexos, []).filter((a) => a.freteId !== id));
  queueSheetsSync();
}

// Entregas
export function getEntregasByFreteId(freteId: string): Entrega[] {
  return load<Entrega[]>(KEYS.entregas, [])
    .filter((e) => e.freteId === freteId)
    .sort((a, b) => a.ordem - b.ordem);
}

export function updateEntregasOrdenacao(freteId: string, entregas: Entrega[]) {
  const todas = load<Entrega[]>(KEYS.entregas, []).filter((e) => e.freteId !== freteId);
  const atualizadas = entregas.map((e, i) => ({ ...e, ordem: i }));
  save(KEYS.entregas, [...todas, ...atualizadas]);
  queueSheetsSync();
}

export function toggleEntregaConcluida(entregaId: string) {
  const todas = load<Entrega[]>(KEYS.entregas, []);
  const idx = todas.findIndex((e) => e.id === entregaId);
  if (idx >= 0) {
    todas[idx].concluida = !todas[idx].concluida;
    save(KEYS.entregas, todas);
    queueSheetsSync();
  }
}

// Anexos
export function getAnexosByFreteId(freteId: string): Anexo[] {
  return load<Anexo[]>(KEYS.anexos, []).filter((a) => a.freteId === freteId);
}

export function deleteAnexo(id: string) {
  save(KEYS.anexos, load<Anexo[]>(KEYS.anexos, []).filter((a) => a.id !== id));
  queueSheetsSync();
}

// ---------------------------------------------------------------------------
// Google Sheets Sync — CORRIGIDO para funcionar com CORS no GitHub Pages
// ---------------------------------------------------------------------------
// PROBLEMA: Google Apps Script Web Apps causam erro CORS quando chamados via
// fetch() de uma origem diferente (ex.: rayandantas13-lang.github.io).
// SOLUÇÃO:
//   • POST (enviar dados): usar Content-Type: text/plain + mode: 'no-cors'
//     para evitar preflight. O dado chega ao Apps Script com sucesso.
//   • GET (receber dados): usar JSONP (tag <script>) que bypassa CORS
//     completamente. O Apps Script precisa suportar parâmetro `callback`.
// ---------------------------------------------------------------------------

let syncTimeout: any = null;

function queueSheetsSync() {
  if (!isBrowser()) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncToSheets();
  }, 1500);
}

/**
 * JSONP — carrega dados do Apps Script via tag <script>, bypassando CORS.
 * O Apps Script deve suportar o parâmetro `callback` no doGet().
 */
function jsonpFetch(url: string, timeoutMs = 15000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) { reject(new Error("no browser")); return; }

    const callbackName =
      "fretecontrol_jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      try {
        delete (window as any)[callbackName];
      } catch { /* ignore */ }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error("JSONP timeout"));
      }
    }, timeoutMs);

    (window as any)[callbackName] = (data: any) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      }
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = url + separator + "callback=" + callbackName;
    script.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error("JSONP request failed"));
      }
    };

    document.head.appendChild(script);
  });
}

/**
 * Busca dados do Apps Script, tentando primeiro JSONP (bypassa CORS)
 * e depois fetch com redirect: follow como fallback.
 */
async function fetchFromAppsScript(baseUrl: string): Promise<any> {
  // 1. JSONP — bypassa CORS completamente (requer Apps Script atualizado com callback)
  try {
    const data = await jsonpFetch(baseUrl + "?action=get");
    if (data && data.status === "success") return data;
  } catch {
    // JSONP falhou — pode ser que o script antigo não suporte callback
  }

  // 2. Fallback: fetch com redirect (funciona em alguns navegadores)
  try {
    const res = await fetch(baseUrl + "?action=get", {
      method: "GET",
      redirect: "follow",
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.status === "success") return json;
    }
  } catch {
    // fetch também falhou
  }

  throw new Error(
    "Não foi possível conectar ao Apps Script. Verifique se o script está atualizado (com suporte a callback) e implantado como 'Qualquer pessoa'."
  );
}

export async function syncToSheets() {
  if (!isBrowser()) return;
  const cfg = getConfig();
  const gs = cfg.googleSheets;

  // Monta os dados atuais do localStorage para enviar
  const data = {
    fretes: load<Frete[]>(KEYS.fretes, []),
    motoristas: load<Motorista[]>(KEYS.motoristas, []),
    entregas: load<Entrega[]>(KEYS.entregas, []),
    config: cfg,
    updatedAt: nowISO(),
  };

  // 1. Se apiKey for URL do Apps Script, faz POST com mode: 'no-cors'
  //    Content-Type: text/plain evita preflight CORS.
  if (gs.apiKey && gs.apiKey.startsWith("https://script.google.com")) {
    try {
      await fetch(gs.apiKey, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "save", data }),
        mode: "no-cors",
      });
      // Com mode: 'no-cors', a resposta é opaca (status 0), mas o dado foi enviado.
      console.log("Sincronizado com Apps Script (no-cors POST)");
      return { ok: true, method: "apps_script" };
    } catch (e) {
      console.warn("Erro sync Apps Script POST", e);
    }
  }

  // 2. Se tiver spreadsheetId, salva em localStorage cache para export manual
  save(KEYS.sheetsCache, data);

  // 3. Modo local
  return { ok: true, method: "local_cache" };
}

export async function syncFromSheets(): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!isBrowser()) return { ok: false, error: "no browser" };
  const cfg = getConfig();
  const gs = cfg.googleSheets;

  // Modo 1: Apps Script URL no campo apiKey — usa JSONP para bypassar CORS
  if (gs.apiKey && gs.apiKey.startsWith("https://script.google.com")) {
    try {
      const json = await fetchFromAppsScript(gs.apiKey);
      if (json && json.data) {
        // Só sobrescreve localStorage se a planilha tiver dados de verdade.
        // Evita apagar tudo quando a planilha volta vazia.
        const hasAny =
          (Array.isArray(json.data.fretes) && json.data.fretes.length > 0) ||
          (Array.isArray(json.data.motoristas) && json.data.motoristas.length > 0) ||
          (Array.isArray(json.data.entregas) && json.data.entregas.length > 0) ||
          (json.data.config && typeof json.data.config === "object");

        if (hasAny) {
          if (Array.isArray(json.data.fretes)) save(KEYS.fretes, json.data.fretes);
          if (Array.isArray(json.data.motoristas)) save(KEYS.motoristas, json.data.motoristas);
          if (Array.isArray(json.data.entregas)) save(KEYS.entregas, json.data.entregas);

          if (json.data.config && typeof json.data.config === "object") {
            const currentConfig = getConfig();
            const mergedConfig = {
              ...json.data.config,
              googleSheets: {
                ...json.data.config.googleSheets,
                apiKey: currentConfig.googleSheets.apiKey || json.data.config.googleSheets?.apiKey || "",
                spreadsheetId: currentConfig.googleSheets.spreadsheetId || json.data.config.googleSheets?.spreadsheetId || "",
              }
            };
            save(KEYS.config, mergedConfig);
          }
        }
        return { ok: true, count: Array.isArray(json.data.fretes) ? json.data.fretes.length : 0 };
      }
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Modo 2: API Key + SpreadsheetID - leitura direta da planilha
  if (gs.apiKey && gs.spreadsheetId && !gs.apiKey.startsWith("https://")) {
    try {
      // Tenta ler as abas Fretes, Motoristas
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${gs.spreadsheetId}/values`;
      
      let count = 0;
      const fretesRes = await fetch(`${base}/${encodeURIComponent(gs.sheetFretes || "Fretes")}?key=${gs.apiKey}`);
      if (fretesRes.ok) {
        const fretesData = await fretesRes.json();
        const rows = fretesData.values || [];
        if (rows.length > 1) {
          // Primeira linha é cabeçalho
          const header = rows[0];
          const fretes: Frete[] = rows.slice(1).map((row: any[]) => {
            const obj: any = {};
            header.forEach((h: string, i: number) => {
              obj[h] = row[i];
            });
            // Mapear para formato Frete
            return {
              id: obj.id || uid(),
              oc: obj.oc || obj.OC || "",
              motoristaNome: obj.motoristaNome || obj.motorista || "",
              placa: obj.placa || "",
              cliente: obj.cliente || "",
              regiao: obj.regiao || "goiania",
              toneladas: parseFloat(obj.toneladas) || 0,
              numEntregas: parseInt(obj.numEntregas) || 0,
              valorTonelada: parseFloat(obj.valorTonelada) || 0,
              valorEntregas: parseFloat(obj.valorEntregas) || 0,
              valorExtraEntregas: parseFloat(obj.valorExtraEntregas) || 0,
              valorTotal: parseFloat(obj.valorTotal) || 0,
              status: obj.status || "pendente",
              dataCarregamento: obj.dataCarregamento || "",
              dataEntrega: obj.dataEntrega || "",
              observacoes: obj.observacoes || "",
              createdAt: obj.createdAt || nowISO(),
              updatedAt: obj.updatedAt || nowISO(),
            };
          });
          save(KEYS.fretes, fretes);
          count = fretes.length;
        }
      } else {
        const err = await fretesRes.text();
        return { ok: false, error: `Sheets API erro: ${fretesRes.status} ${err}` };
      }

      // Tenta ler a aba Configuracoes se houver no Modo 2
      try {
        const configRes = await fetch(`${base}/Configuracoes?key=${gs.apiKey}`);
        if (configRes.ok) {
          const configData = await configRes.json();
          const rows = configData.values || [];
          if (rows.length > 1 && rows[1][0]) {
            const parsedConfig = JSON.parse(rows[1][0]);
            if (parsedConfig && typeof parsedConfig === "object") {
              const currentConfig = getConfig();
              const mergedConfig = {
                ...parsedConfig,
                googleSheets: {
                  ...parsedConfig.googleSheets,
                  apiKey: currentConfig.googleSheets.apiKey || parsedConfig.googleSheets.apiKey || "",
                  spreadsheetId: currentConfig.googleSheets.spreadsheetId || parsedConfig.googleSheets.spreadsheetId || "",
                }
              };
              save(KEYS.config, mergedConfig);
            }
          }
        }
      } catch (err) {
        console.warn("Erro ao ler aba Configuracoes", err);
      }

      return { ok: true, count };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  return { ok: false, error: "Configure API Key ou Apps Script URL no Admin" };
}

export function exportAllData() {
  return {
    fretes: load<Frete[]>(KEYS.fretes, []),
    motoristas: load<Motorista[]>(KEYS.motoristas, []),
    entregas: load<Entrega[]>(KEYS.entregas, []),
    anexos: load<Anexo[]>(KEYS.anexos, []),
    config: getConfig(),
    exportadoEm: nowISO(),
  };
}

export function importData(data: any) {
  if (data.fretes) save(KEYS.fretes, data.fretes);
  if (data.motoristas) save(KEYS.motoristas, data.motoristas);
  if (data.entregas) save(KEYS.entregas, data.entregas);
  if (data.anexos) save(KEYS.anexos, data.anexos);
}

export function clearAllData() {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
