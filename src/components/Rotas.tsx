"use client";

import { useEffect, useState } from "react";
import type { Frete, Entrega } from "@/lib/store";
import { getFretes, getEntregasByFreteId } from "@/lib/store";

interface RotasProps {
  refreshKey: number;
}

export default function Rotas({ refreshKey }: RotasProps) {
  const [fretesComEntrega, setFretesComEntrega] = useState<(Frete & { entregas: Entrega[] })[]>([]);
  const [freteSelecionado, setFreteSelecionado] = useState<string>("");

  useEffect(() => {
    const fretes = getFretes();
    const comEntregas = fretes
      .map((f) => ({ ...f, entregas: getEntregasByFreteId(f.id) }))
      .filter((f) => f.entregas.length > 0);
    setFretesComEntrega(comEntregas);
    if (comEntregas.length > 0 && !freteSelecionado) {
      setFreteSelecionado(comEntregas[0].id);
    }
  }, [refreshKey]);

  const frete = fretesComEntrega.find((f) => f.id === freteSelecionado);

  const gerarLinkMaps = () => {
    if (!frete || frete.entregas.length === 0) return;
    const paradas = frete.entregas.map((e: Entrega) => `${e.endereco}${e.cidade ? ", " + e.cidade : ""}`).filter(Boolean);
    const origin = encodeURIComponent("Goiânia, GO");
    const destination = encodeURIComponent(paradas[paradas.length - 1]);
    const waypoints = paradas.length > 1 ? "&waypoints=" + encodeURIComponent(paradas.slice(0, -1).join("|")) : "";
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
    window.open(url, "_blank");
  };

  if (fretesComEntrega.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Rotas & Mapas</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Nenhum frete com locais de entrega cadastrados.</p>
          <p className="text-sm text-yellow-600 mt-1">Crie um frete e adicione os pontos de entrega para ver a rota aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rotas & Mapas</h1>
        <p className="text-slate-500 mt-1">Visualize e abra rotas de entrega no Google Maps</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center gap-4 mb-4">
          <label className="font-medium">Selecione um frete:</label>
          <select value={freteSelecionado} onChange={(e) => setFreteSelecionado(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2">
            <option value="">-- Selecione --</option>
            {fretesComEntrega.map((f) => (
              <option key={f.id} value={f.id}>{f.oc} - {f.motoristaNome || "sem motorista"} ({f.entregas.length} entregas)</option>
            ))}
          </select>
          {frete && (
            <button onClick={gerarLinkMaps} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium whitespace-nowrap">🗺️ Abrir no Google Maps</button>
          )}
        </div>

        {frete && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">🚛 {frete.oc} - {frete.motoristaNome} ({frete.placa})</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">🏁</div>
                <div className="flex-1"><p className="text-sm font-medium">Origem: Goiânia, GO</p></div>
              </div>
              {frete.entregas.map((e: Entrega, i: number) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${e.concluida ? "bg-emerald-600 text-white" : "bg-white border-2 border-blue-600 text-blue-600"}`}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.endereco}</p>
                    <p className="text-xs text-slate-500">{[e.bairro, e.cidade].filter(Boolean).join(" • ")} {e.distanciaKm ? `• ${e.distanciaKm}km` : ""}</p>
                  </div>
                  {e.concluida && <span className="text-emerald-600 text-xs font-medium">✓ Entregue</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
