"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  Save,
  Sun,
  Sunset,
  Users,
  X,
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
  cursos?: {
    titulo: string;
  }[] | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
};

type Horario = {
  id: string;
  inicio: string;
  fim: string;
  label: string;
  periodo: "Manhã" | "Tarde";
};

const HORARIOS: Horario[] = [
  {
    id: "08:30-10:00",
    inicio: "08:30",
    fim: "10:00",
    label: "08:30 – 10:00",
    periodo: "Manhã",
  },
  {
    id: "10:00-11:30",
    inicio: "10:00",
    fim: "11:30",
    label: "10:00 – 11:30",
    periodo: "Manhã",
  },
  {
    id: "14:30-16:00",
    inicio: "14:30",
    fim: "16:00",
    label: "14:30 – 16:00",
    periodo: "Tarde",
  },
  {
    id: "16:00-17:30",
    inicio: "16:00",
    fim: "17:30",
    label: "16:00 – 17:30",
    periodo: "Tarde",
  },
];

function getHorarioId(value: string | null | undefined): string | null {
  if (!value) return null;

  const texto = String(value);

  // Caso esteja salvo simplesmente como "08:30"
  const horarioSimples = texto.match(/^(\d{2}):(\d{2})/);

  if (horarioSimples) {
    const hora = `${horarioSimples[1]}:${horarioSimples[2]}`;

    const encontrado = HORARIOS.find(
      (item) => item.inicio === hora
    );

    if (encontrado) {
      return encontrado.id;
    }
  }

  // Caso esteja salvo como timestamp ISO
  const date = new Date(texto);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const partes = formatter.formatToParts(date);

    const hora = partes.find(
      (parte) => parte.type === "hour"
    )?.value;

    const minuto = partes.find(
      (parte) => parte.type === "minute"
    )?.value;

    if (!hora || !minuto) {
      return null;
    }

    const horario = `${hora}:${minuto}`;

    const encontrado = HORARIOS.find(
      (item) => item.inicio === horario
    );

    return encontrado?.id ?? null;
  } catch {
    return null;
  }
}

