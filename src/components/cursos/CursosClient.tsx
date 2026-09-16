"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Calendar,
  Clock,
  Users,
  BookOpen,
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
  turno: string;
  dias_semana: string[] | null;
  horario: string | null;
  data_hora_inicio: string | null;
  data_hora_fim: string | null;
  vagas: number | null;
  cursos?: {
    titulo: string;
  } | {
    titulo: string;
  }[] | null;
};

type EditingTurma = {
  id?: string;
  nome: string;
  curso_id: string;
  turno: string;
  dias_semana: string[];
  horario: string;
  vagas: number;
};

const DIAS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
];

const HORARIOS = [
  {
    turno: "Manhã",
    label: "08:30 - 10:00",
    inicio: "08:30",
    fim: "10:00",
  },
  {
    turno: "Manhã",
    label: "10:00 - 11:30",
    inicio: "10:00",
    fim: "11:30",
  },
  {
    turno: "Tarde",
    label: "14:30 - 16:00",
    inicio: "14:30",
    fim: "16:00",
  },
  {
    turno: "Tarde",
    label: "16:00 - 17:30",
    inicio: "16:00",
    fim: "17:30",
  },
] as const;

const DIAS_ABREV: Record<string, string> = {
  Segunda: "SEG",
  Terça: "TER",
  Quarta: "QUA",
  Quinta: "QUI",
  Sexta: "SEX",
};

function getCursoTitulo(turma: Turma) {
  if (!turma.cursos) return "";

  if (Array.isArray(turma.cursos)) {
    return turma.cursos[0]?.titulo || "";
  }

  return turma.cursos.titulo || "";
}

function getHorarioByLabel(label: string) {
  return HORARIOS.find((horario) => horario.label === label);
}

function getHorarioLabel(turma: Turma) {
  /*
   * Primeiro usa diretamente o campo horario salvo no banco.
   *
   * Exemplo:
   * "08:30 - 10:00"
   */
  if (turma.horario) {
    const horarioBanco = HORARIOS.find(
      (horario) => horario.label === turma.horario
    );

    if (horarioBanco) {
      return horarioBanco.label;
    }

    return turma.horario;
  }

  /*
   * Compatibilidade com turmas antigas que ainda não possuem
   * horario preenchido.
   */
  if (turma.data_hora_inicio) {
    const data = new Date(turma.data_hora_inicio);

    const brasil = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(data);

    if (turma.turno === "Manhã") {
      if (brasil === "08:30") return "08:30 - 10:00";
      if (brasil === "10:00") return "10:00 - 11:30";
    }

    if (turma.turno === "Tarde") {
      if (brasil === "14:30") return "14:30 - 16:00";
      if (brasil === "16:00") return "16:00 - 17:30";
    }
  }

  return "";
}

function criarDatasHorario(horarioLabel: string) {
  const horario = getHorarioByLabel(horarioLabel);

  if (!horario) {
    throw new Error("Horário inválido.");
  }

  /*
   * A data atual é usada somente para montar os timestamps.
   * O horário salvo no campo `horario` continua sendo o texto
   * selecionado pelo usuário.
   */
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  const inicio = `${ano}-${mes}-${dia}T${horario.inicio}:00-03:00`;
  const fim = `${ano}-${mes}-${dia}T${horario.fim}:00-03:00`;

  return {
    inicio,
    fim,
  };
}

