"use client";

import { useEffect, useState } from "react";
import type { Frete, Entrega, Anexo } from "@/lib/store";
import { getFreteById, updateFreteStatus, updateEntregasOrdenacao, toggleEntregaConcluida, deleteAnexo } from "@/lib/store";
import { regioes } from "@/lib/config";

interface DetalhesFreteProps {
  freteId: string;
  onBack: () => void;
  onSaved: () => void;
}

export default function DetalhesFrete({ freteId, onBack, onSaved }: DetalhesFreteProps) {
  const [frete, setFrete] = useState<(Frete & { entregas: Entrega[]; anexos: Anexo[] }) | null>(null);

  useEffect(() => {
    setFrete(getFreteById(freteId));
  }, [freteId]);

  const mudarStatus = (status: string) => {
    updateFreteStatus(freteId, status);
    setFrete(getFreteById(freteId));
    onSaved();
  };

  const alternarConclusaoEntrega = (entrega: Entrega) => {
    toggleEntregaConcluida(entrega.id);
    setFrete(getFreteById(freteId));
  };

  const reordenarEntrega = (idx: number, direcao: -1 | 1) => {
    if (!frete) return;
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= frete.entregas.length) return;
    const novas = [...frete.entregas];
    [novas[idx], novas[novoIdx]] = [novas[novoIdx], novas[idx]];
    updateEntregasOrdenacao(freteId, novas);
    setFrete(getFreteById(freteId));
  };

  const removerAnexo = (id: string) => {
    if (!confirm("Excluir anexo?")) return;
    deleteAnexo(id);
    setFrete(getFreteById(freteId));
  };

  const gerarLinkMaps = () => {
    if (!frete || frete.entregas.length === 0) {
      alert("Este frete não possui locais de entrega");
      return;
    }
    const paradas = frete.entregas.map((e: Entrega) => `${e.endereco}${e.cidade ? ", " + e.cidade : ""}`).filter(Boolean);
    if (paradas.length === 0) {
      alert("Adicione pelo menos um endereço de entrega");
      return;
    }
    const origin = encodeURIComponent("Goiânia, GO");
    const destination = encodeURIComponent(paradas[paradas.length - 1]);
    const waypoints = paradas.length > 1 ? "&waypoints=" + encodeURIComponent(paradas.slice(0, -1).join("|")) : "";
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
    window.open(url, "_blank");
  };

  if (!frete) return <div>Frete não encontrado</div>;

  const regiaoLabel = regioes.find((r) => r.value === frete.regiao)?.label || frete.regiao;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-600 hover:text-slate-900 text-sm">← Voltar</button>
          <h1 className="text-3xl font-bold">Frete {frete.oc}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarLinkMaps} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">🗺️ Abrir rota no Google Maps</button>
          <select value={frete.status || "pendente"} onChange={(e) => mudarStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="pendente">Pendente</option>
            <option value="em_rota">Em rota</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h2 className="font-semibold text-lg mb-4">Informações</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-slate-500">Cliente</p><p className="font-medium">{frete.cliente || "-"}</p></div>
              <div><p className="text-slate-500">Motorista</p><p className="font-medium">{frete.motoristaNome || "-"}</p></div>
              <div><p className="text-slate-500">Placa</p><p className="font-mono">{frete.placa || "-"}</p></div>
              <div><p className="text-slate-500">Região</p><p className="font-medium">{regiaoLabel}</p></div>
              <div><p className="text-slate-500">Data Carregamento</p><p className="font-medium">{frete.dataCarregamento || "-"}</p></div>
              <div><p className="text-slate-500">Data Entrega</p><p className="font-medium">{frete.dataEntrega || "-"}</p></div>
              <div><p className="text-slate-500">Toneladas</p><p className="font-medium">{frete.toneladas}t</p></div>
              <div><p className="text-slate-500">Nº Entregas</p><p className="font-medium">{frete.numEntregas}</p></div>
            </div>
            {frete.observacoes && (<div className="mt-4 pt-4 border-t"><p className="text-slate-500 text-sm">Observações</p><p className="text-sm mt-1">{frete.observacoes}</p></div>)}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h2 className="font-semibold text-lg mb-4">📍 Locais de Entrega ({frete.entregas.length})</h2>
            {frete.entregas.length === 0 && <p className="text-sm text-slate-400">Nenhuma entrega cadastrada</p>}
            <div className="space-y-2">
              {frete.entregas.map((e: Entrega, i: number) => (
                <div key={e.id} className={`flex items-center gap-3 p-3 rounded-lg border ${e.concluida ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                  <button onClick={() => alternarConclusaoEntrega(e)} className={`w-6 h-6 rounded border flex items-center justify-center ${e.concluida ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>{e.concluida && "✓"}</button>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{i + 1}. {e.endereco}</p>
                    <p className="text-xs text-slate-500">{[e.bairro, e.cidade].filter(Boolean).join(" • ")} {e.distanciaKm ? `• ${e.distanciaKm}km` : ""}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => reordenarEntrega(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-slate-900 disabled:opacity-30 text-xs">▲</button>
                    <button onClick={() => reordenarEntrega(i, 1)} disabled={i === frete.entregas.length - 1} className="text-slate-500 hover:text-slate-900 disabled:opacity-30 text-xs">▼</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-3 opacity-90">Valor do Frete</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="opacity-80">Toneladas</span><span>R$ {(frete.valorTonelada || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="opacity-80">Entregas</span><span>R$ {(frete.valorEntregas || 0).toFixed(2)}</span></div>
              {(frete.valorExtraEntregas || 0) > 0 && (<div className="flex justify-between"><span className="opacity-80">Extras</span><span>R$ {(frete.valorExtraEntregas || 0).toFixed(2)}</span></div>)}
              <div className="border-t border-white/30 pt-2 mt-2 flex justify-between text-lg font-bold"><span>TOTAL</span><span>R$ {(frete.valorTotal || 0).toFixed(2)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h2 className="font-semibold mb-4">📎 Anexos ({frete.anexos.length})</h2>
            {frete.anexos.length === 0 && <p className="text-sm text-slate-400">Nenhum anexo</p>}
            <div className="space-y-2">
              {frete.anexos.map((a: Anexo) => (
                <div key={a.id} className="flex items-center justify-between p-2 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">{a.mimeType.startsWith("image/") ? "🖼️" : "📄"}</span>
                    <a href={a.dataUrl} download={a.nomeOriginal} target="_blank" className="text-sm text-blue-600 hover:text-blue-800 truncate">{a.nomeOriginal}</a>
                  </div>
                  <button onClick={() => removerAnexo(a.id)} className="text-red-600 hover:text-red-800 text-xs ml-2">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
