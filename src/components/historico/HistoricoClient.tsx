"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Calendar,
  Filter,
  RotateCcw,
  Clock,
  User,
  Users,
  UsersRound,
  CheckCircle2,
  XCircle,
  Percent,
  Download,
  BookOpen,
  GraduationCap,
  TrendingUp,
  ChevronDown,
  School,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TIPOS
========================================================= */

type Curso = {
  id: string;
  titulo: string;
};

type Turma = {
  id: string;
  nome: string;
  curso_id: string;

  // Campos usados pelo dashboard
  horario?: string | null;
  turno?: string | null;
  vagas?: number | null;

  cursos?: {
    titulo: string;
  } | {
    titulo: string;
  }[] | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
  cpf?: string | null;
};

type Matricula = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_matricula?: string | null;

  alunos?:
    | {
        nome_completo: string;
      }[]
    | null;
};

type PresencaRegistro = {
  id: string;
  aluno_id: string;
  curso_id: string;
  turma_id: string;
  data_hora: string;
  metodo: string | null;
  operador_id: string | null;
  status: string | null;

  alunos:
    | {
        nome_completo: string;
        cpf: string | null;
      }
    | {
        nome_completo: string;
        cpf: string | null;
      }[]
    | null;

  cursos:
    | {
        titulo: string;
      }
    | {
        titulo: string;
      }[]
    | null;

  turmas:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null;

  operadores:
    | {
        nome: string;
      }
    | {
        nome: string;
      }[]
    | null;
};

type AlunoMultiplasTurmas = {
  id: string;
  nome: string;
  turmas: {
    id: string;
    nome: string;
    curso: string;
    horario: string;
  }[];
};

type ResumoTurma = {
  id: string;
  nome: string;
  curso: string;
  cursoId: string;
  horario: string;
  turno: string;
  vagas: number;
  matriculados: number;
  ocupacao: number;
  presentes: number;
  faltas: number;
  registros: number;
  frequencia: number;
};

type AtividadeRecente = {
  id: string;
  aluno: string;
  turma: string;
  curso: string;
  data: string;
  hora: string;
  status: "presente" | "falta";
};

/* =========================================================
   HELPERS
========================================================= */

function pegarRelacao<T>(
  valor: T | T[] | null | undefined
): T | null {
  if (!valor) return null;

  return Array.isArray(valor)
    ? valor[0] || null
    : valor;
}

function normalizarStatus(
  status: string | null | undefined
): "presente" | "falta" {
  const valor = String(status || "")
    .toLowerCase()
    .trim();

  if (
    valor === "falta" ||
    valor === "faltou" ||
    valor === "ausente"
  ) {
    return "falta";
  }

  return "presente";
}

function ehPresenca(
  status: string | null | undefined
) {
  return normalizarStatus(status) === "presente";
}

function ehFalta(
  status: string | null | undefined
) {
  return normalizarStatus(status) === "falta";
}

function percentual(
  valor: number,
  total: number
) {
  if (!total) return 0;

  return Math.round(
    (valor / total) * 100
  );
}

function formatarData(data: string) {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return valor.toLocaleDateString("pt-BR");
}

