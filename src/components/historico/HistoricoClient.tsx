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
    | { nome_completo: string; cpf: string | null }
    | { nome_completo: string; cpf: string | null }[]
    | null;
  cursos: { titulo: string } | { titulo: string }[] | null;
  turmas: { nome: string } | { nome: string }[] | null;
  operadores: { nome: string } | { nome: string }[] | null;
};

function pegarRelacao<T>(valor: T | T[] | null): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] || null : valor;
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
    if (!filtroCurso) return turmas;
    return turmas.filter((t) => t.curso_id === filtroCurso);
  }, [turmas, filtroCurso]);

  const presentes = useMemo(
    () => presencas.filter((p) => (p.status || "presente").toLowerCase() === "presente").length,
    [presencas]
  );

  const faltas = useMemo(
    () => presencas.filter((p) => (p.status || "").toLowerCase() === "falta").length,
    [presencas]
  );

  const percentualPresenca = useMemo(() => {
    if (!presencas.length) return 0;
    return Math.round((presentes / presencas.length) * 100);
  }, [presencas.length, presentes]);

  const alunosUnicos = useMemo(
    () => new Set(presencas.map((p) => p.aluno_id)).size,
    [presencas]
  );

  const buscarHistorico = async () => {
    setIsLoading(true);
    setBuscou(true);

    try {
      let query = supabase
        .from("presencas")
        .select(
          "id, aluno_id, curso_id, turma_id, data_hora, metodo, operador_id, status, alunos(nome_completo, cpf), cursos(titulo), turmas(nome), operadores(nome)"
        )
        .order("data_hora", { ascending: false })
        .limit(2000);

      if (filtroCurso) {
        query = query.eq("curso_id", filtroCurso);
      }

      if (filtroTurma) {
        query = query.eq("turma_id", filtroTurma);
      }

      if (filtroDataInicio) {
        query = query.gte("data_hora", `${filtroDataInicio}T00:00:00`);
      }

      if (filtroDataFim) {
        query = query.lte("data_hora", `${filtroDataFim}T23:59:59.999`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        alert("Erro ao buscar histórico: " + error.message);
        setPresencas([]);
        return;
      }

      let resultados = (data || []) as unknown as PresencaRegistro[];

      if (filtroNome.trim()) {
        const termo = filtroNome.trim().toLowerCase();

        resultados = resultados.filter((p) =>
          pegarRelacao(p.alunos)?.nome_completo?.toLowerCase().includes(termo)
        );
      }

      if (filtroCpf.trim()) {
        const cpfLimpo = filtroCpf.replace(/\D/g, "");

        resultados = resultados.filter((p) =>
          (pegarRelacao(p.alunos)?.cpf || "")
            .replace(/\D/g, "")
            .includes(cpfLimpo)
        );
      }

      if (filtroStatus) {
        resultados = resultados.filter((p) => {
          const status = (p.status || "presente").toLowerCase();
          return status === filtroStatus;
        });
      }

      setPresencas(resultados);
    } catch (err: any) {
      console.error("Erro:", err);
      alert("Erro inesperado: " + (err?.message || "Erro desconhecido."));
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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-BR");
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "—";

    const d = cpf.replace(/\D/g, "");

    if (d.length === 11) {
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    }

    return cpf;
  };

  const getStatus = (p: PresencaRegistro) => {
    const status = (p.status || "presente").toLowerCase();

    if (status === "falta") {
      return {
        label: "Falta",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: <XCircle className="w-3.5 h-3.5" />,
      };
    }

    return {
      label: "Presente",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  };

  const exportarCSV = () => {
    if (!presencas.length) {
      alert("Não há registros para exportar.");
      return;
    }

    const linhas = presencas.map((p) => {
      const aluno = pegarRelacao(p.alunos);
      const curso = pegarRelacao(p.cursos);
      const turma = pegarRelacao(p.turmas);
      const operador = pegarRelacao(p.operadores);

      return [
        aluno?.nome_completo || "",
        formatCPF(aluno?.cpf || null),
        curso?.titulo || "",
        turma?.nome || "",
        formatDate(p.data_hora),
        formatTime(p.data_hora),
        (p.status || "presente").toLowerCase() === "falta"
          ? "Falta"
          : "Presente",
        operador?.nome || "",
        p.metodo || "",
      ];
    });

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

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
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
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Relatório de Frequência
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Consulte presenças e faltas por participante, curso, turma e período.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="w-4 h-4" />
          Filtros de Busca
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nome do Participante
            </label>

            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              CPF do Participante
            </label>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={filtroCpf}
                onChange={(e) => setFiltroCpf(e.target.value)}
                placeholder="Buscar por CPF..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          {/* Curso */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Curso
            </label>

            <select
              value={filtroCurso}
              onChange={(e) => {
                setFiltroCurso(e.target.value);
                setFiltroTurma("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            >
              <option value="">Todos os cursos</option>

              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Turma */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Turma
            </label>

            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            >
              <option value="">Todas as turmas</option>

              {turmasFiltradas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status
            </label>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            >
              <option value="">Todos</option>
              <option value="presente">Presentes</option>
              <option value="falta">Faltas</option>
            </select>
          </div>

          {/* Data início */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Data Início
            </label>

            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>

          {/* Data fim */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Data Fim
            </label>

            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={buscarHistorico}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {isLoading ? "Buscando..." : "Buscar"}
          </button>

          <button
            onClick={limparFiltros}
            className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar
          </button>

          <button
            onClick={exportarCSV}
            disabled={!presencas.length}
            className="border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Resumo */}
      {buscou && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Registros
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {presencas.length}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-100">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Presentes
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {presentes}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Faltas
                </p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {faltas}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-red-50">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Taxa de Presença
                </p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {percentualPresenca}%
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {alunosUnicos} participante(s)
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {buscou && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Registros de frequência
              </p>

              <p className="text-xs text-slate-500 mt-0.5">
                {presencas.length} registro(s) encontrado(s)
              </p>
            </div>

            {presencas.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {presentes} presentes
                </span>

                <span className="flex items-center gap-1.5 text-red-700">
                  <XCircle className="w-3.5 h-3.5" />
                  {faltas} faltas
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Participante</th>
                  <th className="px-5 py-3 font-semibold">CPF</th>
                  <th className="px-5 py-3 font-semibold">Curso</th>
                  <th className="px-5 py-3 font-semibold">Turma</th>
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="px-5 py-3 font-semibold">Horário</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Operador</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {presencas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Nenhum registro encontrado com os filtros informados.
                    </td>
                  </tr>
                ) : (
                  presencas.map((p) => {
                    const aluno = pegarRelacao(p.alunos);
                    const curso = pegarRelacao(p.cursos);
                    const turma = pegarRelacao(p.turmas);
                    const operador = pegarRelacao(p.operadores);
                    const status = getStatus(p);

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3 text-slate-900 font-medium">
                          {aluno?.nome_completo || "—"}
                        </td>

                        <td className="px-5 py-3 text-slate-500">
                          {formatCPF(aluno?.cpf || null)}
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {curso?.titulo || "—"}
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {turma?.nome || "—"}
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(p.data_hora)}
                          </div>
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatTime(p.data_hora)}
                          </div>
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${status.className}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-3 text-slate-500">
                          {operador?.nome || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
