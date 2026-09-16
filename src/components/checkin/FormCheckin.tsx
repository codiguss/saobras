"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Search,
  Users,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Turma = {
  id: string;
  nome: string;
  curso_id: string;
  turno: string | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
  presente: boolean;
};

type Matricula = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string | null;
  alunos: {
    id: string;
    nome_completo: string;
  } | null;
};

export default function FormCheckin() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] =
    useState("");

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [pesquisa, setPesquisa] = useState("");

  const [carregandoTurmas, setCarregandoTurmas] =
    useState(true);

  const [carregandoAlunos, setCarregandoAlunos] =
    useState(false);

  const [salvando, setSalvando] = useState(false);

  const [mensagem, setMensagem] = useState("");

  /*
   * ============================================================
   * BUSCAR TURMAS
   * ============================================================
   */

  useEffect(() => {
    const buscarTurmas = async () => {
      setCarregandoTurmas(true);

      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso_id, turno")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar turmas:", error);
        setMensagem(
          "Não foi possível carregar as turmas."
        );
        setTurmas([]);
      } else {
        setTurmas(data || []);
      }

      setCarregandoTurmas(false);
    };

    buscarTurmas();
  }, []);

  /*
   * ============================================================
   * BUSCAR ALUNOS DA TURMA
   * ============================================================
   */

  const carregarAlunos = async (turmaId: string) => {
    if (!turmaId) {
      setAlunos([]);
      return;
    }

    setCarregandoAlunos(true);
    setMensagem("");

    /*
     * Buscamos somente matrículas que possuem
     * turma_id igual à turma selecionada.
     */

    const { data, error } = await supabase
      .from("matriculas")
      .select(`
        id,
        aluno_id,
        curso_id,
        turma_id,
        alunos (
          id,
          nome_completo
        )
      `)
      .eq("turma_id", turmaId);

    if (error) {
      console.error(
        "Erro ao buscar alunos:",
        error
      );

      setAlunos([]);

      setMensagem(
        "Erro ao carregar os alunos da turma: " +
          error.message
      );

      setCarregandoAlunos(false);
      return;
    }

    const matriculas =
      (data || []) as unknown as Matricula[];

    /*
     * Transformamos as matrículas em alunos.
     */

    const listaAlunos: Aluno[] = matriculas
      .filter((matricula) => matricula.alunos)
      .map((matricula) => ({
        id: matricula.alunos!.id,
        nome_completo:
          matricula.alunos!.nome_completo,
        presente: false,
      }))
      .sort((a, b) =>
        a.nome_completo.localeCompare(
          b.nome_completo,
          "pt-BR"
        )
      );

    /*
     * Verifica quem já possui presença registrada
     * hoje para essa turma.
     *
     * data_hora representa o momento em que a
     * presença foi registrada.
     */

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);

    const { data: presencas, error: presencaError } =
      await supabase
        .from("presencas")
        .select("aluno_id")
        .eq("turma_id", turmaId)
        .eq("metodo", "manual")
        .gte(
          "data_hora",
          inicioHoje.toISOString()
        )
        .lte(
          "data_hora",
          fimHoje.toISOString()
        );

    if (presencaError) {
      console.error(
        "Erro ao buscar presenças:",
        presencaError
      );
    }

    const presentes = new Set(
      (presencas || []).map(
        (presenca) => presenca.aluno_id
      )
    );

    const alunosComPresenca = listaAlunos.map(
      (aluno) => ({
        ...aluno,
        presente: presentes.has(aluno.id),
      })
    );

    setAlunos(alunosComPresenca);
    setCarregandoAlunos(false);
  };

  /*
   * ============================================================
   * SELECIONAR TURMA
   * ============================================================
   */

  const handleTurmaChange = (
    turmaId: string
  ) => {
    setTurmaSelecionada(turmaId);
    setPesquisa("");
    setMensagem("");

    carregarAlunos(turmaId);
  };

  /*
   * ============================================================
   * MARCAR / DESMARCAR ALUNO
   * ============================================================
   */

  const alternarPresenca = (alunoId: string) => {
    setAlunos((lista) =>
      lista.map((aluno) =>
        aluno.id === alunoId
          ? {
              ...aluno,
              presente: !aluno.presente,
            }
          : aluno
      )
    );
  };

  /*
   * ============================================================
   * MARCAR TODOS
   * ============================================================
   */

  const marcarTodos = () => {
    setAlunos((lista) =>
      lista.map((aluno) => ({
        ...aluno,
        presente: true,
      }))
    );
  };

  /*
   * ============================================================
   * DESMARCAR TODOS
   * ============================================================
   */

  const desmarcarTodos = () => {
    setAlunos((lista) =>
      lista.map((aluno) => ({
        ...aluno,
        presente: false,
      }))
    );
  };

  /*
   * ============================================================
   * DESCOBRIR OPERADOR LOGADO
   * ============================================================
   */

  const getOperadorId = async (): Promise<string> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(
        "Não foi possível identificar o usuário logado: " +
          userError.message
      );
    }

    if (!user) {
      throw new Error(
        "Usuário não está logado."
      );
    }

    if (!user.email) {
      throw new Error(
        "O usuário logado não possui e-mail."
      );
    }

    const { data: operador, error } =
      await supabase
        .from("operadores")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

    if (error) {
      throw new Error(
        "Erro ao localizar operador: " +
          error.message
      );
    }

    if (!operador) {
      throw new Error(
        "Nenhum operador foi encontrado para o e-mail " +
          user.email
      );
    }

    return operador.id;
  };

  /*
   * ============================================================
   * SALVAR CHAMADA
   * ============================================================
   */

  const salvarChamada = async () => {
    if (!turmaSelecionada) {
      alert("Selecione uma turma.");
      return;
    }

    if (alunos.length === 0) {
      alert(
        "Não existem alunos matriculados nesta turma."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const operadorId =
        await getOperadorId();

      /*
       * Primeiro removemos as presenças manuais
       * registradas hoje para essa turma.
       *
       * Depois gravamos novamente somente os alunos
       * que estão marcados como presentes.
       */

      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);

      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      const { error: deleteError } =
        await supabase
          .from("presencas")
          .delete()
          .eq("turma_id", turmaSelecionada)
          .eq("metodo", "manual")
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
          "Não foi possível atualizar a chamada: " +
            deleteError.message
        );
      }

      const presentes = alunos.filter(
        (aluno) => aluno.presente
      );

      /*
       * Se ninguém estiver presente,
       * simplesmente salvamos a chamada vazia.
       */

      if (presentes.length > 0) {
        const registros = presentes.map(
          (aluno) => ({
            aluno_id: aluno.id,

            /*
             * O curso vem da turma selecionada.
             */
            curso_id:
              turmas.find(
                (turma) =>
                  turma.id ===
                  turmaSelecionada
              )?.curso_id || null,

            turma_id: turmaSelecionada,

            operador_id: operadorId,

            metodo: "manual",

            data_hora:
              new Date().toISOString(),
          })
        );

        const { error: insertError } =
          await supabase
            .from("presencas")
            .insert(registros);

        if (insertError) {
          throw new Error(
            "Erro ao salvar as presenças: " +
              insertError.message
          );
        }
      }

      setMensagem(
        `Chamada salva com sucesso! ${presentes.length} aluno(s) presente(s).`
      );

      /*
       * Atualiza a lista para garantir que o estado
       * esteja sincronizado com o banco.
       */
      await carregarAlunos(
        turmaSelecionada
      );
    } catch (error) {
      const texto =
        error instanceof Error
          ? error.message
          : "Erro desconhecido.";

      console.error(error);

      setMensagem(
        "Erro ao salvar chamada: " + texto
      );
    } finally {
      setSalvando(false);
    }
  };

  /*
   * ============================================================
   * FILTRO DE PESQUISA
   * ============================================================
   */

  const alunosFiltrados = alunos.filter(
    (aluno) =>
      aluno.nome_completo
        .toLowerCase()
        .includes(
          pesquisa.toLowerCase()
        )
  );

  const quantidadePresentes =
    alunos.filter(
      (aluno) => aluno.presente
    ).length;

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */

  return (
    <div className="w-full">
      {/* CABEÇALHO */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Chamada
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Selecione uma turma e marque os alunos
          presentes.
        </p>
      </div>

      {/* SELEÇÃO DA TURMA */}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Turma
        </label>

        <select
          value={turmaSelecionada}
          onChange={(e) =>
            handleTurmaChange(
              e.target.value
            )
          }
          disabled={carregandoTurmas}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">
            {carregandoTurmas
              ? "Carregando turmas..."
              : "Selecione uma turma"}
          </option>

          {turmas.map((turma) => (
            <option
              key={turma.id}
              value={turma.id}
            >
              {turma.nome}
              {turma.turno
                ? ` — ${turma.turno}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ÁREA DA CHAMADA */}

      {turmaSelecionada && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* TOPO */}

          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users
                    size={20}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-semibold text-slate-900">
                    Lista de alunos
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Presentes:{" "}
                  <strong>
                    {quantidadePresentes}
                  </strong>{" "}
                  de{" "}
                  <strong>
                    {alunos.length}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={marcarTodos}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Marcar todos
                </button>

                <button
                  type="button"
                  onClick={desmarcarTodos}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* PESQUISA */}

            <div className="relative mt-4">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={pesquisa}
                onChange={(e) =>
                  setPesquisa(
                    e.target.value
                  )
                }
                placeholder="Pesquisar aluno..."
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* LISTA */}

          <div className="p-5">
            {carregandoAlunos ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2
                  size={24}
                  className="mr-2 animate-spin"
                />

                Carregando alunos...
              </div>
            ) : alunosFiltrados.length ===
              0 ? (
              <div className="py-12 text-center">
                <Users
                  size={40}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-medium text-slate-700">
                  {alunos.length === 0
                    ? "Nenhum aluno matriculado nesta turma."
                    : "Nenhum aluno encontrado."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alunosFiltrados.map(
                  (aluno) => (
                    <button
                      type="button"
                      key={aluno.id}
                      onClick={() =>
                        alternarPresenca(
                          aluno.id
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition ${
                        aluno.presente
                          ? "border-green-200 bg-green-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            aluno.presente
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {aluno.presente ? (
                            <Check
                              size={20}
                            />
                          ) : (
                            <span className="text-sm font-semibold">
                              {aluno.nome_completo
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        <span className="font-medium text-slate-800">
                          {aluno.nome_completo}
                        </span>
                      </div>

                      <div>
                        {aluno.presente ? (
                          <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                            <CheckCircle2
                              size={18}
                            />
                            Presente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-slate-400">
                            <XCircle
                              size={18}
                            />
                            Ausente
                          </span>
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* RODAPÉ */}

          <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {quantidadePresentes} aluno(s)
              marcado(s) como presente
            </div>

            <button
              type="button"
              onClick={salvarChamada}
              disabled={
                salvando ||
                carregandoAlunos
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />

                  Salvar chamada
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MENSAGEM */}

      {mensagem && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          {mensagem}
        </div>
      )}
    </div>
  );
}
