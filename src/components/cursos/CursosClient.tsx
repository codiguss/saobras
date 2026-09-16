"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  BookOpen,
  Clock,
  X,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type Curso = {
  id: string;
  titulo: string;
  descricao: string | null;
  criado_por?: string | null;
  criado_em?: string;
};

export type Turma = {
  id: string;
  nome: string;
  curso_id: string;
  dias_semana: string[] | null;
  turno: string | null;

  // Campos reais da tabela turmas
  data_inicio?: string | null;
  data_fim?: string | null;

  // Nova coluna criada no Supabase
  horario?: string | null;

  vagas?: number;
  cursos?: {
    titulo: string;
  } | null;
};

const DIAS_SEMANA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
];

const TURNOS = ["Manhã", "Tarde"];

const HORARIOS = [
  {
    id: "manha-1",
    turno: "Manhã",
    label: "08:30 - 10:00",
    inicio: "08:30",
    fim: "10:00",
  },
  {
    id: "manha-2",
    turno: "Manhã",
    label: "10:00 - 11:30",
    inicio: "10:00",
    fim: "11:30",
  },
  {
    id: "tarde-1",
    turno: "Tarde",
    label: "14:30 - 16:00",
    inicio: "14:30",
    fim: "16:00",
  },
  {
    id: "tarde-2",
    turno: "Tarde",
    label: "16:00 - 17:30",
    inicio: "16:00",
    fim: "17:30",
  },
] as const;

/*
 * Procura o horário pelo ID.
 */
const getHorarioById = (id?: string | null) => {
  return HORARIOS.find((horario) => horario.id === id);
};

/*
 * Converte data_inicio para o horário de Brasília.
 *
 * Serve apenas para compatibilidade com turmas antigas
 * que ainda não possuem a coluna horario preenchida.
 */
const getLocalTimeFromDate = (
  value?: string | null
) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(date);
};

/*
 * Descobre o horário da turma.

 * PRIMEIRO:
 * usa diretamente a nova coluna horario.

 * Se uma turma antiga ainda não tiver horario,
 * tenta descobrir através de data_inicio.
 */
const getHorarioId = (turma: Partial<Turma>) => {
  /*
   * Agora o principal é o campo horario.
   */
  if (turma.horario) {
    const horarioExiste = HORARIOS.find(
      (horario) => horario.id === turma.horario
    );

    if (horarioExiste) {
      return horarioExiste.id;
    }
  }

  /*
   * Compatibilidade com turmas antigas.
   */
  const localTime = getLocalTimeFromDate(
    turma.data_inicio
  );

  if (localTime) {
    const horarioExato = HORARIOS.find(
      (horario) =>
        horario.turno === turma.turno &&
        horario.inicio === localTime
    );

    if (horarioExato) {
      return horarioExato.id;
    }
  }

  return "";
};

/*
 * Cria data_inicio e data_fim a partir
 * do horário que o usuário selecionou.

 * Exemplo:
 * 08:30 - 10:00
 *
 * vira:
 * data_inicio = 2024-01-01T11:30:00.000Z
 * data_fim    = 2024-01-01T13:00:00.000Z
 *
 * O -03:00 representa Brasília.
 */
const createHorarioDates = (
  horarioId: string
) => {
  const horario = getHorarioById(horarioId);

  if (!horario) {
    return {
      inicio: null,
      fim: null,
    };
  }

  const inicio = new Date(
    `2024-01-01T${horario.inicio}:00-03:00`
  ).toISOString();

  const fim = new Date(
    `2024-01-01T${horario.fim}:00-03:00`
  ).toISOString();

  return {
    inicio,
    fim,
  };
};

const COLOR_THEMES = {
  blue: {
    cardBorder: "border-t-blue-500",
    gridCard:
      "bg-blue-50 border-blue-400 hover:bg-blue-100",
    gridTextSub: "text-blue-700",
    listCard: "border-l-blue-400",
    badge:
      "bg-blue-100 text-blue-700 border-blue-200",
  },

  green: {
    cardBorder: "border-t-emerald-500",
    gridCard:
      "bg-emerald-50 border-emerald-400 hover:bg-emerald-100",
    gridTextSub: "text-emerald-700",
    listCard: "border-l-emerald-400",
    badge:
      "bg-emerald-100 text-emerald-700 border-emerald-200",
  },

  orange: {
    cardBorder: "border-t-orange-500",
    gridCard:
      "bg-orange-50 border-orange-400 hover:bg-orange-100",
    gridTextSub: "text-orange-700",
    listCard: "border-l-orange-400",
    badge:
      "bg-orange-100 text-orange-700 border-orange-200",
  },

  red: {
    cardBorder: "border-t-red-500",
    gridCard:
      "bg-red-50 border-red-400 hover:bg-red-100",
    gridTextSub: "text-red-700",
    listCard: "border-l-red-400",
    badge:
      "bg-red-100 text-red-700 border-red-200",
  },
};

