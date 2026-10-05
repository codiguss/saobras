"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  XCircle,
  TrendingUp,
  UserCheck,
  Search,
  RefreshCw,
  ArrowUpRight,
  CalendarDays,
  UsersRound,
  ChevronDown,
  Clock3,
  School,
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
  horario?: string | null;
  turno?: string | null;
  vagas?: number | null;
  cursos?: { titulo: string } | { titulo: string }[] | null;
};

type Matricula = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_matricula?: string | null;

  // O Supabase pode devolver a relação como array.
  alunos?: { nome_completo: string }[] | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
};

type Presenca = {
  id: string;
  aluno_id: string;
  turma_id: string;
  curso_id: string;
  status: string | null;
  data_hora: string;
};

type AlunoMultiplasTurmas = {
  id: string;
  nome: string;
  turmas: {
    id: string;
    nome: string;
    curso: string;
    horario: string;
  }[];
};

function relacao<T>(
  valor: T | T[] | null | undefined
): T | null {
  return Array.isArray(valor)
    ? valor[0] || null
    : valor || null;
}

function statusPresenca(status: string | null) {
  return String(status || "presente")
    .toLowerCase()
    .trim() === "falta"
    ? "falta"
    : "presente";
}

function percentual(valor: number, total: number) {
  if (!total) return 0;

  return Math.round((valor / total) * 100);
}

function formatarData(data: string) {
  const d = new Date(data);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("pt-BR");
}

