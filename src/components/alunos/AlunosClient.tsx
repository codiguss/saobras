"use client";

import { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Trash2,
  User,
  Phone,
  MapPin,
  Mail,
  Save,
  AlertCircle,
  Search,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type Aluno = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  cpf_responsavel?: string | null;
  nome_responsavel: string | null;
  telefone: string | null;
  telefone_secundario?: string | null;
  email: string | null;
  idade: number | null;
  status_estudante: boolean | null;
  bairro: string | null;
  municipio: string | null;
  criado_por: string | null;
  criado_em: string;
  nis: boolean;
  tags_perfil?: string[] | null;
  matriculas?: Matricula[];
  curso_id?: string | null;
  turma_id?: string | null;
};

export type Matricula = {
  id: string;
  curso_id: string;
  turma_id?: string | null;
  data_matricula?: string | null;
  cursos?: {
    titulo: string;
  }[] | null;
};

const AVAILABLE_TAGS = [
  {
    label: "Deficiência Física",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    label: "Deficiência Intelectual/Mental",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
];

export function AlunosClient({ alunos }: { alunos: Aluno[] }) {
  const router = useRouter();

  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para controlar os fluxos do modal
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Estado de Matrículas
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [isLoadingMatriculas, setIsLoadingMatriculas] = useState(false);

  // Cursos disponíveis
  const [cursos, setCursos] = useState<
    { id: string; titulo: string }[]
  >([]);
  const [isLoadingCursos, setIsLoadingCursos] = useState(false);

  // Turmas disponíveis
  const [turmas, setTurmas] = useState<
    { id: string; nome: string; curso_id: string; turno: string | null }[]
  >([]);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);

  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Estados da exclusão
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /*
   * ============================================================
   * BUSCAR MATRÍCULAS DO ALUNO
   * ============================================================
   */
  useEffect(() => {
    if (selectedAluno && !isEditing) {
      const fetchMatriculas = async () => {
        setIsLoadingMatriculas(true);

        const { data, error } = await supabase
          .from("matriculas")
          .select("id, curso_id, turma_id, data_matricula, cursos(titulo)")
          .eq("aluno_id", selectedAluno.id);

        if (!error && data) {
          setMatriculas(data as Matricula[]);
        } else if (error) {
          console.error("Erro ao carregar matrículas:", error.message);
          setMatriculas([]);
        }

        setIsLoadingMatriculas(false);
      };

      fetchMatriculas();
    }
  }, [selectedAluno, isEditing]);

  /*
   * ============================================================
   * BUSCAR CURSOS
   * ============================================================
   */
  useEffect(() => {
    const fetchCursos = async () => {
      setIsLoadingCursos(true);

      const { data, error } = await supabase
        .from("cursos")
        .select("id, titulo")
        .order("titulo", { ascending: true });

      if (!error && data) {
        setCursos(data);
      } else if (error) {
        console.error("Erro ao carregar cursos:", error.message);
        setCursos([]);
      }

      setIsLoadingCursos(false);
    };

    fetchCursos();
  }, []);

  /*
   * ============================================================
   * BUSCAR TURMAS
   * ============================================================
   */
  useEffect(() => {
    const fetchTurmas = async () => {
      setIsLoadingTurmas(true);

      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso_id, turno")
        .order("nome", { ascending: true });

      if (!error && data) {
        setTurmas(data);
      } else if (error) {
        console.error("Erro ao carregar turmas:", error.message);
        setTurmas([]);
      }

      setIsLoadingTurmas(false);
    };

    fetchTurmas();
  }, []);

  /*
   * ============================================================
   * DESCOBRIR O OPERADOR LOGADO
   *
   * IMPORTANTE:
   * auth.users.id NÃO é o mesmo que operadores.id.
   *
   * A tabela matriculas possui:
   *
   * operador_id -> operadores.id
   *
   * Por isso usamos o e-mail do usuário autenticado para
   * encontrar o registro correspondente na tabela operadores.
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
        "Usuário não está logado. Faça login novamente."
      );
    }

    if (!user.email) {
      throw new Error(
        "O usuário logado não possui e-mail para identificar o operador."
      );
    }

    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (operadorError) {
      throw new Error(
        "Erro ao localizar o operador: " +
          operadorError.message
      );
    }

    if (!operador) {
      throw new Error(
        `Nenhum operador foi encontrado com o e-mail ${user.email}. Verifique se este usuário está cadastrado na tabela operadores.`
      );
    }

    return operador.id;
  };

  /*
   * ============================================================
   * FUNÇÕES DE MÁSCARA
   * ============================================================
   */

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, "");

    if (v.length > 11) {
      v = v.slice(0, 11);
    }

    if (v.length > 10) {
      return v.replace(
        /^(\d{2})(\d{5})(\d{4}).*/,
        "($1) $2-$3"
      );
    }

    if (v.length > 5) {
      return v.replace(
        /^(\d{2})(\d{4})(\d{0,4}).*/,
        "($1) $2-$3"
      );
    }

    if (v.length > 2) {
      return v.replace(
        /^(\d{2})(\d{0,5})/,
        "($1) $2"
      );
    }

    return v;
  };

  const maskCpfPreview = (cpf: string | null) => {
    if (!cpf) return "Não informado";

    const digits = cpf.replace(/\D/g, "");

    if (digits.length === 11) {
      return `***.***.${digits.slice(6, 9)}-${digits.slice(
        9,
        11
      )}`;
    }

    return "***.***.***-**";
  };

  /*
   * ============================================================
   * INICIAR NOVO CADASTRO
   * ============================================================
   */

  const startCreating = () => {
    setSelectedAluno(null);
    setMatriculas([]);

    setFormData({
      status_estudante: true,
      nis: false,
      idade: undefined,
      curso_id: "",
      turma_id: "",
      tags_perfil: [],
    });

    setIsCreating(true);
    setIsEditing(true);
  };

  /*
   * ============================================================
   * INICIAR EDIÇÃO
   * ============================================================
   */

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const matriculaAtual =
      matriculas.length > 0 ? matriculas[0] : null;

    setFormData({
      ...(selectedAluno || {}),
      curso_id: matriculaAtual?.curso_id || "",
      turma_id: matriculaAtual?.turma_id || "",
    });

    setIsEditing(true);
  };

  /*
   * ============================================================
   * FECHAR PAINEL
   * ============================================================
   */

  const closePanel = () => {
    setSelectedAluno(null);
    setIsEditing(false);
    setIsCreating(false);
    setShowDeleteConfirm(false);
    setShowDiscardConfirm(false);
    setMatriculas([]);
    setFormData({});
  };

  /*
   * ============================================================
   * TENTATIVA DE FECHAR
   * ============================================================
   */

  const handleCloseAttempt = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isEditing || isCreating) {
      setShowDiscardConfirm(true);
    } else {
      closePanel();
    }
  };

  const handleDiscardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setShowDiscardConfirm(true);
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);

    if (isCreating) {
      closePanel();
    } else {
      setIsEditing(false);
    }
  };

  const cancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  /*
   * ============================================================
   * EXCLUSÃO
   * ============================================================
   */

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedAluno) return;

    setIsDeleting(true);

    /*
     * Primeiro removemos as matrículas do aluno.
     * Isso evita erro de chave estrangeira caso o banco não
     * esteja configurado com ON DELETE CASCADE.
     */
    const { error: matriculaError } = await supabase
      .from("matriculas")
      .delete()
      .eq("aluno_id", selectedAluno.id);

    if (matriculaError) {
      setIsDeleting(false);

      alert(
        "Erro ao excluir as matrículas do aluno: " +
          matriculaError.message
      );

      return;
    }

    const { error } = await supabase
      .from("alunos")
      .delete()
      .eq("id", selectedAluno.id);

    setIsDeleting(false);

    if (error) {
      alert("Erro ao excluir aluno: " + error.message);
      return;
    }

    setShowDeleteConfirm(false);

    closePanel();

    router.refresh();
  };

  /*
   * ============================================================
   * SALVAR ALUNO
   * ============================================================
   */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.curso_id) {
      alert(
        "Selecione o curso do aluno antes de salvar."
      );
      return;
    }

    if (!formData.turma_id) {
      alert("Selecione a turma do aluno antes de salvar.");
      return;
    }

    if (!formData.idade) {
      alert("Informe a idade do aluno.");
      return;
    }

    if (!formData.nome_completo?.trim()) {
      alert("Informe o nome completo do aluno.");
      return;
    }

    if (!formData.cpf?.trim()) {
      alert("Informe o CPF do aluno.");
      return;
    }

    if (
      formData.idade < 18 &&
      !formData.nome_responsavel?.trim()
    ) {
      alert(
        "Informe o nome do responsável para alunos menores de 18 anos."
      );
      return;
    }

    if (
      formData.idade < 18 &&
      !formData.cpf_responsavel?.trim()
    ) {
      alert(
        "Informe o CPF do responsável para alunos menores de 18 anos."
      );
      return;
    }

    setIsSaving(true);

    try {
      /*
       * Dados que serão gravados na tabela alunos.
       */
      const savePayload = {
        nome_completo: formData.nome_completo,
        cpf: formData.cpf,
        cpf_responsavel: formData.cpf_responsavel,
        telefone: formData.telefone,
        telefone_secundario:
          formData.telefone_secundario,
        email: formData.email,
        idade: formData.idade,
        nome_responsavel:
          formData.nome_responsavel,
        bairro: formData.bairro,
        municipio: formData.municipio,
        status_estudante:
          formData.status_estudante,
        nis: formData.nis,
        tags_perfil:
          formData.tags_perfil || [],
      };

      let alunoId = selectedAluno?.id;

      /*
       * ========================================================
       * NOVO ALUNO
       * ========================================================
       */
      if (isCreating) {
        /*
         * PRIMEIRO:
         * Descobrimos o operador.
         *
         * Fazemos isso ANTES de criar o aluno para evitar
         * cadastrar um aluno e depois descobrir que não existe
         * operador correspondente.
         */
        const operadorId = await getOperadorId();

        /*
         * 1. Criar aluno
         */
        const {
          data: novoAluno,
          error: alunoError,
        } = await supabase
          .from("alunos")
          .insert([savePayload])
          .select("id")
          .single();

        if (alunoError) {
          throw new Error(
            "Erro ao criar aluno: " +
              alunoError.message
          );
        }

        if (!novoAluno) {
          throw new Error(
            "O aluno foi criado, mas o ID não foi retornado."
          );
        }

        alunoId = novoAluno.id;

        /*
         * 2. Criar matrícula
         *
         * IMPORTANTE:
         * operador_id recebe operador.id,
         * e NÃO auth.user.id.
         */
        const {
          error: matriculaError,
        } = await supabase
          .from("matriculas")
          .insert([
            {
              aluno_id: alunoId,
              curso_id: formData.curso_id,
              turma_id: formData.turma_id || null,
              operador_id: operadorId,
              data_matricula:
                new Date().toISOString(),
            },
          ]);

        if (matriculaError) {
          /*
           * Se a matrícula falhar, tentamos remover o aluno
           * recém-criado para não deixar cadastro incompleto.
           */
          await supabase
            .from("alunos")
            .delete()
            .eq("id", alunoId);

          throw new Error(
            "Aluno criado, mas a matrícula não pôde ser criada: " +
              matriculaError.message
          );
        }
      }

      /*
       * ========================================================
       * EDITAR ALUNO
       * ========================================================
       */
      else if (selectedAluno) {
        /*
         * 1. Atualizar dados do aluno
         */
        const {
          error: alunoError,
        } = await supabase
          .from("alunos")
          .update(savePayload)
          .eq("id", selectedAluno.id);

        if (alunoError) {
          throw new Error(
            "Erro ao atualizar aluno: " +
              alunoError.message
          );
        }

        /*
         * 2. Buscar matrícula existente
         */
        const {
          data: matriculasExistentes,
          error: buscaMatriculaError,
        } = await supabase
          .from("matriculas")
          .select("id, curso_id, turma_id")
          .eq("aluno_id", selectedAluno.id)
          .order("data_matricula", {
            ascending: false,
          });

        if (buscaMatriculaError) {
          throw new Error(
            "Não foi possível consultar a matrícula: " +
              buscaMatriculaError.message
          );
        }

        const matriculaAtual =
          matriculasExistentes?.[0];

        /*
         * 3. Se já existe matrícula, altera o curso
         */
        if (matriculaAtual) {
          if (
            matriculaAtual.curso_id !== formData.curso_id ||
            (matriculaAtual.turma_id || null) !== (formData.turma_id || null)
          ) {
            const {
              error: updateMatriculaError,
            } = await supabase
              .from("matriculas")
              .update({
                curso_id: formData.curso_id,
                turma_id: formData.turma_id || null,
              })
              .eq("id", matriculaAtual.id);

            if (updateMatriculaError) {
              throw new Error(
                "Aluno atualizado, mas não foi possível alterar o curso: " +
                  updateMatriculaError.message
              );
            }
          }
        }

        /*
         * 4. Se o aluno não possui matrícula, cria uma.
         */
        else {
          const operadorId =
            await getOperadorId();

          const {
            error: matriculaError,
          } = await supabase
            .from("matriculas")
            .insert([
              {
                aluno_id: selectedAluno.id,
                curso_id: formData.curso_id,
                operador_id: operadorId,
                data_matricula:
                  new Date().toISOString(),
              },
            ]);

          if (matriculaError) {
            throw new Error(
              "Aluno atualizado, mas a matrícula não pôde ser criada: " +
                matriculaError.message
            );
          }
        }
      }

      /*
       * Tudo certo
       */
      closePanel();

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao salvar.";

      alert("Erro ao salvar: " + message);
    } finally {
      setIsSaving(false);
    }
  };

  /*
   * ============================================================
   * ALTERAÇÃO DOS CAMPOS
   * ============================================================
   */

  const handleInputChange = (
    field: keyof Aluno,
    value: string | number | boolean | null
  ) => {
    let finalValue = value;

    if (typeof value === "string") {
      if (
        field === "cpf" ||
        field === "cpf_responsavel"
      ) {
        finalValue = value
          .replace(/\D/g, "")
          .slice(0, 11);
      } else if (
        field === "telefone" ||
        field === "telefone_secundario"
      ) {
        finalValue = value
          .replace(/\D/g, "")
          .slice(0, 11);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: finalValue,
    }));
  };

  /*
   * ============================================================
   * TAGS
   * ============================================================
   */

  const handleTagToggle = (tag: string) => {
    const currentTags =
      formData.tags_perfil || [];

    if (currentTags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags_perfil: currentTags.filter(
          (t) => t !== tag
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        tags_perfil: [
          ...currentTags,
          tag,
        ],
      }));
    }
  };

  const showModal =
    !!selectedAluno || isCreating;

  /*
   * ============================================================
   * FILTRO
   * ============================================================
   */

  const filteredAlunos =
    (alunos || []).filter((aluno) => {
      const term =
        searchTerm.toLowerCase();

      return (
        (
          aluno.nome_completo?.toLowerCase() ||
          ""
        ).includes(term) ||
        (
          aluno.cpf?.toLowerCase() ||
          ""
        ).includes(term) ||
        (
          aluno.telefone?.toLowerCase() ||
          ""
        ).includes(term)
      );
    });

  /*
   * ============================================================
   * IDADE
   * ============================================================
   */

  const hasAge =
    formData.idade !== null &&
    formData.idade !== undefined &&
    !isNaN(formData.idade);

  const isMinor =
    hasAge &&
    formData.idade! < 18;

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Gestão de Alunos
        </h1>

        <button
          type="button"
          onClick={startCreating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          + Novo Aluno
        </button>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />

          <input
            type="text"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-4">
                Nome Completo
              </th>

              <th className="px-6 py-4">
                CPF
              </th>

              <th className="px-6 py-4">
                Bairro
              </th>

              <th className="px-6 py-4">
                Telefone
              </th>

              <th className="px-6 py-4">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {filteredAlunos.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {searchTerm
                    ? "Nenhum aluno encontrado para sua busca."
                    : "Nenhum aluno cadastrado no momento."}
                </td>
              </tr>
            ) : (
              filteredAlunos.map((aluno) => (
                <tr
                  key={aluno.id}
                  onClick={() =>
                    setSelectedAluno(aluno)
                  }
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-slate-900 font-medium">
                    {aluno.nome_completo}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {maskCpfPreview(aluno.cpf)}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {aluno.bairro ||
                      "Não informado"}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {aluno.telefone
                      ? formatPhone(
                          aluno.telefone
                        )
                      : "Não informado"}
                  </td>

                  <td className="px-6 py-4">
                    {aluno.matriculas &&
                    aluno.matriculas.length > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        Não Ativo
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-4 transition-opacity"
          onClick={handleCloseAttempt}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h2 className="text-lg font-semibold text-slate-900">
                {isCreating
                  ? "Cadastrar Novo Aluno"
                  : isEditing
                  ? "Editar Dados do Aluno"
                  : "Detalhes do Aluno"}
              </h2>

              <button
                type="button"
                onClick={handleCloseAttempt}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!isEditing &&
              selectedAluno ? (
                <>
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                      <User className="w-8 h-8" />
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {
                          selectedAluno.nome_completo
                        }
                      </h3>

                      <p className="text-sm text-slate-500 mt-1">
                        Cadastrado em{" "}
                        {new Date(
                          selectedAluno.criado_em
                        ).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Contato
                        </h4>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />

                            <span className="truncate">
                              {selectedAluno.telefone
                                ? formatPhone(
                                    selectedAluno.telefone
                                  )
                                : "Não informado"}
                            </span>
                          </div>

                          {selectedAluno.telefone_secundario && (
                            <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />

                              <span className="truncate">
                                {formatPhone(
                                  selectedAluno.telefone_secundario
                                )}{" "}
                                (Secundário)
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />

                            <span className="truncate">
                              {selectedAluno.email ||
                                "Não informado"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Localização
                        </h4>

                        <div className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />

                          <div>
                            <p className="font-medium text-slate-800">
                              {selectedAluno.bairro ||
                                "Bairro não informado"}
                            </p>

                            <p className="text-slate-500">
                              {selectedAluno.municipio ||
                                "Município não informado"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Informações Pessoais
                      </h4>

                      <div className="bg-slate-50 p-4 rounded-md border border-slate-100 space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">
                            Idade
                          </p>

                          <p className="text-sm font-medium text-slate-900">
                            {selectedAluno.idade
                              ? `${selectedAluno.idade} anos`
                              : "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 mb-1">
                            CPF
                          </p>

                          <p className="text-sm font-medium text-slate-900">
                            {selectedAluno.cpf
                              ? formatCPF(
                                  selectedAluno.cpf
                                )
                              : "-"}
                          </p>
                        </div>

                        {selectedAluno.idade !== null &&
                          selectedAluno.idade < 18 && (
                            <div className="pt-3 mt-3 border-t border-slate-200">
                              <p className="text-xs font-bold text-orange-600 mb-2">
                                Dados do Responsável
                              </p>

                              <div className="mb-2">
                                <p className="text-xs text-slate-500 mb-1">
                                  Nome
                                </p>

                                <p className="text-sm font-medium text-slate-900">
                                  {selectedAluno.nome_responsavel ||
                                    "-"}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500 mb-1">
                                  CPF
                                </p>

                                <p className="text-sm font-medium text-slate-900">
                                  {selectedAluno.cpf_responsavel
                                    ? formatCPF(
                                        selectedAluno.cpf_responsavel
                                      )
                                    : "-"}
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {selectedAluno.tags_perfil &&
                    selectedAluno.tags_perfil.length >
                      0 && (
                      <div className="mt-8 pt-8 border-t border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                          Perfil e Necessidades Específicas
                        </h4>

                        <div className="flex flex-wrap gap-2">
                          {selectedAluno.tags_perfil.map(
                            (tag) => {
                              const foundTag =
                                AVAILABLE_TAGS.find(
                                  (t) =>
                                    t.label === tag
                                );

                              const colorClass =
                                foundTag
                                  ? foundTag.color
                                  : "bg-slate-100 text-slate-800 border-slate-200";

                              return (
                                <span
                                  key={tag}
                                  className={`px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}
                                >
                                  {tag}
                                </span>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                  {/* MATRÍCULAS */}
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Matrículas do Aluno
                    </h4>

                    {isLoadingMatriculas ? (
                      <div className="text-sm text-slate-500 animate-pulse bg-slate-50 p-4 rounded-md border border-slate-100 text-center">
                        Carregando matrículas...
                      </div>
                    ) : matriculas.length ===
                      0 ? (
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-100 text-sm text-slate-500 text-center">
                        Este aluno não possui matrículas no momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matriculas.map(
                          (mat) => (
                            <div
                              key={mat.id}
                              className="bg-white border border-slate-200 p-4 rounded-md shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-bold text-slate-900 text-sm">
                                    {mat.cursos?.[0]
                                      ?.titulo ||
                                      "Curso não especificado"}
                                  </p>

                                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                                    Matrícula
                                  </span>
                                </div>

                                <p className="text-xs text-slate-500">
                                  {mat.cursos?.[0]
                                    ?.titulo
                                    ? `Curso: ${mat.cursos[0].titulo}`
                                    : "Curso não disponível"}
                                </p>

                                {mat.data_matricula && (
                                  <p className="text-xs text-slate-400 mt-2">
                                    Matriculado em:{" "}
                                    {new Date(
                                      mat.data_matricula
                                    ).toLocaleDateString(
                                      "pt-BR"
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <form
                  id="edit-form"
                  onSubmit={handleSave}
                  className="space-y-6"
                >
                  {/* IDADE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Qual a idade do aluno?
                      </label>

                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Ex: 15"
                        value={
                          formData.idade || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "idade",
                            e.target.value
                              ? parseInt(
                                  e.target.value
                                )
                              : null
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                      />
                    </div>

                    {!hasAge && (
                      <div className="flex items-center text-sm text-slate-500 mt-4 md:mt-0">
                        * Informe a idade primeiro para preencher o resto dos dados.
                      </div>
                    )}
                  </div>

                  {/* RESTANTE DO FORMULÁRIO */}
                  <div
                    className={`space-y-6 transition-opacity duration-300 ${
                      !hasAge
                        ? "opacity-30 pointer-events-none"
                        : "opacity-100"
                    }`}
                  >
                    {/* NOME E CPF */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Nome Completo
                        </label>

                        <input
                          type="text"
                          required
                          disabled={!hasAge}
                          value={
                            formData.nome_completo ||
                            ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "nome_completo",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          CPF do Aluno
                        </label>

                        <input
                          type="text"
                          required
                          disabled={!hasAge}
                          value={formatCPF(
                            formData.cpf || ""
                          )}
                          onChange={(e) =>
                            handleInputChange(
                              "cpf",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    {/* RESPONSÁVEL */}
                    {(isMinor || !hasAge) && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-md space-y-4">
                        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Dados do Responsável (Obrigatório para Menores)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-orange-900 mb-1">
                              Nome do Responsável
                            </label>

                            <input
                              type="text"
                              required={isMinor}
                              disabled={!hasAge}
                              value={
                                formData.nome_responsavel ||
                                ""
                              }
                              onChange={(e) =>
                                handleInputChange(
                                  "nome_responsavel",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-slate-900 focus:outline-none focus:border-orange-500 text-sm transition-colors disabled:bg-orange-50/50"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-orange-900 mb-1">
                              CPF do Responsável
                            </label>

                            <input
                              type="text"
                              required={isMinor}
                              disabled={!hasAge}
                              value={formatCPF(
                                formData.cpf_responsavel ||
                                  ""
                              )}
                              onChange={(e) =>
                                handleInputChange(
                                  "cpf_responsavel",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-slate-900 focus:outline-none focus:border-orange-500 text-sm transition-colors disabled:bg-orange-50/50"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TELEFONES E E-MAIL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Telefone Principal
                        </label>

                        <input
                          type="text"
                          required
                          disabled={!hasAge}
                          value={formatPhone(
                            formData.telefone ||
                              ""
                          )}
                          onChange={(e) =>
                            handleInputChange(
                              "telefone",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                        />
                      </div>

                      {(isMinor || !hasAge) && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Telefone Secundário (Opcional)
                          </label>

                          <input
                            type="text"
                            disabled={!hasAge}
                            value={formatPhone(
                              formData.telefone_secundario ||
                                ""
                            )}
                            onChange={(e) =>
                              handleInputChange(
                                "telefone_secundario",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                          />
                        </div>
                      )}

                      {!isMinor &&
                        hasAge && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              E-mail
                            </label>

                            <input
                              type="email"
                              value={
                                formData.email ||
                                ""
                              }
                              onChange={(e) =>
                                handleInputChange(
                                  "email",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                            />
                          </div>
                        )}
                    </div>

                    {(isMinor || !hasAge) && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          E-mail
                        </label>

                        <input
                          type="email"
                          disabled={!hasAge}
                          value={
                            formData.email || ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "email",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                        />
                      </div>
                    )}

                    {/* LOCALIZAÇÃO */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bairro
                        </label>

                        <input
                          type="text"
                          disabled={!hasAge}
                          value={
                            formData.bairro ||
                            ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "bairro",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Município
                        </label>

                        <input
                          type="text"
                          disabled={!hasAge}
                          value={
                            formData.municipio ||
                            ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "municipio",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm transition-colors disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    {/* =====================================================
                        CURSO
                    ====================================================== */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />

                        <label className="block text-sm font-bold text-blue-900">
                          Curso do aluno
                        </label>
                      </div>

                      <select
                        required
                        disabled={
                          !hasAge ||
                          isLoadingCursos
                        }
                        value={
                          formData.curso_id || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "curso_id",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 text-sm disabled:bg-blue-50/50"
                      >
                        <option value="">
                          {isLoadingCursos
                            ? "Carregando cursos..."
                            : "Selecione um curso"}
                        </option>

                        {cursos.map(
                          (curso) => (
                            <option
                              key={curso.id}
                              value={curso.id}
                            >
                              {curso.titulo}
                            </option>
                          )
                        )}
                      </select>

                      <p className="text-xs text-blue-700 mt-2">
                        O curso selecionado será usado para criar ou atualizar a matrícula do aluno.
                      </p>
                    </div>

                    {/* TURMA */}
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <label className="block text-sm font-bold text-emerald-900">
                          Turma do aluno
                        </label>
                      </div>

                      <select
                        required
                        disabled={!formData.curso_id || isLoadingTurmas}
                        value={formData.turma_id || ""}
                        onChange={(e) =>
                          handleInputChange("turma_id", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-md text-slate-900 focus:outline-none focus:border-emerald-500 text-sm disabled:bg-emerald-50/50"
                      >
                        <option value="">
                          {isLoadingTurmas
                            ? "Carregando turmas..."
                            : !formData.curso_id
                            ? "Selecione primeiro o curso"
                            : "Selecione uma turma"}
                        </option>

                        {turmas
                          .filter((turma) => turma.curso_id === formData.curso_id)
                          .map((turma) => (
                            <option key={turma.id} value={turma.id}>
                              {turma.nome}
                              {turma.turno ? ` — ${turma.turno}` : ""}
                            </option>
                          ))}
                      </select>

                      <p className="text-xs text-emerald-700 mt-2">
                        A turma é usada para mostrar o aluno corretamente no check-in manual.
                      </p>
                    </div>

                    {/* TAGS */}
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                      <div className="flex gap-6 flex-wrap">
                        <label
                          className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${
                            !hasAge
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!hasAge}
                            checked={(
                              formData.tags_perfil ||
                              []
                            ).includes(
                              "Deficiência Física"
                            )}
                            onChange={() =>
                              handleTagToggle(
                                "Deficiência Física"
                              )
                            }
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                          />

                          Deficiência Física
                        </label>

                        <label
                          className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${
                            !hasAge
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!hasAge}
                            checked={(
                              formData.tags_perfil ||
                              []
                            ).includes(
                              "Deficiência Intelectual/Mental"
                            )}
                            onChange={() =>
                              handleTagToggle(
                                "Deficiência Intelectual/Mental"
                              )
                            }
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                          />

                          Deficiência Intelectual/Mental
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* RODAPÉ */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
              {!isEditing &&
              selectedAluno ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>

                  <button
                    type="button"
                    onClick={startEditing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Dados
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleDiscardClick}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    disabled={isSaving}
                  >
                    {isCreating
                      ? "Cancelar"
                      : "Descartar Alterações"}
                  </button>

                  <button
                    type="submit"
                    form="edit-form"
                    disabled={
                      isSaving || !hasAge
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />

                    {isSaving
                      ? "Salvando..."
                      : "Salvar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE DESCARTE */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {isCreating
                ? "Cancelar cadastro?"
                : "Descartar alterações?"}
            </h3>

            <p className="text-sm text-slate-500 mb-6">
              Você tem modificações não salvas. Se sair agora, todos os dados digitados serão perdidos.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={cancelDiscard}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmDiscard}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sim, descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Excluir aluno?
            </h3>

            <p className="text-sm text-slate-500 mb-6">
              Tem certeza que deseja excluir os dados de{" "}
              <strong>
                {selectedAluno?.nome_completo}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting
                  ? "Excluindo..."
                  : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

