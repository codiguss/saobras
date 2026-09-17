"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Search, X, Save, UserCheck, UserX, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Operador = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  criado_em: string;
};

export default function OperadoresClient({ operadores }: { operadores: Operador[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperador, setEditingOperador] = useState<Partial<Operador> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const operadoresFiltrados = useMemo(() => {
    if (!searchTerm) return operadores;
    const lower = searchTerm.toLowerCase();
    return operadores.filter(
      (op) =>
        op.nome.toLowerCase().includes(lower) ||
        op.email.toLowerCase().includes(lower)
    );
  }, [operadores, searchTerm]);

  const abrirNovoOperador = () => {
    setEditingOperador({ nome: "", email: "", telefone: "", ativo: true });
    setIsModalOpen(true);
  };

  const abrirEdicao = (op: Operador) => {
    setEditingOperador({ ...op });
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingOperador(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperador?.nome?.trim() || !editingOperador?.email?.trim()) {
      alert("Preencha o nome e o e-mail do operador.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        nome: editingOperador.nome,
        email: editingOperador.email,
        telefone: editingOperador.telefone || null,
        ativo: editingOperador.ativo ?? true,
      };

      if (editingOperador.id) {
        // Editar
        const { error } = await supabase
          .from("operadores")
          .update(payload)
          .eq("id", editingOperador.id);

        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase
          .from("operadores")
          .insert([{ ...payload, criado_em: new Date().toISOString() }]);

        if (error) throw error;
      }

      fecharModal();
      router.refresh();
    } catch (err: any) {
      alert("Erro ao salvar operador: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o operador "${nome}"? Esta ação não pode ser desfeita.`)) return;

    const { error } = await supabase.from("operadores").delete().eq("id", id);

    if (error) {
      alert("Erro ao excluir operador: " + error.message);
    } else {
      router.refresh();
    }
  };

  const handleToggleAtivo = async (op: Operador) => {
    const novoStatus = !op.ativo;
    const { error } = await supabase
      .from("operadores")
      .update({ ativo: novoStatus })
      .eq("id", op.id);

    if (error) {
      alert("Erro ao alterar status: " + error.message);
    } else {
      router.refresh();
    }
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return v;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Operadores</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastre e gerencie os operadores do sistema.</p>
        </div>
        <button
          onClick={abrirNovoOperador}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Operador
        </button>
      </div>

      {/* Search & Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white"
            />
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-white text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Nome</th>
              <th className="px-6 py-4 font-semibold">E-mail</th>
              <th className="px-6 py-4 font-semibold">Telefone</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operadoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  {searchTerm
                    ? "Nenhum operador encontrado para a busca."
                    : "Nenhum operador cadastrado no momento."}
                </td>
              </tr>
            ) : (
              operadoresFiltrados.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        op.ativo
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        {op.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-medium ${op.ativo ? "text-slate-900" : "text-slate-400"}`}>
                        {op.nome}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${op.ativo ? "text-slate-600" : "text-slate-400"}`}>
                    {op.email}
                  </td>
                  <td className={`px-6 py-4 ${op.ativo ? "text-slate-600" : "text-slate-400"}`}>
                    {op.telefone ? formatPhone(op.telefone) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      op.ativo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {op.ativo ? (
                        <><UserCheck className="w-3 h-3" /> Ativo</>
                      ) : (
                        <><UserX className="w-3 h-3" /> Inativo</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleAtivo(op)}
                        title={op.ativo ? "Desativar" : "Ativar"}
                        className={`p-1.5 rounded-md transition-colors ${
                          op.ativo
                            ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {op.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => abrirEdicao(op)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(op.id, op.nome)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && editingOperador && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-4" onClick={fecharModal}>
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-lg transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                {editingOperador.id ? "Editar Operador" : "Novo Operador"}
              </h2>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editingOperador.nome || ""}
                  onChange={(e) => setEditingOperador({ ...editingOperador, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                  placeholder="Nome do operador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={editingOperador.email || ""}
                  onChange={(e) => setEditingOperador({ ...editingOperador, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                  placeholder="email@instituto.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formatPhone(editingOperador.telefone || "")}
                  onChange={(e) => setEditingOperador({ ...editingOperador, telefone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Status:</label>
                <button
                  type="button"
                  onClick={() => setEditingOperador({ ...editingOperador, ativo: !(editingOperador.ativo ?? true) })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    editingOperador.ativo ?? true
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {editingOperador.ativo ?? true ? (
                    <><UserCheck className="w-3 h-3" /> Ativo</>
                  ) : (
                    <><UserX className="w-3 h-3" /> Inativo</>
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
