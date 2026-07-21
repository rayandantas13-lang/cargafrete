// ---------------------------------------------------------------------------
// Municípios dinâmicos
// ---------------------------------------------------------------------------
// Cada município tem seu próprio valor por entrega, seu limite de entregas (X)
// e seu valor extra acima desse limite. Municípios marcados como `combinado`
// (ex.: destinos longes como Brasília, Anápolis, Mato Grosso) não entram no
// cálculo automático: o valor do frete é negociado e digitado manualmente.

export interface Municipio {
  /** Identificador estável (slug), ex.: "goiania". */
  value: string;
  /** Nome exibido, ex.: "Goiânia". */
  label: string;
  /** Valor (R$) cobrado por entrega neste município. */
  valorEntrega: number;
  /** Valor (R$) por entrega acima do limite `limiteEntregas`. */
  valorExtra: number;
  /** Limite de entregas (X) antes de cobrar o valor extra. */
  limiteEntregas: number;
  /** Distância aproximada do centro de Goiânia (km) - apenas referência. */
  distanciaKm: number;
  /** true = destino negociado ("combinado"); sem cálculo automático de entregas. */
  combinado: boolean;
}

export const defaultMunicipios: Municipio[] = [
  { value: "goiania", label: "Goiânia (capital)", valorEntrega: 25, valorExtra: 10, limiteEntregas: 7, distanciaKm: 0, combinado: false },
  { value: "trindade", label: "Trindade", valorEntrega: 45, valorExtra: 10, limiteEntregas: 7, distanciaKm: 18, combinado: false },
  { value: "senador_canedo", label: "Senador Canedo", valorEntrega: 50, valorExtra: 10, limiteEntregas: 7, distanciaKm: 22, combinado: false },
  { value: "goianira", label: "Goianira", valorEntrega: 55, valorExtra: 10, limiteEntregas: 7, distanciaKm: 28, combinado: false },
  { value: "abadia", label: "Abadia de Goiás", valorEntrega: 40, valorExtra: 10, limiteEntregas: 7, distanciaKm: 15, combinado: false },
  // Destinos longes - valor combinado (negociado manualmente)
  { value: "anapolis", label: "Anápolis", valorEntrega: 0, valorExtra: 0, limiteEntregas: 7, distanciaKm: 53, combinado: true },
  { value: "brasilia", label: "Brasília (DF)", valorEntrega: 0, valorExtra: 0, limiteEntregas: 7, distanciaKm: 210, combinado: true },
  { value: "mato_grosso", label: "Mato Grosso", valorEntrega: 0, valorExtra: 0, limiteEntregas: 7, distanciaKm: 900, combinado: true },
];

// Mantidos por compatibilidade (derivados dos municípios padrão).
export const regioes = defaultMunicipios.map((m) => ({ value: m.value, label: m.label }));
export const distanciasPorRegiao: Record<string, number> = Object.fromEntries(
  defaultMunicipios.map((m) => [m.value, m.distanciaKm]),
);

// ---------------------------------------------------------------------------
// Tarifas e configuração
// ---------------------------------------------------------------------------

export interface TarifasConfig {
  /** Valor (R$) por tonelada (global). */
  valorTonelada: number;
  /** Valor extra padrão usado ao criar um NOVO município. */
  valorExtraApos7Entregas: number;
  /** Limite de entregas padrão usado ao criar um NOVO município. */
  limiteEntregas: number;
}

export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  sheetFretes: string;
  sheetMotoristas: string;
  serviceAccountEmail: string;
  privateKey: string;
}

export interface AppConfig {
  tarifas: TarifasConfig;
  municipios: Municipio[];
  googleSheets: GoogleSheetsConfig;
  senhaAdmin: string;
  origemRota: string;
}

/**
 * Valores de conexão com o Google Sheets lidos de Variáveis de Ambiente públicas
 * do Next.js (`NEXT_PUBLIC_...`). Elas são embutidas no build, então qualquer
 * dispositivo (celular, tablet, desktop) já abre o app com a planilha configurada,
 * sem que o usuário precise digitar nada manualmente.
 */
function readEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

export const googleSheetsEnvDefaults = {
  /** URL do Google Apps Script (termina em /exec) OU API Key do Google Sheets. */
  apiKey: readEnv(process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY),
  /** ID da planilha do Google Sheets (trecho da URL da planilha). */
  spreadsheetId: readEnv(process.env.NEXT_PUBLIC_SPREADSHEET_ID),
};

/**
 * Garante que a configuração tenha a lista de municípios. Se ela não existir
 * (config antiga salva no navegador), migra os valores por região antigamente
 * usados, preservando o que o usuário já havia personalizado.
 */
