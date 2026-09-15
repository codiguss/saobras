"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Aluno = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  nome_responsavel: string | null;
  telefone: string | null;
  email: string | null;
  idade: number | null;
  status_estudante: boolean | null;
  bairro: string | null;
  municipio: string | null;
  criado_por: string | null;
  criado_em: string | null;
  nis: string | null;
  cpf_responsavel: string | null;
  telefone_secundario: string | null;
  tags_perfil: string[] | null;
};

type Curso = {
  id: string;
  titulo: string;
};

type Matricula = {
  id: string;
  aluno_id: string;
  curso_id: string;
  operador_id: string | null;
  data_matricula: string | null;
  cursos: Curso | null;
};

export default function AlunosClient() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);

  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatriculas, setIsLoadingMatriculas] = useState(false);

  const [search, setSearch] = useState("");

  /*
   * ============================================================
   * BUSCAR ALUNOS
   * ============================================================
   */

  async function carregarAlunos() {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .order("nome_completo", { ascending: true });

      if (error) {
        console.error("Erro ao buscar alunos:", error);
        return;
      }

      setAlunos((data || []) as Aluno[]);
    } catch (error) {
      console.error("Erro inesperado ao buscar alunos:", error);
    } finally {
      setIsLoading(false);
    }
  }

  /*
   * ============================================================
   * BUSCAR CURSOS
   * ============================================================
   */

  async function carregarCursos() {
    try {
      const { data, error } = await supabase
        .from("cursos")
        .select("id, titulo")
        .order("titulo", { ascending: true });

      if (error) {
        console.error("Erro ao buscar cursos:", error);
        return;
      }

      setCursos((data || []) as Curso[]);
    } catch (error) {
      console.error("Erro inesperado ao buscar cursos:", error);
    }
  }

  /*
   * ============================================================
   * BUSCAR MATRÍCULAS DO ALUNO
   *
   * alunos
   *   ↓
   * matriculas
   *   ↓
   * cursos
   * ============================================================
   */

  async function carregarMatriculas(alunoId: string) {
    try {
      setIsLoadingMatriculas(true);
      setMatriculas([]);

      const { data, error } = await supabase
        .from("matriculas")
        .select(
          `
          id,
          aluno_id,
          curso_id,
          operador_id,
          data_matricula,
          cursos (
            id,
            titulo
          )
        `
        )
        .eq("aluno_id", alunoId)
        .order("data_matricula", { ascending: false });

      if (error) {
        console.error("Erro ao buscar matrículas:", error);
        return;
      }

      /*
       * O Supabase pode retornar a relação como objeto.
       * Fazemos a conversão para o tipo Matricula.
       */
      setMatriculas((data || []) as unknown as Matricula[]);
    } catch (error) {
      console.error("Erro inesperado ao buscar matrículas:", error);
    } finally {
      setIsLoadingMatriculas(false);
    }
  }

  /*
   * ============================================================
   * ABRIR DETALHES DO ALUNO
   * ============================================================
   */

  async function abrirDetalhes(aluno: Aluno) {
    setSelectedAluno(aluno);
    await carregarMatriculas(aluno.id);
  }

  /*
   * ============================================================
   * FECHAR DETALHES
   * ============================================================
   */

  function fecharDetalhes() {
    setSelectedAluno(null);
    setMatriculas([]);
  }

  /*
   * ============================================================
   * CARREGAMENTO INICIAL
   * ============================================================
   */

  useEffect(() => {
    carregarAlunos();
    carregarCursos();
  }, []);

  /*
   * ============================================================
   * FILTRO DE PESQUISA
   * ============================================================
   */

  const alunosFiltrados = alunos.filter((aluno) => {
    const termo = search.toLowerCase().trim();

    if (!termo) {
      return true;
    }

    return (
      aluno.nome_completo?.toLowerCase().includes(termo) ||
      aluno.cpf?.toLowerCase().includes(termo) ||
      aluno.email?.toLowerCase().includes(termo) ||
      aluno.telefone?.toLowerCase().includes(termo)
    );
  });

  /*
   * ============================================================
   * TELA DE DETALHES
   * ============================================================
   */

  if (selectedAluno) {
    return (
      <div className="w-full space-y-6">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Detalhes do aluno
            </h1>

            <p className="text-sm text-gray-500">
              Informações e matrículas do aluno
            </p>
          </div>

          <button
            onClick={fecharDetalhes}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Voltar
          </button>
        </div>

        {/* DADOS DO ALUNO */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Dados pessoais
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">
                Nome completo
              </p>

              <p className="font-medium">
                {selectedAluno.nome_completo || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                CPF
              </p>

              <p className="font-medium">
                {selectedAluno.cpf || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Responsável
              </p>

              <p className="font-medium">
                {selectedAluno.nome_responsavel || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                CPF do responsável
              </p>

              <p className="font-medium">
                {selectedAluno.cpf_responsavel || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Telefone
              </p>

              <p className="font-medium">
                {selectedAluno.telefone || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                E-mail
              </p>

              <p className="font-medium">
                {selectedAluno.email || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Idade
              </p>

              <p className="font-medium">
                {selectedAluno.idade ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Município
              </p>

              <p className="font-medium">
                {selectedAluno.municipio || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Bairro
              </p>

              <p className="font-medium">
                {selectedAluno.bairro || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                NIS
              </p>

              <p className="font-medium">
                {selectedAluno.nis || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Status
          </h2>

          {selectedAluno.status_estudante ? (
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Matriculado
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              Não matriculado
            </span>
          )}
        </div>

        {/* MATRÍCULAS */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Matrículas
              </h2>

              <p className="text-sm text-gray-500">
                Cursos em que o aluno está matriculado
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
              {matriculas.length}{" "}
              {matriculas.length === 1
                ? "matrícula"
                : "matrículas"}
            </span>
          </div>

          {isLoadingMatriculas ? (
            <div className="py-8 text-center text-gray-500">
              Carregando matrículas...
            </div>
          ) : matriculas.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <p className="font-medium text-gray-700">
                Nenhuma matrícula encontrada.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Este aluno ainda não possui uma matrícula
                registrada.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matriculas.map((matricula) => (
                <div
                  key={matricula.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        Curso
                      </p>

                      <p className="text-lg font-semibold">
                        {matricula.cursos?.titulo ||
                          "Curso não especificado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Data da matrícula
                      </p>

                      <p className="font-medium">
                        {matricula.data_matricula
                          ? new Date(
                              matricula.data_matricula
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {!matricula.cursos?.titulo && (
                    <div className="mt-3 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                      A matrícula possui um curso_id, mas
                      o curso relacionado não foi encontrado.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * LISTA DE ALUNOS
   * ============================================================
   */

  return (
    <div className="w-full space-y-6">
      {/* CABEÇALHO */}
      <div>
        <h1 className="text-2xl font-bold">
          Gestão de Alunos
        </h1>

        <p className="text-sm text-gray-500">
          Consulte e gerencie os alunos cadastrados.
        </p>
      </div>

      {/* PESQUISA */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Pesquisar aluno por nome, CPF, e-mail ou telefone..."
          className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2"
        />
      </div>

      {/* TABELA */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">
            Carregando alunos...
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium text-gray-700">
              Nenhum aluno encontrado.
            </p>

            {search && (
              <p className="mt-1 text-sm text-gray-500">
                Tente pesquisar por outro nome, CPF,
                e-mail ou telefone.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    Aluno
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    CPF
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Telefone
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Município
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {alunosFiltrados.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium">
                          {aluno.nome_completo}
                        </p>

                        {aluno.email && (
                          <p className="text-xs text-gray-500">
                            {aluno.email}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {aluno.cpf || "-"}
                    </td>

                    <td className="px-4 py-4">
                      {aluno.telefone || "-"}
                    </td>

                    <td className="px-4 py-4">
                      {aluno.municipio || "-"}
                    </td>

                    <td className="px-4 py-4">
                      {aluno.status_estudante ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Matriculado
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          Não matriculado
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() =>
                          abrirDetalhes(aluno)
                        }
                        className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
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
      </div>

      {/* INFORMAÇÃO */}
      <div className="text-sm text-gray-500">
        Exibindo {alunosFiltrados.length} de{" "}
        {alunos.length} alunos.
      </div>
    </div>
  );
}
