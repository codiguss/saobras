"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  Save,
  UserCheck,
  UserX,
  Users,
  XCircle,
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
  turno: string | null;
  horario: string | null;
  dias_semana: string[] | null;
};

type Aluno = {
  id: string;
  nome_completo: string;
};

type RegistroFrequencia = {
  alunoId: string;
  presente: boolean;
  registroId: string | null;
};

function getDataHoje() {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function criarInicioDoDia(data: string) {
  return new Date(`${data}T00:00:00`);
}

function criarFimDoDia(data: string) {
  return new Date(`${data}T23:59:59.999`);
}

function criarDataRegistro(data: string) {
  /*
   * Meio-dia evita problemas de mudança de fuso horário.
   * A data escolhida continua sendo a data da chamada.
   */
  return new Date(`${data}T12:00:00`).toISOString();
}

function formatarData(data: string) {
  if (!data) return "";

  const partes = data.split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function FormCheckin() {
  // ==========================================================
  // DADOS
  // ==========================================================

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  const [dataSelecionada, setDataSelecionada] =
    useState(getDataHoje());

  const [turmaSelecionadaId, setTurmaSelecionadaId] =
    useState("");

  // ==========================================================
  // FILTROS
  // ==========================================================

  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [buscaTurma, setBuscaTurma] = useState("");
  const [buscaAluno, setBuscaAluno] = useState("");

  // ==========================================================
  // FREQUÊNCIA
  // ==========================================================

  const [frequencia, setFrequencia] = useState<
    Record<string, RegistroFrequencia>
  >({});

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [carregandoBase, setCarregandoBase] =
    useState(true);

  const [carregandoAlunos, setCarregandoAlunos] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // ==========================================================
  // TURMA SELECIONADA
  // ==========================================================

  const turmaSelecionada = useMemo(() => {
    return turmas.find(
      (turma) => turma.id === turmaSelecionadaId
    );
  }, [turmas, turmaSelecionadaId]);

  const cursoSelecionado = useMemo(() => {
    if (!turmaSelecionada) {
      return undefined;
    }

    return cursos.find(
      (curso) =>
        curso.id === turmaSelecionada.curso_id
    );
  }, [cursos, turmaSelecionada]);

  // ==========================================================
  // CARREGAR CURSOS E TURMAS
  // ==========================================================

  useEffect(() => {
    async function carregarBase() {
      setCarregandoBase(true);
      setErro("");

      try {
        const [cursosResponse, turmasResponse] =
          await Promise.all([
            supabase
              .from("cursos")
              .select("id, titulo")
              .order("titulo"),

            supabase
              .from("turmas")
              .select(
                "id, nome, curso_id, turno, horario, dias_semana"
              )
              .order("nome"),
          ]);

        if (cursosResponse.error) {
          throw new Error(
            `Erro ao carregar cursos: ${cursosResponse.error.message}`
          );
        }

        if (turmasResponse.error) {
          throw new Error(
            `Erro ao carregar turmas: ${turmasResponse.error.message}`
          );
        }

        setCursos(
          (cursosResponse.data || []) as Curso[]
        );

        setTurmas(
          (turmasResponse.data || []) as Turma[]
        );
      } catch (error: any) {
        console.error(error);

        setErro(
          error?.message ||
            "Não foi possível carregar os dados."
        );
      } finally {
        setCarregandoBase(false);
      }
    }

    carregarBase();
  }, []);

  // ==========================================================
  // CARREGAR ALUNOS DA TURMA
  // ==========================================================

  useEffect(() => {
    if (
      !turmaSelecionadaId ||
      !dataSelecionada
    ) {
      setAlunos([]);
      setFrequencia({});
      return;
    }

    async function carregarChamada() {
      setCarregandoAlunos(true);
      setErro("");
      setSucesso("");

      try {
        // ------------------------------------------------------
        // 1. MATRÍCULAS
        // ------------------------------------------------------

        const {
          data: matriculas,
          error: erroMatriculas,
        } = await supabase
          .from("matriculas")
          .select("aluno_id")
          .eq(
            "turma_id",
            turmaSelecionadaId
          );

        if (erroMatriculas) {
          throw erroMatriculas;
        }

        const alunoIds = Array.from(
          new Set(
            (matriculas || [])
              .map((item) => item.aluno_id)
              .filter(Boolean)
          )
        );

        // ------------------------------------------------------
        // SEM ALUNOS
        // ------------------------------------------------------

        if (alunoIds.length === 0) {
          setAlunos([]);
          setFrequencia({});
          return;
        }

        // ------------------------------------------------------
        // 2. ALUNOS
        // ------------------------------------------------------

        const {
          data: alunosData,
          error: erroAlunos,
        } = await supabase
          .from("alunos")
          .select(
            "id, nome_completo"
          )
          .in("id", alunoIds)
          .order("nome_completo");

        if (erroAlunos) {
          throw erroAlunos;
        }

        const alunosCarregados =
          (alunosData || []) as Aluno[];

        setAlunos(alunosCarregados);

        // ------------------------------------------------------
        // 3. BUSCAR A CHAMADA DA DATA
        // ------------------------------------------------------

        const inicio =
          criarInicioDoDia(dataSelecionada).toISOString();

        const fim =
          criarFimDoDia(dataSelecionada).toISOString();

        const {
          data: registros,
          error: erroRegistros,
        } = await supabase
          .from("presencas")
          .select(
            "id, aluno_id, status, data_hora"
          )
          .eq(
            "turma_id",
            turmaSelecionadaId
          )
          .gte("data_hora", inicio)
          .lte("data_hora", fim)
          .order("data_hora", {
            ascending: false,
          });

        if (erroRegistros) {
          throw erroRegistros;
        }

        // ------------------------------------------------------
        // 4. MONTAR ESTADO DA CHAMADA
        // ------------------------------------------------------

        const novaFrequencia: Record<
          string,
          RegistroFrequencia
        > = {};

        for (const aluno of alunosCarregados) {
          novaFrequencia[aluno.id] = {
            alunoId: aluno.id,
            presente: false,
            registroId: null,
          };
        }

        /*
         * Caso existam registros duplicados antigos,
         * usamos o registro mais recente.
         */

        for (const registro of registros || []) {
          if (!novaFrequencia[registro.aluno_id]) {
            continue;
          }

          if (
            novaFrequencia[registro.aluno_id]
              .registroId !== null
          ) {
            continue;
          }

          novaFrequencia[
            registro.aluno_id
          ] = {
            alunoId: registro.aluno_id,
            presente:
              registro.status !== "falta",
            registroId: registro.id,
          };
        }

        setFrequencia(novaFrequencia);
      } catch (error: any) {
        console.error(
          "Erro ao carregar chamada:",
          error
        );

        setErro(
          error?.message ||
            "Não foi possível carregar a chamada."
        );

        setAlunos([]);
        setFrequencia({});
      } finally {
        setCarregandoAlunos(false);
      }
    }

    carregarChamada();
  }, [
    turmaSelecionadaId,
    dataSelecionada,
  ]);

  // ==========================================================
  // TURMAS FILTRADAS
  // ==========================================================

  const turnosDisponiveis = useMemo(() => {
    return Array.from(
      new Set(
        turmas
          .map((turma) => turma.turno)
          .filter(Boolean)
      )
    ).sort();
  }, [turmas]);

  const turmasFiltradas = useMemo(() => {
    const termo =
      buscaTurma
        .trim()
        .toLowerCase();

    return turmas.filter((turma) => {
      if (
        filtroCurso &&
        turma.curso_id !== filtroCurso
      ) {
        return false;
      }

      if (
        filtroTurno &&
        turma.turno !== filtroTurno
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const curso =
        cursos.find(
          (item) =>
            item.id === turma.curso_id
        );

      const texto = [
        turma.nome,
        curso?.titulo || "",
        turma.turno || "",
        turma.horario || "",
        ...(turma.dias_semana || []),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [
    turmas,
    cursos,
    filtroCurso,
    filtroTurno,
    buscaTurma,
  ]);

  // ==========================================================
  // ALUNOS FILTRADOS
  // ==========================================================

  const alunosFiltrados = useMemo(() => {
    const termo =
      buscaAluno
        .trim()
        .toLowerCase();

    if (!termo) {
      return alunos;
    }

    return alunos.filter((aluno) =>
      aluno.nome_completo
        .toLowerCase()
        .includes(termo)
    );
  }, [alunos, buscaAluno]);

  // ==========================================================
  // CONTADORES
  // ==========================================================

  const totalAlunos = alunos.length;

  const totalPresentes = alunos.filter(
    (aluno) =>
      frequencia[aluno.id]?.presente === true
  ).length;

  const totalFaltas =
    totalAlunos - totalPresentes;

  // ==========================================================
  // MARCAR ALUNO
  // ==========================================================

  const marcarAluno = (
    alunoId: string,
    presente: boolean
  ) => {
    setFrequencia((atual) => ({
      ...atual,
      [alunoId]: {
        alunoId,
        presente,
        registroId:
          atual[alunoId]?.registroId || null,
      },
    }));

    setSucesso("");
  };

  // ==========================================================
  // MARCAR TODOS
  // ==========================================================

  const marcarTodos = (
    presente: boolean
  ) => {
    setFrequencia((atual) => {
      const nova = {
        ...atual,
      };

      for (const aluno of alunos) {
        nova[aluno.id] = {
          alunoId: aluno.id,
          presente,
          registroId:
            atual[aluno.id]?.registroId ||
            null,
        };
      }

      return nova;
    });

    setSucesso("");
  };

  // ==========================================================
  // OPERADOR
  // ==========================================================

  async function buscarOperadorId() {
    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError) {
      throw sessionError;
    }

    const usuario =
      sessionData.user;

    if (!usuario?.email) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const {
      data: operador,
      error: operadorError,
    } = await supabase
      .from("operadores")
      .select("id")
      .eq("email", usuario.email)
      .maybeSingle();

    if (operadorError) {
      throw operadorError;
    }

    if (!operador) {
      throw new Error(
        `O usuário ${usuario.email} não está cadastrado como operador.`
      );
    }

    return operador.id;
  }

  // ==========================================================
  // SALVAR CHAMADA
  // ==========================================================

  async function salvarChamada() {
    if (!turmaSelecionadaId) {
      setErro(
        "Selecione uma turma."
      );
      return;
    }

    if (!dataSelecionada) {
      setErro(
        "Selecione a data da chamada."
      );
      return;
    }

    if (alunos.length === 0) {
      setErro(
        "Essa turma não possui alunos matriculados."
      );
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const operadorId =
        await buscarOperadorId();

      const dataRegistro =
        criarDataRegistro(
          dataSelecionada
        );

      /*
       * Busca novamente os registros daquele dia.
       * Isso evita criar duplicados.
       */

      const inicio =
        criarInicioDoDia(
          dataSelecionada
        ).toISOString();

      const fim =
        criarFimDoDia(
          dataSelecionada
        ).toISOString();

      const {
        data: registrosExistentes,
        error: erroExistentes,
      } = await supabase
        .from("presencas")
        .select(
          "id, aluno_id, status"
        )
        .eq(
          "turma_id",
          turmaSelecionadaId
        )
        .gte("data_hora", inicio)
        .lte("data_hora", fim);

      if (erroExistentes) {
        throw erroExistentes;
      }

      /*
       * Mapa dos registros existentes.
       */

      const mapaExistentes =
        new Map<
          string,
          {
            id: string;
            aluno_id: string;
          }
        >();

      for (
        const registro of
          registrosExistentes || []
      ) {
        if (
          !mapaExistentes.has(
            registro.aluno_id
          )
        ) {
          mapaExistentes.set(
            registro.aluno_id,
            {
              id: registro.id,
              aluno_id:
                registro.aluno_id,
            }
          );
        }
      }

      // ------------------------------------------------------
      // ATUALIZAR / INSERIR
      // ------------------------------------------------------

      const insercoes: any[] = [];
      const atualizacoes: Promise<any>[] = [];

      for (const aluno of alunos) {
        const estado =
          frequencia[aluno.id];

        /*
         * Se estiver marcado como presente:
         * status = presente
         *
         * Se estiver marcado como falta:
         * status = falta
         */

        const status =
          estado?.presente
            ? "presente"
            : "falta";

        const existente =
          mapaExistentes.get(
            aluno.id
          );

        if (existente) {
          atualizacoes.push(
            supabase
              .from("presencas")
              .update({
                status,
                curso_id:
                  turmaSelecionada?.curso_id,
                operador_id:
                  operadorId,
                metodo: "manual",
              })
              .eq(
                "id",
                existente.id
              )
          );
        } else {
          insercoes.push({
            aluno_id: aluno.id,

            curso_id:
              turmaSelecionada?.curso_id,

            turma_id:
              turmaSelecionadaId,

            operador_id:
              operadorId,

            metodo: "manual",

            /*
             * AQUI fica a data escolhida
             * na chamada.
             */

            data_hora:
              dataRegistro,

            status,
          });
        }
      }

      // ------------------------------------------------------
      // EXECUTAR ATUALIZAÇÕES
      // ------------------------------------------------------

      if (
        atualizacoes.length > 0
      ) {
        const resultados =
          await Promise.all(
            atualizacoes
          );

        const erro =
          resultados.find(
            (resultado) =>
              resultado.error
          )?.error;

        if (erro) {
          throw erro;
        }
      }

      // ------------------------------------------------------
      // INSERIR NOVOS
      // ------------------------------------------------------

      if (insercoes.length > 0) {
        const {
          error: erroInsert,
        } = await supabase
          .from("presencas")
          .insert(
            insercoes
          );

        if (erroInsert) {
          throw erroInsert;
        }
      }

      // ------------------------------------------------------
      // RECARREGAR CHAMADA
      // ------------------------------------------------------

      const {
        data: registrosSalvos,
        error: erroRecarregar,
      } = await supabase
        .from("presencas")
        .select(
          "id, aluno_id, status"
        )
        .eq(
          "turma_id",
          turmaSelecionadaId
        )
        .gte("data_hora", inicio)
        .lte("data_hora", fim);

      if (erroRecarregar) {
        throw erroRecarregar;
      }

      const novaFrequencia: Record<
        string,
        RegistroFrequencia
      > = {};

      for (const aluno of alunos) {
        const registro =
          (registrosSalvos || []).find(
            (item) =>
              item.aluno_id ===
              aluno.id
          );

        novaFrequencia[aluno.id] = {
          alunoId: aluno.id,

          presente:
            registro
              ? registro.status !==
                "falta"
              : false,

          registroId:
            registro?.id || null,
        };
      }

      /*
       * IMPORTANTE:
       *
       * NÃO limpamos a turma.
       * NÃO limpamos a data.
       *
       * A chamada continua na tela.
       */

      setFrequencia(
        novaFrequencia
      );

      setSucesso(
        `Chamada de ${formatarData(
          dataSelecionada
        )} salva com sucesso! ${totalPresentes} presença(s) e ${totalFaltas} falta(s).`
      );
    } catch (error: any) {
      console.error(
        "Erro ao salvar chamada:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível salvar a chamada."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================================
  // LIMPAR FILTROS
  // ==========================================================

  function limparFiltros() {
    setFiltroCurso("");
    setFiltroTurno("");
    setBuscaTurma("");
  }

  // ==========================================================
  // LIMPAR TURMA
  // ==========================================================

  function limparTurma() {
    setTurmaSelecionadaId("");
    setAlunos([]);
    setFrequencia({});
    setBuscaAluno("");
    setErro("");
    setSucesso("");
  }

  // ==========================================================
  // LOADING INICIAL
  // ==========================================================

  if (carregandoBase) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando cursos e turmas...
        </div>
      </div>
    );
  }

  // ==========================================================
  // TELA
  // ==========================================================

  return (
    <div className="flex flex-col gap-6">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          Chamada / Check-in
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Registre presença e falta dos alunos por curso,
          turma e data.
        </p>
      </div>

      {/* =====================================================
          ERRO
      ====================================================== */}

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

          <div className="flex-1">
            <p className="font-semibold text-sm">
              Atenção
            </p>

            <p className="text-sm mt-1">
              {erro}
            </p>
          </div>

          <button
            onClick={() => setErro("")}
            className="text-red-400 hover:text-red-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* =====================================================
          SUCESSO
      ====================================================== */}

      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />

          <div className="flex-1">
            <p className="font-semibold text-sm">
              Chamada salva
            </p>

            <p className="text-sm mt-1">
              {sucesso}
            </p>
          </div>

          <button
            onClick={() => setSucesso("")}
            className="text-emerald-400 hover:text-emerald-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* =====================================================
          DATA
      ====================================================== */}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">

        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-blue-600" />

          <h2 className="font-semibold text-slate-900">
            Data da chamada
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">

          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Data
            </label>

            <input
              type="date"
              value={dataSelecionada}
              onChange={(event) => {
                setDataSelecionada(
                  event.target.value
                );
                setErro("");
                setSucesso("");
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
            <p className="text-xs text-blue-600 font-medium">
              Data selecionada
            </p>

            <p className="text-lg font-bold text-blue-900 mt-1">
              {formatarData(
                dataSelecionada
              )}
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          FILTROS DE TURMA
      ====================================================== */}

      {!turmaSelecionadaId && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">

          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <Filter className="w-4 h-4" />
            Escolha a turma
          </div>

          {/* Filtros */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Curso
              </label>

              <select
                value={filtroCurso}
                onChange={(event) =>
                  setFiltroCurso(
                    event.target.value
                  )
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50"
              >
                <option value="">
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
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Turno
              </label>

              <select
                value={filtroTurno}
                onChange={(event) =>
                  setFiltroTurno(
                    event.target.value
                  )
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50"
              >
                <option value="">
                  Todos os turnos
                </option>

                {turnosDisponiveis.map(
                  (turno) => (
                    <option
                      key={turno}
                      value={turno}
                    >
                      {turno}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Pesquisar turma
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={buscaTurma}
                  onChange={(event) =>
                    setBuscaTurma(
                      event.target.value
                    )
                  }
                  placeholder="Nome da turma..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50"
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={limparFiltros}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          </div>

          {/* Lista de turmas */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {turmasFiltradas.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-500 text-sm">
                Nenhuma turma encontrada.
              </div>
            )}

            {turmasFiltradas.map(
              (turma) => {
                const curso =
                  cursos.find(
                    (item) =>
                      item.id ===
                      turma.curso_id
                  );

                return (
                  <button
                    key={turma.id}
                    onClick={() => {
                      setTurmaSelecionadaId(
                        turma.id
                      );
                      setErro("");
                      setSucesso("");
                    }}
                    className="text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg p-4 transition-all group"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <p className="font-semibold text-slate-900 truncate">
                          {turma.nome}
                        </p>

                        <p className="text-xs text-blue-600 mt-1">
                          {curso?.titulo ||
                            "Curso não informado"}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">

                          {turma.turno && (
                            <span className="text-[11px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-600">
                              {turma.turno}
                            </span>
                          )}

                          {turma.horario && (
                            <span className="text-[11px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {turma.horario}
                            </span>
                          )}

                        </div>

                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 shrink-0" />

                    </div>

                  </button>
                );
              }
            )}

          </div>
        </div>
      )}

      {/* =====================================================
          CHAMADA
      ====================================================== */}

      {turmaSelecionadaId && (
        <div className="flex flex-col gap-5">

          {/* Cabeçalho da turma */}

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={limparTurma}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    ← Trocar turma
                  </button>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  {turmaSelecionada?.nome}
                </h2>

                <p className="text-sm text-blue-600 mt-1">
                  {cursoSelecionado?.titulo}
                </p>

                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Chamada do dia{" "}
                  <strong>
                    {formatarData(
                      dataSelecionada
                    )}
                  </strong>
                </p>

              </div>

              <div className="grid grid-cols-3 gap-2">

                <div className="bg-slate-50 rounded-md px-4 py-3 text-center">
                  <p className="text-[11px] text-slate-500">
                    Alunos
                  </p>

                  <p className="text-xl font-bold text-slate-900">
                    {totalAlunos}
                  </p>
                </div>

                <div className="bg-emerald-50 rounded-md px-4 py-3 text-center">
                  <p className="text-[11px] text-emerald-600">
                    Presentes
                  </p>

                  <p className="text-xl font-bold text-emerald-700">
                    {totalPresentes}
                  </p>
                </div>

                <div className="bg-red-50 rounded-md px-4 py-3 text-center">
                  <p className="text-[11px] text-red-600">
                    Faltas
                  </p>

                  <p className="text-xl font-bold text-red-700">
                    {totalFaltas}
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* Controles */}

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">

            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">

              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={buscaAluno}
                  onChange={(event) =>
                    setBuscaAluno(
                      event.target.value
                    )
                  }
                  placeholder="Pesquisar aluno..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-md text-sm bg-slate-50"
                />
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    marcarTodos(true)
                  }
                  disabled={
                    carregandoAlunos ||
                    alunos.length === 0
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  Todos presentes
                </button>

                <button
                  onClick={() =>
                    marcarTodos(false)
                  }
                  disabled={
                    carregandoAlunos ||
                    alunos.length === 0
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  Todos faltaram
                </button>

              </div>

            </div>

          </div>

          {/* Lista */}

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Alunos da turma
                  </h3>

                  <p className="text-xs text-slate-500">
                    Marque presente ou falta
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-500">
                {alunosFiltrados.length} aluno(s)
              </span>

            </div>

            {carregandoAlunos ? (
              <div className="py-16 flex justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Carregando alunos e chamada...
                </div>
              </div>
            ) : alunos.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 mx-auto text-slate-300" />

                <p className="font-medium text-slate-600 mt-3">
                  Nenhum aluno matriculado
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Cadastre uma matrícula para esta turma.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {alunosFiltrados.map(
                  (aluno, index) => {

                    const estado =
                      frequencia[
                        aluno.id
                      ];

                    const presente =
                      estado?.presente === true;

                    return (
                      <div
                        key={aluno.id}
                        className={`px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          presente
                            ? "bg-emerald-50/30"
                            : "bg-red-50/20"
                        }`}
                      >

                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {index + 1}
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {aluno.nome_completo}
                            </p>

                            <p className="text-xs text-slate-400 mt-0.5">
                              {presente
                                ? "Presença marcada"
                                : "Falta marcada"}
                            </p>
                          </div>

                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              marcarAluno(
                                aluno.id,
                                true
                              )
                            }
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                              presente
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            Presente
                          </button>

                          <button
                            onClick={() =>
                              marcarAluno(
                                aluno.id,
                                false
                              )
                            }
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                              !presente
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-red-700 border-red-200 hover:bg-red-50"
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            Falta
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

                {alunosFiltrados.length ===
                  0 && (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Nenhum aluno encontrado.
                  </div>
                )}

              </div>
            )}

          </div>

          {/* =================================================
              RESUMO + BOTÃO SALVAR
          ================================================== */}

          {alunos.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

                <div>

                  <p className="text-sm font-semibold text-slate-800">
                    Resumo da chamada
                  </p>

                  <div className="flex flex-wrap gap-4 mt-2 text-sm">

                    <span className="flex items-center gap-2 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {totalPresentes} presentes
                    </span>

                    <span className="flex items-center gap-2 text-red-700">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {totalFaltas} faltas
                    </span>

                    <span className="text-slate-500">
                      Data:{" "}
                      <strong>
                        {formatarData(
                          dataSelecionada
                        )}
                      </strong>
                    </span>

                  </div>

                </div>

                <button
                  onClick={salvarChamada}
                  disabled={salvando}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? (
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
          )}

        </div>
      )}

    </div>
  );
}
