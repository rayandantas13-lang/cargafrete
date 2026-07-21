export const regioes = [
  { value: "goiania", label: "Goiânia (capital)" },
  { value: "trindade", label: "Trindade" },
  { value: "senador_canedo", label: "Senador Canedo" },
  { value: "goianira", label: "Goianira" },
  { value: "abadia", label: "Abadia de Goiás" },
];

// Distâncias aproximadas do centro de Goiânia (em km)
export const distanciasPorRegiao: Record<string, number> = {
  goiania: 0,
  trindade: 18,
  senador_canedo: 22,
  goianira: 28,
  abadia: 15,
};

export interface TarifasConfig {
  valorTonelada: number;
  valorEntregaGoiania: number;
  valorEntregaTrindade: number;
  valorEntregaSenadorCanedo: number;
  valorEntregaGoianira: number;
  valorEntregaAbadia: number;
  valorExtraApos7Entregas: number;
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
  googleSheets: GoogleSheetsConfig;
  senhaAdmin: string;
  origemRota: string;
}

/**
 * Valores de conexão com o Google Sheets lidos de Variáveis de Ambiente públicas
 * do Next.js (`NEXT_PUBLIC_...`). Elas são embutidas no build, então qualquer
 * dispositivo (celular, tablet, desktop) já abre o app com a planilha configurada,
 * sem que o usuário precise digitar nada manualmente.
 *
 * Defina-as no provedor de hospedagem (Vercel, Netlify, etc.) ou em um `.env.local`.
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
 * Mescla uma configuração com os padrões vindos das variáveis de ambiente.
 * Para cada campo de conexão que estiver em branco na configuração local
 * (ex.: `localStorage` vazio de um dispositivo novo), usamos o valor da
 * variável de ambiente como fallback. Campos já preenchidos localmente são
 * preservados, permitindo sobrescrever o padrão quando necessário.
 */
export function mergeConfigWithEnv(cfg: AppConfig): AppConfig {
  const env = googleSheetsEnvDefaults;
  return {
    ...cfg,
    googleSheets: {
      ...cfg.googleSheets,
      apiKey: cfg.googleSheets.apiKey?.trim() ? cfg.googleSheets.apiKey : env.apiKey,
      spreadsheetId: cfg.googleSheets.spreadsheetId?.trim()
        ? cfg.googleSheets.spreadsheetId
        : env.spreadsheetId,
    },
  };
}

export const defaultConfig: AppConfig = mergeConfigWithEnv({
  tarifas: {
    valorTonelada: 15,
    valorEntregaGoiania: 25,
    valorEntregaTrindade: 45,
    valorEntregaSenadorCanedo: 50,
    valorEntregaGoianira: 55,
    valorEntregaAbadia: 40,
    valorExtraApos7Entregas: 10,
    limiteEntregas: 7,
  },
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

export function calcularValorFrete(
  cfg: AppConfig,
  regiaoPrincipal: string,
  toneladas: number,
  numEntregas: number,
  entregasItens?: { regiao?: string; numEntregas?: number }[]
) {
  const t = cfg.tarifas;
  const valorTonelada = t.valorTonelada * toneladas;

  let valorEntregas = 0;
  let valorExtra = 0;
  const limite = t.limiteEntregas;

  const getRate = (reg: string) => {
    switch (reg) {
      case "goiania":
        return t.valorEntregaGoiania;
      case "trindade":
        return t.valorEntregaTrindade;
      case "senador_canedo":
        return t.valorEntregaSenadorCanedo;
      case "goianira":
        return t.valorEntregaGoianira;
      case "abadia":
        return t.valorEntregaAbadia;
      default:
        return t.valorEntregaGoiania;
    }
  };

  if (entregasItens && entregasItens.length > 0) {
    let entregasProcessadas = 0;
    entregasItens.forEach((item) => {
      const reg = item.regiao || regiaoPrincipal;
      // Uma rota pode representar uma ou várias entregas no mesmo município.
      const quantidade = Math.max(0, item.numEntregas ?? 1);
      for (let i = 0; i < quantidade; i += 1) {
        if (entregasProcessadas < limite) {
          valorEntregas += getRate(reg);
        } else {
          valorExtra += t.valorExtraApos7Entregas;
        }
        entregasProcessadas += 1;
      }
    });
  } else {
    const entregasNormais = Math.min(numEntregas, limite);
    const entregasExtras = Math.max(0, numEntregas - limite);
    const valorPorEntrega = getRate(regiaoPrincipal);
    valorEntregas = entregasNormais * valorPorEntrega;
    valorExtra = entregasExtras * t.valorExtraApos7Entregas;
  }

  const valorTotal = valorTonelada + valorEntregas + valorExtra;

  return {
    valorTonelada,
    valorEntregas,
    valorExtraEntregas: valorExtra,
    valorTotal,
    valorPorEntrega: getRate(regiaoPrincipal),
  };
}
