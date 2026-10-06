"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Calendar,
  Filter,
  RotateCcw,
  FileText,
  Download,
  BarChart3,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Percent,
  ClipboardList,
  UsersRound,
  UserPlus,
  Layers3,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  X,
  ChevronRight,
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
};

type Operador = {
  id: string;
  nome: string;
};

type RelacaoAluno = {
  nome_completo: string;
  cpf: string | null;
} | null;

type RelacaoCurso = {
  titulo: string;
} | null;

type RelacaoTurma = {
  nome: string;
} | null;

type RelacaoOperador = {
  nome: string;
} | null;

type MatriculaRelatorio = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_matricula: string | null;
  alunos: { nome_completo: string; cpf: string | null } | { nome_completo: string; cpf: string | null }[] | null;
  cursos: { titulo: string } | { titulo: string }[] | null;
  turmas: { nome: string } | { nome: string }[] | null;
};

type PresencaRelatorio = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_hora: string;
  status: string | null;
  metodo: string | null;
  operador_id: string | null;
  alunos: RelacaoAluno;
  cursos: RelacaoCurso;
  turmas: RelacaoTurma;
  operadores: RelacaoOperador;
};

type ResumoAluno = {
  alunoId: string;
  nome: string;
  cpf: string;
  presencas: number;
  faltas: number;
  total: number;
  percentual: number;
};

type ResumoCurso = {
  cursoId: string;
  titulo: string;
  participantes: number;
  presencas: number;
  faltas: number;
  total: number;
  percentual: number;
};

function normalizarStatus(status: string | null | undefined) {
  return String(status || "presente").toLowerCase().trim() === "falta"
    ? "falta"
    : "presente";
}

function getRelacao<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function formatarData(data: string) {
  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
}

