"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import NovoFrete from "@/components/NovoFrete";
import ListaFretes from "@/components/ListaFretes";
import DetalhesFrete from "@/components/DetalhesFrete";
import Rotas from "@/components/Rotas";
import Motoristas from "@/components/Motoristas";
import Admin from "@/components/Admin";
import Login from "@/components/Login";
import { getConfig, syncFromSheets, type SessaoAcesso } from "@/lib/store";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const didAutoSync = useRef(false);

  useEffect(() => {
    // Sincronização automática com a planilha ao abrir o app.
    // Executa apenas uma vez por carregamento (mesmo com React StrictMode).
    if (didAutoSync.current) return;
    didAutoSync.current = true;

    let ativo = true;
    (async () => {
      try {
        const cfg = getConfig();
        const gs = cfg.googleSheets;
        const temAppsScript = gs.apiKey && gs.apiKey.startsWith("https://script.google.com");
        const temSheetsApi = gs.apiKey && !gs.apiKey.startsWith("https://") && gs.spreadsheetId;

        if (temAppsScript || temSheetsApi) {
          const result = await syncFromSheets();
          if (ativo && result.ok) {
            setFreteRefresh((r) => r + 1);
          }
        }
      } catch {
        // Ignora erros (offline ou planilha indisponível)
      }
    })();
    return () => { ativo = false; };
  }, []);

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
    setSidebarOpen(false);
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
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Top Header Mobile */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-white transition-colors"
            aria-label="Abrir Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold flex items-center gap-1.5">
            <span>🚚</span>
            <span className="text-lg">FreteControl</span>
          </span>
        </div>
        <div className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded capitalize font-medium">
          {session.role}
        </div>
      </div>

      {/* Overlay Backdrop for Mobile Sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden transition-opacity"
        />
      )}

      <Sidebar
        activeTab={tab}
        onChangeTab={mudarTab}
        userRole={session.role}
        userName={session.nome}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
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
