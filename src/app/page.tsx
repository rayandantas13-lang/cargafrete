"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import NovoFrete from "@/components/NovoFrete";
import ListaFretes from "@/components/ListaFretes";
import DetalhesFrete from "@/components/DetalhesFrete";
import Rotas from "@/components/Rotas";
import Motoristas from "@/components/Motoristas";
import Admin from "@/components/Admin";

export type TabKey =
  | "dashboard"
  | "novo"
  | "fretes"
  | "detalhe"
  | "rotas"
  | "motoristas"
  | "admin";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [freteIdSelecionado, setFreteIdSelecionado] = useState<string | null>(
    null
  );
  const [freteRefresh, setFreteRefresh] = useState(0);

  // Persistir aba na URL
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (hash && ["dashboard", "novo", "fretes", "rotas", "motoristas", "admin"].includes(hash)) {
      setTab(hash);
    }
    const handler = () => {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (h) setTab(h);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const mudarTab = (novaTab: TabKey) => {
    setTab(novaTab);
    window.location.hash = novaTab;
  };

  const abrirDetalhe = (id: string) => {
    setFreteIdSelecionado(id);
    setTab("detalhe");
  };

  const voltarParaFretes = () => {
    setFreteIdSelecionado(null);
    mudarTab("fretes");
  };

  const atualizarFretes = () => {
    setFreteRefresh((r) => r + 1);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={tab} onChangeTab={mudarTab} />
      <main className="flex-1 ml-64 p-8">
        {tab === "dashboard" && (
          <Dashboard onNavigate={mudarTab} refreshKey={freteRefresh} />
        )}
        {tab === "novo" && (
          <NovoFrete
            onSaved={() => {
              atualizarFretes();
              mudarTab("fretes");
            }}
          />
        )}
        {tab === "fretes" && (
          <ListaFretes
            refreshKey={freteRefresh}
            onOpenDetail={abrirDetalhe}
            onDeleted={atualizarFretes}
          />
        )}
        {tab === "detalhe" && freteIdSelecionado && (
          <DetalhesFrete
            freteId={freteIdSelecionado}
            onBack={voltarParaFretes}
            onSaved={atualizarFretes}
          />
        )}
        {tab === "rotas" && <Rotas refreshKey={freteRefresh} />}
        {tab === "motoristas" && <Motoristas />}
        {tab === "admin" && <Admin />}
      </main>
    </div>
  );
}
