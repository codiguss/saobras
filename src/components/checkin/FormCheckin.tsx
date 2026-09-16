"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Save,
  ClipboardCheck,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Turma = {
  id: string;
  nome: string;
  curso_id: string;
  turno: string | null;
  cursos?: { titulo: string }[] | null;
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

  const [busca, setBusca] = useState("");

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
   * ALUNOS FILTRADOS PELA BUSCA
   */
  const alunosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    if (!texto) {
      return alunos;
    }

    return alunos.filter((aluno) =>
      aluno.nome_completo.toLowerCase().includes(texto)
    );
  }, [alunos, busca]);

  const quantidadePresentes = presentes.size;
  const quantidadeAusentes = Math.max(
    alunos.length - quantidadePresentes,
    0
  );

  /*
   * CARREGAR TURMAS
   */
  useEffect(() => {
    const carregarTurmas = async () => {
      setIsLoadingTurmas(true);
      setErro("");

      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso_id, turno, cursos(titulo)")
        .order("nome", { ascending: true });

      if (error) {
        console.error(error);

        setErro(
          "Não foi possível carregar as turmas: " + error.message
        );

        setTurmas([]);
      } else {
        setTurmas((data || []) as Turma[]);
      }

      setIsLoadingTurmas(false);
    };

    carregarTurmas();
  }, []);

  /*
   * CARREGAR ALUNOS DA TURMA
   */
  useEffect(() => {
    if (!turmaId) {
      setAlunos([]);
      setPresentes(new Set());
      setBusca("");
      return;
    }

    const carregarAlunos = async () => {
      setIsLoadingAlunos(true);
      setErro("");
      setMensagem("");
      setBusca("");

      /*
       * Primeiro pegamos as matrículas da turma.
       */
      const { data: matriculas, error: matriculasError } =
        await supabase
          .from("matriculas")
          .select("aluno_id")
          .eq("turma_id", turmaId);

      if (matriculasError) {
        console.error(matriculasError);

        setErro(
          "Não foi possível carregar as matrículas da turma: " +
            matriculasError.message
        );

        setAlunos([]);
        setPresentes(new Set());
        setIsLoadingAlunos(false);

        return;
      }

      const alunoIds = Array.from(
        new Set(
          (matriculas || [])
            .map((item) => item.aluno_id)
            .filter(Boolean)
        )
      );

      if (alunoIds.length === 0) {
        setAlunos([]);
        setPresentes(new Set());
        setIsLoadingAlunos(false);

        return;
      }

      /*
       * Depois buscamos os dados dos alunos.
       */
      const { data: alunosData, error: alunosError } =
        await supabase
          .from("alunos")
          .select("id, nome_completo")
          .in("id", alunoIds)
          .order("nome_completo", {
            ascending: true,
          });

      if (alunosError) {
        console.error(alunosError);

        setErro(
          "Não foi possível carregar os alunos: " +
            alunosError.message
        );

        setAlunos([]);
        setPresentes(new Set());
        setIsLoadingAlunos(false);

        return;
      }

      setAlunos((alunosData || []) as Aluno[]);

      /*
       * Verifica quem já está marcado como presente hoje.
       */
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);

      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      const { data: presencasData, error: presencasError } =
        await supabase
          .from("presencas")
          .select("id, aluno_id")
          .eq("turma_id", turmaId)
          .gte(
            "data_hora",
            inicioHoje.toISOString()
          )
          .lte(
            "data_hora",
            fimHoje.toISOString()
          );

      if (presencasError) {
        console.error(
          "Erro ao carregar presenças:",
          presencasError.message
        );

        setPresentes(new Set());
      } else {
        setPresentes(
          new Set(
            ((presencasData || []) as Presenca[]).map(
              (presenca) => presenca.aluno_id
            )
          )
        );
      }

      setIsLoadingAlunos(false);
    };

    carregarAlunos();
  }, [turmaId]);

  /*
   * MARCAR / DESMARCAR ALUNO
   */
  const alternarPresenca = (alunoId: string) => {
    setMensagem("");

    setPresentes((atual) => {
      const novo = new Set(atual);

      if (novo.has(alunoId)) {
        novo.delete(alunoId);
      } else {
        novo.add(alunoId);
      }

      return novo;
    });
  };

  /*
   * MARCAR TODOS
   */
  const marcarTodos = () => {
    setPresentes(
      new Set(alunos.map((aluno) => aluno.id))
    );

    setMensagem("");
  };

  /*
   * LIMPAR TODOS
   */
  const limparTodos = () => {
    setPresentes(new Set());
    setMensagem("");
  };

  /*
   * PEGAR OPERADOR LOGADO
   */
  const getOperadorId = async (): Promise<string> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        "Usuário não está logado. Faça login novamente."
      );
    }

    if (!user.email) {
      throw new Error(
        "O usuário logado não possui e-mail."
      );
    }

    const { data: operador, error } = await supabase
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
        `Nenhum operador foi encontrado com o e-mail ${user.email}.`
      );
    }

    return operador.id;
  };

  /*
   * SALVAR CHAMADA
   */
  const salvarPresencas = async () => {
    if (!turmaId || !turmaSelecionada) {
      setErro("Selecione uma turma.");
      return;
    }

    setIsSaving(true);
    setErro("");
    setMensagem("");

    try {
      const operadorId = await getOperadorId();

      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);

      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      /*
       * Remove as presenças de hoje dessa turma.
       * Depois gravamos novamente somente quem está marcado.
       */
      const { error: deleteError } = await supabase
        .from("presencas")
        .delete()
        .eq("turma_id", turmaId)
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

      const presentesArray = Array.from(presentes);

      if (presentesArray.length > 0) {
        const agora = new Date().toISOString();

        const registros = presentesArray.map(
          (alunoId) => ({
            aluno_id: alunoId,
            curso_id:
              turmaSelecionada.curso_id,
            turma_id: turmaId,
            operador_id: operadorId,
            metodo: "manual",
            data_hora: agora,
          })
        );

        const { error: insertError } =
          await supabase
            .from("presencas")
            .insert(registros);

        if (insertError) {
          throw new Error(
            "Não foi possível registrar as presenças: " +
              insertError.message
          );
        }
      }

      setMensagem(
        `Chamada salva com sucesso! ${presentesArray.length} aluno(s) presente(s).`
      );
    } catch (error) {
      console.error(error);

      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao salvar a chamada."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">

      {/* CABEÇALHO */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Check-in
            </h1>

            <p className="text-sm text-slate-500">
              Faça a chamada dos alunos da turma.
            </p>
          </div>
        </div>
      </div>

      {/* MENSAGEM DE ERRO */}
      {erro && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* MENSAGEM DE SUCESSO */}
      {mensagem && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {mensagem}
        </div>
      )}

      {/* SELEÇÃO DA TURMA */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">

        <label className="block text-sm font-semibold text-slate-700 mb-2">
          1. Selecione a turma
        </label>

        <select
          value={turmaId}
          onChange={(e) => {
            setTurmaId(e.target.value);
            setMensagem("");
            setErro("");
          }}
          disabled={isLoadingTurmas}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        >
          <option value="">
            {isLoadingTurmas
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
              {turma.cursos?.[0]?.titulo
                ? ` — ${turma.cursos[0].titulo}`
                : ""}
            </option>
          ))}
        </select>

        {turmaSelecionada && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              Turma: {turmaSelecionada.nome}
            </span>

            {turmaSelecionada.turno && (
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                Turno: {turmaSelecionada.turno}
              </span>
            )}

            {turmaSelecionada.cursos?.[0]?.titulo && (
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                {turmaSelecionada.cursos[0].titulo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ÁREA DOS ALUNOS */}
      {turmaId && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* TOPO */}
          <div className="p-5 border-b border-slate-200">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />

                  <h2 className="text-xl font-bold text-slate-900">
                    2. Faça a chamada
                  </h2>
                </div>

                <p className="text-sm text-slate-500 mt-1">
                  Clique no aluno para marcar ou desmarcar a presença.
                </p>
              </div>

              {/* CONTADORES */}
              <div className="flex gap-2">

                <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-700">
                    {quantidadePresentes}
                  </div>

                  <div className="text-xs text-green-600">
                    Presentes
                  </div>
                </div>

                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-center">
                  <div className="text-lg font-bold text-red-700">
                    {quantidadeAusentes}
                  </div>

                  <div className="text-xs text-red-600">
                    Ausentes
                  </div>
                </div>

              </div>
            </div>

            {/* BUSCA */}
            {!isLoadingAlunos &&
              alunos.length > 0 && (
                <div className="mt-5">

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                    <input
                      type="text"
                      value={busca}
                      onChange={(e) =>
                        setBusca(e.target.value)
                      }
                      placeholder="Pesquisar aluno pelo nome..."
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                </div>
              )}

            {/* BOTÕES */}
            {!isLoadingAlunos &&
              alunos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={marcarTodos}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Marcar todos presentes
                  </button>

                  <button
                    type="button"
                    onClick={limparTodos}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Limpar chamada
                  </button>

                </div>
              )}
          </div>

          {/* CARREGANDO */}
          {isLoadingAlunos && (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500">

              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />

              <p className="font-medium">
                Carregando alunos...
              </p>

              <p className="text-sm mt-1">
                Aguarde um momento.
              </p>

            </div>
          )}

          {/* SEM ALUNOS */}
          {!isLoadingAlunos &&
            alunos.length === 0 && (
              <div className="p-12 text-center">

                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-slate-400" />
                </div>

                <h3 className="font-semibold text-slate-800">
                  Nenhum aluno encontrado
                </h3>

                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  Essa turma não possui alunos vinculados.
                  Verifique se as matrículas possuem o
                  <strong> turma_id </strong>
                  preenchido.
                </p>

              </div>
            )}

          {/* LISTA */}
          {!isLoadingAlunos &&
            alunos.length > 0 && (
              <>
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">

                  <p className="text-sm text-slate-500">
                    Mostrando{" "}
                    <strong className="text-slate-700">
                      {alunosFiltrados.length}
                    </strong>{" "}
                    de{" "}
                    <strong className="text-slate-700">
                      {alunos.length}
                    </strong>{" "}
                    alunos
                  </p>

                </div>

                <div className="divide-y divide-slate-100">

                  {alunosFiltrados.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">
                      Nenhum aluno encontrado para essa pesquisa.
                    </div>
                  ) : (
                    alunosFiltrados.map(
                      (aluno, index) => {
                        const presente =
                          presentes.has(aluno.id);

                        return (
                          <button
                            type="button"
                            key={aluno.id}
                            onClick={() =>
                              alternarPresenca(
                                aluno.id
                              )
                            }
                            className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-all ${
                              presente
                                ? "bg-green-50 hover:bg-green-100"
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >

                            {/* NÚMERO */}
                            <div className="w-8 text-center text-sm text-slate-400">
                              {index + 1}
                            </div>

                            {/* ÍCONE */}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                presente
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {presente ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Users className="w-5 h-5" />
                              )}
                            </div>

                            {/* NOME */}
                            <div className="flex-1 min-w-0">

                              <p
                                className={`font-semibold truncate ${
                                  presente
                                    ? "text-green-900"
                                    : "text-slate-800"
                                }`}
                              >
                                {aluno.nome_completo}
                              </p>

                              <p
                                className={`text-xs mt-0.5 ${
                                  presente
                                    ? "text-green-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {presente
                                  ? "Presente"
                                  : "Ainda não marcado"}
                              </p>

                            </div>

                            {/* STATUS */}
                            <div
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm ${
                                presente
                                  ? "bg-green-600 text-white"
                                  : "bg-white border border-slate-300 text-slate-500"
                              }`}
                            >
                              {presente ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Presente
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Ausente
                                </>
                              )}
                            </div>

                          </button>
                        );
                      }
                    )
                  )}

                </div>

                {/* RODAPÉ */}
                <div className="p-5 border-t border-slate-200 bg-slate-50">

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    <div>
                      <p className="font-semibold text-slate-800">
                        Resumo da chamada
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {quantidadePresentes} presente(s) e{" "}
                        {quantidadeAusentes} ausente(s)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={salvarPresencas}
                      disabled={
                        isSaving ||
                        isLoadingAlunos ||
                        alunos.length === 0
                      }
                      className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    >

                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Salvando chamada...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Salvar chamada
                        </>
                      )}

                    </button>

                  </div>

                </div>
              </>
            )}

        </div>
      )}

      {/* INSTRUÇÃO QUANDO NÃO ESCOLHEU TURMA */}
      {!turmaId && !isLoadingTurmas && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">

          <div className="w-14 h-14 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ClipboardCheck className="w-7 h-7 text-blue-600" />
          </div>

          <h2 className="text-lg font-bold text-blue-900">
            Comece selecionando uma turma
          </h2>

          <p className="text-sm text-blue-700 mt-2">
            Depois disso, a lista de alunos aparecerá aqui
            para você fazer a chamada.
          </p>

        </div>
      )}

    </div>
  );
}