function formatarHora(data: string) {
  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarCPF(cpf: string | null) {
  if (!cpf) return "—";

  const numeros = cpf.replace(/\D/g, "");

  if (numeros.length === 11) {
    return `${numeros.slice(0, 3)}.${numeros.slice(
      3,
      6
    )}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
  }

  return cpf;
}

export default function RelatoriosClient({
  cursos,
  turmas,
  operadores,
  matriculas,
}: {
  cursos: Curso[];
  turmas: Turma[];
  operadores: Operador[];
  matriculas: MatriculaRelatorio[];
}) {
  const [registros, setRegistros] = useState<PresencaRelatorio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [busca, setBusca] = useState("");

  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [mostrarMultiplasTurmas, setMostrarMultiplasTurmas] = useState(false);

  const turmasFiltradas = useMemo(() => {
    if (!filtroCurso) return turmas;

    return turmas.filter((turma) => turma.curso_id === filtroCurso);
  }, [turmas, filtroCurso]);

  const alunosMultiplasTurmas = useMemo(() => {
    const mapa = new Map<string, {
      alunoId: string;
      nome: string;
      cpf: string;
      turmas: Map<string, { turmaId: string; turma: string; curso: string }>;
    }>();

    matriculas.forEach((matricula) => {
      const aluno = getRelacao(matricula.alunos);
      const curso = getRelacao(matricula.cursos);
      const turma = getRelacao(matricula.turmas);
      const atual = mapa.get(matricula.aluno_id);

      if (!atual) {
        mapa.set(matricula.aluno_id, {
          alunoId: matricula.aluno_id,
          nome: aluno?.nome_completo || "Aluno sem nome",
          cpf: aluno?.cpf || "",
          turmas: new Map([[matricula.turma_id, {
            turmaId: matricula.turma_id,
            turma: turma?.nome || "Turma sem nome",
            curso: curso?.titulo || "Curso sem nome",
          }]]),
        });
      } else {
        atual.turmas.set(matricula.turma_id, {
          turmaId: matricula.turma_id,
          turma: turma?.nome || "Turma sem nome",
          curso: curso?.titulo || "Curso sem nome",
        });
      }
    });

    return Array.from(mapa.values())
      .filter((aluno) => aluno.turmas.size > 1)
      .map((aluno) => ({ ...aluno, turmas: Array.from(aluno.turmas.values()) }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [matriculas]);

  const totalTurmas = useMemo(() => new Set(matriculas.map((m) => m.turma_id)).size, [matriculas]);
  const totalMatriculas = matriculas.length;
  const totalAlunosMatriculados = useMemo(() => new Set(matriculas.map((m) => m.aluno_id)).size, [matriculas]);

  const handlePeriodoChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const valor = event.target.value;

    setFiltroPeriodo(valor);

    const hoje = new Date();

    const formatarISO = (data: Date) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");

      return `${ano}-${mes}-${dia}`;
    };

    const fim = new Date(hoje);

    if (valor === "diario") {
      setFiltroDataInicio(formatarISO(hoje));
      setFiltroDataFim(formatarISO(hoje));
      return;
    }

    if (valor === "semanal") {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);

      setFiltroDataInicio(formatarISO(inicio));
      setFiltroDataFim(formatarISO(fim));
      return;
    }

    if (valor === "mensal") {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 29);

      setFiltroDataInicio(formatarISO(inicio));
      setFiltroDataFim(formatarISO(fim));
      return;
    }

    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  const gerarRelatorio = async () => {
    setIsLoading(true);
    setBuscou(true);

    try {
      let query = supabase
        .from("presencas")
        .select(
          `
            id,
            aluno_id,
            curso_id,
            turma_id,
            data_hora,
            status,
            metodo,
            operador_id,
            alunos(nome_completo, cpf),
            cursos(titulo),
            turmas(nome),
            operadores(nome)
          `
        )
        .order("data_hora", { ascending: false })
        .limit(5000);

      if (filtroCurso) {
        query = query.eq("curso_id", filtroCurso);
      }

      if (filtroTurma) {
        query = query.eq("turma_id", filtroTurma);
      }

      if (filtroDataInicio) {
        query = query.gte(
          "data_hora",
          `${filtroDataInicio}T00:00:00.000Z`
        );
      }

      if (filtroDataFim) {
        query = query.lte(
          "data_hora",
          `${filtroDataFim}T23:59:59.999Z`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);

        alert("Erro ao gerar relatório: " + error.message);

        setRegistros([]);
        return;
      }

      let resultado = (data || []) as unknown as PresencaRelatorio[];

      if (filtroStatus) {
        resultado = resultado.filter(
          (registro) =>
            normalizarStatus(registro.status) === filtroStatus
        );
      }

      setRegistros(resultado);
    } catch (error) {
      console.error(error);

      alert(
        "Não foi possível gerar o relatório. Tente novamente."
      );

      setRegistros([]);
    } finally {
      setIsLoading(false);
    }
  };

  const limparFiltros = () => {
    setFiltroCurso("");
    setFiltroTurma("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroPeriodo("");
    setFiltroStatus("");
    setBusca("");
    setRegistros([]);
    setBuscou(false);
    setMostrarMultiplasTurmas(false);
  };

  const registrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return registros;

    return registros.filter((registro) => {
      const aluno = getRelacao(registro.alunos);
      const curso = getRelacao(registro.cursos);
      const turma = getRelacao(registro.turmas);

      return (
        aluno?.nome_completo?.toLowerCase().includes(termo) ||
        aluno?.cpf?.toLowerCase().includes(termo) ||
        curso?.titulo?.toLowerCase().includes(termo) ||
        turma?.nome?.toLowerCase().includes(termo)
      );
    });
  }, [registros, busca]);

  /*
   * ================================
   * RESUMO GERAL
   * ================================
   */

  const totalRegistros = registrosFiltrados.length;

  const totalPresencas = useMemo(() => {
    return registrosFiltrados.filter(
      (registro) => normalizarStatus(registro.status) === "presente"
    ).length;
  }, [registrosFiltrados]);

  const totalFaltas = useMemo(() => {
    return registrosFiltrados.filter(
      (registro) => normalizarStatus(registro.status) === "falta"
    ).length;
  }, [registrosFiltrados]);

  const totalParticipantes = useMemo(() => {
    return new Set(registrosFiltrados.map((registro) => registro.aluno_id))
      .size;
  }, [registrosFiltrados]);

  const totalCursos = useMemo(() => {
    return new Set(registrosFiltrados.map((registro) => registro.curso_id))
      .size;
  }, [registrosFiltrados]);

  const percentualPresenca =
    totalRegistros > 0
      ? Math.round((totalPresencas / totalRegistros) * 100)
      : 0;

  /*
   * ================================
   * RESUMO POR ALUNO
   * ================================
   */

  const resumoPorAluno = useMemo((): ResumoAluno[] => {
    const mapa = new Map<string, ResumoAluno>();

    registrosFiltrados.forEach((registro) => {
      const aluno = getRelacao(registro.alunos);
      const status = normalizarStatus(registro.status);

      const atual = mapa.get(registro.aluno_id);

      if (!atual) {
        mapa.set(registro.aluno_id, {
          alunoId: registro.aluno_id,
          nome: aluno?.nome_completo || "Participante desconhecido",
          cpf: aluno?.cpf || "",
          presencas: status === "presente" ? 1 : 0,
          faltas: status === "falta" ? 1 : 0,
          total: 1,
          percentual: status === "presente" ? 100 : 0,
        });

        return;
      }

      atual.total += 1;

      if (status === "presente") {
        atual.presencas += 1;
      } else {
        atual.faltas += 1;
      }

      atual.percentual =
        atual.total > 0
          ? Math.round((atual.presencas / atual.total) * 100)
          : 0;
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.percentual !== b.percentual) {
        return a.percentual - b.percentual;
      }

      return a.nome.localeCompare(b.nome);
    });
  }, [registrosFiltrados]);

  /*
   * ================================
   * RESUMO POR CURSO
   * ================================
   */

  const resumoPorCurso = useMemo((): ResumoCurso[] => {
    const mapa = new Map<
      string,
      {
        cursoId: string;
        titulo: string;
        participantes: Set<string>;
        presencas: number;
        faltas: number;
      }
    >();

    registrosFiltrados.forEach((registro) => {
      const curso = getRelacao(registro.cursos);
      const status = normalizarStatus(registro.status);

      let atual = mapa.get(registro.curso_id);

      if (!atual) {
        atual = {
          cursoId: registro.curso_id,
          titulo: curso?.titulo || "Curso desconhecido",
          participantes: new Set<string>(),
          presencas: 0,
          faltas: 0,
        };

        mapa.set(registro.curso_id, atual);
      }

      atual.participantes.add(registro.aluno_id);

      if (status === "presente") {
        atual.presencas += 1;
      } else {
        atual.faltas += 1;
      }
    });

    return Array.from(mapa.values())
      .map((item) => {
        const total = item.presencas + item.faltas;

        return {
          cursoId: item.cursoId,
          titulo: item.titulo,
          participantes: item.participantes.size,
          presencas: item.presencas,
          faltas: item.faltas,
          total,
          percentual:
            total > 0
              ? Math.round((item.presencas / total) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.percentual - a.percentual);
  }, [registrosFiltrados]);

  const diasComRegistro = useMemo(() => {
    return new Set(registrosFiltrados.map((registro) => registro.data_hora.slice(0, 10))).size;
  }, [registrosFiltrados]);

  const mediaRegistrosPorAluno = totalParticipantes > 0
    ? (totalRegistros / totalParticipantes).toFixed(1)
    : "0";

  const melhorCurso = resumoPorCurso.length > 0 ? resumoPorCurso[0] : null;
  const piorCurso = resumoPorCurso.length > 0 ? resumoPorCurso[resumoPorCurso.length - 1] : null;

  /*
   * ================================
   * EXPORTAÇÃO
   * ================================
   */

  const escaparCSV = (valor: string) => {
    return `"${String(valor).replace(/"/g, '""')}"`;
  };

  const exportarCSV = () => {
    if (registrosFiltrados.length === 0) return;

    const cabecalho = [
      "Participante",
      "CPF",
      "Curso",
      "Turma",
      "Data",
      "Horario",
      "Status",
      "Operador",
      "Metodo",
    ];

    const linhas = registrosFiltrados.map((registro) => {
      const aluno = getRelacao(registro.alunos);
      const curso = getRelacao(registro.cursos);
      const turma = getRelacao(registro.turmas);
      const operador = getRelacao(registro.operadores);

      return [
        aluno?.nome_completo || "",
        aluno?.cpf || "",
        curso?.titulo || "",
        turma?.nome || "",
        formatarData(registro.data_hora),
        formatarHora(registro.data_hora),
        normalizarStatus(registro.status) === "falta"
          ? "Falta"
          : "Presença",
        operador?.nome || "",
        registro.metodo || "",
      ];
    });

    const csv = [
      cabecalho.map(escaparCSV).join(";"),
      ...linhas.map((linha) =>
        linha.map(escaparCSV).join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `relatorio_frequencia_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Relatório de Frequência
            </h1>

            <p className="text-sm text-slate-500">
              Consulte presenças e faltas por período, curso e turma.
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />

            <div>
              <h2 className="font-semibold text-slate-900">
                Filtros
              </h2>

              <p className="text-xs text-slate-500">
                Escolha os dados que deseja analisar.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Atalhos</span>
            {[
              ["diario", "Hoje"],
              ["semanal", "7 dias"],
              ["mensal", "30 dias"],
            ].map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => handlePeriodoChange({ target: { value: valor } } as React.ChangeEvent<HTMLSelectElement>)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filtroPeriodo === valor ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
            {(filtroCurso || filtroTurma || filtroStatus || filtroDataInicio || filtroDataFim || busca) && (
              <span className="ml-auto text-xs text-slate-400">Filtros personalizados ativos</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* CURSO */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Curso
              </label>

              <select
                value={filtroCurso}
                onChange={(event) => {
                  setFiltroCurso(event.target.value);
                  setFiltroTurma("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Todos os cursos</option>

                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.titulo}
                  </option>
                ))}
              </select>
            </div>

            {/* TURMA */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Turma
              </label>

              <select
                value={filtroTurma}
                onChange={(event) =>
                  setFiltroTurma(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Todas as turmas</option>

                {turmasFiltradas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Situação
              </label>

              <select
                value={filtroStatus}
                onChange={(event) =>
                  setFiltroStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Presenças e faltas</option>
                <option value="presente">Somente presenças</option>
                <option value="falta">Somente faltas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* PERÍODO */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Período rápido
              </label>

              <select
                value={filtroPeriodo}
                onChange={handlePeriodoChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Todos os períodos</option>
                <option value="diario">Hoje</option>
                <option value="semanal">Últimos 7 dias</option>
                <option value="mensal">Últimos 30 dias</option>
              </select>
            </div>

            {/* DATA INICIAL */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Data inicial
              </label>

              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(event) => {
                    setFiltroDataInicio(event.target.value);
                    setFiltroPeriodo("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* DATA FINAL */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Data final
              </label>

              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(event) => {
                    setFiltroDataFim(event.target.value);
                    setFiltroPeriodo("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* BUSCA */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Pesquisar nos resultados
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, CPF, curso ou turma..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filtroCurso && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Curso: {cursos.find((c) => c.id === filtroCurso)?.titulo}</span>}
            {filtroTurma && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Turma: {turmas.find((t) => t.id === filtroTurma)?.nome}</span>}
            {filtroStatus && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Situação: {filtroStatus === "falta" ? "Faltas" : "Presenças"}</span>}
            {filtroDataInicio && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">De: {formatarData(filtroDataInicio)}</span>}
            {filtroDataFim && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Até: {formatarData(filtroDataFim)}</span>}
          </div>

          {/* BOTÕES */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={gerarRelatorio}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BarChart3 className="h-4 w-4" />

              {isLoading ? "Gerando..." : "Gerar relatório"}
            </button>

            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />

              Limpar
            </button>

            {registrosFiltrados.length > 0 && (
              <button
                type="button"
                onClick={exportarCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Download className="h-4 w-4" />

                Exportar CSV
              </button>
            )}
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      {buscou && (
        <>
          {/* CARDS */}
          <section>
            <div className="mb-3">
              <h2 className="font-semibold text-slate-900">
                Resumo da frequência
              </h2>

              <p className="text-sm text-slate-500">
                Resultado dos filtros selecionados.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-8">
              {/* REGISTROS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <ClipboardList className="h-5 w-5 text-slate-600" />
                </div>

                <p className="text-xs font-medium text-slate-500">
                  Registros
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {totalRegistros}
                </p>
              </div>

              {/* PRESENÇAS */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>

                <p className="text-xs font-medium text-emerald-700">
                  Presenças
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-800">
                  {totalPresencas}
                </p>
              </div>

              {/* FALTAS */}
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>

                <p className="text-xs font-medium text-red-700">
                  Faltas
                </p>

                <p className="mt-1 text-2xl font-bold text-red-800">
                  {totalFaltas}
                </p>
              </div>

              {/* FREQUÊNCIA */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Percent className="h-5 w-5 text-blue-600" />
                </div>

                <p className="text-xs font-medium text-blue-700">
                  Frequência
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-800">
                  {percentualPresenca}%
                </p>
              </div>

              {/* PARTICIPANTES */}
              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <Users className="h-5 w-5 text-violet-600" />
                </div>

                <p className="text-xs font-medium text-violet-700">
                  Participantes
                </p>

                <p className="mt-1 text-2xl font-bold text-violet-800">
                  {totalParticipantes}
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100"><Layers3 className="h-5 w-5 text-indigo-600" /></div>
                <p className="text-xs font-medium text-indigo-700">Turmas</p>
                <p className="mt-1 text-2xl font-bold text-indigo-800">{totalTurmas}</p>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100"><CalendarDays className="h-5 w-5 text-cyan-600" /></div>
                <p className="text-xs font-medium text-cyan-700">Dias registrados</p>
                <p className="mt-1 text-2xl font-bold text-cyan-800">{diasComRegistro}</p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100"><BarChart3 className="h-5 w-5 text-orange-600" /></div>
                <p className="text-xs font-medium text-orange-700">Média/aluno</p>
                <p className="mt-1 text-2xl font-bold text-orange-800">{mediaRegistrosPorAluno}</p>
              </div>
            </div>
          </section>

          {/* ALUNOS EM MAIS DE UMA TURMA */}
          <section className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600"><UserPlus className="h-6 w-6" /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Alunos em mais de uma turma</h2>
                  <p className="mt-1 text-sm text-slate-500">Veja quem possui múltiplas matrículas e quais são suas turmas.</p>
                </div>
              </div>
              <button type="button" onClick={() => setMostrarMultiplasTurmas(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700">
                <UsersRound className="h-4 w-4" />
                Ver {alunosMultiplasTurmas.length} alunos
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* MAIS INDICADORES */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100"><TrendingUp className="h-5 w-5 text-emerald-600" /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Melhor frequência</p><p className="font-bold text-slate-900">{melhorCurso?.titulo || "—"}</p></div></div>
              <p className="mt-4 text-3xl font-bold text-emerald-700">{melhorCurso ? `${melhorCurso.percentual}%` : "—"}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100"><TrendingDown className="h-5 w-5 text-red-600" /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Menor frequência</p><p className="font-bold text-slate-900">{piorCurso?.titulo || "—"}</p></div></div>
              <p className="mt-4 text-3xl font-bold text-red-700">{piorCurso ? `${piorCurso.percentual}%` : "—"}</p>
            </div>
          </section>

          {/* SEM RESULTADOS */}
          {registrosFiltrados.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Search className="h-6 w-6 text-slate-400" />
              </div>

              <h3 className="font-semibold text-slate-900">
                Nenhum registro encontrado
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Tente alterar os filtros ou o período selecionado.
              </p>
            </div>
          )}

          {/* RESUMO POR CURSO */}
          {resumoPorCurso.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Frequência por curso
                    </h2>

                    <p className="text-xs text-slate-500">
                      Compare presença e falta em cada curso.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Curso
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Participantes
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Presenças
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Faltas
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Frequência
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {resumoPorCurso.map((curso) => (
                      <tr
                        key={curso.cursoId}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {curso.titulo}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {curso.participantes}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-emerald-700">
                            {curso.presencas}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-red-700">
                            {curso.faltas}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{
                                  width: `${curso.percentual}%`,
                                }}
                              />
                            </div>

                            <span className="font-semibold text-slate-700">
                              {curso.percentual}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* RESUMO POR PARTICIPANTE */}
          {resumoPorAluno.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                    <Users className="h-5 w-5 text-violet-600" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Frequência por participante
                    </h2>

                    <p className="text-xs text-slate-500">
                      Participantes com menor frequência aparecem primeiro.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Participante
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        CPF
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Presenças
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Faltas
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Frequência
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {resumoPorAluno.map((aluno) => (
                      <tr
                        key={aluno.alunoId}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {aluno.nome}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatarCPF(aluno.cpf)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-emerald-700">
                            {aluno.presencas}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-red-700">
                            {aluno.faltas}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={
                                  aluno.percentual >= 75
                                    ? "h-full rounded-full bg-emerald-500"
                                    : "h-full rounded-full bg-red-500"
                                }
                                style={{
                                  width: `${aluno.percentual}%`,
                                }}
                              />
                            </div>

                            <span
                              className={
                                aluno.percentual >= 75
                                  ? "font-bold text-emerald-700"
                                  : "font-bold text-red-700"
                              }
                            >
                              {aluno.percentual}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* DETALHAMENTO */}
          {registrosFiltrados.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <ClipboardList className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Registros detalhados
                    </h2>

                    <p className="text-xs text-slate-500">
                      Cada lançamento de presença ou falta.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {registrosFiltrados.length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Participante
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Curso
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Turma
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Data
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Horário
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Situação
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Operador
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {registrosFiltrados.map((registro) => {
                      const aluno = getRelacao(registro.alunos);
                      const curso = getRelacao(registro.cursos);
                      const turma = getRelacao(registro.turmas);
                      const operador = getRelacao(
                        registro.operadores
                      );

                      const status = normalizarStatus(
                        registro.status
                      );

                      return (
                        <tr
                          key={registro.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">
                              {aluno?.nome_completo ||
                                "Participante desconhecido"}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-400">
                              {formatarCPF(aluno?.cpf || null)}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {curso?.titulo || "—"}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {turma?.nome || "—"}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatarData(registro.data_hora)}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatarHora(registro.data_hora)}
                          </td>

                          <td className="px-5 py-4">
                            {status === "falta" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                <XCircle className="h-3.5 w-3.5" />
                                Falta
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Presença
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {operador?.nome || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {mostrarMultiplasTurmas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setMostrarMultiplasTurmas(false); }}>
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-lg font-bold text-slate-900">Alunos em múltiplas turmas</h2><p className="text-sm text-slate-500">{alunosMultiplasTurmas.length} aluno(s) com duas ou mais turmas.</p></div>
              <button type="button" onClick={() => setMostrarMultiplasTurmas(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto p-5">
              {alunosMultiplasTurmas.length === 0 ? (
                <div className="py-12 text-center"><UsersRound className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Nenhum aluno em múltiplas turmas</p></div>
              ) : (
                <div className="space-y-3">
                  {alunosMultiplasTurmas.map((aluno) => (
                    <div key={aluno.alunoId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div><p className="font-bold text-slate-900">{aluno.nome}</p><p className="text-xs text-slate-500">CPF: {formatarCPF(aluno.cpf)}</p></div>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">{aluno.turmas.length} turmas</span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {aluno.turmas.map((turma) => (
                          <div key={turma.turmaId} className="rounded-lg border border-white bg-white px-3 py-2.5 shadow-sm">
                            <p className="text-sm font-semibold text-slate-800">{turma.turma}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{turma.curso}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
