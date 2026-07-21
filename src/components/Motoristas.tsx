"use client";

import { useEffect, useState } from "react";
import type { Motorista } from "@/lib/store";
import { getMotoristas, saveMotorista, deleteMotorista } from "@/lib/store";

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [editando, setEditando] = useState<Motorista | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [novoMotoristaCriado, setNovoMotoristaCriado] = useState<Motorista | null>(null);

  const [form, setForm] = useState({ nome: "", placa: "", cnh: "", telefone: "", veiculo: "", observacoes: "" });

  const carregar = () => setMotoristas(getMotoristas());

  useEffect(() => { carregar(); }, []);

  const resetForm = () => {
    setForm({ nome: "", placa: "", cnh: "", telefone: "", veiculo: "", observacoes: "" });
    setEditando(null);
    setShowForm(false);
  };

  const salvar = () => {
    if (!form.nome || !form.placa) { alert("Nome e placa são obrigatórios"); return; }
    const m = saveMotorista(editando ? { ...form, id: editando.id } : form);
    if (!editando && m.senha) {
      setNovoMotoristaCriado(m);
    }
    resetForm();
    carregar();
  };

  const editar = (m: Motorista) => {
    setEditando(m);
    setForm({ nome: m.nome, placa: m.placa, cnh: m.cnh || "", telefone: m.telefone || "", veiculo: m.veiculo || "", observacoes: m.observacoes || "" });
    setShowForm(true);
  };

  const remover = (id: string) => {
    if (!confirm("Excluir motorista?")) return;
    deleteMotorista(id);
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Motoristas</h1>
          <p className="text-slate-500 mt-1">Gerencie os motoristas (Acesso exclusivo para administradores)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">{showForm ? "✕ Cancelar" : "+ Novo Motorista"}</button>
      </div>

      {novoMotoristaCriado && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 space-y-3">
          <h3 className="font-bold text-emerald-900 text-lg">🎉 Motorista cadastrado com sucesso!</h3>
          <p className="text-sm text-emerald-800">Uma senha temporária aleatória foi gerada para o primeiro acesso deste motorista:</p>
          <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between max-w-md">
            <div>
              <p className="text-xs text-slate-500">Login (Placa): <strong className="text-slate-800">{novoMotoristaCriado.placa}</strong></p>
              <p className="text-xs text-slate-500 mt-1">Senha temporária: <code className="bg-slate-100 px-2 py-1 rounded font-bold text-blue-600 text-base">{novoMotoristaCriado.senha}</code></p>
            </div>
            <button onClick={() => {
              navigator.clipboard.writeText(`Placa: ${novoMotoristaCriado.placa}\nSenha temporária: ${novoMotoristaCriado.senha}`);
              alert("Dados copiados para a área de transferência!");
            }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded font-medium">📋 Copiar Dados</button>
          </div>
          <p className="text-xs text-emerald-700">O motorista deverá usar esta senha no primeiro login e poderá alterá-la depois.</p>
          <button onClick={() => setNovoMotoristaCriado(null)} className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded font-medium">Fechar aviso</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
          <h2 className="font-semibold text-lg">{editando ? "Editar Motorista" : "Novo Motorista"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Nome completo" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Placa * (Usada como login)</label><input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="ABC-1234" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="(62) 99999-9999" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">CNH</label><input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Nº da CNH" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label><input value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Marca/Modelo" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Observações</label><input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Ex: só trabalha seg-qua-sex" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-slate-600 hover:text-slate-900">Cancelar</button>
            <button onClick={salvar} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium">{editando ? "Atualizar" : "Cadastrar"}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nome</th>
                <th className="text-left px-4 py-3 font-semibold">Placa (Login)</th>
                <th className="text-left px-4 py-3 font-semibold">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold">Veículo</th>
                <th className="text-left px-4 py-3 font-semibold">CNH</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {motoristas.length === 0 && (<tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum motorista cadastrado</td></tr>)}
              {motoristas.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{m.nome}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">{m.placa}</td>
                  <td className="px-4 py-3">{m.telefone || "-"}</td>
                  <td className="px-4 py-3">{m.veiculo || "-"}</td>
                  <td className="px-4 py-3 text-xs">{m.cnh || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => editar(m)} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button>
                      <button onClick={() => remover(m.id)} className="text-red-600 hover:text-red-800 text-xs">Excluir</button>
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
