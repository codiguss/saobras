"use client";

import { useState, useMemo } from "react";
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
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Curso = { id: string; titulo: string };
type Turma = { id: string; nome: string; curso_id: string };
type Operador = { id: string; nome: string };

type PresencaRelatorio = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_hora: string;
  operador_id: string | null;
  alunos: { nome_completo: string; cpf: string | null } | null;
  cursos: { titulo: string } | null;
  turmas: { nome: string } | null;
  operadores: { nome: string } | null;
};

type ResumoAluno = {
  nome: string;
  cpf: string;
  totalPresencas: number;
};

type ResumoCurso = {
  titulo: string;
  totalPresencas: number;
  totalAlunos: number;
};

export default function RelatoriosClient({
  cursos,
  turmas,
  operadores,
}: {
  cursos: Curso[];
  turmas: Turma[];
  operadores: Operador[];
}) {
  const [presencas, setPresencas] = useState<PresencaRelatorio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);

  // Filtros
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const turmasFiltradas = useMemo(() => {
    if (!filtroCurso) return turmas;
    return turmas.filter((t) => t.curso_id === filtroCurso);
  }, [turmas, filtroCurso]);

  const gerarRelatorio = async () => {
    setIsLoading(true);
    setBuscou(true);

    try {
      let query = supabase
        .from("presencas")
        .select(
          "id, aluno_id, curso_id, turma_id, data_hora, operador_id, alunos(nome_completo, cpf), cursos(titulo), turmas(nome), operadores(nome)"
        )
        .order("data_hora", { ascending: false })
        .limit(2000);

      if (filtroCurso) query = query.eq("curso_id", filtroCurso);
      if (filtroTurma) query = query.eq("turma_id", filtroTurma);
      if (filtroOperador) query = query.eq("operador_id", filtroOperador);
      if (filtroDataInicio) query = query.gte("data_hora", `${filtroDataInicio}T00:00:00.000Z`);
      if (filtroDataFim) query = query.lte("data_hora", `${filtroDataFim}T23:59:59.999Z`);

      const { data, error } = await query;

      if (error) {
        alert("Erro ao gerar relatório: " + error.message);
        setPresencas([]);
        return;
      }

      let resultados = (data || []) as unknown as PresencaRelatorio[];

      if (filtroNome.trim()) {
        const termo = filtroNome.toLowerCase();
        resultados = resultados.filter((p) =>
          p.alunos?.nome_completo?.toLowerCase().includes(termo)
        );
      }

      if (filtroCpf.trim()) {
        const cpfLimpo = filtroCpf.replace(/\D/g, "");
        resultados = resultados.filter((p) =>
          p.alunos?.cpf?.replace(/\D/g, "").includes(cpfLimpo)
        );
      }

      setPresencas(resultados);
    } catch (err: any) {
      alert("Erro inesperado: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const limparFiltros = () => {
    setFiltroCpf("");
    setFiltroNome("");
    setFiltroCurso("");
    setFiltroTurma("");
    setFiltroOperador("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setPresencas([]);
    setBuscou(false);
  };

  // =========================================
  // Resumos
  // =========================================

  const resumoPorAluno = useMemo((): ResumoAluno[] => {
    const mapa: Record<string, ResumoAluno> = {};
    presencas.forEach((p) => {
      const key = p.aluno_id;
      if (!mapa[key]) {
        mapa[key] = {
          nome: p.alunos?.nome_completo || "Desconhecido",
          cpf: p.alunos?.cpf || "—",
          totalPresencas: 0,
        };
      }
      mapa[key].totalPresencas++;
    });
    return Object.values(mapa).sort((a, b) => b.totalPresencas - a.totalPresencas);
  }, [presencas]);

  const resumoPorCurso = useMemo((): ResumoCurso[] => {
    const mapa: Record<string, { titulo: string; presencas: number; alunos: Set<string> }> = {};
    presencas.forEach((p) => {
      const key = p.curso_id;
      const titulo = (Array.isArray(p.cursos) ? (p.cursos as any)[0]?.titulo : p.cursos?.titulo) || "Desconhecido";
      if (!mapa[key]) {
        mapa[key] = { titulo, presencas: 0, alunos: new Set() };
      }
      mapa[key].presencas++;
      mapa[key].alunos.add(p.aluno_id);
    });
    return Object.values(mapa)
      .map((v) => ({ titulo: v.titulo, totalPresencas: v.presencas, totalAlunos: v.alunos.size }))
      .sort((a, b) => b.totalPresencas - a.totalPresencas);
  }, [presencas]);

  // =========================================
  // Exportar CSV
  // =========================================

  const exportarCSV = () => {
    if (presencas.length === 0) return;

    const headers = ["Participante", "CPF", "Curso", "Turma", "Data", "Horário", "Operador"];
    const linhas = presencas.map((p) => [
      p.alunos?.nome_completo || "",
      p.alunos?.cpf || "",
      (Array.isArray(p.cursos) ? (p.cursos as any)[0]?.titulo : p.cursos?.titulo) || "",
      (Array.isArray(p.turmas) ? (p.turmas as any)[0]?.nome : p.turmas?.nome) || "",
      new Date(p.data_hora).toLocaleDateString("pt-BR"),
      new Date(p.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      (Array.isArray(p.operadores) ? (p.operadores as any)[0]?.nome : p.operadores?.nome) || "",
    ]);

    const csv = [headers.join(";"), ...linhas.map((l) => l.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_frequencia_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf || cpf === "—") return "—";
    const d = cpf.replace(/\D/g, "");
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    return cpf;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Relatórios de Frequência
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gere relatórios de presença com filtros por período, curso, participante, CPF e operador.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="w-4 h-4" /> Filtros do Relatório
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Participante</label>
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Nome do participante..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CPF</label>
            <input
              type="text"
              value={filtroCpf}
              onChange={(e) => setFiltroCpf(e.target.value)}
              placeholder="CPF do participante..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
            <select
              value={filtroCurso}
              onChange={(e) => { setFiltroCurso(e.target.value); setFiltroTurma(""); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            >
              <option value="">Todos os cursos</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Turma</label>
            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            >
              <option value="">Todas as turmas</option>
              {turmasFiltradas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Operador</label>
            <select
              value={filtroOperador}
              onChange={(e) => setFiltroOperador(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            >
              <option value="">Todos os operadores</option>
              {operadores.map((op) => (
                <option key={op.id} value={op.id}>{op.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Início</label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={gerarRelatorio}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {isLoading ? "Gerando..." : "Gerar Relatório"}
          </button>
          <button
            onClick={limparFiltros}
            className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Limpar
          </button>
          {presencas.length > 0 && (
            <button
              onClick={exportarCSV}
              className="border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {buscou && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total de Presenças</p>
                  <p className="text-2xl font-bold text-slate-900">{presencas.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Participantes Únicos</p>
                  <p className="text-2xl font-bold text-slate-900">{resumoPorAluno.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cursos Envolvidos</p>
                  <p className="text-2xl font-bold text-slate-900">{resumoPorCurso.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo por Curso */}
          {resumoPorCurso.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-700 font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Resumo por Curso
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Curso</th>
                    <th className="px-5 py-3 font-semibold">Participantes</th>
                    <th className="px-5 py-3 font-semibold">Total de Presenças</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumoPorCurso.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-900 font-medium">{r.titulo}</td>
                      <td className="px-5 py-3 text-slate-600">{r.totalAlunos}</td>
                      <td className="px-5 py-3 text-slate-600">{r.totalPresencas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumo por Aluno */}
          {resumoPorAluno.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-700 font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Resumo por Participante (Top 20)
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Participante</th>
                    <th className="px-5 py-3 font-semibold">CPF</th>
                    <th className="px-5 py-3 font-semibold">Presenças</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumoPorAluno.slice(0, 20).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-900 font-medium">{r.nome}</td>
                      <td className="px-5 py-3 text-slate-500">{formatCPF(r.cpf)}</td>
                      <td className="px-5 py-3 text-slate-600">{r.totalPresencas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
