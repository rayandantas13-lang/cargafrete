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

export const defaultConfig: AppConfig = {
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
};

export function calcularValorFrete(
  cfg: AppConfig,
  regiao: string,
  toneladas: number,
  numEntregas: number
) {
  const t = cfg.tarifas;
  const valorTonelada = t.valorTonelada * toneladas;

  let valorPorEntrega = 0;
  switch (regiao) {
    case "goiania":
      valorPorEntrega = t.valorEntregaGoiania;
      break;
    case "trindade":
      valorPorEntrega = t.valorEntregaTrindade;
      break;
    case "senador_canedo":
      valorPorEntrega = t.valorEntregaSenadorCanedo;
      break;
    case "goianira":
      valorPorEntrega = t.valorEntregaGoianira;
      break;
    case "abadia":
      valorPorEntrega = t.valorEntregaAbadia;
      break;
    default:
      valorPorEntrega = t.valorEntregaGoiania;
  }

  const limite = t.limiteEntregas;
  const entregasNormais = Math.min(numEntregas, limite);
  const entregasExtras = Math.max(0, numEntregas - limite);
  const valorEntregas = entregasNormais * valorPorEntrega;
  const valorExtra = entregasExtras * t.valorExtraApos7Entregas;
  const valorTotal = valorTonelada + valorEntregas + valorExtra;

  return {
    valorTonelada,
    valorEntregas,
    valorExtraEntregas: valorExtra,
    valorTotal,
    valorPorEntrega,
  };
}