function formatarHora(data: string) {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return valor.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatarCPF(
  cpf: string | null
) {
  if (!cpf) return "—";

  const valor = cpf.replace(/\D/g, "");

  if (valor.length === 11) {
    return `${valor.slice(
      0,
      3
    )}.${valor.slice(3, 6)}.${valor.slice(
      6,
      9
    )}-${valor.slice(9, 11)}`;
  }

  return cpf;
}

function obterHorarioTurma(
  turma: Turma
) {
  const horario = String(
    turma.horario || ""
  ).trim();

  const turno = String(
    turma.turno || ""
  ).trim();

  if (horario) {
    return horario;
  }

  if (turno) {
    return turno;
  }

  return "Horário não cadastrado";
}

function obterTurno(
  turma: Turma
) {
  if (turma.turno?.trim()) {
    return turma.turno;
  }

  return "Turno não informado";
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function HistoricoClient({
  cursos,
  turmas,
}: {
  cursos: Curso[];
  turmas: Turma[];
}) {
  /* =======================================================
     ESTADOS DO RELATÓRIO ORIGINAL
  ======================================================= */

  const [
    presencas,
    setPresencas,
  ] = useState<PresencaRegistro[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    buscou,
    setBuscou,
  ] = useState(false);

  const [
    filtroCpf,
    setFiltroCpf,
  ] = useState("");

  const [
    filtroNome,
    setFiltroNome,
  ] = useState("");

  const [
    filtroCurso,
    setFiltroCurso,
  ] = useState("");

  const [
    filtroTurma,
    setFiltroTurma,
  ] = useState("");

  const [
    filtroStatus,
    setFiltroStatus,
  ] = useState("");

  const [
    filtroDataInicio,
    setFiltroDataInicio,
  ] = useState("");

  const [
    filtroDataFim,
    setFiltroDataFim,
  ] = useState("");

  /* =======================================================
     ESTADOS DO DASHBOARD
  ======================================================= */

  const [
    alunos,
    setAlunos,
  ] = useState<Aluno[]>([]);

  const [
    matriculas,
    setMatriculas,
  ] = useState<Matricula[]>([]);

  const [
    carregandoDashboard,
    setCarregandoDashboard,
  ] = useState(false);

  const [
    dashboardCarregado,
    setDashboardCarregado,
  ] = useState(false);

  const [
    mostrarAlunosMultiplasTurmas,
    setMostrarAlunosMultiplasTurmas,
  ] = useState(false);

  const [
    filtroHorario,
    setFiltroHorario,
  ] = useState("");

  const [
    turmaDashboardSelecionada,
    setTurmaDashboardSelecionada,
  ] = useState("");

  /* =======================================================
     TURMAS DO FILTRO
  ======================================================= */

  const turmasFiltradas = useMemo(() => {
    if (!filtroCurso) {
      return turmas;
    }

    return turmas.filter(
      (turma) =>
        turma.curso_id === filtroCurso
    );
  }, [
    turmas,
    filtroCurso,
  ]);

  /* =======================================================
     BUSCA DO DASHBOARD
  ======================================================= */

  const carregarDashboard = async () => {
    setCarregandoDashboard(true);

    try {
      const [
        alunosRes,
        matriculasRes,
      ] = await Promise.all([
        supabase
          .from("alunos")
          .select(
            "id, nome_completo, cpf"
          ),

        supabase
          .from("matriculas")
          .select(
            "id, aluno_id, curso_id, turma_id, data_matricula, alunos(nome_completo)"
          ),
      ]);

      if (alunosRes.error) {
        console.error(
          "Erro ao carregar alunos:",
          alunosRes.error
        );
      }

      if (matriculasRes.error) {
        console.error(
          "Erro ao carregar matrículas:",
          matriculasRes.error
        );
      }

      setAlunos(
        (alunosRes.data ||
          []) as Aluno[]
      );

      setMatriculas(
        (matriculasRes.data ||
          []) as Matricula[]
      );

      setDashboardCarregado(
        true
      );
    } catch (error) {
      console.error(
        "Erro ao carregar dashboard:",
        error
      );
    } finally {
      setCarregandoDashboard(
        false
      );
    }
  };

  /* =======================================================
     BUSCAR HISTÓRICO
  ======================================================= */

  const buscarHistorico = async () => {
    setIsLoading(true);
    setBuscou(true);

    try {
      let query = supabase
        .from("presencas")
        .select(
          "id, aluno_id, curso_id, turma_id, data_hora, metodo, operador_id, status, alunos(nome_completo, cpf), cursos(titulo), turmas(nome), operadores(nome)"
        )
        .order("data_hora", {
          ascending: false,
        })
        .limit(5000);

      if (filtroCurso) {
        query = query.eq(
          "curso_id",
          filtroCurso
        );
      }

      if (filtroTurma) {
        query = query.eq(
          "turma_id",
          filtroTurma
        );
      }

      if (filtroDataInicio) {
        query = query.gte(
          "data_hora",
          `${filtroDataInicio}T00:00:00`
        );
      }

      if (filtroDataFim) {
        query = query.lte(
          "data_hora",
          `${filtroDataFim}T23:59:59.999`
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          "Erro ao buscar histórico:",
          error
        );

        alert(
          "Erro ao buscar histórico: " +
            error.message
        );

        setPresencas([]);
        return;
      }

      let resultados =
        (data ||
          []) as unknown as PresencaRegistro[];

      /* FILTRO POR NOME */

      if (filtroNome.trim()) {
        const termo =
          filtroNome
            .trim()
            .toLowerCase();

        resultados =
          resultados.filter(
            (registro) =>
              pegarRelacao(
                registro.alunos
              )
                ?.nome_completo?.toLowerCase()
                .includes(termo)
          );
      }

      /* FILTRO POR CPF */

      if (filtroCpf.trim()) {
        const cpfLimpo =
          filtroCpf.replace(
            /\D/g,
            ""
          );

        resultados =
          resultados.filter(
            (registro) =>
              (
                pegarRelacao(
                  registro.alunos
                )?.cpf || ""
              )
                .replace(
                  /\D/g,
                  ""
                )
                .includes(cpfLimpo)
          );
      }

      /* FILTRO POR STATUS */

      if (filtroStatus) {
        resultados =
          resultados.filter(
            (registro) =>
              normalizarStatus(
                registro.status
              ) ===
              filtroStatus
          );
      }

      setPresencas(
        resultados
      );

      /*
       * Carrega os dados do dashboard
       * também quando o usuário pesquisa.
       */
      if (!dashboardCarregado) {
        await carregarDashboard();
      }
    } catch (error: any) {
      console.error(
        "Erro inesperado:",
        error
      );

      alert(
        "Erro inesperado: " +
          (error?.message ||
            "Erro desconhecido.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =======================================================
     LIMPAR FILTROS
  ======================================================= */

  const limparFiltros = () => {
    setFiltroCpf("");
    setFiltroNome("");
    setFiltroCurso("");
    setFiltroTurma("");
    setFiltroStatus("");
    setFiltroDataInicio("");
    setFiltroDataFim("");

    setPresencas([]);
    setBuscou(false);
  };

  /* =======================================================
     INDICADORES DO RELATÓRIO
  ======================================================= */

  const presentes = useMemo(
    () =>
      presencas.filter(
        (p) =>
          ehPresenca(p.status)
      ).length,
    [presencas]
  );

  const faltas = useMemo(
    () =>
      presencas.filter(
        (p) =>
          ehFalta(p.status)
      ).length,
    [presencas]
  );

  const percentualPresenca =
    useMemo(() => {
      return percentual(
        presentes,
        presencas.length
      );
    }, [
      presentes,
      presencas.length,
    ]);

  const alunosUnicos =
    useMemo(() => {
      return new Set(
        presencas.map(
          (p) => p.aluno_id
        )
      ).size;
    }, [presencas]);

  /* =======================================================
     ALUNOS EM MAIS DE UMA TURMA
  ======================================================= */

  const alunosMultiplasTurmas =
    useMemo<
      AlunoMultiplasTurmas[]
    >(() => {
      const resultado: AlunoMultiplasTurmas[] =
        [];

      alunos.forEach(
        (aluno) => {
          const matriculasAluno =
            matriculas.filter(
              (matricula) =>
                matricula.aluno_id ===
                aluno.id
            );

          const turmaIds =
            Array.from(
              new Set(
                matriculasAluno.map(
                  (matricula) =>
                    matricula.turma_id
                )
              )
            );

          if (
            turmaIds.length <= 1
          ) {
            return;
          }

          const turmasAluno =
            turmaIds
              .map(
                (turmaId) => {
                  const turma =
                    turmas.find(
                      (item) =>
                        item.id ===
                        turmaId
                    );

                  if (!turma) {
                    return null;
                  }

                  const curso =
                    cursos.find(
                      (item) =>
                        item.id ===
                        turma.curso_id
                    );

                  return {
                    id: turma.id,
                    nome: turma.nome,
                    curso:
                      curso?.titulo ||
                      pegarRelacao(
                        turma.cursos
                      )?.titulo ||
                      "Curso não informado",
                    horario:
                      obterHorarioTurma(
                        turma
                      ),
                  };
                }
              )
              .filter(
                (
                  item
                ): item is {
                  id: string;
                  nome: string;
                  curso: string;
                  horario: string;
                } =>
                  item !== null
              );

          if (
            turmasAluno.length >
            1
          ) {
            resultado.push({
              id: aluno.id,
              nome:
                aluno.nome_completo,
              turmas:
                turmasAluno,
            });
          }
        }
      );

      return resultado.sort(
        (a, b) =>
          a.nome.localeCompare(
            b.nome,
            "pt-BR"
          )
      );
    }, [
      alunos,
      matriculas,
      turmas,
      cursos,
    ]);

  /* =======================================================
     MATRÍCULAS POR TURMA
  ======================================================= */

  const matriculadosPorTurma =
    useMemo(() => {
      const mapa: Record<
        string,
        number
      > = {};

      matriculas.forEach(
        (matricula) => {
          mapa[
            matricula.turma_id
          ] =
            (mapa[
              matricula.turma_id
            ] || 0) + 1;
        }
      );

      return mapa;
    }, [matriculas]);

  /* =======================================================
     FREQUÊNCIA POR TURMA
  ======================================================= */

  const frequenciaPorTurma =
    useMemo(() => {
      const mapa: Record<
        string,
        {
          presentes: number;
          faltas: number;
        }
      > = {};

      presencas.forEach(
        (registro) => {
          if (
            !mapa[
              registro.turma_id
            ]
          ) {
            mapa[
              registro.turma_id
            ] = {
              presentes: 0,
              faltas: 0,
            };
          }

          if (
            ehPresenca(
              registro.status
            )
          ) {
            mapa[
              registro.turma_id
            ].presentes++;
          } else {
            mapa[
              registro.turma_id
            ].faltas++;
          }
        }
      );

      return mapa;
    }, [presencas]);

  /* =======================================================
     RESUMO COMPLETO DAS TURMAS
  ======================================================= */

  const resumoTurmas =
    useMemo<ResumoTurma[]>(
      () => {
        return turmas
          .map((turma) => {
            const curso =
              cursos.find(
                (c) =>
                  c.id ===
                  turma.curso_id
              );

            const matriculados =
              matriculadosPorTurma[
                turma.id
              ] || 0;

            const limite =
              Number(
                turma.vagas || 0
              );

            const frequencia =
              frequenciaPorTurma[
                turma.id
              ] || {
                presentes: 0,
                faltas: 0,
              };

            const registros =
              frequencia.presentes +
              frequencia.faltas;

            const ocupacao =
              limite > 0
                ? percentual(
                    matriculados,
                    limite
                  )
                : 0;

            return {
              id: turma.id,
              nome: turma.nome,
              curso:
                curso?.titulo ||
                pegarRelacao(
                  turma.cursos
                )?.titulo ||
                "Curso não informado",
              cursoId:
                turma.curso_id,
              horario:
                obterHorarioTurma(
                  turma
                ),
              turno:
                obterTurno(
                  turma
                ),
              vagas: limite,
              matriculados,
              ocupacao,
              presentes:
                frequencia.presentes,
              faltas:
                frequencia.faltas,
              registros,
              frequencia:
                percentual(
                  frequencia.presentes,
                  registros
                ),
            };
          })
          .filter((turma) => {
            const busca =
              `${turma.nome} ${turma.curso} ${turma.horario} ${turma.turno}`
                .toLowerCase();

            if (
              filtroHorario &&
              turma.horario !==
                filtroHorario
            ) {
              return false;
            }

            if (
              turmaDashboardSelecionada &&
              turma.id !==
                turmaDashboardSelecionada
            ) {
              return false;
            }

            return (
              !filtroNome ||
              busca.includes(
                filtroNome.toLowerCase()
              )
            );
          });
      },
      [
        turmas,
        cursos,
        matriculadosPorTurma,
        frequenciaPorTurma,
        filtroHorario,
        filtroNome,
        turmaDashboardSelecionada,
      ]
    );

  /* =======================================================
     ALUNOS POR CURSO
  ======================================================= */

  const alunosPorCurso =
    useMemo(() => {
      return cursos
        .map((curso) => {
          const quantidade =
            matriculas.filter(
              (matricula) =>
                matricula.curso_id ===
                curso.id
            ).length;

          return {
            id: curso.id,
            nome: curso.titulo,
            quantidade,
          };
        })
        .filter(
          (curso) =>
            curso.quantidade > 0
        )
        .sort(
          (a, b) =>
            b.quantidade -
            a.quantidade
        );
    }, [
      cursos,
      matriculas,
    ]);

  /* =======================================================
     FREQUÊNCIA POR CURSO
  ======================================================= */

  const frequenciaPorCurso =
    useMemo(() => {
      return cursos
        .map((curso) => {
          const registros =
            presencas.filter(
              (registro) =>
                registro.curso_id ===
                curso.id
            );

          const presentesCurso =
            registros.filter(
              (registro) =>
                ehPresenca(
                  registro.status
                )
            ).length;

          const faltasCurso =
            registros.filter(
              (registro) =>
                ehFalta(
                  registro.status
                )
            ).length;

          return {
            id: curso.id,
            nome: curso.titulo,
            presentes:
              presentesCurso,
            faltas:
              faltasCurso,
            total: registros.length,
            frequencia:
              percentual(
                presentesCurso,
                registros.length
              ),
          };
        })
        .filter(
          (curso) =>
            curso.total > 0
        )
        .sort(
          (a, b) =>
            b.frequencia -
            a.frequencia
        );
    }, [
      cursos,
      presencas,
    ]);

  /* =======================================================
     RANKING DE TURMAS
  ======================================================= */

  const rankingTurmas =
    useMemo(() => {
      return [...resumoTurmas]
        .filter(
          (turma) =>
            turma.registros > 0
        )
        .sort(
          (a, b) =>
            b.frequencia -
            a.frequencia
        )
        .slice(0, 5);
    }, [resumoTurmas]);

  /* =======================================================
     TURMAS LOTADAS
  ======================================================= */

  const turmasLotadas =
    useMemo(() => {
      return resumoTurmas.filter(
        (turma) =>
          turma.vagas > 0 &&
          turma.matriculados >=
            turma.vagas
      );
    }, [resumoTurmas]);

  /* =======================================================
     TURMAS SEM VAGA INFORMADA
  ======================================================= */

  const turmasSemVaga =
    useMemo(() => {
      return resumoTurmas.filter(
        (turma) =>
          turma.vagas <= 0
      );
    }, [resumoTurmas]);

  /* =======================================================
     HORÁRIOS
  ======================================================= */

  const horarios =
    useMemo(() => {
      return Array.from(
        new Set(
          turmas
            .map((turma) =>
              obterHorarioTurma(
                turma
              )
            )
            .filter(
              (horario) =>
                horario !==
                "Horário não cadastrado"
            )
        )
      ).sort();
    }, [turmas]);

  /* =======================================================
     ATIVIDADES RECENTES
  ======================================================= */

  const atividadesRecentes =
    useMemo<AtividadeRecente[]>(
      () => {
        return [...presencas]
          .sort(
            (a, b) =>
              new Date(
                b.data_hora
              ).getTime() -
              new Date(
                a.data_hora
              ).getTime()
          )
          .slice(0, 10)
          .map((registro) => {
            const aluno =
              pegarRelacao(
                registro.alunos
              );

            const curso =
              pegarRelacao(
                registro.cursos
              );

            const turma =
              pegarRelacao(
                registro.turmas
              );

            return {
              id: registro.id,
              aluno:
                aluno?.nome_completo ||
                "Aluno não identificado",
              turma:
                turma?.nome ||
                "Turma não identificada",
              curso:
                curso?.titulo ||
                "Curso não identificado",
              data:
                formatarData(
                  registro.data_hora
                ),
              hora:
                formatarHora(
                  registro.data_hora
                ),
              status:
                normalizarStatus(
                  registro.status
                ),
            };
          });
      },
      [presencas]
    );

  /* =======================================================
     EXPORTAR CSV
  ======================================================= */

  const exportarCSV = () => {
    if (!presencas.length) {
      alert(
        "Não há registros para exportar."
      );
      return;
    }

    const cabecalho = [
      "Participante",
      "CPF",
      "Curso",
      "Turma",
      "Data",
      "Horário",
      "Status",
      "Operador",
      "Método",
    ];

    const linhas =
      presencas.map(
        (registro) => {
          const aluno =
            pegarRelacao(
              registro.alunos
            );

          const curso =
            pegarRelacao(
              registro.cursos
            );

          const turma =
            pegarRelacao(
              registro.turmas
            );

          const operador =
            pegarRelacao(
              registro.operadores
            );

          return [
            aluno?.nome_completo ||
              "",
            formatarCPF(
              aluno?.cpf || null
            ),
            curso?.titulo || "",
            turma?.nome || "",
            formatarData(
              registro.data_hora
            ),
            formatarHora(
              registro.data_hora
            ),
            ehFalta(
              registro.status
            )
              ? "Falta"
              : "Presença",
            operador?.nome || "",
            registro.metodo || "",
          ];
        }
      );

    const csv = [
      cabecalho,
      ...linhas,
    ]
      .map((linha) =>
        linha
          .map(
            (valor) =>
              `"${String(
                valor
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `relatorio-frequencia-${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  };

  /* =======================================================
     STATUS
  ======================================================= */

  const getStatus = (
    registro: PresencaRegistro
  ) => {
    if (
      ehFalta(
        registro.status
      )
    ) {
      return {
        label: "Falta",
        className:
          "bg-red-50 text-red-700 border-red-200",
        icon: (
          <XCircle className="w-3.5 h-3.5" />
        ),
      };
    }

    return {
      label: "Presença",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ),
    };
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <BarChart3 className="h-4 w-4" />
              Gestão e acompanhamento
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Acompanhe alunos, matrículas,
              cursos, turmas e frequência
              em um único painel.
            </p>
          </div>

          <button
            type="button"
            onClick={carregarDashboard}
            disabled={carregandoDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                carregandoDashboard
                  ? "animate-spin"
                  : ""
              }`}
            />

            Atualizar dashboard
          </button>
        </div>

        {/* =================================================
            CARDS PRINCIPAIS
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            icon={Users}
            title="Alunos"
            value={
              dashboardCarregado
                ? alunos.length
                : "—"
            }
            description="Alunos cadastrados"
          />

          <DashboardCard
            icon={ClipboardList}
            title="Matrículas"
            value={
              dashboardCarregado
                ? matriculas.length
                : "—"
            }
            description="Vínculos com turmas"
          />

          <DashboardCard
            icon={BookOpen}
            title="Turmas"
            value={turmas.length}
            description={`${cursos.length} cursos cadastrados`}
          />

          <DashboardCard
            icon={Percent}
            title="Frequência"
            value={`${percentual(
              presentes,
              presencas.length
            )}%`}
            description={`${presentes} presenças • ${faltas} faltas`}
            destaque
          />
        </div>

        {/* =================================================
            CARDS SECUNDÁRIOS
        ================================================= */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MiniMetric
            icon={CheckCircle2}
            title="Presenças"
            value={presentes}
            tipo="verde"
          />

          <MiniMetric
            icon={XCircle}
            title="Faltas"
            value={faltas}
            tipo="vermelho"
          />

          <MiniMetric
            icon={UsersRound}
            title="Alunos em múltiplas turmas"
            value={
              alunosMultiplasTurmas.length
            }
            tipo="amarelo"
          />

          <MiniMetric
            icon={GraduationCap}
            title="Cursos ativos"
            value={
              alunosPorCurso.length
            }
            tipo="azul"
          />
        </div>

        {/* =================================================
            ALUNOS EM MAIS DE UMA TURMA
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() =>
              setMostrarAlunosMultiplasTurmas(
                (valor) => !valor
              )
            }
            className="w-full p-5 text-left transition hover:bg-amber-50/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <UsersRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Alunos em mais de uma turma
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Clique para ver todas as
                    turmas de cada aluno.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700">
                  {alunosMultiplasTurmas.length}
                </span>

                <ChevronDown
                  className={`h-5 w-5 text-slate-400 transition-transform ${
                    mostrarAlunosMultiplasTurmas
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </div>
            </div>
          </button>

          {mostrarAlunosMultiplasTurmas && (
            <div className="border-t border-amber-100 bg-amber-50/30 p-4 sm:p-5">
              {alunosMultiplasTurmas.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <UsersRound className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-2 font-semibold text-slate-600">
                    Nenhum aluno está
                    matriculado em mais
                    de uma turma.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {alunosMultiplasTurmas.map(
                    (aluno) => (
                      <div
                        key={aluno.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                              {aluno.nome
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-bold text-slate-900">
                                {aluno.nome}
                              </div>

                              <div className="mt-0.5 text-xs text-slate-500">
                                {aluno.turmas.length}{" "}
                                turmas
                              </div>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Múltiplas
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {aluno.turmas.map(
                            (turma) => (
                              <div
                                key={turma.id}
                                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <School className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-800">
                                      {turma.nome}
                                    </div>

                                    <div className="mt-1 text-xs text-slate-500">
                                      {turma.curso}
                                    </div>

                                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                                      {turma.horario}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* =================================================
            GRÁFICOS / RESUMOS
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ALUNOS POR CURSO */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Alunos por curso
                  </h2>

                  <p className="text-xs text-slate-500">
                    Distribuição das matrículas.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {alunosPorCurso.length ===
              0 ? (
                <EmptyState text="Nenhuma matrícula encontrada." />
              ) : (
                alunosPorCurso
                  .slice(0, 8)
                  .map((curso) => {
                    const max =
                      alunosPorCurso[0]
                        ?.quantidade ||
                      1;

                    const largura =
                      percentual(
                        curso.quantidade,
                        max
                      );

                    return (
                      <div key={curso.id}>
                        <div className="mb-1.5 flex justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-slate-700">
                            {curso.nome}
                          </span>

                          <span className="font-bold text-slate-900">
                            {curso.quantidade}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${largura}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </section>

          {/* FREQUÊNCIA POR CURSO */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="
