"use client";

import { useEffect, useState } from "react";
import type { Frete } from "@/lib/store";
import { getFretesVisiveis, deleteFrete, getConfig, type SessaoAcesso } from "@/lib/store";
import { getMunicipios, getMunicipioLabel } from "@/lib/config";

interface ListaFretesProps {
  refreshKey: number;
  onOpenDetail: (id: string) => void;
  onDeleted: () => void;
  sessao: SessaoAcesso;
}

export default function ListaFretes({ refreshKey, onOpenDetail, onDeleted, sessao }: ListaFretesProps) {
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [filtro, setFiltro] = useState("");
  const [filtroRegiao, setFiltroRegiao] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    setFretes(getFretesVisiveis(sessao));
  }, [refreshKey]);

  const deletar = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este frete?")) return;
    deleteFrete(id);
    setFretes(getFretesVisiveis(sessao));
    onDeleted();
  };

  const fretesFiltrados = fretes.filter((f) => {
    const q = filtro.toLowerCase();
    const matches =
      f.oc.toLowerCase().includes(q) ||
      (f.motoristaNome || "").toLowerCase().includes(q) ||
      (f.placa || "").toLowerCase().includes(q) ||
      (f.cliente || "").toLowerCase().includes(q);
    const matchesRegiao = !filtroRegiao || f.regiao === filtroRegiao;
    const matchesStatus = !filtroStatus || f.status === filtroStatus;
    return matches && matchesRegiao && matchesStatus;
  });

  const regiaoLabel = (value: string) => getMunicipioLabel(getConfig(), value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fretes Registrados</h1>
        <p className="text-slate-500 mt-1">{fretes.length} fretes no total</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-wrap gap-3">
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="🔍 Buscar por OC, motorista, placa..." className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto" />
        <select value={filtroRegiao} onChange={(e) => setFiltroRegiao(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto">
          <option value="">Todas as regiões</option>
          {getMunicipios(getConfig()).map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_rota">Em rota</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Mobile Card List (Visible on mobile/tablet, hidden on desktop) */}
      <div className="md:hidden space-y-4">
        {fretesFiltrados.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Nenhum frete encontrado
          </div>
        )}
        {fretesFiltrados.map((f) => (
          <div key={f.id} className="bg-white rounded-xl shadow-md border border-slate-100 p-4 space-y-3 relative hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="font-bold text-slate-950 text-base">OC {f.oc}</span>
                {f.tipoFrete === "combinado" && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">🤝 combinado</span>}
                <span className="text-xs text-slate-400 block mt-0.5">{f.dataCarregamento || "Sem data"}</span>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                f.status === "concluido"
                  ? "bg-emerald-100 text-emerald-700"
                  : f.status === "em_rota"
                  ? "bg-blue-100 text-blue-700"
                  : f.status === "cancelado"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {f.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
              <div className="col-span-2">
                <span className="text-xs text-slate-400 font-medium block">Cliente</span>
                <span className="font-medium text-slate-850">{f.cliente || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Motorista</span>
                <span className="font-medium text-slate-800">{f.motoristaNome || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Placa</span>
                <span className="font-mono text-slate-700 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-xs inline-block mt-0.5">{f.placa || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Região</span>
                <span className="text-slate-800 font-medium">{regiaoLabel(f.regiao)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Resumo</span>
                <span className="text-slate-800 font-medium">{f.toneladas}t • {f.numEntregas} ent.</span>
              </div>
              <div className="col-span-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 flex justify-between items-center mt-1">
                <span className="text-xs text-blue-800 font-medium">Valor Total</span>
                <span className="font-bold text-blue-900 text-base">R$ {(f.valorTotal || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100">
              <button
                onClick={() => onOpenDetail(f.id)}
                className="flex-1 sm:flex-none text-center bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Detalhes
              </button>
              <button
                onClick={() => deletar(f.id)}
                className="flex-1 sm:flex-none text-center bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">OC</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Data</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Motorista</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Região</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Ton.</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Entregas</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Valor</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fretesFiltrados.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-slate-400">Nenhum frete encontrado</td></tr>
              )}
              {fretesFiltrados.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {f.oc}
                    {f.tipoFrete === "combinado" && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">🤝 combinado</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.dataCarregamento || "-"}</td>
                  <td className="px-4 py-3">{f.motoristaNome || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{f.placa || "-"}</td>
                  <td className="px-4 py-3">{regiaoLabel(f.regiao)}</td>
                  <td className="px-4 py-3 text-right">{f.toneladas}t</td>
                  <td className="px-4 py-3 text-right">{f.numEntregas}</td>
                  <td className="px-4 py-3 text-right font-medium">R$ {(f.valorTotal || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${f.status === "concluido" ? "bg-emerald-100 text-emerald-700" : f.status === "em_rota" ? "bg-blue-100 text-blue-700" : f.status === "cancelado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onOpenDetail(f.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Abrir</button>
                      <button onClick={() => deletar(f.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