function formatarHora(data: string) {
  const d = new Date(data);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Normaliza o horário da turma.
 *
 * Se existir "horario", ele será mostrado.
 * Se não existir, tenta usar "turno".
 * Se nenhum dos dois estiver preenchido, informa corretamente
 * que o cadastro da turma não possui horário.
 */
function obterHorarioTurma(turma: Turma) {
  const horario = String(turma.horario || "").trim();
  const turno = String(turma.turno || "").trim();

  if (horario) {
    return horario;
  }

  if (turno) {
    return turno;
  }

  return "Horário não cadastrado";
}

export default function HistoricoClient({
  cursos,
  turmas,
}: {
  cursos: Curso[];
  turmas: Turma[];
}) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);

  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");

  const [
    mostrarAlunosMultiplasTurmas,
    setMostrarAlunosMultiplasTurmas,
  ] = useState(false);

  async function carregarDashboard() {
    setCarregando(true);

    const [
      alunosRes,
      matriculasRes,
      presencasRes,
    ] = await Promise.all([
      supabase
        .from("alunos")
        .select("id, nome_completo"),

      supabase
        .from("matriculas")
        .select(
          "id, aluno_id, curso_id, turma_id, data_matricula, alunos(nome_completo)"
        ),

      supabase
        .from("presencas")
        .select(
          "id, aluno_id, turma_id, curso_id, status, data_hora"
        )
        .order("data_hora", {
          ascending: false,
        }),
    ]);

    if (alunosRes.error) {
      console.error(
        "Erro ao carregar alunos:",
        alunosRes.error
      );
    }

    if (matriculasRes.error) {
      console.error(
        "Erro ao carregar matrículas:",
        matriculasRes.error
      );
    }

    if (presencasRes.error) {
      console.error(
        "Erro ao carregar frequência:",
        presencasRes.error
      );
    }

    if (alunosRes.data) {
      setAlunos(alunosRes.data);
    }

    if (matriculasRes.data) {
      setMatriculas(
        matriculasRes.data as Matricula[]
      );
    }

    if (presencasRes.data) {
      setPresencas(
        presencasRes.data as Presenca[]
      );
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  /*
   * ---------------------------------------------------------
   * ALUNOS EM MAIS DE UMA TURMA
   * ---------------------------------------------------------
   */

  const alunosMultiplasTurmas = useMemo<
    AlunoMultiplasTurmas[]
  >(() => {
    const resultado: AlunoMultiplasTurmas[] = [];

    alunos.forEach((aluno) => {
      const matriculasAluno = matriculas.filter(
        (matricula) =>
          matricula.aluno_id === aluno.id
      );

      const turmaIds = Array.from(
        new Set(
          matriculasAluno.map(
            (matricula) => matricula.turma_id
          )
        )
      );

      if (turmaIds.length <= 1) {
        return;
      }

      const turmasAluno = turmaIds
        .map((turmaId) => {
          const turma = turmas.find(
            (item) => item.id === turmaId
          );

          if (!turma) {
            return null;
          }

          const curso = cursos.find(
            (item) => item.id === turma.curso_id
          );

          return {
            id: turma.id,
            nome: turma.nome,
            curso:
              curso?.titulo ||
              relacao(turma.cursos)?.titulo ||
              "Curso não informado",
            horario: obterHorarioTurma(turma),
          };
        })
        .filter(
          (
            item
          ): item is {
            id: string;
            nome: string;
            curso: string;
            horario: string;
          } => item !== null
        );

      if (turmasAluno.length > 1) {
        resultado.push({
          id: aluno.id,
          nome: aluno.nome_completo,
          turmas: turmasAluno,
        });
      }
    });

    return resultado.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [alunos, matriculas, turmas, cursos]);

  /*
   * ---------------------------------------------------------
   * TURMAS FILTRADAS
   * ---------------------------------------------------------
   */

  const turmasFiltradas = useMemo(() => {
    return turmas.filter((turma) => {
      const curso =
        relacao(turma.cursos) ||
        cursos.find(
          (item) => item.id === turma.curso_id
        );

      const texto = `
        ${turma.nome}
        ${curso?.titulo || ""}
        ${obterHorarioTurma(turma)}
      `.toLowerCase();

      return (
        (!busca ||
          texto.includes(busca.toLowerCase())) &&
        (!cursoFiltro ||
          turma.curso_id === cursoFiltro) &&
        (!turmaFiltro ||
          turma.id === turmaFiltro)
      );
    });
  }, [
    turmas,
    cursos,
    busca,
    cursoFiltro,
    turmaFiltro,
  ]);

  /*
   * ---------------------------------------------------------
   * FREQUÊNCIA GERAL
   * ---------------------------------------------------------
   */

  const presentes = useMemo(
    () =>
      presencas.filter(
        (p) =>
          statusPresenca(p.status) ===
          "presente"
      ).length,
    [presencas]
  );

  const faltas = presencas.length - presentes;

  const frequenciaGeral = percentual(
    presentes,
    presencas.length
  );

  /*
   * ---------------------------------------------------------
   * MATRÍCULAS POR TURMA
   * ---------------------------------------------------------
   */

  const matriculadosPorTurma = useMemo(() => {
    const mapa: Record<string, number> = {};

    matriculas.forEach((matricula) => {
      mapa[matricula.turma_id] =
        (mapa[matricula.turma_id] || 0) + 1;
    });

    return mapa;
  }, [matriculas]);

  /*
   * ---------------------------------------------------------
   * FREQUÊNCIA POR TURMA
   * ---------------------------------------------------------
   */

  const frequenciaPorTurma = useMemo(() => {
    const mapa: Record<
      string,
      {
        presentes: number;
        faltas: number;
      }
    > = {};

    presencas.forEach((presenca) => {
      if (!mapa[presenca.turma_id]) {
        mapa[presenca.turma_id] = {
          presentes: 0,
          faltas: 0,
        };
      }

      if (
        statusPresenca(presenca.status) ===
        "presente"
      ) {
        mapa[presenca.turma_id].presentes++;
      } else {
        mapa[presenca.turma_id].faltas++;
      }
    });

    return mapa;
  }, [presencas]);

  /*
   * ---------------------------------------------------------
   * ATIVIDADES RECENTES
   * ---------------------------------------------------------
   */

  const ultimasAtividades = useMemo(() => {
    return [...presencas]
      .sort(
        (a, b) =>
          new Date(b.data_hora).getTime() -
          new Date(a.data_hora).getTime()
      )
      .slice(0, 8)
      .map((presenca) => {
        const aluno = alunos.find(
          (item) =>
            item.id === presenca.aluno_id
        );

        const turma = turmas.find(
          (item) =>
            item.id === presenca.turma_id
        );

        const curso = cursos.find(
          (item) =>
            item.id === presenca.curso_id
        );

        return {
          ...presenca,
          aluno:
            aluno?.nome_completo ||
            "Aluno não identificado",
          turma:
            turma?.nome ||
            "Turma não identificada",
          curso:
            curso?.titulo ||
            "Curso não identificado",
          horario: turma
            ? obterHorarioTurma(turma)
            : "Horário não cadastrado",
        };
      });
  }, [
    presencas,
    alunos,
    turmas,
    cursos,
  ]);

  /*
   * ---------------------------------------------------------
   * TURMA SELECIONADA
   * ---------------------------------------------------------
   */

  const turmaSelecionada = turmaFiltro
    ? turmas.find(
        (turma) =>
          turma.id === turmaFiltro
      )
    : null;

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              Visão geral
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Acompanhe alunos, matrículas, turmas e frequência em um só lugar.
            </p>
          </div>

          <button
            onClick={carregarDashboard}
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                carregando
                  ? "animate-spin"
                  : ""
              }`}
            />

            Atualizar dados
          </button>
        </div>

        {/* CARDS PRINCIPAIS */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Users}
            label="Alunos cadastrados"
            value={alunos.length}
            description="Pessoas no sistema"
          />

          <MetricCard
            icon={GraduationCap}
            label="Matrículas"
            value={matriculas.length}
            description={`${turmas.length} turmas cadastradas`}
          />

          <MetricCard
            icon={BookOpen}
            label="Turmas"
            value={turmas.length}
            description={`${cursos.length} cursos disponíveis`}
          />

          <MetricCard
            icon={ClipboardList}
            label="Frequência geral"
            value={`${frequenciaGeral}%`}
            description={`${presentes} presenças • ${faltas} faltas`}
            destaque
          />
        </div>

        {/* ALUNOS EM MAIS DE UMA TURMA */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() =>
              setMostrarAlunosMultiplasTurmas(
                (valor) => !valor
              )
            }
            className="w-full p-5 text-left transition hover:bg-amber-50/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <UsersRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Alunos em mais de uma turma
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Clique para visualizar exatamente quais turmas cada aluno possui.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700">
                  {alunosMultiplasTurmas.length}
                </span>

                <ChevronDown
                  className={`h-5 w-5 text-slate-400 transition-transform ${
                    mostrarAlunosMultiplasTurmas
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </div>
            </div>
          </button>

          {mostrarAlunosMultiplasTurmas && (
            <div className="border-t border-amber-100 bg-amber-50/30 p-4 sm:p-5">
              {alunosMultiplasTurmas.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <UsersRound className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-2 font-semibold text-slate-600">
                    Nenhum aluno está matriculado em mais de uma turma.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {alunosMultiplasTurmas.map(
                    (aluno) => (
                      <div
                        key={aluno.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                              {aluno.nome
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-bold text-slate-900">
                                {aluno.nome}
                              </div>

                              <div className="mt-0.5 text-xs text-slate-500">
                                {aluno.turmas.length} turmas
                              </div>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Múltiplas
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {aluno.turmas.map(
                            (turma) => (
                              <div
                                key={turma.id}
                                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <School className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-800">
                                      {turma.nome}
                                    </div>

                                    <div className="mt-1 text-xs text-slate-500">
                                      {turma.curso}
                                    </div>

                                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                      {turma.horario}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* TURMAS + FREQUÊNCIA */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Turmas
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Clique em uma turma para filtrar o dashboard.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      value={busca}
                      onChange={(e) =>
                        setBusca(e.target.value)
                      }
                      placeholder="Buscar turma..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-48"
                    />
                  </div>

                  <select
                    value={cursoFiltro}
                    onChange={(e) => {
                      setCursoFiltro(
                        e.target.value
                      );
                      setTurmaFiltro("");
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-400"
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
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {carregando ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  Carregando indicadores...
                </div>
              ) : turmasFiltradas.length ===
                0 ? (
                <div className="p-10 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-2 text-sm font-medium text-slate-600">
                    Nenhuma turma encontrada.
                  </p>
                </div>
              ) : (
                turmasFiltradas.map(
                  (turma) => {
                    const curso =
                      relacao(turma.cursos) ||
                      cursos.find(
                        (c) =>
                          c.id ===
                          turma.curso_id
                      );

                    const ocupadas =
                      matriculadosPorTurma[
                        turma.id
                      ] || 0;

                    const limite =
                      turma.vagas || 10;

                    const freq =
                      frequenciaPorTurma[
                        turma.id
                      ] || {
                        presentes: 0,
                        faltas: 0,
                      };

                    const totalFreq =
                      freq.presentes +
                      freq.faltas;

                    const percentualFreq =
                      percentual(
                        freq.presentes,
                        totalFreq
                      );

                    const ocupacao =
                      percentual(
                        ocupadas,
                        limite
                      );

                    return (
                      <button
                        key={turma.id}
                        onClick={() =>
                          setTurmaFiltro(
                            turma.id
                          )
                        }
                        className={`w-full p-5 text-left transition hover:bg-slate-50 ${
                          turmaSelecionada?.id ===
                          turma.id
                            ? "bg-emerald-50/60"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-semibold text-slate-900">
                                {turma.nome}
                              </div>

                              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300" />
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {curso?.titulo ||
                                  "Curso não informado"}
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                <Clock3 className="h-3 w-3" />
                                {obterHorarioTurma(
                                  turma
                                )}
                              </span>

                              {turma.turno && (
                                <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                                  {turma.turno}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="w-full sm:max-w-xs">
                            <div className="mb-1.5 flex justify-between text-xs">
                              <span className="text-slate-500">
                                Alunos
                              </span>

                              <span className="font-semibold text-slate-700">
                                {ocupadas}/
                                {limite}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ocupacao
                                  )}%`,
                                }}
                              />
                            </div>

                            <div className="mt-2 flex justify-between text-xs">
                              <span className="text-slate-400">
                                {totalFreq} registros
                              </span>

                              <span className="font-semibold text-slate-700">
                                {totalFreq
                                  ? `${percentualFreq}% presença`
                                  : "Sem registros"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  }
                )
              )}
            </div>
          </section>

          {/* RESUMO DA FREQUÊNCIA */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">
                Resumo da frequência
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Distribuição dos registros de presença e falta.
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-emerald-100">
                  <div
                    className="absolute inset-[-14px] rounded-full border-[14px] border-transparent border-t-emerald-500 border-r-emerald-500"
                    style={{
                      transform: `rotate(${Math.max(
                        0,
                        frequenciaGeral *
                          3.6 -
                          90
                      )}deg)`,
                    }}
                  />

                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900">
                      {frequenciaGeral}%
                    </div>

                    <div className="text-xs text-slate-400">
                      presença
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                  <div className="mt-2 text-2xl font-bold text-emerald-700">
                    {presentes}
                  </div>

                  <div className="text-xs text-emerald-700/70">
                    Presenças
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <XCircle className="h-5 w-5 text-red-500" />

                  <div className="mt-2 text-2xl font-bold text-red-600">
                    {faltas}
                  </div>

                  <div className="text-xs text-red-600/70">
                    Faltas
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserCheck className="h-4 w-4 text-emerald-600" />

                  Alunos matriculados
                </div>

                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {matriculas.length}
                </div>

                <div className="text-xs text-slate-400">
                  Total de vínculos com turmas
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ATIVIDADE RECENTE */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />

              <div>
                <h2 className="font-bold text-slate-900">
                  Atividade recente
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Últimos registros de presença e falta realizados no sistema.
                </p>
              </div>
            </div>
          </div>

          {ultimasAtividades.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Ainda não existem registros de frequência.
            </div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {ultimasAtividades.map(
                (item) => {
                  const presente =
                    statusPresenca(
                      item.status
                    ) === "presente";

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800">
                            {item.aluno}
                          </div>

                          <div className="mt-1 truncate text-xs text-slate-500">
                            {item.turma}
                          </div>

                          <div className="mt-1 truncate text-xs text-slate-400">
                            {item.curso}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            presente
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {presente
                            ? "Presença"
                            : "Falta"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                          <span>
                            {formatarData(
                              item.data_hora
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5 text-slate-400" />

                          <span>
                            {formatarHora(
                              item.data_hora
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5 text-slate-400" />

                          <span>
                            {item.horario}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* FILTRO ATIVO */}

        {turmaSelecionada && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Filtro ativo
                </div>

                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {turmaSelecionada.nome}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {obterHorarioTurma(
                    turmaSelecionada
                  )}
                </p>
              </div>

              <button
                onClick={() =>
                  setTurmaFiltro("")
                }
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Ver todas as turmas
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  destaque = false,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  description: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        destaque
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            destaque
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <TrendingUp
          className={`h-4 w-4 ${
            destaque
              ? "text-emerald-500"
              : "text-slate-300"
          }`}
        />
      </div>

      <div className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-700">
        {label}
      </div>

      <div className="mt-1 text-xs text-slate-400">
        {description}
      </div>
    </div>
  );
}