export default function FormCheckin() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [cursoId, setCursoId] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<Set<string>>(
    new Set()
  );

  const [pesquisa, setPesquisa] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [carregandoAlunos, setCarregandoAlunos] =
    useState(false);

  const [salvando, setSalvando] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  // =========================================================
  // CARREGAR CURSOS E TURMAS
  // =========================================================

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErro("");

        const [cursosResponse, turmasResponse] =
          await Promise.all([
            supabase
              .from("cursos")
              .select("id, titulo")
              .order("titulo", {
                ascending: true,
              }),

            supabase
              .from("turmas")
              .select(
                "id, nome, curso_id, turno, horario, cursos(titulo)"
              )
              .order("nome", {
                ascending: true,
              }),
          ]);

        if (cursosResponse.error) {
          throw new Error(
            cursosResponse.error.message
          );
        }

        if (turmasResponse.error) {
          throw new Error(
            turmasResponse.error.message
          );
        }

        setCursos(
          (cursosResponse.data || []) as Curso[]
        );

        setTurmas(
          (turmasResponse.data || []) as Turma[]
        );
      } catch (error: any) {
        console.error(error);

        setErro(
          error?.message ||
            "Não foi possível carregar os dados."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  // =========================================================
  // TURMAS FILTRADAS
  // =========================================================

  const turmasFiltradas = useMemo(() => {
    if (!cursoId || !horarioId) {
      return [];
    }

    return turmas.filter((turma) => {
      const mesmaCurso =
        turma.curso_id === cursoId;

      const mesmoHorario =
        getHorarioId(turma.horario) === horarioId;

      return mesmaCurso && mesmoHorario;
    });
  }, [turmas, cursoId, horarioId]);

  // =========================================================
  // ALUNOS DA TURMA
  // =========================================================

  useEffect(() => {
    if (!turmaId) {
      setAlunos([]);
      setPresencas(new Set());
      return;
    }

    async function carregarAlunos() {
      try {
        setCarregandoAlunos(true);
        setErro("");
        setMensagem("");

        // Primeiro pegamos as matrículas da turma
        const {
          data: matriculas,
          error: matriculasError,
        } = await supabase
          .from("matriculas")
          .select("aluno_id")
          .eq("turma_id", turmaId);

        if (matriculasError) {
          throw new Error(
            matriculasError.message
          );
        }

        const idsAlunos =
          (matriculas || []).map(
            (item) => item.aluno_id
          );

        if (idsAlunos.length === 0) {
          setAlunos([]);
          setPresencas(new Set());
          return;
        }

        // Depois buscamos os alunos
        const {
          data: alunosData,
          error: alunosError,
        } = await supabase
          .from("alunos")
          .select("id, nome_completo")
          .in("id", idsAlunos)
          .order("nome_completo", {
            ascending: true,
          });

        if (alunosError) {
          throw new Error(
            alunosError.message
          );
        }

        setAlunos(
          (alunosData || []) as Aluno[]
        );

        // =====================================================
        // BUSCAR PRESENÇAS DE HOJE
        // =====================================================

        const agora = new Date();

        const inicioHoje = new Date(agora);
        inicioHoje.setHours(0, 0, 0, 0);

        const fimHoje = new Date(agora);
        fimHoje.setHours(23, 59, 59, 999);

        const {
          data: presencasData,
          error: presencasError,
        } = await supabase
          .from("presencas")
          .select("aluno_id")
          .eq("turma_id", turmaId)
          .gte(
            "data_hora",
            inicioHoje.toISOString()
          )
          .lte(
            "data_hora",
            fimHoje.toISOString()
          );

        if (presencasError) {
          throw new Error(
            presencasError.message
          );
        }

        const idsPresentes = new Set<string>(
          (presencasData || []).map(
            (item) => item.aluno_id
          )
        );

        setPresencas(idsPresentes);
      } catch (error: any) {
        console.error(error);

        setErro(
          error?.message ||
            "Não foi possível carregar os alunos."
        );
      } finally {
        setCarregandoAlunos(false);
      }
    }

    carregarAlunos();
  }, [turmaId]);

  // =========================================================
  // SELECIONAR CURSO
  // =========================================================

  function selecionarCurso(id: string) {
    setCursoId(id);
    setHorarioId("");
    setTurmaId("");
    setAlunos([]);
    setPresencas(new Set());
    setMensagem("");
    setErro("");
  }

  // =========================================================
  // SELECIONAR HORÁRIO
  // =========================================================

  function selecionarHorario(id: string) {
    setHorarioId(id);
    setTurmaId("");
    setAlunos([]);
    setPresencas(new Set());
    setMensagem("");
    setErro("");
  }

  // =========================================================
  // SELECIONAR TURMA
  // =========================================================

  function selecionarTurma(id: string) {
    setTurmaId(id);
    setMensagem("");
    setErro("");
  }

  // =========================================================
  // MARCAR / DESMARCAR ALUNO
  // =========================================================

  function alternarPresenca(alunoId: string) {
    setPresencas((atual) => {
      const novo = new Set(atual);

      if (novo.has(alunoId)) {
        novo.delete(alunoId);
      } else {
        novo.add(alunoId);
      }

      return novo;
    });
  }

  // =========================================================
  // MARCAR TODOS
  // =========================================================

  function marcarTodos() {
    setPresencas(
      new Set(alunos.map((aluno) => aluno.id))
    );
  }

  // =========================================================
  // LIMPAR TODOS
  // =========================================================

  function limparTodos() {
    setPresencas(new Set());
  }

  // =========================================================
  // SALVAR CHAMADA
  // =========================================================

  async function salvarChamada() {
    if (!turmaId) {
      setErro("Selecione uma turma.");
      return;
    }

    if (alunos.length === 0) {
      setErro(
        "Essa turma não possui alunos matriculados."
      );
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      // =====================================================
      // PEGAR USUÁRIO LOGADO
      // =====================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Usuário não está logado."
        );
      }

      if (!user.email) {
        throw new Error(
          "O usuário logado não possui e-mail."
        );
      }

      // =====================================================
      // PEGAR OPERADOR
      // =====================================================

      const {
        data: operador,
        error: operadorError,
      } = await supabase
        .from("operadores")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (operadorError) {
        throw new Error(
          operadorError.message
        );
      }

      if (!operador) {
        throw new Error(
          "Operador não encontrado."
        );
      }

      // =====================================================
      // DATA DE HOJE
      // =====================================================

      const agora = new Date();

      const inicioHoje = new Date(agora);
      inicioHoje.setHours(0, 0, 0, 0);

      const fimHoje = new Date(agora);
      fimHoje.setHours(23, 59, 59, 999);

      // =====================================================
      // APAGAR A CHAMADA DE HOJE DA TURMA
      // =====================================================

      const {
        error: deleteError,
      } = await supabase
        .from("presencas")
        .delete()
        .eq("turma_id", turmaId)
        .gte(
          "data_hora",
          inicioHoje.toISOString()
        )
        .lte(
          "data_hora",
          fimHoje.toISOString()
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      // =====================================================
      // CRIAR NOVAS PRESENÇAS
      // =====================================================

      const alunosPresentes = alunos.filter(
        (aluno) =>
          presencas.has(aluno.id)
      );

      if (alunosPresentes.length > 0) {
        const registros = alunosPresentes.map(
          (aluno) => ({
            aluno_id: aluno.id,
            curso_id: cursoId,
            turma_id: turmaId,
            operador_id: operador.id,
            metodo: "manual",
            data_hora:
              agora.toISOString(),
          })
        );

        const {
          error: insertError,
        } = await supabase
          .from("presencas")
          .insert(registros);

        if (insertError) {
          throw new Error(
            insertError.message
          );
        }
      }

      setMensagem(
        `Chamada salva com sucesso. ${alunosPresentes.length} aluno(s) presente(s).`
      );
    } catch (error: any) {
      console.error(error);

      setErro(
        error?.message ||
          "Não foi possível salvar a chamada."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =========================================================
  // PESQUISA
  // =========================================================

  const alunosFiltrados = useMemo(() => {
    const texto = pesquisa
      .trim()
      .toLowerCase();

    if (!texto) {
      return alunos;
    }

    return alunos.filter((aluno) =>
      aluno.nome_completo
        .toLowerCase()
        .includes(texto)
    );
  }, [alunos, pesquisa]);

  const turmaSelecionada = turmas.find(
    (turma) => turma.id === turmaId
  );

  const horarioSelecionado = HORARIOS.find(
    (horario) => horario.id === horarioId
  );

  const cursoSelecionado = cursos.find(
    (curso) => curso.id === cursoId
  );

  // =========================================================
  // LOADING INICIAL
  // =========================================================

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Carregando check-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* ===================================================
            CABEÇALHO
        =================================================== */}

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Check-in de Oficinas
              </h1>

              <p className="text-slate-500 mt-1">
                Faça a chamada manualmente e registre os alunos presentes.
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            MENSAGENS
        =================================================== */}

        {erro && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <X className="w-5 h-5 mt-0.5 flex-shrink-0" />

            <div>
              <p className="font-semibold">
                Ocorreu um erro
              </p>

              <p className="text-sm mt-1">
                {erro}
              </p>
            </div>
          </div>
        )}

        {mensagem && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />

            <div>
              <p className="font-semibold">
                Chamada atualizada
              </p>

              <p className="text-sm mt-1">
                {mensagem}
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            ETAPA 1 - CURSO
        =================================================== */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 mb-5">

          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                1. Escolha o curso
              </h2>

              <p className="text-sm text-slate-500">
                Selecione o curso da turma que terá a chamada.
              </p>
            </div>
          </div>

          {cursos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhum curso encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cursos.map((curso) => {
                const selecionado =
                  cursoId === curso.id;

                return (
                  <button
                    key={curso.id}
                    type="button"
                    onClick={() =>
                      selecionarCurso(curso.id)
                    }
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selecionado
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p
                          className={`font-semibold ${
                            selecionado
                              ? "text-blue-900"
                              : "text-slate-800"
                          }`}
                        >
                          {curso.titulo}
                        </p>
                      </div>

                      {selecionado && (
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ===================================================
            ETAPA 2 - HORÁRIO
        =================================================== */}

        {cursoId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 mb-5">

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock3 className="w-5 h-5 text-purple-600" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  2. Escolha o horário
                </h2>

                <p className="text-sm text-slate-500">
                  Selecione o horário da aula.
                </p>
              </div>
            </div>

            {/* MANHÃ */}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-5 h-5 text-orange-500" />

                <h3 className="font-semibold text-slate-800">
                  Manhã
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HORARIOS.filter(
                  (horario) =>
                    horario.periodo === "Manhã"
                ).map((horario) => {
                  const selecionado =
                    horarioId === horario.id;

                  return (
                    <button
                      key={horario.id}
                      type="button"
                      onClick={() =>
                        selecionarHorario(
                          horario.id
                        )
                      }
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selecionado
                          ? "border-purple-600 bg-purple-50"
                          : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-lg font-bold ${
                              selecionado
                                ? "text-purple-900"
                                : "text-slate-800"
                            }`}
                          >
                            {horario.label}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            Aula da manhã
                          </p>
                        </div>

                        {selecionado && (
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TARDE */}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sunset className="w-5 h-5 text-indigo-500" />

                <h3 className="font-semibold text-slate-800">
                  Tarde
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HORARIOS.filter(
                  (horario) =>
                    horario.periodo === "Tarde"
                ).map((horario) => {
                  const selecionado =
                    horarioId === horario.id;

                  return (
                    <button
                      key={horario.id}
                      type="button"
                      onClick={() =>
                        selecionarHorario(
                          horario.id
                        )
                      }
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selecionado
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-lg font-bold ${
                              selecionado
                                ? "text-indigo-900"
                                : "text-slate-800"
                            }`}
                          >
                            {horario.label}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            Aula da tarde
                          </p>
                        </div>

                        {selecionado && (
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            ETAPA 3 - TURMA
        =================================================== */}

        {cursoId && horarioId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 mb-5">

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  3. Escolha a turma
                </h2>

                <p className="text-sm text-slate-500">
                  As turmas abaixo pertencem ao curso e horário selecionados.
                </p>
              </div>
            </div>

            {turmasFiltradas.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="font-semibold text-amber-900">
                  Nenhuma turma encontrada
                </p>

                <p className="text-sm text-amber-700 mt-1">
                  Não existe uma turma cadastrada para{" "}
                  <strong>
                    {cursoSelecionado?.titulo}
                  </strong>{" "}
                  no horário{" "}
                  <strong>
                    {horarioSelecionado?.label}
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turmasFiltradas.map((turma) => {
                  const selecionado =
                    turmaId === turma.id;

                  return (
                    <button
                      key={turma.id}
                      type="button"
                      onClick={() =>
                        selecionarTurma(
                          turma.id
                        )
                      }
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selecionado
                          ? "border-green-600 bg-green-50"
                          : "border-slate-200 hover:border-green-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`font-bold ${
                              selecionado
                                ? "text-green-900"
                                : "text-slate-800"
                            }`}
                          >
                            {turma.nome}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
                              <Clock3 className="w-3 h-3" />
                              {horarioSelecionado?.label}
                            </span>

                            {turma.turno && (
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
                                {turma.turno}
                              </span>
                            )}
                          </div>
                        </div>

                        {selecionado && (
                          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================
            ETAPA 4 - CHAMADA
        =================================================== */}

        {turmaId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* CABEÇALHO DA CHAMADA */}

            <div className="p-5 md:p-6 border-b border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />

                    <h2 className="font-bold text-slate-900 text-xl">
                      4. Fazer chamada
                    </h2>
                  </div>

                  <p className="text-sm text-slate-500">
                    {cursoSelecionado?.titulo} •{" "}
                    {turmaSelecionada?.nome} •{" "}
                    {horarioSelecionado?.label}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-600 font-medium">
                    PRESENTES
                  </p>

                  <p className="text-2xl font-bold text-blue-900">
                    {presencas.size}
                    <span className="text-sm font-normal text-blue-600">
                      {" "}
                      / {alunos.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* FERRAMENTAS */}

            <div className="p-5 md:p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex flex-col md:flex-row gap-3">

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    value={pesquisa}
                    onChange={(e) =>
                      setPesquisa(
                        e.target.value
                      )
                    }
                    placeholder="Pesquisar aluno..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={marcarTodos}
                    disabled={
                      carregandoAlunos ||
                      alunos.length === 0
                    }
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Marcar todos
                  </button>

                  <button
                    type="button"
                    onClick={limparTodos}
                    disabled={
                      carregandoAlunos ||
                      alunos.length === 0
                    }
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            {/* LISTA DE ALUNOS */}

            <div className="p-5 md:p-6">

              {carregandoAlunos ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />

                  <p>
                    Carregando alunos da turma...
                  </p>
                </div>
              ) : alunos.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />

                  <p className="font-semibold text-slate-700">
                    Nenhum aluno encontrado
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Verifique se os alunos estão matriculados nesta turma.
                  </p>
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  Nenhum aluno corresponde à pesquisa.
                </div>
              ) : (
                <div className="space-y-2">
                  {alunosFiltrados.map(
                    (aluno, index) => {
                      const presente =
                        presencas.has(
                          aluno.id
                        );

                      return (
                        <button
                          key={aluno.id}
                          type="button"
                          onClick={() =>
                            alternarPresenca(
                              aluno.id
                            )
                          }
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            presente
                              ? "border-green-500 bg-green-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {/* NÚMERO */}

                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              presente
                                ? "bg-green-600 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {index + 1}
                          </div>

                          {/* NOME */}

                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold truncate ${
                                presente
                                  ? "text-green-900"
                                  : "text-slate-800"
                              }`}
                            >
                              {aluno.nome_completo}
                            </p>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {presente
                                ? "Presente"
                                : "Ausente"}
                            </p>
                          </div>

                          {/* CHECK */}

                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              presente
                                ? "bg-green-600"
                                : "border-2 border-slate-300 bg-white"
                            }`}
                          >
                            {presente && (
                              <Check className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* RODAPÉ */}

            {alunos.length > 0 && (
              <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                <div>
                  <p className="font-semibold text-slate-800">
                    {presencas.size} aluno(s) marcado(s) como presente
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Ao salvar, a chamada de hoje desta turma será atualizada.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={salvarChamada}
                  disabled={salvando}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold transition-colors"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar chamada
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