export default function CursosClient({
  cursos,
  turmas: turmasIniciais,
}: {
  cursos: Curso[];
  turmas: Turma[];
}) {
  const [turmas, setTurmas] = useState<Turma[]>(turmasIniciais || []);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingTurma, setEditingTurma] =
    useState<EditingTurma | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [selectedCurso, setSelectedCurso] =
    useState<string>("todos");

  const [selectedTurno, setSelectedTurno] =
    useState<string>("todos");

  const [mensagem, setMensagem] = useState("");

  /*
   * Mantém a lista atualizada caso o componente receba
   * novos dados pelo servidor.
   */
  useEffect(() => {
    setTurmas(turmasIniciais || []);
  }, [turmasIniciais]);

  const turmasFiltradas = useMemo(() => {
    return turmas.filter((turma) => {
      const cursoOk =
        selectedCurso === "todos" ||
        turma.curso_id === selectedCurso;

      const turnoOk =
        selectedTurno === "todos" ||
        turma.turno === selectedTurno;

      return cursoOk && turnoOk;
    });
  }, [turmas, selectedCurso, selectedTurno]);

  const turmasPorDiaEHorario = (
    dia: string,
    horario: string
  ) => {
    return turmasFiltradas.filter((turma) => {
      const dias = turma.dias_semana || [];

      const possuiDia = dias.some(
        (item) =>
          item.toLowerCase() === dia.toLowerCase()
      );

      const horarioTurma = getHorarioLabel(turma);

      return (
        possuiDia &&
        horarioTurma === horario
      );
    });
  };

  const abrirNovaTurma = () => {
    setMensagem("");

    setEditingTurma({
      nome: "",
      curso_id: "",
      turno: "Manhã",
      dias_semana: [],
      horario: "08:30 - 10:00",
      vagas: 30,
    });

    setIsModalOpen(true);
  };

  const abrirEdicao = (turma: Turma) => {
    setMensagem("");

    const horario = getHorarioLabel(turma);

    setEditingTurma({
      id: turma.id,
      nome: turma.nome || "",
      curso_id: turma.curso_id || "",
      turno: turma.turno || "Manhã",
      dias_semana: turma.dias_semana || [],
      horario:
        horario ||
        (turma.turno === "Tarde"
          ? "14:30 - 16:00"
          : "08:30 - 10:00"),
      vagas: turma.vagas || 30,
    });

    setIsModalOpen(true);
  };

  const fecharModal = () => {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingTurma(null);
    setMensagem("");
  };

  const alternarDia = (dia: string) => {
    if (!editingTurma) return;

    const existe =
      editingTurma.dias_semana.includes(dia);

    setEditingTurma({
      ...editingTurma,
      dias_semana: existe
        ? editingTurma.dias_semana.filter(
            (item) => item !== dia
          )
        : [...editingTurma.dias_semana, dia],
    });
  };

  const alterarTurno = (turno: string) => {
    if (!editingTurma) return;

    const primeiroHorario =
      turno === "Manhã"
        ? "08:30 - 10:00"
        : "14:30 - 16:00";

    setEditingTurma({
      ...editingTurma,
      turno,
      horario: primeiroHorario,
    });
  };

  const salvarTurma = async () => {
    if (!editingTurma) return;

    setMensagem("");

    if (!editingTurma.nome.trim()) {
      setMensagem("Informe o nome da turma.");
      return;
    }

    if (!editingTurma.curso_id) {
      setMensagem("Selecione um curso.");
      return;
    }

    if (editingTurma.dias_semana.length === 0) {
      setMensagem("Selecione pelo menos um dia da semana.");
      return;
    }

    if (!editingTurma.horario) {
      setMensagem("Selecione um horário.");
      return;
    }

    const horarioSelecionado =
      getHorarioByLabel(editingTurma.horario);

    if (!horarioSelecionado) {
      setMensagem("O horário selecionado é inválido.");
      return;
    }

    if (
      horarioSelecionado.turno !==
      editingTurma.turno
    ) {
      setMensagem(
        "O horário selecionado não corresponde ao turno da turma."
      );
      return;
    }

    setIsSaving(true);

    try {
      const { inicio, fim } =
        criarDatasHorario(
          editingTurma.horario
        );

      /*
       * IMPORTANTE:
       *
       * Aqui está a correção principal.
       *
       * O campo horario recebe diretamente:
       *
       * "08:30 - 10:00"
       *
       * "10:00 - 11:30"
       *
       * "14:30 - 16:00"
       *
       * "16:00 - 17:30"
       *
       * e NÃO recebe mais:
       *
       * "manha-1"
       * "manha-2"
       * etc.
       */
      const payload = {
        nome: editingTurma.nome.trim(),
        curso_id: editingTurma.curso_id,
        turno: editingTurma.turno,
        dias_semana: editingTurma.dias_semana,
        horario: editingTurma.horario,
        data_hora_inicio: inicio,
        data_hora_fim: fim,
        vagas: editingTurma.vagas || 30,
      };

      console.log(
        "SALVANDO TURMA:",
        payload
      );

      if (editingTurma.id) {
        const { data, error } = await supabase
          .from("turmas")
          .update(payload)
          .eq("id", editingTurma.id)
          .select(`
            *,
            cursos (
              titulo
            )
          `)
          .single();

        if (error) {
          console.error(
            "Erro ao atualizar turma:",
            error
          );

          setMensagem(
            "Erro ao atualizar turma: " +
              error.message
          );

          return;
        }

        setTurmas((lista) =>
          lista.map((turma) =>
            turma.id === editingTurma.id
              ? (data as Turma)
              : turma
          )
        );

        setMensagem(
          "Turma atualizada com sucesso!"
        );
      } else {
        const { data, error } = await supabase
          .from("turmas")
          .insert([payload])
          .select(`
            *,
            cursos (
              titulo
            )
          `)
          .single();

        if (error) {
          console.error(
            "Erro ao criar turma:",
            error
          );

          setMensagem(
            "Erro ao criar turma: " +
              error.message
          );

          return;
        }

        setTurmas((lista) => [
          ...lista,
          data as Turma,
        ]);

        setMensagem(
          "Turma criada com sucesso!"
        );
      }

      /*
       * Pequeno atraso para o usuário conseguir
       * visualizar a mensagem antes de fechar.
       */
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingTurma(null);
        setMensagem("");
      }, 700);
    } catch (error) {
      console.error(error);

      setMensagem(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao salvar a turma."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const excluirTurma = async (turma: Turma) => {
    const confirmar = window.confirm(
      `Deseja realmente excluir a turma "${turma.nome}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("turmas")
      .delete()
      .eq("id", turma.id);

    if (error) {
      console.error(error);

      alert(
        "Não foi possível excluir a turma: " +
          error.message
      );

      return;
    }

    setTurmas((lista) =>
      lista.filter(
        (item) => item.id !== turma.id
      )
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* CABEÇALHO */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Turmas
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Organize as turmas, horários e dias
            das aulas.
          </p>
        </div>

        <button
          onClick={abrirNovaTurma}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />

          Nova turma
        </button>
      </div>

      {/* FILTROS */}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Curso
            </label>

            <select
              value={selectedCurso}
              onChange={(e) =>
                setSelectedCurso(e.target.value)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Turno
            </label>

            <select
              value={selectedTurno}
              onChange={(e) =>
                setSelectedTurno(e.target.value)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">
                Todos os turnos
              </option>

              <option value="Manhã">
                Manhã
              </option>

              <option value="Tarde">
                Tarde
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* GRADE SEMANAL */}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />

          <h2 className="font-semibold text-slate-900">
            Grade semanal
          </h2>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* CABEÇALHO DOS DIAS */}

            <div className="grid grid-cols-[140px_repeat(5,1fr)] border-b border-slate-200">
              <div className="p-3 bg-slate-50 border-r border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  HORÁRIO
                </span>
              </div>

              {DIAS.map((dia) => (
                <div
                  key={dia}
                  className="p-3 bg-slate-50 text-center border-r border-slate-200 last:border-r-0"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {DIAS_ABREV[dia]}
                  </span>
                </div>
              ))}
            </div>

            {/* HORÁRIOS */}

            {HORARIOS.map((horario) => (
              <div
                key={horario.label}
                className="grid grid-cols-[140px_repeat(5,1fr)] border-b border-slate-200 last:border-b-0"
              >
                {/* HORÁRIO */}

                <div className="p-3 border-r border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {horario.label}
                      </p>

                      <p className="text-xs text-slate-400 mt-0.5">
                        {horario.turno}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DIAS */}

                {DIAS.map((dia) => {
                  const turmasCelula =
                    turmasPorDiaEHorario(
                      dia,
                      horario.label
                    );

                  return (
                    <div
                      key={`${dia}-${horario.label}`}
                      className="min-h-[120px] p-2 border-r border-slate-200 last:border-r-0"
                    >
                      <div className="space-y-2">
                        {turmasCelula.map(
                          (turma) => (
                            <div
                              key={turma.id}
                              className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-blue-900 truncate">
                                    {turma.nome}
                                  </p>

                                  <p className="text-xs text-blue-700 mt-1 truncate">
                                    {getCursoTitulo(
                                      turma
                                    )}
                                  </p>

                                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                    <Users className="w-3 h-3" />

                                    <span>
                                      {turma.vagas ||
                                        0}{" "}
                                      vagas
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      abrirEdicao(
                                        turma
                                      )
                                    }
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      excluirTurma(
                                        turma
                                      )
                                    }
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        )}

                        {turmasCelula.length ===
                          0 && (
                          <div className="h-full min-h-[100px] flex items-center justify-center">
                            <span className="text-xs text-slate-300">
                              —
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL */}

      {isModalOpen &&
        editingTurma && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* HEADER */}

              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingTurma.id
                      ? "Editar turma"
                      : "Nova turma"}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Configure a turma e o horário
                    das aulas.
                  </p>
                </div>

                <button
                  onClick={fecharModal}
                  disabled={isSaving}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* CONTEÚDO */}

              <div className="p-5 space-y-5">
                {/* MENSAGEM */}

                {mensagem && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    {mensagem}
                  </div>
                )}

                {/* NOME */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome da turma
                  </label>

                  <input
                    type="text"
                    value={editingTurma.nome}
                    onChange={(e) =>
                      setEditingTurma({
                        ...editingTurma,
                        nome: e.target.value,
                      })
                    }
                    placeholder="Ex.: Turma A"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* CURSO */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Curso
                  </label>

                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                    <select
                      value={
                        editingTurma.curso_id
                      }
                      onChange={(e) =>
                        setEditingTurma({
                          ...editingTurma,
                          curso_id:
                            e.target.value,
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">
                        Selecione um curso
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
                </div>

                {/* TURNO */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Turno
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {["Manhã", "Tarde"].map(
                      (turno) => (
                        <button
                          key={turno}
                          type="button"
                          onClick={() =>
                            alterarTurno(
                              turno
                            )
                          }
                          className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                            editingTurma.turno ===
                            turno
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                          }`}
                        >
                          {turno}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* HORÁRIO */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Horário da aula
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {HORARIOS.filter(
                      (horario) =>
                        horario.turno ===
                        editingTurma.turno
                    ).map((horario) => (
                      <button
                        key={horario.label}
                        type="button"
                        onClick={() =>
                          setEditingTurma({
                            ...editingTurma,
                            horario:
                              horario.label,
                          })
                        }
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                          editingTurma.horario ===
                          horario.label
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                        }`}
                      >
                        <Clock
                          className={`w-5 h-5 ${
                            editingTurma.horario ===
                            horario.label
                              ? "text-white"
                              : "text-slate-400"
                          }`}
                        />

                        <div>
                          <p className="font-semibold text-sm">
                            {horario.label}
                          </p>

                          <p
                            className={`text-xs mt-0.5 ${
                              editingTurma.horario ===
                              horario.label
                                ? "text-blue-100"
                                : "text-slate-400"
                            }`}
                          >
                            {horario.turno}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DIAS */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dias da semana
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {DIAS.map((dia) => {
                      const selecionado =
                        editingTurma.dias_semana.includes(
                          dia
                        );

                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() =>
                            alternarDia(dia)
                          }
                          className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                            selecionado
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* VAGAS */}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantidade de vagas
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={editingTurma.vagas}
                    onChange={(e) =>
                      setEditingTurma({
                        ...editingTurma,
                        vagas:
                          Number(
                            e.target.value
                          ) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* RESUMO */}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    Resumo
                  </p>

                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <strong>Turno:</strong>{" "}
                      {editingTurma.turno}
                    </p>

                    <p>
                      <strong>Horário:</strong>{" "}
                      {editingTurma.horario}
                    </p>

                    <p>
                      <strong>Dias:</strong>{" "}
                      {editingTurma.dias_semana
                        .length > 0
                        ? editingTurma.dias_semana.join(
                            ", "
                          )
                        : "Nenhum dia selecionado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={isSaving}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarTurma}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">
                        <Loader2Icon />
                      </span>

                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />

                      Salvar turma
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function Loader2Icon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2V6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18V22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.93 4.93L7.76 7.76"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.24 16.24L19.07 19.07"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2 12H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 12H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.93 19.07L7.76 16.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.24 7.76L19.07 4.93"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
