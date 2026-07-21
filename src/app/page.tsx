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
import Login from "@/components/Login";
import type { SessaoAcesso } from "@/lib/store";

export type TabKey =
  | "dashboard"
  | "novo"
  | "fretes"
  | "detalhe"
  | "rotas"
  | "motoristas"
  | "admin";

interface UserSession extends SessaoAcesso {
  nome: string;
}

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [freteIdSelecionado, setFreteIdSelecionado] = useState<string | null>(null);
  const [freteRefresh, setFreteRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar sessão do localStorage
    try {
      const raw = localStorage.getItem("fretecontrol_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.role) {
          setSession(parsed);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  // Persistir aba na URL
  useEffect(() => {
    if (!session) return;
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (hash && ["dashboard", "novo", "fretes", "rotas", "motoristas", "admin"].includes(hash)) {
      if (session.role !== "admin" && ["motoristas", "admin"].includes(hash)) {
        setTab("dashboard");
      } else {
        setTab(hash);
      }
    }
    const handler = () => {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (h) {
        if (session.role !== "admin" && ["motoristas", "admin"].includes(h)) {
          setTab("dashboard");
        } else {
          setTab(h);
        }
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [session]);

  const handleLoginSuccess = (user: UserSession) => {
    setSession(user);
    localStorage.setItem("fretecontrol_session", JSON.stringify(user));
    setTab("dashboard");
    window.location.hash = "dashboard";
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("fretecontrol_session");
    window.location.hash = "";
  };

  const mudarTab = (novaTab: TabKey) => {
    if (session?.role !== "admin" && ["motoristas", "admin"].includes(novaTab)) {
      alert("Acesso restrito a administradores.");
      return;
    }
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Carregando...</div></div>;
  }

  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={tab}
        onChangeTab={mudarTab}
        userRole={session.role}
        userName={session.nome}
        onLogout={handleLogout}
      />
      <main className="flex-1 ml-64 p-8">
        {tab === "dashboard" && (
          <Dashboard onNavigate={mudarTab} refreshKey={freteRefresh} sessao={session} />
        )}
        {tab === "novo" && (session.role === "admin" || session.role === "proprietario" || session.role === "motorista") && (
          <NovoFrete
            sessao={session}
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
            sessao={session}
          />
        )}
        {tab === "detalhe" && freteIdSelecionado && (
          <DetalhesFrete
            freteId={freteIdSelecionado}
            onBack={voltarParaFretes}
            onSaved={atualizarFretes}
          />
        )}
        {tab === "rotas" && <Rotas refreshKey={freteRefresh} sessao={session} />}
        {tab === "motoristas" && session.role === "admin" && <Motoristas />}
        {tab === "admin" && session.role === "admin" && <Admin />}
      </main>
    </div>
  );
}
