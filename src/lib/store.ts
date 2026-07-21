// Store principal - usa localStorage + Google Sheets como banco de dados
import { defaultConfig, type AppConfig } from "./config";

// Tipos
export interface Motorista {
  id: string;
  nome: string;
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
  return load<AppConfig>(KEYS.config, defaultConfig);
}

export function saveConfig(cfg: AppConfig) {
  save(KEYS.config, cfg);
  // Se tiver Apps Script URL configurado como apiKey (hack temporário) ou spreadsheetId, tenta sync
  // O sync real é feito via saveToSheets
}

// Motoristas
export function getMotoristas(): Motorista[] {
  return load<Motorista[]>(KEYS.motoristas, []);
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
export function getFretes(): Frete[] {
  const fretes = load<Frete[]>(KEYS.fretes, []);
  // Ordenar por mais recente
  return [...fretes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

// Google Sheets Sync
let syncTimeout: any = null;

function queueSheetsSync() {
  if (!isBrowser()) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncToSheets();
  }, 1500);
}

export async function syncToSheets() {
  if (!isBrowser()) return;
  const cfg = getConfig();
  const gs = cfg.googleSheets;

  // Se tiver spreadsheetId e apiKey ou privateKey, tenta sincronizar
  // Para funcionar 100% no GitHub Pages, usamos Apps Script como proxy (se o user colar URL no campo apiKey)
  const data = {
    fretes: load<Frete[]>(KEYS.fretes, []),
    motoristas: load<Motorista[]>(KEYS.motoristas, []),
    entregas: load<Entrega[]>(KEYS.entregas, []),
    config: cfg,
    updatedAt: nowISO(),
  };

  // 1. Se apiKey na verdade for uma URL de Apps Script (começa com https://script.google.com), faz POST
  if (gs.apiKey && gs.apiKey.startsWith("https://script.google.com")) {
    try {
      await fetch(gs.apiKey, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", data }),
      });
      console.log("Sincronizado com Apps Script");
      return { ok: true, method: "apps_script" };
    } catch (e) {
      console.warn("Erro sync Apps Script", e);
    }
  }

  // 2. Se tiver spreadsheetId, tenta salvar em localStorage cache para export manual
  // O push real para Sheets via API precisa de backend, mas deixamos dados prontos para o usuario copiar
  save(KEYS.sheetsCache, data);

  // 3. Se tiver apiKey e spreadsheetId (modo leitura/escrita via gapi), o usuário pode usar a função import
  return { ok: true, method: "local_cache" };
}

export async function syncFromSheets(): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!isBrowser()) return { ok: false, error: "no browser" };
  const cfg = getConfig();
  const gs = cfg.googleSheets;

  // Modo 1: Apps Script URL no campo apiKey
  if (gs.apiKey && gs.apiKey.startsWith("https://script.google.com")) {
    try {
      const res = await fetch(gs.apiKey + "?action=get", { method: "GET" });
      const json = await res.json();
      if (json.data) {
        if (json.data.fretes) save(KEYS.fretes, json.data.fretes);
        if (json.data.motoristas) save(KEYS.motoristas, json.data.motoristas);
        if (json.data.entregas) save(KEYS.entregas, json.data.entregas);
        return { ok: true, count: json.data.fretes?.length || 0 };
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
          return { ok: true, count: fretes.length };
        }
      } else {
        const err = await fretesRes.text();
        return { ok: false, error: `Sheets API erro: ${fretesRes.status} ${err}` };
      }
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