export function normalizeConfig(cfg: AppConfig): AppConfig {
  let municipios = cfg.municipios;
  if (!municipios || municipios.length === 0) {
    const t = cfg.tarifas as any;
    const legacy: Record<string, string> = {
      goiania: "valorEntregaGoiania",
      trindade: "valorEntregaTrindade",
      senador_canedo: "valorEntregaSenadorCanedo",
      goianira: "valorEntregaGoianira",
      abadia: "valorEntregaAbadia",
    };
    municipios = defaultMunicipios.map((m) => {
      const legacyKey = legacy[m.value];
      const legacyValor = legacyKey ? t?.[legacyKey] : undefined;
      return {
        ...m,
        valorEntrega: typeof legacyValor === "number" ? legacyValor : m.valorEntrega,
        valorExtra: typeof t?.valorExtraApos7Entregas === "number" ? t.valorExtraApos7Entregas : m.valorExtra,
        limiteEntregas: typeof t?.limiteEntregas === "number" ? t.limiteEntregas : m.limiteEntregas,
      };
    });
  }
  return { ...cfg, municipios };
}

/**
 * Mescla uma configuração com os padrões vindos das variáveis de ambiente.
 * Campos de conexão em branco (ex.: `localStorage` vazio de um dispositivo novo)
 * recebem o valor da variável de ambiente como fallback. Campos já preenchidos
 * localmente são preservados. Também garante a lista de municípios.
 */
export function mergeConfigWithEnv(cfg: AppConfig): AppConfig {
  const env = googleSheetsEnvDefaults;
  const merged: AppConfig = {
    ...cfg,
    googleSheets: {
      ...cfg.googleSheets,
      apiKey: cfg.googleSheets.apiKey?.trim() ? cfg.googleSheets.apiKey : env.apiKey,
      spreadsheetId: cfg.googleSheets.spreadsheetId?.trim()
        ? cfg.googleSheets.spreadsheetId
        : env.spreadsheetId,
    },
  };
  return normalizeConfig(merged);
}

export const defaultConfig: AppConfig = mergeConfigWithEnv({
  tarifas: {
    valorTonelada: 15,
    valorExtraApos7Entregas: 10,
    limiteEntregas: 7,
  },
  municipios: defaultMunicipios,
  googleSheets: {
    apiKey: "",
    spreadsheetId: "",
    sheetFretes: "Fretes",
    sheetMotoristas: "Motoristas",
    serviceAccountEmail: "",
    privateKey: "",
  },
  senhaAdmin: "admin123",
  origemRota: "Goiânia, GO",
});

// ---------------------------------------------------------------------------
// Helpers de municípios (usam a lista dinâmica da configuração)
// ---------------------------------------------------------------------------

export function getMunicipios(cfg: AppConfig): Municipio[] {
  return cfg.municipios && cfg.municipios.length > 0 ? cfg.municipios : defaultMunicipios;
}

export function getMunicipio(cfg: AppConfig, value: string): Municipio | undefined {
  return getMunicipios(cfg).find((m) => m.value === value);
}

export function getMunicipioLabel(cfg: AppConfig, value: string): string {
  return getMunicipio(cfg, value)?.label || value;
}

// ---------------------------------------------------------------------------
// Cálculo do valor do frete
// ---------------------------------------------------------------------------

export function calcularValorFrete(
  cfg: AppConfig,
  regiaoPrincipal: string,
  toneladas: number,
  numEntregas: number,
  entregasItens?: { regiao?: string; numEntregas?: number }[]
) {
  const t = cfg.tarifas;
  const municipios = getMunicipios(cfg);
  const valorTonelada = t.valorTonelada * toneladas;

  const resolveMunicipio = (reg: string): Municipio | undefined =>
    municipios.find((m) => m.value === reg) || municipios[0];

  let valorEntregas = 0;
  let valorExtra = 0;

  if (entregasItens && entregasItens.length > 0) {
    // Agrupa as entregas por município para aplicar o limite e o valor extra
    // próprios de cada cidade.
    const porMunicipio: Record<string, number> = {};
    entregasItens.forEach((item) => {
      const reg = item.regiao || regiaoPrincipal;
      const qtd = Math.max(0, item.numEntregas ?? 1);
      porMunicipio[reg] = (porMunicipio[reg] || 0) + qtd;
    });

    Object.entries(porMunicipio).forEach(([reg, total]) => {
      const m = resolveMunicipio(reg);
      // Município "combinado" não entra no cálculo automático.
      if (!m || m.combinado) return;
      const limite = m.limiteEntregas ?? t.limiteEntregas;
      const normais = Math.min(total, limite);
      const extras = Math.max(0, total - limite);
      valorEntregas += normais * m.valorEntrega;
      valorExtra += extras * (m.valorExtra ?? t.valorExtraApos7Entregas);
    });
  } else {
    const m = resolveMunicipio(regiaoPrincipal);
    if (m && !m.combinado) {
      const limite = m.limiteEntregas ?? t.limiteEntregas;
      const normais = Math.min(numEntregas, limite);
      const extras = Math.max(0, numEntregas - limite);
      valorEntregas = normais * m.valorEntrega;
      valorExtra = extras * (m.valorExtra ?? t.valorExtraApos7Entregas);
    }
  }

  const valorTotal = valorTonelada + valorEntregas + valorExtra;
  const mPrincipal = resolveMunicipio(regiaoPrincipal);

  return {
    valorTonelada,
    valorEntregas,
    valorExtraEntregas: valorExtra,
    valorTotal,
    valorPorEntrega: mPrincipal && !mPrincipal.combinado ? mPrincipal.valorEntrega : 0,
  };
}
