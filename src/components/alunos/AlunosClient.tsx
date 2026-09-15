"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Aluno = {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  nome_responsavel?: string | null;
  telefone?: string | null;
  email?: string | null;
  idade?: number | null;
  status_estudante?: boolean | null;
  bairro?: string | null;
  municipio?: string | null;
  nis?: string | null;
};

type Curso = {
  id: string;
  titulo: string;
};

type Matricula = {
  id: string;
  curso_id: string;
  data_matricula?: string | null;
  cursos?: {
    id: string;
    titulo: string;
  }[] | null;
};

export function AlunosClient() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);

  const [busca, setBusca] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  useEffect(() => {
    carregarAlunos();
    carregarCursos();
  }, []);

  async function carregarAlunos() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("alunos")
      .select("*")
      .order("nome_completo", { ascending: true });

    if (error) {
      console.error("Erro ao carregar alunos:", error);
      setAlunos([]);
    } else {
      setAlunos(data || []);
    }

    setCarregando(false);
  }

  async function carregarCursos() {
    const { data, error } = await supabase
      .from("cursos")
      .select("id, titulo")
      .order("titulo", { ascending: true });

    if (error) {
      console.error("Erro ao carregar cursos:", error);
      setCursos([]);
    } else {
      setCursos(data || []);
    }
  }

  async function abrirDetalhes(aluno: Aluno) {
    setAlunoSelecionado(aluno);
    setCarregandoDetalhes(true);
    setMatriculas([]);

    const { data, error } = await supabase
      .from("matriculas")
      .select(`
        id,
        curso_id,
        data_matricula,
        cursos (
          id,
          titulo
        )
      `)
      .eq("aluno_id", aluno.id);

    if (error) {
      console.error("Erro ao carregar matrícula:", error);
      setMatriculas([]);
    } else {
      setMatriculas(data || []);
    }

    setCarregandoDetalhes(false);
  }

  function fecharDetalhes() {
    setAlunoSelecionado(null);
    setMatriculas([]);
  }

  const alunosFiltrados = alunos.filter((aluno) => {
    const termo = busca.toLowerCase();

    return (
      aluno.nome_completo?.toLowerCase().includes(termo) ||
      aluno.cpf?.toLowerCase().includes(termo) ||
      aluno.email?.toLowerCase().includes(termo)
    );
  });

  if (alunoSelecionado) {
    return (
      <main className="p-6">
        <button
          onClick={fecharDetalhes}
          className="mb-6 rounded-lg border px-4 py-2 hover:bg-gray-100"
        >
          ← Voltar para alunos
        </button>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold">
            Detalhes do aluno
          </h1>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <strong>Nome:</strong>
              <p>{alunoSelecionado.nome_completo}</p>
            </div>

            <div>
              <strong>CPF:</strong>
              <p>{alunoSelecionado.cpf || "Não informado"}</p>
            </div>

            <div>
              <strong>Responsável:</strong>
              <p>
                {alunoSelecionado.nome_responsavel ||
                  "Não informado"}
              </p>
            </div>

            <div>
              <strong>Telefone:</strong>
              <p>
                {alunoSelecionado.telefone || "Não informado"}
              </p>
            </div>

            <div>
              <strong>E-mail:</strong>
              <p>
                {alunoSelecionado.email || "Não informado"}
              </p>
            </div>

            <div>
              <strong>Idade:</strong>
              <p>
                {alunoSelecionado.idade ?? "Não informado"}
              </p>
            </div>

            <div>
              <strong>Bairro:</strong>
              <p>
                {alunoSelecionado.bairro || "Não informado"}
              </p>
            </div>

            <div>
              <strong>Município:</strong>
              <p>
                {alunoSelecionado.municipio || "Não informado"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-4 text-xl font-bold">
              Curso matriculado
            </h2>

            {carregandoDetalhes ? (
              <p>Carregando matrícula...</p>
            ) : matriculas.length === 0 ? (
              <div className="rounded-lg border p-4">
                <p>Nenhum curso encontrado para este aluno.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matriculas.map((matricula) => (
                  <div
                    key={matricula.id}
                    className="rounded-lg border p-4"
                  >
                    <p className="font-semibold">
                      {matricula.cursos?.[0]?.titulo ||
                        "Curso não especificado"}
                    </p>

                    {matricula.data_matricula && (
                      <p className="text-sm text-gray-500">
                        Matrícula realizada em:{" "}
                        {new Date(
                          matricula.data_matricula
                        ).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Gestão de Alunos
        </h1>

        <p className="text-gray-500">
          Consulte os alunos cadastrados e suas matrículas.
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Pesquisar aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
        />
      </div>

      {carregando ? (
        <p>Carregando alunos...</p>
      ) : alunosFiltrados.length === 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <p>Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-4">Nome</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Status</th>
                <th className="p-4">Ação</th>
              </tr>
            </thead>

            <tbody>
              {alunosFiltrados.map((aluno) => (
                <tr
                  key={aluno.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">
                    {aluno.nome_completo}
                  </td>

                  <td className="p-4">
                    {aluno.cpf || "-"}
                  </td>

                  <td className="p-4">
                    {aluno.telefone || "-"}
                  </td>

                  <td className="p-4">
                    {aluno.status_estudante ? (
                      <span className="font-medium">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        Inativo
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => abrirDetalhes(aluno)}
                      className="rounded-lg border px-3 py-2 hover:bg-gray-100"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