const getColorKeys = () =>
  ["blue", "green", "orange", "red"] as const;

const getColorForId = (id: string) => {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash =
      id.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  const keys = getColorKeys();

  return keys[Math.abs(hash) % keys.length];
};

export function CursosClient({
  cursos,
  turmas,
}: {
  cursos: Curso[];
  turmas: Turma[];
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "cursos" | "turmas"
  >("turmas");

  const [isCursoModalOpen, setIsCursoModalOpen] =
    useState(false);

  const [isTurmaModalOpen, setIsTurmaModalOpen] =
    useState(false);

  const [editingCurso, setEditingCurso] =
    useState<Partial<Curso> | null>(null);

  const [editingTurma, setEditingTurma] =
    useState<Partial<Turma> | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  /*
   * ============================================================
   * SALVAR CURSO
   * ============================================================
   */

  const handleSaveCurso = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editingCurso?.titulo) {
      return;
    }

    setIsSaving(true);

    const payload = {
      titulo: editingCurso.titulo,
      descricao: editingCurso.descricao,
    };

    let error;

    if (editingCurso.id) {
      const {
        error: updateError,
      } = await supabase
        .from("cursos")
        .update(payload)
        .eq("id", editingCurso.id);

      error = updateError;
    } else {
      const insertPayload = {
        ...payload,
        criado_em:
          new Date().toISOString(),
      };

      const {
        error: insertError,
      } = await supabase
        .from("cursos")
        .insert([insertPayload]);

      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      alert(
        "Erro ao salvar curso: " +
          error.message
      );
      return;
    }

    setIsCursoModalOpen(false);

    router.refresh();
  };

  /*
   * ============================================================
   * EXCLUIR CURSO
   * ============================================================
   */

  const handleDeleteCurso = async (
    id: string
  ) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este curso?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("cursos")
      .delete()
      .eq("id", id);

    if (error) {
      alert(
        "Erro ao excluir: " +
          error.message
      );
    } else {
      router.refresh();
    }
  };

  /*
   * ============================================================
   * SALVAR TURMA
   * ============================================================
   */

  const handleSaveTurma = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !editingTurma?.nome ||
      !editingTurma?.curso_id ||
      !editingTurma?.turno
    ) {
      alert(
        "Preencha nome, curso e turno!"
      );
      return;
    }

    if (!editingTurma.horario) {
      alert(
        "Selecione um horário para a turma!"
      );
      return;
    }

    if (
      !editingTurma.dias_semana ||
      editingTurma.dias_semana.length === 0
    ) {
      alert(
        "Selecione ao menos um dia da semana!"
      );
      return;
    }

    setIsSaving(true);

    /*
     * Pega o horário que o usuário escolheu.
     */
    const horario = getHorarioById(
      editingTurma.horario
    );

    if (!horario) {
      alert(
        "Horário selecionado inválido."
      );
      setIsSaving(false);
      return;
    }

    /*
     * Confere se o horário pertence ao turno escolhido.
     */
    if (
      horario.turno !==
      editingTurma.turno
    ) {
      alert(
        "O horário selecionado não corresponde ao turno da turma!"
      );

      setIsSaving(false);
      return;
    }

    /*
     * Cria os timestamps usando o horário escolhido.
     */
    const {
      inicio,
      fim,
    } = createHorarioDates(
      editingTurma.horario
    );

    /*
     * ========================================================
     * IMPORTANTE
     *
     * horario recebe EXATAMENTE o horário escolhido.
     *
     * Exemplo:
     *
     * horario = "manha-1"
     *
     * data_inicio = horário correspondente
     * data_fim    = horário correspondente
     * ========================================================
     */

    const payload = {
      nome: editingTurma.nome,

      curso_id:
        editingTurma.curso_id,

      turno:
        editingTurma.turno,

      dias_semana:
        editingTurma.dias_semana,

      /*
       * NOVA COLUNA
       */
      horario:
        editingTurma.horario,

      /*
       * TIMESTAMPS
       */
      data_inicio: inicio,

      data_fim: fim,

      vagas:
        editingTurma.vagas || 30,
    };

    let error;

    /*
     * EDITAR
     */
    if (editingTurma.id) {
      const {
        error: updateError,
      } = await supabase
        .from("turmas")
        .update(payload)
        .eq(
          "id",
          editingTurma.id
        );

      error = updateError;
    }

    /*
     * CRIAR
     */
    else {
      const insertPayload = {
        ...payload,

        criado_em:
          new Date().toISOString(),
      };

      const {
        error: insertError,
      } = await supabase
        .from("turmas")
        .insert([
          insertPayload,
        ]);

      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      console.error(
        "Erro ao salvar turma:",
        error
      );

      alert(
        "Erro ao salvar turma: " +
          error.message
      );

      return;
    }

    setIsTurmaModalOpen(false);

    router.refresh();
  };

  /*
   * ============================================================
   * EXCLUIR TURMA
   * ============================================================
   */

  const handleDeleteTurma = async (
    id: string
  ) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta turma?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("turmas")
      .delete()
      .eq("id", id);

    if (error) {
      alert(
        "Erro ao excluir: " +
          error.message
      );
    } else {
      router.refresh();
    }
  };

  /*
   * ============================================================
   * SELECIONAR DIA
   * ============================================================
   */

  const toggleDiaSemana = (
    dia: string
  ) => {
    setEditingTurma((prev) => {
      if (!prev) {
        return prev;
      }

      const current =
        prev.dias_semana || [];

      const updated =
        current.includes(dia)
          ? current.filter(
              (d) => d !== dia
            )
          : [...current, dia];

      return {
        ...prev,
        dias_semana: updated,
      };
    });
  };

  /*
   * ============================================================
   * TURMAS DA GRADE
   * ============================================================
   */

  const getTurmasForCell = (
    turno: string,
    dia: string,
    horarioId: string
  ) => {
    return turmas.filter(
      (turma) =>
        turma.turno === turno &&
        getHorarioId(turma) ===
          horarioId &&
        (turma.dias_semana || []).includes(
          dia
        )
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* CABEÇALHO */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Cursos e Turmas
        </h1>

        <div className="flex gap-2">
          {activeTab === "cursos" ? (
            <button
              onClick={() => {
                setEditingCurso({
                  titulo: "",
                  descricao: "",
                });

                setIsCursoModalOpen(
                  true
                );
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Curso
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingTurma({
                  nome: "",
                  curso_id: "",
                  turno: "Manhã",
                  dias_semana: [],
                  horario: "manha-1",
                  vagas: 30,
                });

                setIsTurmaModalOpen(
                  true
                );
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Turma
            </button>
          )}
        </div>
      </div>

      {/* ABAS */}

      <div className="flex border-b border-slate-200">
        <button
          onClick={() =>
            setActiveTab("turmas")
          }
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "turmas"
              ? "border-emerald-500 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Grade Semanal
        </button>

        <button
          onClick={() =>
            setActiveTab("cursos")
          }
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "cursos"
              ? "border-blue-500 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Cursos
        </button>
      </div>

      {/* ========================================================
          CURSOS
      ======================================================== */}

      {activeTab === "cursos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((curso) => {
            const turmasDoCurso =
              turmas.filter(
                (t) =>
                  t.curso_id ===
                  curso.id
              );

            const cursoColor =
              COLOR_THEMES[
                getColorForId(
                  curso.id
                )
              ];

            return (
              <div
                key={curso.id}
                className={`bg-white border border-slate-200 border-t-4 ${cursoColor.cardBorder} rounded-lg p-5 shadow-sm hover:shadow transition-shadow flex flex-col h-full`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-900">
                    {curso.titulo}
                  </h3>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingCurso(
                          curso
                        );

                        setIsCursoModalOpen(
                          true
                        );
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteCurso(
                          curso.id
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">
                  {curso.descricao ||
                    "Sem descrição"}
                </p>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Turmas Ativas (
                    {
                      turmasDoCurso.length
                    }
                    )
                  </h4>

                  {turmasDoCurso.length >
                  0 ? (
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                      {turmasDoCurso.map(
                        (turma) => {
                          const turmaColor =
                            COLOR_THEMES[
                              getColorForId(
                                turma.id
                              )
                            ];

                          const horario =
                            getHorarioById(
                              getHorarioId(
                                turma
                              )
                            );

                          return (
                            <div
                              key={
                                turma.id
                              }
                              className={`flex items-center justify-between bg-slate-50 border border-slate-100 border-l-4 ${turmaColor.listCard} p-2.5 rounded-md`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-sm text-slate-800 truncate">
                                  {
                                    turma.nome
                                  }
                                </span>

                                <span className="text-[11px] text-slate-500 truncate">
                                  {
                                    turma.turno
                                  }{" "}
                                  •{" "}
                                  {horario?.label ||
                                    "Horário não definido"}{" "}
                                  •{" "}
                                  {(
                                    turma.dias_semana ||
                                    []
                                  ).join(
                                    ", "
                                  )}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap ml-2 border ${turmaColor.badge}`}
                              >
                                {turma.vagas ||
                                  30}{" "}
                                vagas
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Nenhuma turma cadastrada.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {cursos.length === 0 && (
            <p className="text-slate-500 col-span-full py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
              Nenhum curso cadastrado ainda.
            </p>
          )}
        </div>
      )}

      {/* ========================================================
          GRADE SEMANAL
      ======================================================== */}

      {activeTab === "turmas" && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-32 border-r border-slate-200 text-center">
                  <Clock className="w-4 h-4 inline-block mr-1" />
                  Turno
                </th>

                {DIAS_SEMANA.map(
                  (dia) => (
                    <th
                      key={dia}
                      className="px-4 py-4 w-48 border-r border-slate-200 text-center"
                    >
                      {dia}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {HORARIOS.map(
                (horario) => (
                  <tr key={horario.id}>
                    <td className="px-4 py-6 border-r border-slate-200 bg-slate-50 text-center font-bold text-slate-700 align-middle">
                      {horario.turno}
                      <br />

                      <span className="text-xs font-normal text-slate-500">
                        {horario.label}
                      </span>
                    </td>

                    {DIAS_SEMANA.map(
                      (dia) => {
                        const turmasNoDia =
                          getTurmasForCell(
                            horario.turno,
                            dia,
                            horario.id
                          );

                        return (
                          <td
                            key={dia}
                            className="p-1.5 border-r border-slate-200 align-middle bg-white h-[120px]"
                          >
                            <div className="w-full h-full flex flex-col gap-1.5">
                              {turmasNoDia.map(
                                (
                                  turma
                                ) => {
                                  const turmaColor =
                                    COLOR_THEMES[
                                      getColorForId(
                                        turma.id
                                      )
                                    ];

                                  return (
                                    <div
                                      key={
                                        turma.id
                                      }
                                      onClick={() => {
                                        setEditingTurma(
                                          {
                                            ...turma,
                                            horario:
                                              getHorarioId(
                                                turma
                                              ),
                                          }
                                        );

                                        setIsTurmaModalOpen(
                                          true
                                        );
                                      }}
                                      className={`flex-1 flex flex-col items-start justify-center p-3 rounded-md cursor-pointer transition-all text-left border-l-4 ${turmaColor.gridCard}`}
                                    >
                                      <div className="font-bold text-slate-800 text-base leading-tight mb-1">
                                        {
                                          turma.nome
                                        }
                                      </div>

                                      <div
                                        className={`text-sm font-medium line-clamp-1 mb-2 ${turmaColor.gridTextSub}`}
                                      >
                                        {turma
                                          .cursos
                                          ?.titulo ||
                                          "Curso Indefinido"}
                                      </div>

                                      <div
                                        className={`mt-auto inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border shadow-sm ${turmaColor.badge}`}
                                      >
                                        Vagas:{" "}
                                        {turma.vagas ||
                                          30}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </td>
                        );
                      }
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          MODAL CURSO
      ======================================================== */}

      {isCursoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCurso?.id
                  ? "Editar Curso"
                  : "Novo Curso"}
              </h3>

              <button
                onClick={() =>
                  setIsCursoModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleSaveCurso
              }
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título do Curso
                </label>

                <input
                  required
                  type="text"
                  value={
                    editingCurso?.titulo ||
                    ""
                  }
                  onChange={(e) =>
                    setEditingCurso(
                      (prev) => ({
                        ...prev,
                        titulo:
                          e.target
                            .value,
                      })
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição
                </label>

                <textarea
                  rows={3}
                  value={
                    editingCurso?.descricao ||
                    ""
                  }
                  onChange={(e) =>
                    setEditingCurso(
                      (prev) => ({
                        ...prev,
                        descricao:
                          e.target
                            .value,
                      })
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                {editingCurso?.id && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteCurso(
                        editingCurso.id!
                      )
                    }
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md mr-auto"
                  >
                    Excluir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setIsCursoModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL TURMA
      ======================================================== */}

      {isTurmaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">
                {editingTurma?.id
                  ? "Editar Turma"
                  : "Nova Turma"}
              </h3>

              <button
                onClick={() =>
                  setIsTurmaModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleSaveTurma
              }
              className="p-4 space-y-5"
            >
              {/* CURSO */}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Curso Vinculado
                </label>

                <select
                  required
                  value={
                    editingTurma?.curso_id ||
                    ""
                  }
                  onChange={(e) =>
                    setEditingTurma(
                      (prev) => ({
                        ...prev,
                        curso_id:
                          e.target
                            .value,
                      })
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                >
                  <option
                    value=""
                    disabled
                  >
                    Selecione um curso
                  </option>

                  {cursos.map(
                    (curso) => (
                      <option
                        key={
                          curso.id
                        }
                        value={
                          curso.id
                        }
                      >
                        {
                          curso.titulo
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* NOME E VAGAS */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome/Identificador da Turma
                  </label>

                  <input
                    required
                    type="text"
                    placeholder="Ex: Turma A"
                    value={
                      editingTurma?.nome ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingTurma(
                        (prev) => ({
                          ...prev,
                          nome: e
                            .target
                            .value,
                        })
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantidade de Vagas
                  </label>

                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Ex: 30"
                    value={
                      editingTurma?.vagas ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingTurma(
                        (prev) => ({
                          ...prev,
                          vagas:
                            parseInt(
                              e.target
                                .value
                            ) || 0,
                        })
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* TURNO */}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Turno
                </label>

                <div className="flex gap-4">
                  {TURNOS.map(
                    (turno) => (
                      <label
                        key={
                          turno
                        }
                        className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${
                          editingTurma?.turno ===
                          turno
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="turno"
                          value={
                            turno
                          }
                          checked={
                            editingTurma?.turno ===
                            turno
                          }
                          onChange={() =>
                            setEditingTurma(
                              (
                                prev
                              ) => ({
                                ...prev,
                                turno,
                                horario:
                                  turno ===
                                  "Manhã"
                                    ? "manha-1"
                                    : "tarde-1",
                              })
                            )
                          }
                          className="hidden"
                        />

                        {turno}
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* HORÁRIO */}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horário
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {HORARIOS.filter(
                    (horario) =>
                      horario.turno ===
                      editingTurma?.turno
                  ).map(
                    (horario) => (
                      <button
                        key={
                          horario.id
                        }
                        type="button"
                        onClick={() =>
                          setEditingTurma(
                            (
                              prev
                            ) => ({
                              ...prev,
                              horario:
                                horario.id,
                            })
                          )
                        }
                        className={`p-3 border rounded-md text-sm font-medium transition-colors ${
                          editingTurma?.horario ===
                          horario.id
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {
                          horario.label
                        }
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* DIAS */}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dias da Semana
                </label>

                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(
                    (dia) => {
                      const isSelected =
                        (
                          editingTurma?.dias_semana ||
                          []
                        ).includes(
                          dia
                        );

                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() =>
                            toggleDiaSemana(
                              dia
                            )
                          }
                          className={`px-3 py-1.5 text-sm font-medium border rounded-full transition-colors ${
                            isSelected
                              ? "bg-slate-800 text-white border-slate-800"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    }
                  )}
                </div>

                {(
                  editingTurma?.dias_semana ||
                  []
                ).length === 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    Selecione ao menos um
                    dia da semana.
                  </p>
                )}
              </div>

              {/* BOTÕES */}

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                {editingTurma?.id && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteTurma(
                        editingTurma.id!
                      )
                    }
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md mr-auto"
                  >
                    Excluir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setIsTurmaModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    (
                      editingTurma?.dias_semana
                        ?.length ||
                      0
                    ) === 0 ||
                    !editingTurma?.horario
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
