"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
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
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(true);
  const [isLoadingAlunos, setIsLoadingAlunos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const turmaSelecionada = useMemo(
    () => turmas.find((turma) => turma.id === turmaId),
    [turmas, turmaId]
  );

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
        setErro("Não foi possível carregar as turmas: " + error.message);
        setTurmas([]);
      } else {
        setTurmas((data || []) as Turma[]);
      }

      setIsLoadingTurmas(false);
    };

    carregarTurmas();
  }, []);

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

      // Primeiro pegamos as matrículas da turma.
      const { data: matriculas, error: matriculasError } = await supabase
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
        new Set((matriculas || []).map((item) => item.aluno_id).filter(Boolean))
      );

      if (alunoIds.length === 0) {
        setAlunos([]);
        setPresentes(new Set());
        setIsLoadingAlunos(false);
        return;
      }

      // Depois buscamos os alunos. Isso evita depender do relacionamento
      // matriculas -> alunos configurado no Supabase.
      const { data: alunosData, error: alunosError } = await supabase
        .from("alunos")
        .select("id, nome_completo")
        .in("id", alunoIds)
        .order("nome_completo", { ascending: true });

      if (alunosError) {
        console.error(alunosError);
        setErro("Não foi possível carregar os alunos: " + alunosError.message);
        setAlunos([]);
        setPresentes(new Set());
        setIsLoadingAlunos(false);
        return;
      }

      setAlunos((alunosData || []) as Aluno[]);

      // Carrega os alunos que já tiveram presença registrada hoje nessa turma.
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      const { data: presencasData, error: presencasError } = await supabase
        .from("presencas")
        .select("id, aluno_id")
        .eq("turma_id", turmaId)
        .gte("data_hora", inicioHoje.toISOString())
        .lte("data_hora", fimHoje.toISOString());

      if (presencasError) {
        // Se a leitura das presenças falhar, ainda mostramos os alunos.
        console.error("Erro ao carregar presenças:", presencasError.message);
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

  const marcarTodos = () => {
    setPresentes(new Set(alunos.map((aluno) => aluno.id)));
    setMensagem("");
  };

  const limparTodos = () => {
    setPresentes(new Set());
    setMensagem("");
  };

  const getOperadorId = async (): Promise<string> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Usuário não está logado. Faça login novamente.");
    }

    if (!user.email) {
      throw new Error("O usuário logado não possui e-mail.");
    }

    const { data: operador, error } = await supabase
      .from("operadores")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (error) {
      throw new Error("Erro ao localizar operador: " + error.message);
    }

    if (!operador) {
      throw new Error(
        `Nenhum operador foi encontrado com o e-mail ${user.email}.`
      );
    }

    return operador.id;
  };

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

      // Remove as presenças de hoje dessa turma e grava novamente
      // exatamente os alunos marcados como presentes.
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      const { error: deleteError } = await supabase
        .from("presencas")
        .delete()
        .eq("turma_id", turmaId)
        .gte("data_hora", inicioHoje.toISOString())
        .lte("data_hora", fimHoje.toISOString());

      if (deleteError) {
        throw new Error(
          "Não foi possível atualizar as presenças de hoje: " +
            deleteError.message
        );
      }

      const presentesArray = Array.from(presentes);

      if (presentesArray.length > 0) {
        const agora = new Date().toISOString();

        const registros = presentesArray.map((alunoId) => ({
          aluno_id: alunoId,
          curso_id: turmaSelecionada.curso_id,
          turma_id: turmaId,
          operador_id: operadorId,
          metodo: "manual",
          data_hora: agora,
        }));

        const { error: insertError } = await supabase
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
        presentesArray.length === 1
          ? "1 presença registrada com sucesso."
          : `${presentesArray.length} presenças registradas com sucesso.`
      );
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao salvar o check-in."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Check-in de Oficinas</h1>
        <p className="text-slate-500 mt-2">
          Faça a chamada manualmente e marque os alunos que compareceram.
        </p>
      </div>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensagem}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Turma
        </label>

        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          disabled={isLoadingTurmas}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
        >
          <option value="">
            {isLoadingTurmas ? "Carregando turmas..." : "Selecione uma turma"}
          </option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
              {turma.turno ? ` — ${turma.turno}` : ""}
              {turma.cursos?.[0]?.titulo
                ? ` — ${turma.cursos[0].titulo}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {turmaId && (
        <div className="mt-5 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Alunos da turma
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {alunos.length} aluno(s) — {presentes.size} presente(s)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={marcarTodos}
                disabled={isLoadingAlunos || alunos.length === 0}
                className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={limparTodos}
                disabled={isLoadingAlunos || alunos.length === 0}
                className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
          </div>

          {isLoadingAlunos ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando alunos...
            </div>
          ) : alunos.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Nenhum aluno está matriculado nessa turma.
              <br />
              Verifique se a matrícula possui o <strong>turma_id</strong> preenchido.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alunos.map((aluno, index) => {
                const presente = presentes.has(aluno.id);

                return (
                  <button
                    type="button"
                    key={aluno.id}
                    onClick={() => alternarPresenca(aluno.id)}
                    className={`w-full p-4 flex items-center gap-4 text-left transition-colors ${
                      presente ? "bg-green-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-8 text-sm text-slate-400">{index + 1}</span>
                    <span className="flex-1 font-medium text-slate-800">
                      {aluno.nome_completo}
                    </span>
                    <span
                      className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                        presente
                          ? "bg-green-600 border-green-600 text-white"
                          : "bg-white border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-5 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={salvarPresencas}
              disabled={isSaving || isLoadingAlunos || alunos.length === 0}
              className="px-5 py-2.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Salvando..." : "Salvar chamada"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
