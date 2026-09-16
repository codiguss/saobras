"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Users,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Turma = {
  id: string;
  nome: string;
  curso_id: string;
  turno: string | null;
  horario: string | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
};

type Presenca = {
  id: string;
  aluno_id: string;
};

export default function FormCheckin() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presentes, setPresentes] = useState<Set<string>>(new Set());

  const [isLoadingTurmas, setIsLoadingTurmas] = useState(true);
  const [isLoadingAlunos, setIsLoadingAlunos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const turmaSelecionada = useMemo(
    () => turmas.find((turma) => turma.id === turmaId),
    [turmas, turmaId]
  );

  /*
   * ============================================================
   * CARREGAR TURMAS
   * ============================================================
   *
   * IMPORTANTE:
   * Não usamos cursos(titulo) aqui.
   * A consulta é direta na tabela turmas.
   */
  const carregarTurmas = async () => {
    setIsLoadingTurmas(true);
    setErro("");
    setMensagem("");

    try {
      // Verifica se existe usuário autenticado
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("ERRO AO VERIFICAR USUÁRIO:", authError);
      }

      if (!user) {
        setErro(
          "Usuário não está autenticado. Faça login novamente no sistema."
        );
        setTurmas([]);
        return;
      }

      console.log("USUÁRIO AUTENTICADO:", user.id);

      /*
       * Consulta DIRETA em turmas.
       * Não depende de relacionamento com cursos.
       */
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso_id, turno, horario")
        .order("nome", { ascending: true });

      console.log("RESULTADO DA CONSULTA DE TURMAS:", data);
      console.log("ERRO DA CONSULTA DE TURMAS:", error);

      if (error) {
        console.error("ERRO AO BUSCAR TURMAS:", error);

        setErro(
          `Não foi possível carregar as turmas. ${error.message}`
        );

        setTurmas([]);
        return;
      }

      if (!data || data.length === 0) {
        console.warn(
          "A CONSULTA FUNCIONOU, MAS NÃO RETORNOU NENHUMA TURMA."
        );

        setTurmas([]);

        setErro(
          "Nenhuma turma foi encontrada para este usuário."
        );

        return;
      }

      console.log("TURMAS ENCONTRADAS:", data);

      setTurmas(data as Turma[]);
    } catch (error) {
      console.error("ERRO INESPERADO AO CARREGAR TURMAS:", error);

      setTurmas([]);

      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar as turmas."
      );
    } finally {
      setIsLoadingTurmas(false);
    }
  };

  useEffect(() => {
    carregarTurmas();
  }, []);

  /*
   * ============================================================
   * CARREGAR ALUNOS DA TURMA
   * ============================================================
   */
  useEffect(() => {
    if (!turmaId) {
      setAlunos([]);
      setPresentes(new Set());
      return;
    }

    const carregarAlunos = async () => {
      setIsLoadingAlunos(true);
      setErro("");
      setMensagem("");
      setPresentes(new Set());

      try {
        /*
         * Primeiro buscamos as matrículas que pertencem
         * à turma selecionada.
         */
        const {
          data: matriculas,
          error: matriculasError,
        } = await supabase
          .from("matriculas")
          .select("aluno_id")
          .eq("turma_id", turmaId);

        console.log(
          "MATRÍCULAS DA TURMA:",
          matriculas
        );

        if (matriculasError) {
          console.error(
            "ERRO AO BUSCAR MATRÍCULAS:",
            matriculasError
          );

          setErro(
            `Não foi possível carregar os alunos da turma. ${matriculasError.message}`
          );

          setAlunos([]);
          return;
        }

        const alunoIds = Array.from(
          new Set(
            (matriculas || [])
              .map((matricula) => matricula.aluno_id)
              .filter(Boolean)
          )
        );

        console.log("IDS DOS ALUNOS:", alunoIds);

        if (alunoIds.length === 0) {
          setAlunos([]);

          setErro(
            "Essa turma não possui alunos matriculados. Verifique se o campo turma_id das matrículas está preenchido."
          );

          return;
        }

        /*
         * Agora buscamos os alunos.
         */
        const {
          data: alunosData,
          error: alunosError,
        } = await supabase
          .from("alunos")
          .select("id, nome_completo")
          .in("id", alunoIds)
          .order("nome_completo", {
            ascending: true,
          });

        console.log(
          "ALUNOS ENCONTRADOS:",
          alunosData
        );

        if (alunosError) {
          console.error(
            "ERRO AO BUSCAR ALUNOS:",
            alunosError
          );

          setErro(
            `Não foi possível carregar os alunos. ${alunosError.message}`
          );

          setAlunos([]);
          return;
        }

        setAlunos((alunosData || []) as Aluno[]);

        /*
         * ========================================================
         * VERIFICAR PRESENÇAS JÁ REGISTRADAS HOJE
         * ========================================================
         */

        const inicioDoDia = new Date();
        inicioDoDia.setHours(0, 0, 0, 0);

        const fimDoDia = new Date();
        fimDoDia.setHours(23, 59, 59, 999);

        const {
          data: presencasData,
          error: presencasError,
        } = await supabase
          .from("presencas")
          .select("id, aluno_id")
          .eq("turma_id", turmaId)
          .gte(
            "data_hora",
            inicioDoDia.toISOString()
          )
          .lte(
            "data_hora",
            fimDoDia.toISOString()
          );

        if (presencasError) {
          console.error(
            "ERRO AO BUSCAR PRESENÇAS:",
            presencasError
          );

          /*
           * Não impedimos o usuário de fazer a chamada
           * se a consulta de presenças falhar.
           */
          setPresentes(new Set());
        } else {
          const idsPresentes = new Set(
            ((presencasData || []) as Presenca[]).map(
              (presenca) => presenca.aluno_id
            )
          );

          setPresentes(idsPresentes);
        }
      } catch (error) {
        console.error(
          "ERRO AO CARREGAR ALUNOS:",
          error
        );

        setErro(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar os alunos."
        );

        setAlunos([]);
      } finally {
        setIsLoadingAlunos(false);
      }
    };

    carregarAlunos();
  }, [turmaId]);

  /*
   * ============================================================
   * MARCAR / DESMARCAR ALUNO
   * ============================================================
   */
  const alternarPresenca = (alunoId: string) => {
    setPresentes((atual) => {
      const novo = new Set(atual);

      if (novo.has(alunoId)) {
        novo.delete(alunoId);
      } else {
        novo.add(alunoId);
      }

      return novo;
    });

    setMensagem("");
    setErro("");
  };

  /*
   * ============================================================
   * MARCAR TODOS
   * ============================================================
   */
  const marcarTodos = () => {
    setPresentes(new Set(alunos.map((aluno) => aluno.id)));
    setMensagem("");
    setErro("");
  };

  /*
   * ============================================================
   * LIMPAR TODOS
   * ============================================================
   */
  const limparTodos = () => {
    setPresentes(new Set());
    setMensagem("");
    setErro("");
  };

  /*
   * ============================================================
   * PEGAR OPERADOR LOGADO
   * ============================================================
   */
  const buscarOperadorLogado = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(
        `Erro ao verificar usuário: ${userError.message}`
      );
    }

    if (!user) {
      throw new Error(
        "Usuário não está autenticado."
      );
    }

    if (!user.email) {
      throw new Error(
        "O usuário autenticado não possui e-mail."
      );
    }

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
        `Erro ao localizar operador: ${operadorError.message}`
      );
    }

    if (!operador) {
      throw new Error(
        "Seu usuário está autenticado, mas não existe um operador cadastrado com este e-mail."
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
      setErro("Selecione uma turma.");
      return;
    }

    if (alunos.length === 0) {
      setErro(
        "Não existem alunos para registrar nesta turma."
      );
      return;
    }

    if (presentes.size === 0) {
      const confirmar = window.confirm(
        "Nenhum aluno foi marcado como presente. Deseja realmente salvar a chamada?"
      );

      if (!confirmar) {
        return;
      }
    }

    setIsSaving(true);
    setErro("");
    setMensagem("");

    try {
      const operadorId =
        await buscarOperadorLogado();

      /*
       * Busca novamente as presenças de hoje.
       * Isso evita inserir presença duplicada.
       */
      const inicioDoDia = new Date();
      inicioDoDia.setHours(0, 0, 0, 0);

      const fimDoDia = new Date();
      fimDoDia.setHours(23, 59, 59, 999);

      const {
        data: presencasExistentes,
        error: presencasExistentesError,
      } = await supabase
        .from("presencas")
        .select("aluno_id")
        .eq("turma_id", turmaSelecionada.id)
        .gte(
          "data_hora",
          inicioDoDia.toISOString()
        )
        .lte(
          "data_hora",
          fimDoDia.toISOString()
        );

      if (presencasExistentesError) {
        throw new Error(
          `Erro ao verificar presenças existentes: ${presencasExistentesError.message}`
        );
      }

      const idsJaRegistrados = new Set(
        (presencasExistentes || []).map(
          (presenca) => presenca.aluno_id
        )
      );

      /*
       * Só inserimos quem ainda não possui presença hoje.
       */
      const presentesArray = Array.from(
        presentes
      ).filter(
        (alunoId) =>
          !idsJaRegistrados.has(alunoId)
      );

      if (presentesArray.length === 0) {
        setMensagem(
          "A chamada desta turma já foi registrada hoje."
        );

        return;
      }

      const agora = new Date().toISOString();

      const registros = presentesArray.map(
        (alunoId) => ({
          aluno_id: alunoId,
          curso_id: turmaSelecionada.curso_id,
          turma_id: turmaSelecionada.id,
          operador_id: operadorId,
          metodo: "manual",
          data_hora: agora,
        })
      );

      console.log(
        "REGISTROS DE PRESENÇA:",
        registros
      );

      const {
        error: insertError,
      } = await supabase
        .from("presencas")
        .insert(registros);

      if (insertError) {
        throw new Error(
          `Erro ao salvar presença: ${insertError.message}`
        );
      }

      setMensagem(
        `${presentesArray.length} presença(s) registrada(s) com sucesso!`
      );

      /*
       * Atualiza a lista mantendo os presentes selecionados.
       */
      const idsAtualizados = new Set(
        Array.from(presentes)
      );

      setPresentes(idsAtualizados);
    } catch (error) {
      console.error(
        "ERRO AO SALVAR CHAMADA:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a chamada."
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Chamada
              </h2>

              <p className="text-sm text-slate-500">
                Selecione a turma e marque os alunos presentes.
              </p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="p-6 space-y-6">
          {/* MENSAGEM DE ERRO */}
          {erro && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />

              <div className="flex-1">
                <p className="font-medium">
                  {erro}
                </p>
              </div>
            </div>
          )}

          {/* MENSAGEM DE SUCESSO */}
          {mensagem && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />

              <p className="font-medium">
                {mensagem}
              </p>
            </div>
          )}

          {/* SELEÇÃO DA TURMA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Turma
              </label>

              <button
                type="button"
                onClick={carregarTurmas}
                disabled={isLoadingTurmas}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isLoadingTurmas
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Atualizar
              </button>
            </div>

            <select
              value={turmaId}
              onChange={(e) => {
                setTurmaId(e.target.value);
                setErro("");
                setMensagem("");
              }}
              disabled={isLoadingTurmas}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingTurmas
                  ? "Carregando turmas..."
                  : turmas.length === 0
                  ? "Nenhuma turma encontrada"
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
                  {turma.horario
                    ? ` — ${turma.horario}`
                    : ""}
                </option>
              ))}
            </select>

            {turmaSelecionada && (
              <div className="mt-2 text-sm text-slate-500">
                <span className="font-medium">
                  Horário:
                </span>{" "}
                {turmaSelecionada.horario ||
                  "Não informado"}
              </div>
            )}
          </div>

          {/* ALUNOS */}
          {turmaId && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Alunos da turma
                  </h3>

                  <p className="text-sm text-slate-500">
                    {alunos.length} aluno(s) •{" "}
                    {presentes.size} presente(s)
                  </p>
                </div>

                {alunos.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={marcarTodos}
                      className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Marcar todos
                    </button>

                    <button
                      type="button"
                      onClick={limparTodos}
                      className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>

              {isLoadingAlunos ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />

                  Carregando alunos...
                </div>
              ) : alunos.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-300 rounded-lg">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />

                  <p className="font-medium text-slate-700">
                    Nenhum aluno encontrado
                  </p>

                  <p className="text-sm text-slate-500 mt-1 px-4">
                    Verifique se existem matrículas com o
                    campo <strong>turma_id</strong> preenchido
                    para esta turma.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alunos.map((aluno) => {
                    const presente =
                      presentes.has(aluno.id);

                    return (
                      <button
                        key={aluno.id}
                        type="button"
                        onClick={() =>
                          alternarPresenca(
                            aluno.id
                          )
                        }
                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition ${
                          presente
                            ? "bg-green-50 border-green-300"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                              presente
                                ? "bg-green-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {aluno.nome_completo
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="text-left">
                            <p className="font-medium text-slate-900">
                              {aluno.nome_completo}
                            </p>

                            <p className="text-xs text-slate-500">
                              {presente
                                ? "Presente"
                                : "Não marcado"}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                            presente
                              ? "bg-green-600 border-green-600"
                              : "border-slate-300"
                          }`}
                        >
                          {presente && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* BOTÃO SALVAR */}
              {alunos.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={salvarChamada}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
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
    </div>
  );
}
