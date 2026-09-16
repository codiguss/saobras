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
  Clock,
  ChevronRight,
  CalendarDays,
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
  presencaIdNoBanco: string | null;
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
    return hoje.toISOString().split("T")[0];
  });

  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [buscaTurma, setBuscaTurma] = useState("");

  const [frequencia, setFrequencia] = useState<
    Record<string, PresencaState>
  >({});

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.id === turmaSelecionadaId),
    [turmas, turmaSelecionadaId]
  );

  const cursoDaTurma = useMemo(
    () => cursos.find((c) => c.id === turmaSelecionada?.curso_id),
    [cursos, turmaSelecionada]
  );

  /*
   * ============================================================
   * CARREGAR CURSOS E TURMAS
   * ============================================================
   */
  useEffect(() => {
    const carregarDadosBase = async () => {
      setIsLoadingInitial(true);
      setErro("");

      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !userData?.user) {
        setErro("Usuário não autenticado. Faça login novamente.");
        setIsLoadingInitial(false);
        return;
      }

      const [resCursos, resTurmas] = await Promise.all([
        supabase
          .from("cursos")
          .select("id, titulo")
          .order("titulo"),

        supabase
          .from("turmas")
          .select(
            "id, nome, curso_id, turno, horario, dias_semana"
          )
          .order("nome"),
      ]);

      if (resCursos.error) {
        console.error(resCursos.error);
      }

      if (resTurmas.error) {
        console.error(resTurmas.error);
      }

      setCursos((resCursos.data || []) as Curso[]);
      setTurmas((resTurmas.data || []) as Turma[]);

      setIsLoadingInitial(false);
    };

    carregarDadosBase();
  }, []);

  /*
   * ============================================================
   * CARREGAR ALUNOS E PRESENÇAS
   * ============================================================
   */
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
        /*
         * 1. Buscar matrículas da turma
         */
        const {
          data: matriculas,
          error: matriculasError,
        } = await supabase
          .from("matriculas")
          .select("aluno_id")
          .eq("turma_id", turmaSelecionadaId);

        if (matriculasError) {
          throw matriculasError;
        }

        const alunoIds = Array.from(
          new Set(
            (matriculas || [])
              .map((m) => m.aluno_id)
              .filter(Boolean)
          )
        );

        /*
         * Se não houver alunos
         */
        if (alunoIds.length === 0) {
          setAlunos([]);
          setFrequencia({});
          setIsLoadingAlunos(false);
          return;
        }

        /*
         * 2. Buscar dados dos alunos
         */
        const {
          data: alunosData,
          error: alunosError,
        } = await supabase
          .from("alunos")
          .select("id, nome_completo")
          .in("id", alunoIds)
          .order("nome_completo");

        if (alunosError) {
          throw alunosError;
        }

        setAlunos((alunosData || []) as Aluno[]);

        /*
         * 3. Buscar presenças do dia e da turma
         */
        const dataFiltroInicio = `${dataSelecionada}T00:00:00.000Z`;
        const dataFiltroFim = `${dataSelecionada}T23:59:59.999Z`;

        const {
          data: presencasData,
          error: presencasError,
        } = await supabase
          .from("presencas")
          .select("id, aluno_id")
          .eq("turma_id", turmaSelecionadaId)
          .gte("data_hora", dataFiltroInicio)
          .lte("data_hora", dataFiltroFim);

        if (presencasError) {
          throw presencasError;
        }

        /*
         * 4. Montar estado inicial
         *
         * Todos começam como falta.
         * Quem estiver no banco fica como presente.
         */
        const freqInicial: Record<string, PresencaState> = {};

        alunoIds.forEach((id) => {
          freqInicial[id] = {
            presente: false,
            presencaIdNoBanco: null,
          };
        });

        (presencasData || []).forEach((p) => {
          if (freqInicial[p.aluno_id]) {
            freqInicial[p.aluno_id] = {
              presente: true,
              presencaIdNoBanco: p.id,
            };
          }
        });

        setFrequencia(freqInicial);
      } catch (err: any) {
        console.error(err);

        setErro(
          "Erro ao carregar os dados da turma: " +
            (err?.message || "Erro desconhecido.")
        );

        setAlunos([]);
        setFrequencia({});
      } finally {
        setIsLoadingAlunos(false);
      }
    };

    carregarTurmaAtual();
  }, [turmaSelecionadaId, dataSelecionada]);

  /*
   * ============================================================
   * TOGGLE PRESENÇA
   * ============================================================
   */
  const togglePresenca = (alunoId: string) => {
    setFrequencia((prev) => {
      const atual = prev[alunoId];

      if (!atual) {
        return prev;
      }

      return {
        ...prev,
        [alunoId]: {
          ...atual,
          presente: !atual.presente,
        },
      };
    });

    setSucesso("");
  };

  /*
   * ============================================================
   * MARCAR TODOS
   * ============================================================
   */
  const marcarTodos = (presente: boolean) => {
    setFrequencia((prev) => {
      const novo = { ...prev };

      Object.keys(novo).forEach((id) => {
        novo[id] = {
          ...novo[id],
          presente,
        };
      });

      return novo;
    });

    setSucesso("");
  };

  /*
   * ============================================================
   * BUSCAR OPERADOR LOGADO
   * ============================================================
   */
  const getOperadorId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      throw new Error("Usuário não autenticado.");
    }

    const {
      data: op,
      error: opError,
    } = await supabase
      .from("operadores")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (opError) {
      throw new Error(
        "Erro ao buscar operador: " + opError.message
      );
    }

    if (!op) {
      throw new Error(
        `Seu email (${user.email}) não está cadastrado na tabela de operadores. Cadastre-se lá para poder salvar chamadas.`
      );
    }

    return op.id;
  };

  /*
   * ============================================================
   * SALVAR FREQUÊNCIA
   * ============================================================
   */
  const handleSalvar = async () => {
    if (!turmaSelecionadaId || alunos.length === 0) {
      return;
    }

    setIsSaving(true);
    setErro("");
    setSucesso("");

    try {
      const operadorId = await getOperadorId();

      const insercoes: any[] = [];
      const exclusoes: string[] = [];

      const dataHoraRegistro =
        `${dataSelecionada}T12:00:00.000Z`;

      Object.entries(frequencia).forEach(
        ([alunoId, state]) => {
          /*
           * Presente e ainda não salvo
           */
          if (
            state.presente &&
            !state.presencaIdNoBanco
          ) {
            insercoes.push({
              aluno_id: alunoId,
              curso_id: turmaSelecionada?.curso_id,
              turma_id: turmaSelecionadaId,
              operador_id: operadorId,
              metodo: "manual",
              data_hora: dataHoraRegistro,
            });
          }

          /*
           * Estava salvo e foi alterado para falta
           */
          else if (
            !state.presente &&
            state.presencaIdNoBanco
          ) {
            exclusoes.push(state.presencaIdNoBanco);
          }
        }
      );

      if (
        insercoes.length === 0 &&
        exclusoes.length === 0
      ) {
        setSucesso(
          "Nenhuma alteração de frequência detectada para salvar."
        );

        setIsSaving(false);
        return;
      }

      /*
       * Excluir presenças removidas
       */
      if (exclusoes.length > 0) {
        const {
          error: delErr,
        } = await supabase
          .from("presencas")
          .delete()
          .in("id", exclusoes);

        if (delErr) {
          throw delErr;
        }
      }

      /*
       * Inserir novas presenças
       */
      if (insercoes.length > 0) {
        const {
          error: insErr,
        } = await supabase
          .from("presencas")
          .insert(insercoes);

        if (insErr) {
          throw insErr;
        }
      }

      setSucesso(
        "Frequência salva com sucesso no banco de dados!"
      );

      /*
       * Recarregar a turma
       */
      const turmaIdAtual = turmaSelecionada?.id || "";

      setTurmaSelecionadaId("");

      setTimeout(() => {
        setTurmaSelecionadaId(turmaIdAtual);
      }, 100);
    } catch (err: any) {
      console.error(err);

      setErro(
        "Falha ao salvar a chamada: " +
          (err?.message || "Erro desconhecido.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * ============================================================
   * FILTRO DOS ALUNOS
   * ============================================================
   */
  const alunosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) {
      return alunos;
    }

    return alunos.filter((a) =>
      a.nome_completo
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [alunos, searchTerm]);

  /*
   * ============================================================
   * FILTRO DAS TURMAS
   * ============================================================
   */
  const turmasFiltradas = useMemo(() => {
    if (!buscaTurma.trim()) {
      return turmas;
    }

    const termo = buscaTurma.toLowerCase();

    return turmas.filter((turma) => {
      const curso = cursos.find(
        (c) => c.id === turma.curso_id
      );

      const texto = [
        turma.nome,
        curso?.titulo || "",
        turma.turno || "",
        turma.horario || "",
        ...(turma.dias_semana || []),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [turmas, cursos, buscaTurma]);

  const qtdPresentes = Object.values(
    frequencia
  ).filter((f) => f.presente).length;

  const qtdFaltas = Math.max(
    alunos.length - qtdPresentes,
    0
  );

  /*
   * ============================================================
   * FORMATAR DATA
   * ============================================================
   */
  const dataFormatada = useMemo(() => {
    if (!dataSelecionada) {
      return "";
    }

    const [ano, mes, dia] =
      dataSelecionada.split("-");

    return `${dia}/${mes}/${ano}`;
  }, [dataSelecionada]);

  /*
   * ============================================================
   * RETORNO
   * ============================================================
   */
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-10">

      {/* ======================================================
          CABEÇALHO
      ======================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              <UserCheck className="w-7 h-7 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Diário de Classe
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Realize a chamada e controle a
                frequência dos alunos.
              </p>
            </div>
          </div>

          {/* DATA */}
          <div className="flex flex-col gap-1 min-w-[230px]">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Data da Chamada
            </label>

            <div className="relative">
              <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) =>
                  setDataSelecionada(e.target.value)
                }
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          ALERTAS
      ======================================================= */}
      {erro && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

          <p className="font-medium text-sm">
            {erro}
          </p>

          <button
            onClick={() => setErro("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {sucesso && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />

          <p className="font-medium text-sm">
            {sucesso}
          </p>

          <button
            onClick={() => setSucesso("")}
            className="ml-auto text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================
          SELEÇÃO DE TURMAS
      ======================================================= */}
      {!turmaSelecionadaId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* CABEÇALHO DA SEÇÃO */}
          <div className="p-6 border-b border-slate-200">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Selecione a Turma
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Escolha uma turma abaixo para
                  realizar a chamada.
                </p>
              </div>

              {/* BUSCA TURMA */}
              {!isLoadingInitial &&
                turmas.length > 0 && (
                  <div className="relative w-full md:w-80">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      placeholder="Buscar turma ou curso..."
                      value={buscaTurma}
                      onChange={(e) =>
                        setBuscaTurma(e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
            </div>
          </div>

          {/* LISTA DE TURMAS */}
          <div className="p-6">

            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />

                <p>
                  Carregando turmas...
                </p>
              </div>
            ) : turmas.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />

                <h3 className="text-lg font-bold text-slate-700">
                  Nenhuma turma cadastrada
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Cadastre uma turma antes de realizar
                  a chamada.
                </p>
              </div>
            ) : turmasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                <p className="font-semibold text-slate-600">
                  Nenhuma turma encontrada.
                </p>

                <button
                  onClick={() => setBuscaTurma("")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {turmasFiltradas.map((turma) => {
                  const curso = cursos.find(
                    (c) => c.id === turma.curso_id
                  );

                  const dias =
                    turma.dias_semana || [];

                  return (
                    <button
                      key={turma.id}
                      type="button"
                      onClick={() => {
                        setTurmaSelecionadaId(
                          turma.id
                        );
                        setSearchTerm("");
                        setSucesso("");
                        setErro("");
                      }}
                      className="group text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >

                      {/* ÍCONE + NOME */}
                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-3 min-w-0">

                          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide truncate">
                              {curso?.titulo ||
                                "Curso não informado"}
                            </p>

                            <h3 className="text-lg font-bold text-slate-900 truncate mt-0.5">
                              {turma.nome}
                            </h3>
                          </div>

                        </div>

                        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors">
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>

                      </div>

                      {/* INFORMAÇÕES */}
                      <div className="mt-5 space-y-3">

                        {/* HORÁRIO */}
                        {turma.horario && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4 text-slate-600" />
                            </div>

                            <div>
                              <p className="text-[11px] text-slate-400 font-medium uppercase">
                                Horário
                              </p>

                              <p className="text-sm font-semibold text-slate-700">
                                {turma.horario}
                                {turma.turno
                                  ? ` • ${turma.turno}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* DIAS */}
                        {dias.length > 0 && (
                          <div className="flex items-start gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <CalendarDays className="w-4 h-4 text-slate-600" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[11px] text-slate-400 font-medium uppercase">
                                Dias
                              </p>

                              <p className="text-sm font-semibold text-slate-700">
                                {dias.join(", ")}
                              </p>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* RODAPÉ DO CARD */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">

                        <div className="flex items-center gap-2 text-slate-500">
                          <Users className="w-4 h-4" />

                          <span className="text-xs font-medium">
                            Alunos matriculados
                          </span>
                        </div>

                        <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700">
                          Fazer chamada →
                        </span>

                      </div>

                    </button>
                  );
                })}

              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================
          CHAMADA DA TURMA SELECIONADA
      ======================================================= */}
      {turmaSelecionadaId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* CABEÇALHO DA TURMA */}
          <div className="p-6 bg-slate-50 border-b border-slate-200">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">

              <div className="flex items-start gap-4">

                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    {cursoDaTurma?.titulo ||
                      "Curso não informado"}
                  </p>

                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {turmaSelecionada?.nome ||
                      "Turma"}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-slate-500">

                    {turmaSelecionada?.horario && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {turmaSelecionada.horario}
                      </span>
                    )}

                    {turmaSelecionada?.dias_semana &&
                      turmaSelecionada.dias_semana
                        .length > 0 && (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4" />
                          {turmaSelecionada.dias_semana.join(
                            ", "
                          )}
                        </span>
                      )}

                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4" />
                      {dataFormatada}
                    </span>

                  </div>
                </div>

              </div>

              {/* TROCAR TURMA */}
              <button
                type="button"
                onClick={() => {
                  setTurmaSelecionadaId("");
                  setAlunos([]);
                  setFrequencia({});
                  setSearchTerm("");
                  setSucesso("");
                  setErro("");
                }}
                className="self-start lg:self-center px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-colors"
              >
                ← Trocar turma
              </button>

            </div>

          </div>

          {/* ====================================================
              RESUMO
          ===================================================== */}
          <div className="p-6 border-b border-slate-200">

            {alunos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>

                    <div>
                      <p className="text-xs text-blue-600 font-semibold">
                        TOTAL
                      </p>

                      <p className="text-xl font-bold text-slate-900">
                        {alunos.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>

                    <div>
                      <p className="text-xs text-emerald-600 font-semibold">
                        PRESENTES
                      </p>

                      <p className="text-xl font-bold text-slate-900">
                        {qtdPresentes}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <UserX className="w-5 h-5 text-red-600" />
                    </div>

                    <div>
                      <p className="text-xs text-red-600 font-semibold">
                        FALTAS
                      </p>

                      <p className="text-xl font-bold text-slate-900">
                        {qtdFaltas}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* ====================================================
              LISTA DE ALUNOS
          ===================================================== */}
          <div className="p-6">

            {isLoadingAlunos ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-9 h-9 animate-spin mb-4 text-blue-500" />

                <p className="font-medium">
                  Buscando lista de alunos e histórico
                  do dia...
                </p>
              </div>
            ) : alunos.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">

                <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />

                <h3 className="text-lg font-bold text-slate-700">
                  Turma Vazia
                </h3>

                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  Esta turma não possui alunos
                  matriculados no momento. Realize
                  matrículas primeiro para fazer a
                  chamada.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setTurmaSelecionadaId("")
                  }
                  className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                >
                  Escolher outra turma
                </button>

              </div>
            ) : (
              <div className="space-y-5">

                {/* BUSCA E AÇÕES */}
                <div className="flex flex-col md:flex-row gap-3">

                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      placeholder="Buscar aluno na lista..."
                      value={searchTerm}
                      onChange={(e) =>
                        setSearchTerm(e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        marcarTodos(true)
                      }
                      className="px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Todos presentes
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        marcarTodos(false)
                      }
                      className="px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Todos faltaram
                    </button>

                  </div>

                </div>

                {/* CONTADOR DA BUSCA */}
                {searchTerm && (
                  <p className="text-sm text-slate-500">
                    Mostrando{" "}
                    <strong>
                      {alunosFiltrados.length}
                    </strong>{" "}
                    de{" "}
                    <strong>
                      {alunos.length}
                    </strong>{" "}
                    alunos.
                  </p>
                )}

                {/* ALUNOS */}
                {alunosFiltrados.length === 0 ? (
                  <div className="text-center py-10">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                    <p className="text-slate-500 font-medium">
                      Nenhum aluno encontrado na busca.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                    {alunosFiltrados.map((aluno) => {
                      const state =
                        frequencia[aluno.id];

                      const presente =
                        state?.presente || false;

                      const hasSavedDbState =
                        state?.presencaIdNoBanco !==
                        null;

                      return (
                        <button
                          type="button"
                          key={aluno.id}
                          onClick={() =>
                            togglePresenca(aluno.id)
                          }
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                            presente
                              ? "bg-emerald-50 border-emerald-500 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >

                          <div className="flex items-center gap-3 overflow-hidden">

                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                                presente
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {aluno.nome_completo
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">

                              <p
                                className="font-bold text-slate-900 text-sm truncate"
                                title={
                                  aluno.nome_completo
                                }
                              >
                                {aluno.nome_completo}
                              </p>

                              <p
                                className={`text-xs font-medium mt-1 ${
                                  presente
                                    ? "text-emerald-700"
                                    : "text-slate-500"
                                }`}
                              >
                                {presente
                                  ? "Presente"
                                  : "Falta"}

                                {hasSavedDbState &&
                                  presente && (
                                    <span className="ml-1 text-[10px] opacity-70">
                                      • Salvo
                                    </span>
                                  )}
                              </p>

                            </div>

                          </div>

                          <div className="shrink-0 ml-3">

                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-colors ${
                                presente
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {presente && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>

                          </div>

                        </button>
                      );
                    })}

                  </div>
                )}

              </div>
            )}

          </div>

          {/* ====================================================
              RODAPÉ
          ===================================================== */}
          {alunos.length > 0 && !isLoadingAlunos && (
            <div className="p-6 bg-slate-50 border-t border-slate-200">

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                <div className="text-sm text-slate-500 text-center sm:text-left">
                  <span className="font-semibold text-slate-700">
                    {qtdPresentes}
                  </span>{" "}
                  presentes de{" "}
                  <span className="font-semibold text-slate-700">
                    {alunos.length}
                  </span>{" "}
                  alunos.
                </div>

                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={isSaving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}

                  {isSaving
                    ? "Salvando..."
                    : "Salvar Presenças"}
                </button>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
