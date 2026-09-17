"use client";

import { useState, useMemo } from "react";
import { Search, Calendar, BookOpen, Filter, RotateCcw, Clock, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Curso = { id: string; titulo: string };
type Turma = { id: string; nome: string; curso_id: string };

type PresencaRegistro = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_hora: string;
  metodo: string | null;
  operador_id: string | null;
  alunos: { nome_completo: string; cpf: string | null } | null;
  cursos: { titulo: string } | null;
  turmas: { nome: string } | null;
  operadores: { nome: string } | null;
};

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

  // Filtros
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const turmasFiltradas = useMemo(() => {
    if (!filtroCurso) return turmas;
    return turmas.filter((t) => t.curso_id === filtroCurso);
  }, [turmas, filtroCurso]);

  const buscarHistorico = async () => {
    setIsLoading(true);
    setBuscou(true);

    try {
      let query = supabase
        .from("presencas")
        .select(
          "id, aluno_id, curso_id, turma_id, data_hora, metodo, operador_id, alunos(nome_completo, cpf), cursos(titulo), turmas(nome), operadores(nome)"
        )
        .order("data_hora", { ascending: false })
        .limit(500);

      if (filtroCurso) {
        query = query.eq("curso_id", filtroCurso);
      }

      if (filtroTurma) {
        query = query.eq("turma_id", filtroTurma);
      }

      if (filtroDataInicio) {
        query = query.gte("data_hora", `${filtroDataInicio}T00:00:00.000Z`);
      }

      if (filtroDataFim) {
        query = query.lte("data_hora", `${filtroDataFim}T23:59:59.999Z`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        alert("Erro ao buscar histórico: " + error.message);
        setPresencas([]);
        return;
      }

      let resultados = (data || []) as unknown as PresencaRegistro[];

      // Filtros client-side (nome e CPF precisam da relação)
      if (filtroNome.trim()) {
        const termo = filtroNome.toLowerCase();
        resultados = resultados.filter(
          (p) => p.alunos?.nome_completo?.toLowerCase().includes(termo)
        );
      }

      if (filtroCpf.trim()) {
        const cpfLimpo = filtroCpf.replace(/\D/g, "");
        resultados = resultados.filter(
          (p) => p.alunos?.cpf?.replace(/\D/g, "").includes(cpfLimpo)
        );
      }

      setPresencas(resultados);
    } catch (err: any) {
      console.error("Erro:", err);
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Histórico de Frequência</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulte o histórico de presenças registradas por participante, curso ou período.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="w-4 h-4" /> Filtros de Busca
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Participante</label>
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

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CPF do Participante</label>
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

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
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

        <div className="flex gap-3 pt-2">
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
            <RotateCcw className="w-4 h-4" /> Limpar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscou && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 font-medium">
            {presencas.length} registro(s) encontrado(s)
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
                  <th className="px-5 py-3 font-semibold">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {presencas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Nenhum registro de presença encontrado com os filtros informados.
                    </td>
                  </tr>
                ) : (
                  presencas.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-900 font-medium">
                        {p.alunos?.nome_completo || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatCPF(p.alunos?.cpf || null)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {(Array.isArray(p.cursos) ? (p.cursos as any)[0]?.titulo : p.cursos?.titulo) || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {(Array.isArray(p.turmas) ? (p.turmas as any)[0]?.nome : p.turmas?.nome) || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(p.data_hora)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatTime(p.data_hora)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {(Array.isArray(p.operadores) ? (p.operadores as any)[0]?.nome : p.operadores?.nome) || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
