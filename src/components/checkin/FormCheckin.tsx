"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Check,
  Loader2,
  Users,
  AlertCircle,
  Calendar as CalendarIcon,
  Search,
  BookOpen,
  UserCheck,
  UserX,
  X,
  Save,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Curso = {
  id: string;
  titulo: string;
};

type Turma = {
  id: string;
  nome: string;
  curso_id: string;
  turno: string | null;
  horario: string | null;
  dias_semana: string[] | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
};

type PresencaState = {
  presente: boolean;
  presencaIdNoBanco: string | null; // Se existir no banco, guarda o ID para poder deletar depois se necessário
};

export default function FormCheckin() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingAlunos, setIsLoadingAlunos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0]; // "YYYY-MM-DD"
  });

  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Estado das presenças: Mapeia aluno_id para o estado de presença dele
  const [frequencia, setFrequencia] = useState<Record<string, PresencaState>>({});

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.id === turmaSelecionadaId),
    [turmas, turmaSelecionadaId]
  );

  const cursoDaTurma = useMemo(
    () => cursos.find((c) => c.id === turmaSelecionada?.curso_id),
    [cursos, turmaSelecionada]
  );

  // Inicialização (Cursos e Turmas)
  useEffect(() => {
    const carregarDadosBase = async () => {
      setIsLoadingInitial(true);
      setErro("");

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        setErro("Usuário não autenticado. Faça login novamente.");
        setIsLoadingInitial(false);
        return;
      }

      const [resCursos, resTurmas] = await Promise.all([
        supabase.from("cursos").select("id, titulo").order("titulo"),
        supabase.from("turmas").select("id, nome, curso_id, turno, horario, dias_semana").order("nome")
      ]);

      if (resCursos.error) console.error(resCursos.error);
      if (resTurmas.error) console.error(resTurmas.error);

      setCursos(resCursos.data || []);
      setTurmas(resTurmas.data || []);
      
      setIsLoadingInitial(false);
    };

    carregarDadosBase();
  }, []);

  // Carregar Alunos e Presenças quando a Turma e a Data mudam
  useEffect(() => {
    if (!turmaSelecionadaId || !dataSelecionada) {
      setAlunos([]);
      setFrequencia({});
      return;
    }

    const carregarTurmaAtual = async () => {
      setIsLoadingAlunos(true);
      setErro("");
      setSucesso("");
      setFrequencia({});

      try {
        // 1. Busca matrículas da turma
        const { data: matriculas, error: matriculasError } = await supabase
          .from("matriculas")
          .select("aluno_id")
          .eq("turma_id", turmaSelecionadaId);

        if (matriculasError) throw matriculasError;

        const alunoIds = Array.from(new Set((matriculas || []).map(m => m.aluno_id).filter(Boolean)));

        if (alunoIds.length === 0) {
          setAlunos([]);
          setIsLoadingAlunos(false);
          return;
        }

        // 2. Busca dados dos alunos
        const { data: alunosData, error: alunosError } = await supabase
          .from("alunos")
          .select("id, nome_completo")
          .in("id", alunoIds)
          .order("nome_completo");

        if (alunosError) throw alunosError;
        setAlunos((alunosData || []) as Aluno[]);

        // 3. Busca presenças DESSA DATA E TURMA no banco
        const dataFiltroInicio = `${dataSelecionada}T00:00:00.000Z`;
        const dataFiltroFim = `${dataSelecionada}T23:59:59.999Z`;

        const { data: presencasData, error: presencasError } = await supabase
          .from("presencas")
          .select("id, aluno_id")
          .eq("turma_id", turmaSelecionadaId)
          .gte("data_hora", dataFiltroInicio)
          .lte("data_hora", dataFiltroFim);

        if (presencasError) throw presencasError;

        // 4. Monta o estado inicial de frequencia
        const freqInicial: Record<string, PresencaState> = {};
        
        // Define todos como falta por padrão
        alunoIds.forEach(id => {
          freqInicial[id] = { presente: false, presencaIdNoBanco: null };
        });

        // Marca os que estão no banco como presentes
        (presencasData || []).forEach(p => {
          if (freqInicial[p.aluno_id]) {
            freqInicial[p.aluno_id] = { presente: true, presencaIdNoBanco: p.id };
          }
        });

        setFrequencia(freqInicial);

      } catch (err: any) {
        console.error(err);
        setErro("Erro ao carregar os dados da turma: " + err.message);
        setAlunos([]);
      } finally {
        setIsLoadingAlunos(false);
      }
    };

    carregarTurmaAtual();
  }, [turmaSelecionadaId, dataSelecionada]);

  // Ações de Presença
  const togglePresenca = (alunoId: string) => {
    setFrequencia(prev => {
      const atual = prev[alunoId];
      if (!atual) return prev;
      return {
        ...prev,
        [alunoId]: { ...atual, presente: !atual.presente }
      };
    });
    setSucesso("");
  };

  const marcarTodos = (presente: boolean) => {
    setFrequencia(prev => {
      const novo = { ...prev };
      Object.keys(novo).forEach(id => {
        novo[id] = { ...novo[id], presente };
      });
      return novo;
    });
    setSucesso("");
  };

  // Obter operador logado
  const getOperadorId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Usuário não autenticado.");

    const { data: op, error: opError } = await supabase.from("operadores").select("id").eq("email", user.email).maybeSingle();
    if (opError) throw new Error("Erro ao buscar operador: " + opError.message);
    if (!op) throw new Error(`Seu email (${user.email}) não está cadastrado na tabela de operadores. Cadastre-se lá para poder salvar chamadas.`);
    return op.id;
  };

  // Salvar
  const handleSalvar = async () => {
    if (!turmaSelecionadaId || alunos.length === 0) return;
    
    setIsSaving(true);
    setErro("");
    setSucesso("");

    try {
      const operadorId = await getOperadorId();
      
      const insercoes: any[] = [];
      const exclusoes: string[] = []; // IDs de presença para deletar

      // O horário que vai pro banco é meio-dia da data selecionada, apenas para registro padrão do dia
      const dataHoraRegistro = `${dataSelecionada}T12:00:00.000Z`;

      Object.entries(frequencia).forEach(([alunoId, state]) => {
        // Se está presente na tela, mas NÃO existia no banco -> INSERIR
        if (state.presente && !state.presencaIdNoBanco) {
          insercoes.push({
            aluno_id: alunoId,
            curso_id: turmaSelecionada?.curso_id,
            turma_id: turmaSelecionadaId,
            operador_id: operadorId,
            metodo: "manual",
            data_hora: dataHoraRegistro
          });
        }
        // Se está ausente na tela, mas EXISTIA no banco -> DELETAR
        else if (!state.presente && state.presencaIdNoBanco) {
          exclusoes.push(state.presencaIdNoBanco);
        }
      });

      if (insercoes.length === 0 && exclusoes.length === 0) {
        setSucesso("Nenhuma alteração de frequência detectada para salvar.");
        setIsSaving(false);
        return;
      }

      // Executar exclusões
      if (exclusoes.length > 0) {
        const { error: delErr } = await supabase.from("presencas").delete().in("id", exclusoes);
        if (delErr) throw delErr;
      }

      // Executar inserções
      if (insercoes.length > 0) {
        const { error: insErr } = await supabase.from("presencas").insert(insercoes);
        if (insErr) throw insErr;
      }

      setSucesso("Frequência salva com sucesso no banco de dados!");

      // Força a recarga para pegar os novos IDs gerados no banco
      setTurmaSelecionadaId(""); 
      setTimeout(() => setTurmaSelecionadaId(turmaSelecionada?.id || ""), 100);

    } catch (err: any) {
      console.error(err);
      setErro("Falha ao salvar a chamada: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtro de alunos
  const alunosFiltrados = useMemo(() => {
    if (!searchTerm) return alunos;
    return alunos.filter(a => a.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [alunos, searchTerm]);

  const qtdPresentes = Object.values(frequencia).filter(f => f.presente).length;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Diário de Classe</h1>
              <p className="text-sm text-slate-500 mt-1">Realize a chamada e controle a frequência dos alunos.</p>
            </div>
          </div>
          
          {/* Seletor de Data Global */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data da Chamada</label>
            <div className="relative">
              <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ALERTAS */}
      {erro && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium text-sm">{erro}</p>
        </div>
      )}
      {sucesso && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium text-sm">{sucesso}</p>
        </div>
      )}

      {/* FILTROS E SELEÇÃO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Selecione a Turma</label>
        {isLoadingInitial ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm p-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando turmas...
          </div>
        ) : (
          <select
            value={turmaSelecionadaId}
            onChange={(e) => setTurmaSelecionadaId(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma turma para realizar a chamada...</option>
            {turmas.map(t => {
              const c = cursos.find(curso => curso.id === t.curso_id);
              return (
                <option key={t.id} value={t.id}>
                  {c?.titulo ? `${c.titulo} - ` : ""}{t.nome} 
                  {t.horario ? ` (${t.horario})` : ""} 
                  {t.dias_semana && t.dias_semana.length > 0 ? ` [${t.dias_semana.join(", ")}]` : ""}
                </option>
              )
            })}
          </select>
        )}
      </div>

      {/* LISTA DE ALUNOS */}
      {turmaSelecionadaId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
          
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" /> Alunos Matriculados
              </h2>
              {alunos.length > 0 && (
                <div className="mt-2 flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                    Total: {alunos.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                    Presentes: {qtdPresentes}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                    Faltas: {alunos.length - qtdPresentes}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {alunos.length > 0 && (
                <>
                  <button onClick={() => marcarTodos(true)} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium text-sm rounded-lg transition-colors flex items-center gap-2">
                    <Check className="w-4 h-4"/> Presentes
                  </button>
                  <button onClick={() => marcarTodos(false)} className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium text-sm rounded-lg transition-colors flex items-center gap-2">
                    <X className="w-4 h-4"/> Faltas
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-6">
            {isLoadingAlunos ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Buscando lista de alunos e histórico do dia...</p>
              </div>
            ) : alunos.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Turma Vazia</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">Esta turma não possui alunos matriculados no momento. Realize matrículas primeiro para fazer a chamada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar aluno na lista..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {alunosFiltrados.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">Nenhum aluno encontrado na busca.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alunosFiltrados.map((aluno) => {
                      const state = frequencia[aluno.id];
                      const presente = state?.presente || false;
                      const hasSavedDbState = state?.presencaIdNoBanco !== null; // Se já estava salvo no banco

                      return (
                        <div 
                          key={aluno.id}
                          onClick={() => togglePresenca(aluno.id)}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            presente 
                              ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                              presente ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {aluno.nome_completo.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate" title={aluno.nome_completo}>
                                {aluno.nome_completo}
                              </p>
                              <p className={`text-xs font-medium mt-0.5 ${presente ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {presente ? 'Presente' : 'Falta'}
                                {hasSavedDbState && presente && <span className="ml-1 text-[10px] opacity-70">(Salvo)</span>}
                              </p>
                            </div>
                          </div>
                          
                          <div className="shrink-0 ml-2">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${
                              presente ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                            }`}>
                              {presente && <Check className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RODAPÉ E BOTÃO DE SALVAR */}
          {alunos.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSalvar}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? "Salvando..." : "Salvar Presenças"}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
