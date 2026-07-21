"use client";

import { useEffect, useState } from "react";
import type { TabKey } from "@/app/page";
import type { Frete } from "@/lib/store";
import { getFretesVisiveis, type SessaoAcesso } from "@/lib/store";
import { regioes } from "@/lib/config";

interface DashboardProps {
  onNavigate: (tab: TabKey) => void;
  refreshKey: number;
  sessao: SessaoAcesso;
}

export default function Dashboard({ onNavigate, refreshKey, sessao }: DashboardProps) {
  const [fretes, setFretes] = useState<Frete[]>([]);

  useEffect(() => {
    setFretes(getFretesVisiveis(sessao));
  }, [refreshKey]);

  const totalFretes = fretes.length;
  const valorTotal = fretes.reduce((acc, f) => acc + (f.valorTotal || 0), 0);
  const pendentes = fretes.filter((f) => f.status === "pendente").length;
  const concluidos = fretes.filter((f) => f.status === "concluido").length;

  const fretesPorRegiao = regioes.map((r) => ({
    label: r.label,
    value: r.value,
    count: fretes.filter((f) => f.regiao === r.value).length,
  }));

  const ultimosFretes = [...fretes].slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral dos seus fretes - Google Sheets como banco</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
        <span>✅</span>
        <span>Dados salvos localmente e sincronizados com Google Sheets (quando configurado no Admin)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total de Fretes" value={totalFretes} icon="🚛" color="blue" />
        <StatCard title="Valor Total" value={`R$ ${valorTotal.toFixed(2)}`} icon="💰" color="green" />
        <StatCard title="Pendentes" value={pendentes} icon="⏳" color="yellow" />
        <StatCard title="Concluídos" value={concluidos} icon="✅" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-lg font-semibold mb-4">Fretes por Região</h2>
          <div className="space-y-3">
            {fretesPorRegiao.map((r) => (
              <div key={r.value} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{r.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${totalFretes > 0 ? (r.count / totalFretes) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{r.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Últimos Fretes</h2>
            <button onClick={() => onNavigate("fretes")} className="text-sm text-blue-600 hover:text-blue-700">Ver todos →</button>
          </div>
          <div className="space-y-3">
            {ultimosFretes.length === 0 && <p className="text-sm text-slate-400">Nenhum frete cadastrado</p>}
            {ultimosFretes.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">OC {f.oc}</p>
                  <p className="text-xs text-slate-500">{f.motoristaNome || "Sem motorista"} • {f.dataCarregamento || "sem data"}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${f.status === "concluido" ? "bg-emerald-100 text-emerald-700" : f.status === "em_rota" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onNavigate("novo")} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition">➕ Registrar Novo Frete</button>
        <button onClick={() => onNavigate("rotas")} className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg font-medium border border-slate-200 transition">🗺️ Ver Rotas</button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: "blue" | "green" | "yellow" | "emerald" }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    emerald: "from-emerald-500 to-emerald-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} text-white rounded-xl p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3"><span className="text-2xl">{icon}</span></div>
      <p className="text-sm opacity-90">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
