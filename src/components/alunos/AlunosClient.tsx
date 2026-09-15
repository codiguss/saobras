"use client";

import { useState } from "react";
import { X, Edit2, Trash2, User, Phone, MapPin, Mail, Save, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type Aluno = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  cpf_responsavel?: string | null;
  nome_responsavel: string | null;
  telefone: string | null;
  telefone_secundario?: string | null;
  email: string | null;
  idade: number | null;
  status_estudante: boolean | null;
  bairro: string | null;
  municipio: string | null;
  criado_por: string | null;
  criado_em: string;
  nis: boolean;
};

export function AlunosClient({ alunos }: { alunos: Aluno[] }) {
  const router = useRouter();
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para controlar os fluxos do modal
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Estados da exclusão
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Funções de Máscara
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return v;
  };

  const maskCpfPreview = (cpf: string | null) => {
    if (!cpf) return "Não informado";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length === 11) {
      return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }
    return "***.***.***-**";
  };

  const startCreating = () => {
    setSelectedAluno(null);
    setFormData({ status_estudante: true, nis: false, idade: undefined });
    setIsCreating(true);
    setIsEditing(true);
  };

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData(selectedAluno || {});
    setIsEditing(true);
  };

  const closePanel = () => {
    setSelectedAluno(null);
    setIsEditing(false);
    setIsCreating(false);
    setShowDeleteConfirm(false);
  };

  const handleCloseAttempt = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isEditing || isCreating) {
      setShowDiscardConfirm(true);
    } else {
      closePanel();
    }
  };

  const handleDiscardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDiscardConfirm(true);
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    if (isCreating) {
      closePanel();
    } else {
      setIsEditing(false);
    }
  };

  const cancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedAluno) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from("alunos")
      .delete()
      .eq("id", selectedAluno.id);

    setIsDeleting(false);

    if (error) {
      alert("Erro ao excluir aluno: " + error.message);
      return;
    }

    setShowDeleteConfirm(false);
    closePanel();
    router.refresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    let dbError;
    const savePayload = {
      nome_completo: formData.nome_completo,
      cpf: formData.cpf,
      cpf_responsavel: formData.cpf_responsavel,
      telefone: formData.telefone,
      telefone_secundario: formData.telefone_secundario,
      email: formData.email,
      idade: formData.idade,
      nome_responsavel: formData.nome_responsavel,
      bairro: formData.bairro,
      municipio: formData.municipio,
      status_estudante: formData.status_estudante,
      nis: formData.nis
    };
    
    if (isCreating) {
      const { error } = await supabase.from("alunos").insert([savePayload]);
      dbError = error;
    } else if (selectedAluno) {
      const { error } = await supabase.from("alunos").update(savePayload).eq("id", selectedAluno.id);
      dbError = error;
    }

    setIsSaving(false);

    if (dbError) {
      alert("Erro ao salvar: " + dbError.message + "\nLembre-se de adicionar as colunas cpf_responsavel e telefone_secundario no banco de dados!");
      return;
    }

    closePanel();
    router.refresh();
  };

  const handleInputChange = (field: keyof Aluno, value: string | number | boolean | null) => {
    let finalValue = value;
    
    if (typeof value === "string") {
      if (field === "cpf" || field === "cpf_responsavel") {
        finalValue = value.replace(/\D/g, "").slice(0, 11);
      } else if (field === "telefone" || field === "telefone_secundario") {
        finalValue = value.replace(/\D/g, "").slice(0, 11);
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const showModal = !!selectedAluno || isCreating;

  const filteredAlunos = (alunos || []).filter((aluno) => {
    const term = searchTerm.toLowerCase();
    return (
      (aluno.nome_completo?.toLowerCase() || "").includes(term) ||
      (aluno.cpf?.toLowerCase() || "").includes(term) ||
      (aluno.telefone?.toLowerCase() || "").includes(term)
    );
  });

  // Lógica de condicional de idade
  const hasAge = formData.idade !== null && formData.idade !== undefined && !isNaN(formData.idade);
  const isMinor = hasAge && formData.idade! < 18;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Alunos</h1>
        <button type="button" onClick={startCreating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
          + Novo Aluno
        </button>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Buscar por nome, CPF ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-4">Nome Completo</th>
              <th className="px-6 py-4">CPF</th>
              <th className="px-6 py-4">Bairro</th>
              <th className="px-6 py-4">Telefone</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAlunos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  {searchTerm ? "Nenhum aluno encontrado para sua busca." : "Nenhum aluno cadastrado no momento."}
                </td>
              </tr>
            ) : (
              filteredAlunos.map((aluno) => (
                <tr key={aluno.id} onClick={() => setSelectedAluno(aluno)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-slate-900 font-medium">{aluno.nome_completo}</td>
                  <td className="px-6 py-4 text-slate-500">{maskCpfPreview(aluno.cpf)}</td>
                  <td className="px-6 py-4 text-slate-500">{aluno.bairro || "Não informado"}</td>
                  <td className="px-6 py-4 text-slate-500">{aluno.telefone ? formatPhone(aluno.telefone) : "Não informado"}</td>
                  <td className="px-6 py-4">
                    {aluno.status_estudante ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Estudante</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Não é estudante</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-4 transition-opacity" onClick={handleCloseAttempt}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h2 className="text-lg font-semibold text-slate-900">
                {isCreating ? "Cadastrar Novo Aluno" : isEditing ? "Editar Dados do Aluno" : "Detalhes do Aluno"}
              </h2>
              <button type="button" onClick={handleCloseAttempt} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!isEditing && selectedAluno ? (
                <>
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedAluno.nome_completo}</h3>
                      <p className="text-sm text-slate-500 mt-1">Cadastrado em {new Date(selectedAluno.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contato</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{selectedAluno.telefone ? formatPhone(selectedAluno.telefone) : "Não informado"}</span>
                          </div>
                          {selectedAluno.telefone_secundario && (
                             <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                               <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                               <span className="truncate">{formatPhone(selectedAluno.telefone_secundario)} (Secundário)</span>
                             </div>
                          )}
                          <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{selectedAluno.email || "Não informado"}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Localização</h4>
                        <div className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-800">{selectedAluno.bairro || "Bairro não informado"}</p>
                            <p className="text-slate-500">{selectedAluno.municipio || "Município não informado"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informações Pessoais</h4>
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-100 space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Idade</p>
                          <p className="text-sm font-medium text-slate-900">{selectedAluno.idade ? `${selectedAluno.idade} anos` : "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">CPF</p>
                          <p className="text-sm font-medium text-slate-900">{selectedAluno.cpf ? formatCPF(selectedAluno.cpf) : "-"}</p>
                        </div>
                        {selectedAluno.idade !== null && selectedAluno.idade < 18 && (
                          <div className="pt-3 mt-3 border-t border-slate-200">
                            <p className="text-xs font-bold text-orange-600 mb-2">Dados do Responsável</p>
                            <div className="mb-2">
                              <p className="text-xs text-slate-500 mb-1">Nome</p>
                              <p className="text-sm font-medium text-slate-900">{selectedAluno.nome_responsavel || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">CPF</p>
                              <p className="text-sm font-medium text-slate-900">{selectedAluno.cpf_responsavel ? formatCPF(selectedAluno.cpf_responsavel) : "-"}</p>
                            </div>
                          </div>
                        )}
                        <div className="pt-3 mt-3 border-t border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Beneficiário NIS?</p>
                          <p className="text-sm font-medium text-slate-900">{selectedAluno.nis ? "Sim (Cadastrado)" : "Não"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <form id="edit-form" onSubmit={handleSave} className="space-y-6">
                  
                  {/* Etapa 1: Idade Desbloqueadora */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Qual a idade do aluno?</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="Ex: 15"
                        value={formData.idade || ""}
                        onChange={(e) => handleInputChange("idade", parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                      />
                    </div>
                    {!hasAge && (
                      <div className="flex items-center text-sm text-slate-500 mt-4 md:mt-0">
                        * Informe a idade primeiro para preencher o resto dos dados.
                      </div>
                    )}
                  </div>

                  {/* Restante do Formulário (Opaco e bloqueado se não tiver idade) */}
                  <div className={`space-y-6 transition-opacity duration-300 ${!hasAge ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input type="text" required disabled={!hasAge} value={formData.nome_completo || ""} onChange={(e) => handleInputChange("nome_completo", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CPF do Aluno</label>
                        <input type="text" required disabled={!hasAge} value={formatCPF(formData.cpf || "")} onChange={(e) => handleInputChange("cpf", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                      </div>
                    </div>

                    {/* Dados do Responsável (Exibido apenas se idade < 18, ou no preview desabilitado se não preencheu idade) */}
                    {(isMinor || !hasAge) && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-md space-y-4">
                        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Dados do Responsável (Obrigatório para Menores)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-orange-900 mb-1">Nome do Responsável</label>
                            <input type="text" required={isMinor} disabled={!hasAge} value={formData.nome_responsavel || ""} onChange={(e) => handleInputChange("nome_responsavel", e.target.value)} className="w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-slate-900 focus:outline-none focus:border-orange-500 text-sm transition-colors disabled:bg-orange-50/50" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-900 mb-1">CPF do Responsável</label>
                            <input type="text" required={isMinor} disabled={!hasAge} value={formatCPF(formData.cpf_responsavel || "")} onChange={(e) => handleInputChange("cpf_responsavel", e.target.value)} className="w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-slate-900 focus:outline-none focus:border-orange-500 text-sm transition-colors disabled:bg-orange-50/50" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Principal</label>
                        <input type="text" required disabled={!hasAge} value={formatPhone(formData.telefone || "")} onChange={(e) => handleInputChange("telefone", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                      </div>
                      {(isMinor || !hasAge) && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Secundário (Opcional)</label>
                          <input type="text" disabled={!hasAge} value={formatPhone(formData.telefone_secundario || "")} onChange={(e) => handleInputChange("telefone_secundario", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                        </div>
                      )}
                      {!isMinor && hasAge && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                          <input type="email" value={formData.email || ""} onChange={(e) => handleInputChange("email", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors" />
                        </div>
                      )}
                    </div>

                    {(isMinor || !hasAge) && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                        <input type="email" disabled={!hasAge} value={formData.email || ""} onChange={(e) => handleInputChange("email", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                        <input type="text" disabled={!hasAge} value={formData.bairro || ""} onChange={(e) => handleInputChange("bairro", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Município</label>
                        <input type="text" disabled={!hasAge} value={formData.municipio || ""} onChange={(e) => handleInputChange("municipio", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100" />
                      </div>
                    </div>

                    <div className="flex gap-6 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                      <label className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${!hasAge ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input type="checkbox" disabled={!hasAge} checked={!!formData.status_estudante} onChange={(e) => handleInputChange("status_estudante", e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50" />
                        É Estudante?
                      </label>
                      <label className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${!hasAge ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input type="checkbox" disabled={!hasAge} checked={!!formData.nis} onChange={(e) => handleInputChange("nis", e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50" />
                        Beneficiário do NIS?
                      </label>
                    </div>

                  </div>
                </form>
              )}
            </div>

            {/* Rodapé */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
              {!isEditing && selectedAluno ? (
                <>
                  <button type="button" onClick={handleDeleteClick} className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                  <button type="button" onClick={startEditing} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <Edit2 className="w-4 h-4" /> Editar Dados
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={handleDiscardClick} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors" disabled={isSaving}>
                    {isCreating ? "Cancelar" : "Descartar Alterações"}
                  </button>
                  <button type="submit" form="edit-form" disabled={isSaving || !hasAge} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{isCreating ? "Cancelar cadastro?" : "Descartar alterações?"}</h3>
            <p className="text-sm text-slate-500 mb-6">Você tem modificações não salvas. Se sair agora, todos os dados digitados serão perdidos.</p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={cancelDiscard} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">Voltar</button>
              <button type="button" onClick={confirmDiscard} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Sim, descartar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir aluno?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Tem certeza que deseja excluir os dados de <strong>{selectedAluno?.nome_completo}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors" disabled={isDeleting}>
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50" disabled={isDeleting}>
                {isDeleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
