"use client";

import { useEffect, useState, useRef } from "react";
import type { Motorista } from "@/lib/store";
import { getMotoristas, saveFrete, getConfig } from "@/lib/store";
import { regioes, calcularValorFrete } from "@/lib/config";

interface NovoFreteProps {
  onSaved: () => void;
}

interface EntregaForm {
  endereco: string;
  bairro: string;
  cidade: string;
  regiao: string;
  numEntregas: string;
  toneladas: string;
  distanciaKm: number;
  observacoes: string;
}

interface AnexoForm {
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  dataUrl: string;
}

export default function NovoFrete({ onSaved }: NovoFreteProps) {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [motoristaId, setMotoristaId] = useState("");
  const [motoristaNome, setMotoristaNome] = useState("");
  const [placa, setPlaca] = useState("");

  const [oc, setOc] = useState("");
  const [cliente, setCliente] = useState("");
  const [dataCarregamento, setDataCarregamento] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const novaEntrega = (): EntregaForm => ({
    endereco: "",
    bairro: "",
    cidade: "",
    regiao: "goiania",
    numEntregas: "",
    toneladas: "",
    distanciaKm: 0,
    observacoes: "",
  });

  // A primeira rota já fica pronta: só adicione outra quando realmente precisar.
  const [entregas, setEntregas] = useState<EntregaForm[]>([novaEntrega()]);
  const [anexos, setAnexos] = useState<AnexoForm[]>([]);

  const cfg = getConfig();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMotoristas(getMotoristas());
  }, []);

  const handleMotoristaChange = (id: string) => {
    setMotoristaId(id);
    const m = motoristas.find((x) => x.id === id);
    if (m) {
      setMotoristaNome(m.nome);
      setPlaca(m.placa);
    }
  };

  const totalToneladas = entregas.reduce((total, entrega) => total + (parseFloat(entrega.toneladas) || 0), 0);
  const totalEntregas = entregas.reduce((total, entrega) => total + (parseInt(entrega.numEntregas, 10) || 0), 0);
  const regiaoPrincipal = entregas[0]?.regiao || "goiania";
  const calculo = calcularValorFrete(
    cfg,
    regiaoPrincipal,
    totalToneladas,
    totalEntregas,
    entregas.map((entrega) => ({
      ...entrega,
      numEntregas: parseInt(entrega.numEntregas, 10) || 0,
    })),
  );

  const addEntrega = () => setEntregas([...entregas, novaEntrega()]);

  const updateEntrega = (i: number, field: keyof EntregaForm, value: any) => {
    const novas = [...entregas];
    (novas[i] as any)[field] = value;
    setEntregas(novas);
  };

  const removeEntrega = (i: number) => {
    if (entregas.length === 1) {
      setEntregas([novaEntrega()]);
      return;
    }
    setEntregas(entregas.filter((_, idx) => idx !== i));
  };

  const ordenarPorDistancia = () => setEntregas([...entregas].sort((a, b) => a.distanciaKm - b.distanciaKm));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const novos: AnexoForm[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      novos.push({ nomeOriginal: file.name, mimeType: file.type, tamanhoBytes: file.size, dataUrl });
    }
    setAnexos([...anexos, ...novos]);
  };

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const removeAnexo = (i: number) => setAnexos(anexos.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!oc || totalToneladas <= 0 || totalEntregas <= 0) {
      alert("Preencha a OC e informe toneladas e número de entregas em pelo menos uma rota");
      return;
    }
    saveFrete({
      oc,
      motoristaId: motoristaId || null,
      motoristaNome: motoristaNome || null,
      placa: placa || null,
      dataCarregamento: dataCarregamento || null,
      dataEntrega: dataEntrega || null,
      cliente: cliente || null,
      regiao: regiaoPrincipal,
      toneladas: totalToneladas,
      numEntregas: totalEntregas,
      valorTonelada: calculo.valorTonelada,
      valorEntregas: calculo.valorEntregas,
      valorExtraEntregas: calculo.valorExtraEntregas,
      valorTotal: calculo.valorTotal,
      observacoes,
      status: "pendente",
      entregas: entregas.filter((e) => e.endereco.trim()).map((e) => ({
        ...e,
        numEntregas: parseInt(e.numEntregas, 10) || 0,
        toneladas: parseFloat(e.toneladas) || 0,
      })),
      anexos,
    });
    onSaved();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Registrar Novo Frete</h1>
        <p className="text-slate-500 mt-1">Cálculo automático considerando entregas mistas (Goiânia e outras cidades)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">📋 Ordem de Carregamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">OC (Ordem de Carregamento) *</label><input value={oc} onChange={(e) => setOc(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex: OC-2026-001" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label><input value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Nome do cliente" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Data de Carregamento</label><input type="date" value={dataCarregamento} onChange={(e) => setDataCarregamento(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label><input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">👤 Motorista & Veículo</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Motorista cadastrado (opcional)</label>
          <select value={motoristaId} onChange={(e) => handleMotoristaChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
            <option value="">-- Selecionar ou preencher manualmente --</option>
            {motoristas.map((m) => (<option key={m.id} value={m.id}>{m.nome} - {m.placa}</option>))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome do Motorista</label><input value={motoristaNome} onChange={(e) => setMotoristaNome(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Nome completo" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Placa</label><input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="ABC-1234" maxLength={8} /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">💰 Cálculo do Frete</h2>
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          Informe <strong>município, número de entregas e toneladas dentro de cada rota</strong> abaixo. O total do frete é somado automaticamente.
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Detalhamento do Valor</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-slate-600">Valor por tonelada (R$ {cfg.tarifas.valorTonelada.toFixed(2)} × {totalToneladas.toFixed(2)}t):</span><span className="font-medium text-right">R$ {calculo.valorTonelada.toFixed(2)}</span>
            <span className="text-slate-600">Total informado ({totalEntregas} entrega(s) em {entregas.filter((e) => e.endereco.trim()).length} rota(s)):</span><span className="font-medium text-right">{totalEntregas} entrega(s)</span>
            <span className="text-slate-600">Soma das entregas (por município, com limite de {cfg.tarifas.limiteEntregas}):</span><span className="font-medium text-right">R$ {calculo.valorEntregas.toFixed(2)}</span>
            {calculo.valorExtraEntregas > 0 && (<><span className="text-slate-600">Entregas extras (acima de {cfg.tarifas.limiteEntregas} - R$ {cfg.tarifas.valorExtraApos7Entregas.toFixed(2)} cada):</span><span className="font-medium text-right">R$ {calculo.valorExtraEntregas.toFixed(2)}</span></>)}
            <div className="col-span-2 border-t border-blue-200 my-2" />
            <span className="font-bold text-blue-900 text-base">TOTAL DO FRETE:</span><span className="font-bold text-blue-900 text-lg text-right">R$ {calculo.valorTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h2 className="font-semibold text-lg">📍 Rotas / Locais de Entrega</h2>
            <p className="text-xs text-slate-500">Em cada rota, informe o endereço, município, nº de entregas e peso. Adicione outra rota somente se precisar.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={ordenarPorDistancia} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">⬇⬆ Ordenar por distância</button>
            <button onClick={addEntrega} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg">+ Adicionar entrega</button>
          </div>
        </div>
        {entregas.length === 0 && <p className="text-sm text-slate-400">Nenhum local de entrega adicionado.</p>}
        <div className="space-y-3">
          {entregas.map((e, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Rota #{i + 1}</span><button onClick={() => removeEntrega(i)} className="text-red-600 hover:text-red-800 text-sm">Remover rota</button></div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Endereço *</label><input value={e.endereco} onChange={(ev) => updateEntrega(i, "endereco", ev.target.value)} placeholder="Rua, número e complemento" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label><input value={e.bairro} onChange={(ev) => updateEntrega(i, "bairro", ev.target.value)} placeholder="Bairro" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Município *</label><select value={e.regiao || "goiania"} onChange={(ev) => updateEntrega(i, "regiao", ev.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white font-medium text-blue-900">{regioes.map((r) => (<option key={r.value} value={r.value}>{r.label.replace(" (capital)", "")}</option>))}</select></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Nº entregas *</label><input type="number" min="1" value={e.numEntregas} onChange={(ev) => updateEntrega(i, "numEntregas", ev.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Toneladas *</label><input type="number" min="0" step="0.01" value={e.toneladas} onChange={(ev) => updateEntrega(i, "toneladas", ev.target.value)} placeholder="0,00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Distância (km)</label><input type="number" step="0.1" value={e.distanciaKm} onChange={(ev) => updateEntrega(i, "distanciaKm", parseFloat(ev.target.value) || 0)} placeholder="Opcional" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" /></div>
                <div className="md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Observações</label><input value={e.observacoes} onChange={(ev) => updateEntrega(i, "observacoes", ev.target.value)} placeholder="Referência, contato..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">📎 Anexar Documentos (OC / Notas)</h2>
        <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" onChange={(e) => handleFiles(e.target.files)} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg p-6 w-full text-center text-slate-600 transition">📤 Clique para anexar PDFs ou fotos das OCs</button>
        {anexos.length > 0 && (
          <div className="space-y-2">
            {anexos.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-3"><span className="text-2xl">{a.mimeType.startsWith("image/") ? "🖼️" : "📄"}</span><div><p className="text-sm font-medium">{a.nomeOriginal}</p><p className="text-xs text-slate-500">{(a.tamanhoBytes / 1024).toFixed(1)} KB</p></div></div>
                <button onClick={() => removeAnexo(i)} className="text-red-600 hover:text-red-800 text-sm">Remover</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4">
        <h2 className="font-semibold text-lg border-b pb-2">📝 Observações</h2>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Informações adicionais sobre o frete..." />
      </div>

      <div className="flex justify-end gap-3 pb-8">
        <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition">💾 Salvar Frete (Google Sheets)</button>
      </div>
    </div>
  );
}
