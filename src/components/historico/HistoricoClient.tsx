"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Calendar,
  Filter,
  RotateCcw,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  Download,
  BookOpen,
  BarChart3,
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

type PresencaRegistro = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_hora: string;
  metodo: string | null;
  operador_id: string | null;
  status: string | null;

  alunos:
    | {
        nome_completo: string;
        cpf: string | null;
      }
    | {
        nome_completo: string;
        cpf: string | null;
      }[]
    | null;

  cursos:
    | {
        titulo: string;
      }
    | {
        titulo: string;
      }[]
    | null;

  turmas:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null;

  operadores:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null;
};

function pegarRelacao<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;

  if (Array.isArray(valor)) {
    return valor.length > 0 ? valor[0] : null;
  }

  return valor;
}

function normalizarStatus(status: string | null | undefined) {
  const valor = (status || "presente").toLowerCase().trim();

  if (
    valor === "falta" ||
    valor === "faltou" ||
    valor === "ausente" ||
    valor === "absence"
  ) {
    return "falta";
  }

  return "presente";
}

function formatarData(data: string) {
  if (!data) return "—";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return valor.toLocaleDateString("pt-BR");
}

function formatarHora(data: string) {
  if (!data) return "—";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return valor.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarCPF(cpf: string | null | undefined) {
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

function percentual(presente: number, total: number) {
  if (!total) return 0;

  return Math.round((presente / total) * 100);
}

export default function HistoricoClient({
  cursos,
  turmas,
}: {
  cursos: Curso[];
  turmas: Turma[];
}) {
  const [presencas, setPresencas] = useState<PresencaRegistro[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);

  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const turmasFiltradas = useMemo(() => {
    if (!filtroCurso) {
      return turmas;
    }

    return turmas.filter((turma) => turma.curso_id === filtroCurso);
  }, [turmas, filtroCurso]);

  const presentes = useMemo(() => {
    return presencas.filter(
      (registro) => normalizarStatus(registro.status) === "presente"
    ).length;
  }, [presencas]);

  const faltas = useMemo(() => {
    return presencas.filter(
      (registro) => normalizarStatus(registro.status) === "falta"
    ).length;
  }, [presencas]);

  const totalRegistros = presencas.length;

  const alunosUnicos = useMemo(() => {
    return new Set(presencas.map((registro) => registro.aluno_id)).size;
  }, [presencas]);

  const percentualPresenca = useMemo(() => {
    return percentual(presentes, totalRegistros);
  }, [presentes, totalRegistros]);

  const cursosComRegistros = useMemo(() => {
    return new Set(presencas.map((registro) => registro.curso_id)).size;
  }, [presencas]);

  const turmasComRegistros = useMemo(() => {
    return new Set(presencas.map((registro) => registro.turma_id)).size;
  }, [presencas]);

  const resumoPorCurso = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        nome: string;
        presentes: number;
        faltas: number;
        total: number;
      }
    >();

    presencas.forEach((registro) => {
      const curso = pegarRelacao(registro.cursos);

      const nomeCurso =
        curso?.titulo ||
        cursos.find((item) => item.id === registro.curso_id)?.titulo ||
        "Curso não informado";

      const atual = mapa.get(registro.curso_id);

      if (!atual) {
        mapa.set(registro.curso_id, {
          id: registro.curso_id,
          nome: nomeCurso,
          presentes:
            normalizarStatus(registro.status) === "presente" ? 1 : 0,
          faltas: normalizarStatus(registro.status) === "falta" ? 1 : 0,
          total: 1,
        });
      } else {
        atual.total += 1;

        if (normalizarStatus(registro.status) === "presente") {
          atual.presentes += 1;
        } else {
          atual.faltas += 1;
        }
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [presencas, cursos]);

  const resumoPorTurma = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        nome: string;
        curso: string;
        presentes: number;
        faltas: number;
        total: number;
      }
    >();

    presencas.forEach((registro) => {
      const turma = pegarRelacao(registro.turmas);
      const curso = pegarRelacao(registro.cursos);

      const turmaBase = turmas.find(
        (item) => item.id === registro.turma_id
      );

      const nomeTurma =
        turma?.nome || turmaBase?.nome || "Turma não informada";

      const nomeCurso =
        curso?.titulo ||
        cursos.find((item) => item.id === registro.curso_id)?.titulo ||
        "Curso não informado";

      const atual = mapa.get(registro.turma_id);

      if (!atual) {
        mapa.set(registro.turma_id, {
          id: registro.turma_id,
          nome: nomeTurma,
          curso: nomeCurso,
          presentes:
            normalizarStatus(registro.status) === "presente" ? 1 : 0,
          faltas: normalizarStatus(registro.status) === "falta" ? 1 : 0,
          total: 1,
        });
      } else {
        atual.total += 1;

        if (normalizarStatus(registro.status) === "presente") {
          atual.presentes += 1;
        } else {
          atual.faltas += 1;
        }
      }
    });

    return Array.from(mapa.values()).sort(
      (a, b) => b.total - a.total
    );
  }, [presencas, turmas, cursos]);

  const alunosComMaisDeUmRegistro = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        nome: string;
        cpf: string | null;
        total: number;
        presentes: number;
        faltas: number;
        turmas: Set<string>;
      }
    >();

    presencas.forEach((registro) => {
      const aluno = pegarRelacao(registro.alunos);

      const nome = aluno?.nome_completo || "Participante não informado";

      const atual = mapa.get(registro.aluno_id);

      if (!atual) {
        mapa.set(registro.aluno_id, {
          id: registro.aluno_id,
          nome,
          cpf: aluno?.cpf || null,
          total: 1,
          presentes:
            normalizarStatus(registro.status) === "presente" ? 1 : 0,
          faltas:
            normalizarStatus(registro.status) === "falta" ? 1 : 0,
          turmas: new Set([registro.turma_id]),
        });
      } else {
        atual.total += 1;
        atual.turmas.add(registro.turma_id);

        if (normalizarStatus(registro.status) === "presente") {
          atual.presentes += 1;
        } else {
          atual.faltas += 1;
        }
      }
    });

    return Array.from(mapa.values())
      .filter((aluno) => aluno.total > 1)
      .sort((a, b) => b.total - a.total);
  }, [presencas]);

  const buscarHistorico = async () => {
    setIsLoading(true);
    setBuscou(true);

    try {
      let query = supabase
        .from("presencas")
        .select(
          "id, aluno_id, curso_id, turma_id, data_hora, metodo, operador_id, status, alunos(nome_completo, cpf), cursos(titulo), turmas(nome), operadores(nome)"
        )
        .order("data_hora", {
          ascending: false,
        })
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
          `${filtroDataInicio}T00:00:00`
        );
      }

      if (filtroDataFim) {
        query = query.lte(
          "data_hora",
          `${filtroDataFim}T23:59:59.999`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar histórico:", error);

        alert(
          "Erro ao buscar histórico: " + error.message
        );

        setPresencas([]);
        return;
      }

      let resultados =
        (data || []) as unknown as PresencaRegistro[];

      if (filtroNome.trim()) {
        const termo = filtroNome
          .trim()
          .toLowerCase();

        resultados = resultados.filter((registro) => {
          const aluno = pegarRelacao(registro.alunos);

          return (
            aluno?.nome_completo
              ?.toLowerCase()
              .includes(termo) || false
          );
        });
      }

      if (filtroCpf.trim()) {
        const cpfLimpo = filtroCpf.replace(/\D/g, "");

        resultados = resultados.filter((registro) => {
          const aluno = pegarRelacao(registro.alunos);

          const cpf = (aluno?.cpf || "").replace(
            /\D/g,
            ""
          );

          return cpf.includes(cpfLimpo);
        });
      }

      if (filtroStatus) {
        resultados = resultados.filter((registro) => {
          return (
            normalizarStatus(registro.status) ===
            filtroStatus
          );
        });
      }

      setPresencas(resultados);
    } catch (error: any) {
      console.error("Erro inesperado:", error);

      alert(
        "Erro inesperado: " +
          (error?.message || "Erro desconhecido.")
      );

      setPresencas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const limparFiltros = () => {
    setFiltroCpf("");
    setFiltroNome("");
    setFiltroCurso("");
    setFiltroTurma("");
    setFiltroStatus("");
    setFiltroDataInicio("");
    setFiltroDataFim("");

    setPresencas([]);
    setBuscou(false);
  };

  const exportarCSV = () => {
    if (!presencas.length) {
      alert("Não há registros para exportar.");
      return;
    }

    const cabecalho = [
      "Participante",
      "CPF",
      "Curso",
      "Turma",
      "Data",
      "Horário",
      "Status",
      "Operador",
      "Método",
    ];

    const linhas = presencas.map((registro) => {
      const aluno = pegarRelacao(registro.alunos);
      const curso = pegarRelacao(registro.cursos);
      const turma = pegarRelacao(registro.turmas);
      const operador = pegarRelacao(registro.operadores);

      return [
        aluno?.nome_completo || "",
        formatarCPF(aluno?.cpf),
        curso?.titulo || "",
        turma?.nome || "",
        formatarData(registro.data_hora),
        formatarHora(registro.data_hora),
        normalizarStatus(registro.status) === "falta"
          ? "Falta"
          : "Presente",
        operador?.nome || "",
        registro.metodo || "",
      ];
    });

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map(
            (valor) =>
              `"${String(valor).replace(/"/g, '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `relatorio-frequencia-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Relatório de Frequência
                </h1>

                <p className="text-sm text-slate-500 mt-0.5">
                  Acompanhe presenças, faltas, datas, cursos e
                  turmas.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={buscarHistorico}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            <Search className="w-4 h-4" />

            {isLoading
              ? "Atualizando..."
              : "Atualizar relatório"}
          </button>
        </div>

        {/* FILTROS */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />

              <div>
                <h2 className="font-bold text-slate-900">
                  Filtros
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Refine os registros que deseja consultar.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* NOME */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Participante
                </label>

                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={filtroNome}
                    onChange={(event) =>
                      setFiltroNome(event.target.value)
                    }
                    placeholder="Nome do participante"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  CPF
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={filtroCpf}
                    onChange={(event) =>
                      setFiltroCpf(event.target.value)
                    }
                    placeholder="CPF"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* CURSO */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Curso
                </label>

                <select
                  value={filtroCurso}
                  onChange={(event) => {
                    setFiltroCurso(event.target.value);
                    setFiltroTurma("");
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
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

              {/* TURMA */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Turma
                </label>

                <select
                  value={filtroTurma}
                  onChange={(event) =>
                    setFiltroTurma(event.target.value)
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="">
                    Todas as turmas
                  </option>

                  {turmasFiltradas.map((turma) => (
                    <option
                      key={turma.id}
                      value={turma.id}
                    >
                      {turma.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* STATUS */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Situação
                </label>

                <select
                  value={filtroStatus}
                  onChange={(event) =>
                    setFiltroStatus(event.target.value)
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="">
                    Presenças e faltas
                  </option>

                  <option value="presente">
                    Apenas presentes
                  </option>

                  <option value="falta">
                    Apenas faltas
                  </option>
                </select>
              </div>

              {/* DATA INICIAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Data inicial
                </label>

                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(event) =>
                      setFiltroDataInicio(
                        event.target.value
                      )
                    }
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* DATA FINAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Data final
                </label>

                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={(event) =>
                      setFiltroDataFim(event.target.value)
                    }
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={buscarHistorico}
                disabled={isLoading}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                <Search className="w-4 h-4" />

                {isLoading
                  ? "Buscando..."
                  : "Buscar registros"}
              </button>

              <button
                type="button"
                onClick={limparFiltros}
                className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar filtros
              </button>

              <button
                type="button"
                onClick={exportarCSV}
                disabled={!presencas.length}
                className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>
        </section>

        {/* CARDS */}
        {buscou && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* REGISTROS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Registros
                  </p>

                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {totalRegistros}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    lançamentos encontrados
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </div>

            {/* PRESENTES */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Presenças
                  </p>

                  <p className="text-3xl font-bold text-emerald-700 mt-2">
                    {presentes}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    registros presentes
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* FALTAS */}
            <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Faltas
                  </p>

                  <p className="text-3xl font-bold text-red-700 mt-2">
                    {faltas}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    registros de ausência
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            {/* FREQUÊNCIA */}
            <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Frequência
                  </p>

                  <p className="text-3xl font-bold text-blue-700 mt-2">
                    {percentualPresenca}%
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    {alunosUnicos} participante(s)
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESUMO GERAL */}
        {buscou && presencas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Participantes
                  </p>

                  <p className="text-xl font-bold text-slate-900">
                    {alunosUnicos}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Cursos com registros
                  </p>

                  <p className="text-xl font-bold text-slate-900">
                    {cursosComRegistros}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Turmas com registros
                  </p>

                  <p className="text-xl font-bold text-slate-900">
                    {turmasComRegistros}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FREQUÊNCIA POR CURSO */}
        {buscou && resumoPorCurso.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Frequência por curso
                  </h2>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Veja rapidamente a frequência registrada em cada curso.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {resumoPorCurso.map((curso) => {
                const taxa = percentual(
                  curso.presentes,
                  curso.total
                );

                return (
                  <div
                    key={curso.id}
                    className="border border-slate-100 rounded-xl p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {curso.nome}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {curso.total} registro(s) ·{" "}
                          {curso.presentes} presença(s) ·{" "}
                          {curso.faltas} falta(s)
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-700">
                          {taxa}%
                        </p>

                        <p className="text-[11px] text-slate-400">
                          frequência
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{
                          width: `${taxa}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FREQUÊNCIA POR TURMA */}
        {buscou && resumoPorTurma.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Frequência por turma
                  </h2>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Resumo de presença e falta por turma.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Turma
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Curso
                    </th>

                    <th className="text-center px-5 py-3 font-semibold text-slate-600">
                      Registros
                    </th>

                    <th className="text-center px-5 py-3 font-semibold text-emerald-600">
                      Presentes
                    </th>

                    <th className="text-center px-5 py-3 font-semibold text-red-600">
                      Faltas
                    </th>

                    <th className="text-center px-5 py-3 font-semibold text-blue-600">
                      Frequência
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {resumoPorTurma.map((turma) => {
                    const taxa = percentual(
                      turma.presentes,
                      turma.total
                    );

                    return (
                      <tr
                        key={turma.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {turma.nome}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {turma.curso}
                        </td>

                        <td className="px-5 py-4 text-center text-slate-600">
                          {turma.total}
                        </td>

                        <td className="px-5 py-4 text-center font-semibold text-emerald-700">
                          {turma.presentes}
                        </td>

                        <td className="px-5 py-4 text-center font-semibold text-red-700">
                          {turma.faltas}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                            {taxa}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ALUNOS COM MAIS DE UM REGISTRO */}
        {buscou && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Participantes com vários registros
                  </h2>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Participantes que possuem mais de um lançamento de frequência.
                  </p>
                </div>
              </div>
            </div>

            {alunosComMaisDeUmRegistro.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />

                <p className="text-sm text-slate-500">
                  Nenhum participante possui mais de um registro no resultado atual.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alunosComMaisDeUmRegistro
                  .slice(0, 30)
                  .map((aluno) => {
                    const taxa = percentual(
                      aluno.presentes,
                      aluno.total
                    );

                    return (
                      <div
                        key={aluno.id}
                        className="p-5 hover:bg-slate-50 transition"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                              {aluno.nome
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {aluno.nome}
                              </p>

                              <p className="text-xs text-slate-500">
                                CPF:{" "}
                                {formatarCPF(aluno.cpf)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                              <Users className="w-3.5 h-3.5" />
                              {aluno.total} registros
                            </span>

                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {aluno.presentes} presentes
                            </span>

                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              {aluno.faltas} faltas
                            </span>

                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                              <Percent className="w-3.5 h-3.5" />
                              {taxa}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* RESULTADOS */}
        {buscou && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">
                  Histórico de frequência
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {presencas.length} registro(s) encontrado(s).
                </p>
              </div>

              {presencas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {presentes} presentes
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    {faltas} faltas
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Participante
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      CPF
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Curso
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Turma
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Data
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Horário
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Situação
                    </th>

                    <th className="text-left px-5 py-3 font-semibold text-slate-600">
                      Operador
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {presencas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-14 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <Calendar className="w-9 h-9 text-slate-300 mb-3" />

                          <p className="font-semibold text-slate-600">
                            Nenhum registro encontrado
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            Tente alterar os filtros utilizados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    presencas.map((registro) => {
                      const aluno = pegarRelacao(
                        registro.alunos
                      );

                      const curso = pegarRelacao(
                        registro.cursos
                      );

                      const turma = pegarRelacao(
                        registro.turmas
                      );

                      const operador = pegarRelacao(
                        registro.operadores
                      );

                      const status =
                        normalizarStatus(
                          registro.status
                        );

                      const ehPresente =
                        status === "presente";

                      return (
                        <tr
                          key={registro.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          {/* PARTICIPANTE */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                  ehPresente
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                <User className="w-4 h-4" />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-900">
                                  {aluno?.nome_completo ||
                                    "Participante não informado"}
                                </p>

                                <p className="text-[11px] text-slate-400">
                                  Registro de frequência
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* CPF */}
                          <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                            {formatarCPF(aluno?.cpf)}
                          </td>

                          {/* CURSO */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-slate-400" />

                              <span className="text-slate-700">
                                {curso?.titulo ||
                                  cursos.find(
                                    (item) =>
                                      item.id ===
                                      registro.curso_id
                                  )?.titulo ||
                                  "Curso não informado"}
                              </span>
                            </div>
                          </td>

                          {/* TURMA */}
                          <td className="px-5 py-4 text-slate-700">
                            {turma?.nome ||
                              turmas.find(
                                (item) =>
                                  item.id ===
                                  registro.turma_id
                              )?.nome ||
                              "Turma não informada"}
                          </td>

                          {/* DATA */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Calendar className="w-4 h-4 text-blue-500" />

                              <div>
                                <p className="font-semibold text-slate-700">
                                  {formatarData(
                                    registro.data_hora
                                  )}
                                </p>

                                <p className="text-[11px] text-slate-400">
                                  Dia do registro
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* HORÁRIO */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Clock className="w-4 h-4 text-slate-400" />

                              <span className="text-slate-600">
                                {formatarHora(
                                  registro.data_hora
                                )}
                              </span>
                            </div>
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4">
                            {ehPresente ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Presente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                                <XCircle className="w-3.5 h-3.5" />
                                Falta
                              </span>
                            )}
                          </td>

                          {/* OPERADOR */}
                          <td className="px-5 py-4 text-slate-500">
                            {operador?.nome || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ESTADO INICIAL */}
        {!buscou && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-blue-600" />
            </div>

            <h2 className="font-bold text-slate-800">
              Consulte a frequência
            </h2>

            <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2">
              Utilize os filtros acima e clique em
              <strong> Buscar registros </strong>
              para visualizar presenças, faltas, datas,
              horários, cursos e turmas.
            </p>

            <button
              type="button"
              onClick={buscarHistorico}
              disabled={isLoading}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              <Search className="w-4 h-4" />
              Carregar frequência
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
