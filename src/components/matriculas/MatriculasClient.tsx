"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Search, GraduationCap, X, Loader2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

type Matricula = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_matricula: string;
  alunos?: { nome_completo: string; cpf: string | null };
  cursos?: { titulo: string };
  turmas?: { nome: string; horario: string | null };
};

type Aluno = { id: string; nome_completo: string; cpf: string | null };
type Turma = { id: string; nome: string; curso_id: string; horario: string | null; dias_semana: string[] | null; cursos?: { titulo: string } };

export default function MatriculasClient({ matriculasIniciais }: { matriculasIniciais: any[] }) {
  const router = useRouter();
  const [matriculas, setMatriculas] = useState<Matricula[]>(matriculasIniciais);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoadingFormDados, setIsLoadingFormDados] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [selectedAluno, setSelectedAluno] = useState("");
  const [selectedTurma, setSelectedTurma] = useState("");
  const [alunoBusca, setAlunoBusca] = useState("");

  useEffect(() => {
    setMatriculas(matriculasIniciais);
  }, [matriculasIniciais]);

  const abrirModal = async () => {
    setIsModalOpen(true);
    setSelectedAluno("");
    setSelectedTurma("");
    setAlunoBusca("");
    
    if (alunos.length === 0 || turmas.length === 0) {
      setIsLoadingFormDados(true);
      
      const [resAlunos, resTurmas] = await Promise.all([
        supabase.from("alunos").select("id, nome_completo, cpf").order("nome_completo"),
        supabase.from("turmas").select("id, nome, curso_id, horario, dias_semana, cursos(titulo)").order("nome")
      ]);
      
      if (resAlunos.data) setAlunos(resAlunos.data);
      
      // format turmas
      if (resTurmas.data) {
        const formattedTurmas = resTurmas.data.map((t: any) => ({
          ...t,
          cursos: Array.isArray(t.cursos) ? t.cursos[0] : t.cursos
        }));
        setTurmas(formattedTurmas);
      }
      
      setIsLoadingFormDados(false);
    }
  };

  const alunosFiltradosDropdown = useMemo(() => {
    if (!alunoBusca) return alunos;
    const lower = alunoBusca.toLowerCase();
    return alunos.filter(a => a.nome_completo.toLowerCase().includes(lower) || (a.cpf && a.cpf.includes(lower)));
  }, [alunos, alunoBusca]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAluno || !selectedTurma) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não logado");
      
      const { data: op, error: opError } = await supabase.from("operadores").select("id").eq("email", user.email).maybeSingle();
      if (opError) throw new Error("Erro ao buscar operador: " + opError.message);
      if (!op) throw new Error(`Seu email (${user.email}) não está cadastrado na tabela de operadores. Cadastre-se lá primeiro para poder realizar matrículas.`);

      const turmaObj = turmas.find(t => t.id === selectedTurma);
      if (!turmaObj) throw new Error("Turma inválida");

      // Check for duplicates
      const exists = matriculas.some(m => m.aluno_id === selectedAluno && m.turma_id === selectedTurma);
      if (exists) {
        alert("Este aluno já está matriculado nesta turma!");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from("matriculas").insert({
        aluno_id: selectedAluno,
        turma_id: selectedTurma,
        curso_id: turmaObj.curso_id,
        operador_id: op.id,
        data_matricula: new Date().toISOString()
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      router.refresh();
      
    } catch (err: any) {
      alert("Erro ao matricular: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta matrícula? O histórico de presenças pode ser afetado.")) return;
    
    const { error } = await supabase.from("matriculas").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
    } else {
      router.refresh();
    }
  };

  const matriculasFiltradas = useMemo(() => {
    if (!searchTerm) return matriculas;
    const lower = searchTerm.toLowerCase();
    return matriculas.filter(m => 
      m.alunos?.nome_completo.toLowerCase().includes(lower) ||
      m.turmas?.nome.toLowerCase().includes(lower) ||
      m.cursos?.titulo.toLowerCase().includes(lower)
    );
  }, [matriculas, searchTerm]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Matrículas</h1>
          <p className="text-sm text-slate-500 mt-1">Vincule os alunos às turmas e cursos.</p>
        </div>
        <button 
          onClick={abrirModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Matrícula
        </button>
      </div>

      {/* FILTRO E TABELA */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por aluno, curso ou turma..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Aluno</th>
                <th className="px-6 py-4 font-semibold">Curso & Turma</th>
                <th className="px-6 py-4 font-semibold">Data da Matrícula</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matriculasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma matrícula encontrada.
                  </td>
                </tr>
              ) : (
                matriculasFiltradas.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {m.alunos?.nome_completo.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{m.alunos?.nome_completo}</p>
                          <p className="text-xs text-slate-500">CPF: {m.alunos?.cpf || "Não informado"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{m.cursos?.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.turmas?.nome} {m.turmas?.horario ? `• ${m.turmas.horario}` : ""}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(m.data_matricula).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(m.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                        title="Cancelar matrícula"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA MATRÍCULA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Nova Matrícula
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-md p-1 border shadow-sm">
                <X className="w-4 h-4"/>
              </button>
            </div>
            
            <form onSubmit={handleSalvar} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto">
                {isLoadingFormDados ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                    <p>Carregando alunos e turmas...</p>
                  </div>
                ) : (
                  <>
                    {/* ALUNO SELECT */}
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">1. Selecione o Aluno</label>
                      <input 
                        type="text" 
                        placeholder="Pesquisar aluno por nome ou CPF..." 
                        value={alunoBusca}
                        onChange={e => setAlunoBusca(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-2"
                      />
                      <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto bg-slate-50">
                        {alunosFiltradosDropdown.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500 text-center">Nenhum aluno encontrado.</div>
                        ) : (
                          alunosFiltradosDropdown.map(a => (
                            <label key={a.id} className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-blue-50 transition-colors ${selectedAluno === a.id ? 'bg-blue-50' : ''}`}>
                              <input 
                                type="radio" 
                                name="aluno" 
                                value={a.id} 
                                checked={selectedAluno === a.id} 
                                onChange={() => setSelectedAluno(a.id)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{a.nome_completo}</p>
                                <p className="text-xs text-slate-500">{a.cpf || "CPF não informado"}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    {/* TURMA SELECT */}
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">2. Selecione a Turma</label>
                      <select
                        required
                        value={selectedTurma}
                        onChange={(e) => setSelectedTurma(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>Escolha uma turma para matricular</option>
                        {turmas.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.cursos?.titulo ? `${t.cursos.titulo} - ` : ""}{t.nome} 
                            {t.horario ? ` (${t.horario})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || isLoadingFormDados || !selectedAluno || !selectedTurma} 
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <GraduationCap className="w-4 h-4" />}
                  Confirmar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

