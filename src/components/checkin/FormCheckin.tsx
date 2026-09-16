```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  Filter,
  RotateCcw,
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

  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  });

  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [buscaTurma, setBuscaTurma] = useState("");

  // ==========================================================
  // FILTROS
  // ==========================================================

  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");

  const [frequencia, setFrequencia] = useState<
    Record<string, PresencaState>
  >({});

  // ==========================================================
  // TURMA SELECIONADA
  // ==========================================================

  const turmaSelecionada = useMemo(() => {
    return turmas.find((t) => t.id === turmaSelecionadaId);
  }, [turmas, turmaSelecionadaId]);

  const cursoDaTurma = useMemo(() => {
    if (!turmaSelecionada) return undefined;

    return cursos.find(
      (c) => c.id === turmaSelecionada.curso_id
    );
  }, [cursos, turmaSelecionada]);

  // ==========================================================
  // CARREGAR CURSOS E TURMAS
  // ==========================================================

  useEffect(() => {
    const carregarDadosBase = async () => {
      setIsLoadingInitial(true);
      setErro("");

      try {
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
          console.error(
            "Erro ao carregar cursos:",
            resCursos.error
          );

          setErro(
            "Erro ao carregar os cursos: " +
              resCursos.error.message
          );
        }

        if (resTurmas.error) {
          console.error(
            "Erro ao carregar turmas:",
            resTurmas.error
          );

          setErro(
            "Erro ao carregar as turmas: " +
              resTurmas.error.message
          );
        }

        setCursos(
          (resCursos.data || []) as Curso[]
        );

        setTurmas(
          (resTurmas.data || []) as Turma[]
        );

        console.log(
          "Cursos carregados:",
          resCursos.data
        );

        console.log(
          "Turmas carregadas:",
          resTurmas.data
        );
      } catch (error: any) {
        console.error(
          "Erro geral ao carregar dados:",
          error
        );

        setErro(
          "Não foi possível carregar as turmas: " +
            (error?.message || "Erro desconhecido.")
        );
      } finally {
        setIsLoadingInitial(false);
      }
    };

    carregarDadosBase();
  }, []);

  // ==========================================================
  // CARREGAR ALUNOS E PRESENÇAS
  // ==========================================================

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
        // ======================================================
        // 1. BUSCAR MATRÍCULAS DA TURMA
        // ======================================================

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

        // ======================================================
        // SE NÃO EXISTIR ALUNO
        // ======================================================

        if (alunoIds.length === 0) {
          setAlunos([]);
          setFrequencia({});
          return;
        }

        // ======================================================
        // 2. BUSCAR ALUNOS
        // ======================================================

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

        setAlunos(
          (alunosData || []) as Aluno[]
        );

        // ======================================================
        // 3. BUSCAR PRESENÇAS DO DIA
        // ======================================================

        const dataFiltroInicio =
          `${dataSelecionada}T00:00:00.000Z`;

        const dataFiltroFim =
          `${dataSelecionada}T23:59:59.999Z`;

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

        // ======================================================
        // 4. MONTAR FREQUÊNCIA
        // ======================================================

        const freqInicial: Record<
          string,
          PresencaState
        > = {};

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
      } catch (error: any) {
        console.error(
          "Erro ao carregar turma:",
          error
        );

        setErro(
          "Erro ao carregar os dados da turma: " +
            (error?.message || "Erro desconhecido.")
        );

        setAlunos([]);
        setFrequencia({});
      } finally {
        setIsLoadingAlunos(false);
      }
    };

    carregarTurmaAtual();
  }, [turmaSelecionadaId, dataSelecionada]);

  // ==========================================================
  // ALTERAR PRESENÇA
  // ==========================================================

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

  // ==========================================================
  // MARCAR TODOS
  // ==========================================================

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

  // ==========================================================
  // OPERADOR LOGADO
  // ==========================================================

  const getOperadorId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      throw new Error(
        "Usuário não autenticado."
      );
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
        "Erro ao buscar operador: " +
          opError.message
      );
    }

    if (!op) {
      throw new Error(
        `Seu email (${user.email}) não está cadastrado na tabela de operadores.`
      );
    }

    return op.id;
  };

  // ==========================================================
  // SALVAR FREQUÊNCIA
  // ==========================================================

  const handleSalvar = async () => {
    if (
      !turmaSelecionadaId ||
      alunos.length === 0
    ) {
      return;
    }

    setIsSaving(true);
    setErro("");
    setSucesso("");

    try {
      const operadorId =
        await getOperadorId();

      const insercoes: any[] = [];
      const exclusoes: string[] = [];

      const dataHoraRegistro =
        `${dataSelecionada}T12:00:00.000Z`;

      Object.entries(frequencia).forEach(
        ([alunoId, state]) => {
          // MARCAR COMO PRESENTE

          if (
            state.presente &&
            !state.presencaIdNoBanco
          ) {
            insercoes.push({
              aluno_id: alunoId,
              curso_id:
                turmaSelecionada?.curso_id,
              turma_id:
                turmaSelecionadaId,
              operador_id: operadorId,
              metodo: "manual",
              data_hora:
                dataHoraRegistro,
            });
          }

          // REMOVER PRESENÇA

          if (
            !state.presente &&
            state.presencaIdNoBanco
          ) {
            exclusoes.push(
              state.presencaIdNoBanco
            );
          }
        }
      );

      // NENHUMA ALTERAÇÃO

      if (
        insercoes.length === 0 &&
        exclusoes.length === 0
      ) {
        setSucesso(
          "Nenhuma alteração de frequência detectada."
        );

        return;
      }

      // EXCLUIR PRESENÇAS

      if (exclusoes.length > 0) {
        const {
          error: deleteError,
        } = await supabase
          .from("presencas")
          .delete()
          .in("id", exclusoes);

        if (deleteError) {
          throw deleteError;
        }
      }

      // INSERIR PRESENÇAS

      if (insercoes.length > 0) {
        const {
          error: insertError,
        } = await supabase
          .from("presencas")
          .insert(insercoes);

        if (insertError) {
          throw insertError;
        }
      }

      setSucesso(
        "Frequência salva com sucesso!"
      );

      const idTurmaAtual =
        turmaSelecionadaId;

      setTurmaSelecionadaId("");

      setTimeout(() => {
        setTurmaSelecionadaId(
          idTurmaAtual
        );
      }, 100);
    } catch (error: any) {
      console.error(
        "Erro ao salvar frequência:",
        error
      );

      setErro(
        "Falha ao salvar a chamada: " +
          (error?.message ||
            "Erro desconhecido.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================================
  // FILTRO DE ALUNOS
  // ==========================================================

  const alunosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) {
      return alunos;
    }

    const termo =
      searchTerm.toLowerCase();

    return alunos.filter((aluno) =>
      aluno.nome_completo
        .toLowerCase()
        .includes(termo)
    );
  }, [alunos, searchTerm]);

  // ==========================================================
  // TURNOS DISPONÍVEIS
  // ==========================================================

  const turnosDisponiveis = useMemo(() => {
    const turnos = turmas
      .map((turma) => turma.turno)
      .filter(
        (turno): turno is string =>
          Boolean(turno)
      );

    return Array.from(
      new Set(turnos)
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [turmas]);

  // ==========================================================
  // TURMAS DISPONÍVEIS DE ACORDO COM O CURSO E TURNO
  // ==========================================================

  const turmasParaSelect = useMemo(() => {
    return turmas.filter((turma) => {
      const correspondeCurso =
        !filtroCurso ||
        turma.curso_id === filtroCurso;

      const correspondeTurno =
        !filtroTurno ||
        turma.turno === filtroTurno;

      return (
        correspondeCurso &&
        correspondeTurno
      );
    });
  }, [
    turmas,
    filtroCurso,
    filtroTurno,
  ]);

  // ==========================================================
  // TURMAS FILTRADAS
  // ==========================================================

  const turmasFiltradas = useMemo(() => {
    const termo =
      buscaTurma.trim().toLowerCase();

    return turmas.filter((turma) => {
      // FILTRO POR CURSO
      if (
        filtroCurso &&
        turma.curso_id !== filtroCurso
      ) {
        return false;
      }

      // FILTRO POR TURNO
      if (
        filtroTurno &&
        turma.turno !== filtroTurno
      ) {
        return false;
      }

      // FILTRO POR TURMA
      if (
        filtroTurma &&
        turma.id !== filtroTurma
      ) {
        return false;
      }

      // BUSCA POR TEXTO
      if (termo) {
        const curso = cursos.find(
          (c) =>
            c.id === turma.curso_id
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

        if (!texto.includes(termo)) {
          return false;
        }
      }

      return true;
    });
  }, [
    turmas,
    cursos,
    buscaTurma,
    filtroCurso,
    filtroTurno,
    filtroTurma,
  ]);

  // ==========================================================
  // LIMPAR FILTROS
  // ==========================================================

  const limparFiltros = () => {
    setFiltroCurso("");
    setFiltroTurno("");
    setFiltroTurma("");
    setBuscaTurma("");
  };

  // ==========================================================
  // QUANTIDADE DE PRESENTES E FALTAS
  // ==========================================================

  const qtdPresentes =
    Object.values(frequencia).filter(
      (f) => f.presente
    ).length;

  const qtdFaltas =
    alunos.length - qtdPresentes;

  // ==========================================================
  // DATA FORMATADA
  // ==========================================================

  const dataFormatada = useMemo(() => {
    if (!dataSelecionada) {
      return "";
    }

    const partes =
      dataSelecionada.split("-");

    if (partes.length !== 3) {
      return dataSelecionada;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }, [dataSelecionada]);

  // ==========================================================
  // TELA
  // ==========================================================

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-10">

      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

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
                Realize a chamada e controle
                a frequência dos alunos.
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
                  setDataSelecionada(
                    e.target.value
                  )
                }
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          ERRO
      ====================================================== */}

      {erro && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">

          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

          <p className="font-medium text-sm flex-1">
            {erro}
          </p>

          <button
            type="button"
            onClick={() =>
              setErro("")
            }
          >
            <X className="w-5 h-5" />
          </button>

        </div>
      )}

      {/* ======================================================
          SUCESSO
      ====================================================== */}

      {sucesso && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">

          <Check className="w-5 h-5 shrink-0 mt-0.5" />

          <p className="font-medium text-sm flex-1">
            {sucesso}
          </p>

          <button
            type="button"
            onClick={() =>
              setSucesso("")
            }
          >
            <X className="w-5 h-5" />
          </button>

        </div>
      )}

      {/* ======================================================
          SELEÇÃO DAS TURMAS
      ====================================================== */}

      {!turmaSelecionadaId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* CABEÇALHO */}

          <div className="p-6 border-b border-slate-200">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Filter className="w-5 h-5 text-blue-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Organizar chamada
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Filtre por curso, turno ou turma
                  para encontrar rapidamente a chamada.
                </p>
              </div>

            </div>

          </div>

          {/* ==================================================
              FILTROS
          ================================================== */}

          <div className="p-6 bg-slate-50 border-b border-slate-200">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

              {/* CURSO */}

              <div>

                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Curso / Matéria
                </label>

                <select
                  value={filtroCurso}
                  onChange={(e) => {
                    setFiltroCurso(
                      e.target.value
                    );

                    setFiltroTurma("");
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="">
                    Todos os cursos
                  </option>

                  {cursos.map((curso) => (
                    <option
                      key={curso.id}
                      value={curso.id}
                    >
                      {curso.titulo}
                    </option>
                  ))}

                </select>

              </div>

              {/* TURNO */}

              <div>

                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Turno
                </label>

                <select
                  value={filtroTurno}
                  onChange={(e) => {
                    setFiltroTurno(
                      e.target.value
                    );

                    setFiltroTurma("");
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="">
                    Todos os turnos
                  </option>

                  {turnosDisponiveis.map(
                    (turno) => (
                      <option
                        key={turno}
                        value={turno}
                      >
                        {turno}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* TURMA */}

              <div>

                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Turma
                </label>

                <select
                  value={filtroTurma}
                  onChange={(e) =>
                    setFiltroTurma(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="">
                    Todas as turmas
                  </option>

                  {turmasParaSelect.map(
                    (turma) => (
                      <option
                        key={turma.id}
                        value={turma.id}
                      >
                        {turma.nome}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* BUSCA */}

              <div>

                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Pesquisar
                </label>

                <div className="relative">

                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={buscaTurma}
                    onChange={(e) =>
                      setBuscaTurma(
                        e.target.value
                      )
                    }
                    placeholder="Nome da turma..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

            </div>

            {/* FILTROS ATIVOS */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5">

              <div className="flex flex-wrap items-center gap-2">

                <span className="text-sm text-slate-500 font-medium">
                  {turmasFiltradas.length}{" "}
                  {turmasFiltradas.length === 1
                    ? "turma encontrada"
                    : "turmas encontradas"}
                </span>

                {filtroCurso && (
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                    Curso selecionado
                  </span>
                )}

                {filtroTurno && (
                  <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                    Turno: {filtroTurno}
                  </span>
                )}

                {filtroTurma && (
                  <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                    Turma selecionada
                  </span>
                )}

              </div>

              {(filtroCurso ||
                filtroTurno ||
                filtroTurma ||
                buscaTurma) && (
                <button
                  type="button"
                  onClick={
                    limparFiltros
                  }
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpar filtros
                </button>
              )}

            </div>

          </div>

          {/* ==================================================
              LISTA DE TURMAS
          ================================================== */}

          <div className="p-6">

            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">

                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />

                <p className="font-medium">
                  Carregando turmas...
                </p>

              </div>
            ) : turmas.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">

                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />

                <h3 className="text-lg font-bold text-slate-700">
                  Nenhuma turma encontrada
                </h3>

                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  Não existem turmas cadastradas
                  ou a consulta ao banco retornou
                  algum erro.
                </p>

              </div>
            ) : turmasFiltradas.length === 0 ? (
              <div className="text-center py-12">

                <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                <p className="font-semibold text-slate-600">
                  Nenhuma turma encontrada
                  com esses filtros.
                </p>

                <button
                  type="button"
                  onClick={
                    limparFiltros
                  }
                  className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 font-semibold hover:text-blue-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpar filtros
                </button>

              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {turmasFiltradas.map(
                  (turma) => {
                    const curso =
                      cursos.find(
                        (c) =>
                          c.id ===
                          turma.curso_id
                      );

                    const dias =
                      turma.dias_semana ||
                      [];

                    return (
                      <button
                        key={turma.id}
                        type="button"
                        onClick={() => {
                          setTurmaSelecionadaId(
                            turma.id
                          );

                          setSearchTerm(
                            ""
                          );

                          setErro("");
                          setSucesso("");
                        }}
                        className="group text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                      >

                        {/* TOPO DO CARD */}

                        <div className="flex items-start justify-between gap-3">

                          <div className="flex items-center gap-3 min-w-0">

                            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">

                              <BookOpen className="w-5 h-5 text-blue-600" />

                            </div>

                            <div className="min-w-0">

                              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide truncate">
                                {curso?.titulo ||
                                  "Curso não informado"}
                              </p>

                              <h3 className="text-lg font-bold text-slate-900 truncate mt-1">
                                {turma.nome}
                              </h3>

                            </div>

                          </div>

                          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center shrink-0">

                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />

                          </div>

                        </div>

                        {/* INFORMAÇÕES */}

                        <div className="mt-5 space-y-3">

                          {turma.horario && (
                            <div className="flex items-center gap-3">

                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">

                                <Clock className="w-4 h-4 text-slate-600" />

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-slate-400">
                                  Horário
                                </p>

                                <p className="text-sm font-semibold text-slate-700">
                                  {turma.horario}

                                  {turma.turno &&
                                    ` • ${turma.turno}`}
                                </p>

                              </div>

                            </div>
                          )}

                          {dias.length >
                            0 && (
                            <div className="flex items-start gap-3">

                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">

                                <CalendarDays className="w-4 h-4 text-slate-600" />

                              </div>

                              <div>

                                <p className="text-[10px] uppercase font-bold text-slate-400">
                                  Dias
                                </p>

                                <p className="text-sm font-semibold text-slate-700">
                                  {dias.join(
                                    ", "
                                  )}
                                </p>

                              </div>

                            </div>
                          )}

                        </div>

                        {/* RODAPÉ */}

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">

                          <div className="flex items-center gap-2 text-slate-500">

                            <Users className="w-4 h-4" />

                            <span className="text-xs font-medium">
                              Turma
                            </span>

                          </div>

                          <span className="text-xs font-bold text-blue-600">
                            Fazer chamada →
                          </span>

                        </div>

                      </button>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================================
          CHAMADA
      ====================================================== */}

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
                    {turmaSelecionada?.nome}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-slate-500">

                    {turmaSelecionada?.horario && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {turmaSelecionada.horario}
                      </span>
                    )}

                    {turmaSelecionada?.turno && (
                      <span className="flex items-center gap-1.5">
                        <Filter className="w-4 h-4" />
                        {turmaSelecionada.turno}
                      </span>
                    )}

                    {turmaSelecionada?.dias_semana &&
                      turmaSelecionada
                        .dias_semana
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

              <button
                type="button"
                onClick={() => {
                  setTurmaSelecionadaId(
                    ""
                  );

                  setAlunos([]);
                  setFrequencia({});
                  setSearchTerm("");
                  setSucesso("");
                  setErro("");
                }}
                className="self-start lg:self-center px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm"
              >
                ← Trocar turma
              </button>

            </div>

          </div>

          {/* ==================================================
              RESUMO
          ================================================== */}

          <div className="p-6 border-b border-slate-200">

            {alunos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* TOTAL */}

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">

                      <Users className="w-5 h-5 text-blue-600" />

                    </div>

                    <div>

                      <p className="text-xs font-bold text-blue-600">
                        TOTAL
                      </p>

                      <p className="text-xl font-bold text-slate-900">
                        {alunos.length}
                      </p>

                    </div>

                  </div>

                </div>

                {/* PRESENTES */}

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">

                      <Check className="w-5 h-5 text-emerald-600" />

                    </div>

                    <div>

                      <p className="text-xs font-bold text-emerald-600">
                        PRESENTES
                      </p>

                      <p className="text-xl font-bold text-slate-900">
                        {qtdPresentes}
                      </p>

                    </div>

                  </div>

                </div>

                {/* FALTAS */}

                <div className="rounded-xl bg-red-50 border border-red-100 p-4">

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">

                      <UserX className="w-5 h-5 text-red-600" />

                    </div>

                    <div>

                      <p className="text-xs font-bold text-red-600">
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

          {/* ==================================================
              ALUNOS
          ================================================== */}

          <div className="p-6">

            {isLoadingAlunos ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">

                <Loader2 className="w-9 h-9 animate-spin mb-4 text-blue-500" />

                <p>
                  Buscando lista de alunos
                  e histórico do dia...
                </p>

              </div>
            ) : alunos.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">

                <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />

                <h3 className="text-lg font-bold text-slate-700">
                  Turma Vazia
                </h3>

                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  Esta turma não possui
                  alunos matriculados.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setTurmaSelecionadaId(
                      ""
                    )
                  }
                  className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                >
                  Escolher outra turma
                </button>

              </div>
            ) : (
              <div className="space-y-5">

                {/* BUSCA E BOTÕES */}

                <div className="flex flex-col md:flex-row gap-3">

                  <div className="relative flex-1">

                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      placeholder="Buscar aluno na lista..."
                      value={searchTerm}
                      onChange={(e) =>
                        setSearchTerm(
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      marcarTodos(true)
                    }
                    className="px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Todos presentes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      marcarTodos(false)
                    }
                    className="px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Todos faltaram
                  </button>

                </div>

                {/* LISTA */}

                {alunosFiltrados.length ===
                0 ? (
                  <div className="text-center py-10">

                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                    <p className="text-slate-500 font-medium">
                      Nenhum aluno encontrado.
                    </p>

                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                    {alunosFiltrados.map(
                      (aluno) => {
                        const state =
                          frequencia[
                            aluno.id
                          ];

                        const presente =
                          state?.presente ||
                          false;

                        const salvo =
                          state?.presencaIdNoBanco !==
                          null;

                        return (
                          <button
                            type="button"
                            key={aluno.id}
                            onClick={() =>
                              togglePresenca(
                                aluno.id
                              )
                            }
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                              presente
                                ? "bg-emerald-50 border-emerald-500 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >

                            <div className="flex items-center gap-3 overflow-hidden">

                              <div
                                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold ${
                                  presente
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {aluno.nome_completo
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">

                                <p
                                  className="font-bold text-slate-900 text-sm truncate"
                                  title={
                                    aluno.nome_completo
                                  }
                                >
                                  {
                                    aluno.nome_completo
                                  }
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

                                  {salvo &&
                                    presente && (
                                      <span className="ml-1 opacity-70">
                                        • Salvo
                                      </span>
                                    )}
                                </p>

                              </div>

                            </div>

                            <div className="ml-3 shrink-0">

                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 ${
                                  presente
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "bg-white border-slate-300"
                                }`}
                              >

                                {presente && (
                                  <Check className="w-4 h-4 text-white" />
                                )}

                              </div>

                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>
                )}

              </div>
            )}

          </div>

          {/* ==================================================
              BOTÃO SALVAR
          ================================================== */}

          {alunos.length > 0 &&
            !isLoadingAlunos && (
              <div className="p-6 bg-slate-50 border-t border-slate-200">

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                  <p className="text-sm text-slate-500">
                    <strong className="text-slate-700">
                      {qtdPresentes}
                    </strong>{" "}
                    presentes de{" "}
                    <strong className="text-slate-700">
                      {alunos.length}
                    </strong>{" "}
                    alunos.
                  </p>

                  <button
                    type="button"
                    onClick={handleSalvar}
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
```
