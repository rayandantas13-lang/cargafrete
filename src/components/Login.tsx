"use client";

import { useState } from "react";
import { getConfig, getMotoristas, updateMotoristaSenha, type Motorista } from "@/lib/store";

interface LoginProps {
  onLoginSuccess: (user: { role: "admin" | "motorista"; id?: string; nome: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [tipo, setTipo] = useState<"admin" | "motorista">("motorista");
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const [motoristaPendente, setMotoristaPendente] = useState<Motorista | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const cfg = getConfig();

    if (tipo === "admin") {
      if (senha === cfg.senhaAdmin) {
        onLoginSuccess({ role: "admin", nome: "Administrador" });
      } else {
        setErro("Senha de administrador incorreta.");
      }
    } else {
      const motoristas = getMotoristas();
      const limpo = identificador.trim().toUpperCase();
      const m = motoristas.find(
        (x) =>
          x.placa.toUpperCase() === limpo ||
          (x.telefone && x.telefone.replace(/\D/g, "") === identificador.replace(/\D/g, "")) ||
          x.nome.toUpperCase().includes(limpo)
      );

      if (!m) {
        setErro("Motorista não encontrado com esta placa/telefone. Verifique com o administrador.");
        return;
      }

      if (m.senha && m.senha !== senha) {
        setErro("Senha incorreta.");
        return;
      }

      if (m.primeiroAcesso) {
        setMotoristaPendente(m);
        return;
      }

      onLoginSuccess({ role: "motorista", id: m.id, nome: m.nome });
    }
  };

  const handleSalvarNovaSenha = () => {
    if (!novaSenha || novaSenha.length < 4) {
      setErro("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (novaSenha !== confirmaNovaSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (motoristaPendente) {
      updateMotoristaSenha(motoristaPendente.id, novaSenha);
      onLoginSuccess({ role: "motorista", id: motoristaPendente.id, nome: motoristaPendente.nome });
    }
  };

  if (motoristaPendente) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6">
          <div className="text-center">
            <span className="text-4xl">🔐</span>
            <h1 className="text-2xl font-bold mt-2">Primeiro Acesso</h1>
            <p className="text-sm text-slate-500 mt-1">Olá, {motoristaPendente.nome}! Por segurança, defina uma nova senha para sua conta.</p>
          </div>
          {erro && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">⚠️ {erro}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" placeholder="Digite sua nova senha" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
              <input type="password" value={confirmaNovaSenha} onChange={(e) => setConfirmaNovaSenha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" placeholder="Confirme a nova senha" />
            </div>
            <button onClick={handleSalvarNovaSenha} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow transition">Salvar Senha e Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🚚</div>
          <h1 className="text-2xl font-bold text-slate-900">FreteControl</h1>
          <p className="text-sm text-slate-500 mt-1">Controle de Fretes e Cargas</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => { setTipo("motorista"); setErro(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${tipo === "motorista" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}>Motorista</button>
          <button type="button" onClick={() => { setTipo("admin"); setErro(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${tipo === "admin" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}>Administrador</button>
        </div>

        {erro && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">⚠️ {erro}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          {tipo === "motorista" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Placa do Veículo ou Telefone</label>
              <input type="text" value={identificador} onChange={(e) => setIdentificador(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 uppercase" placeholder="Ex: ABC-1234" required autoFocus />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" placeholder="Sua senha de acesso" required autoFocus={tipo === "admin"} />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow transition">Entrar no Sistema</button>
        </form>

        <div className="text-xs text-slate-400 text-center border-t pt-4">
          {tipo === "admin" ? <p>Senha padrão: <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">admin123</code></p> : <p>O primeiro acesso utiliza a senha temporária fornecida pelo administrador.</p>}
        </div>
      </div>
    </div>
  );
}
