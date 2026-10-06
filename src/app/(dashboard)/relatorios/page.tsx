import { createClient } from "@/lib/supabase/server";
import RelatoriosClient from "@/components/relatorios/RelatoriosClient";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [resCursos, resTurmas, resOperadores, resMatriculas] = await Promise.all([
    supabase.from("cursos").select("id, titulo").order("titulo"),
    supabase.from("turmas").select("id, nome, curso_id").order("nome"),
    supabase.from("operadores").select("id, nome").order("nome"),
    supabase
      .from("matriculas")
      .select(`id, aluno_id, curso_id, turma_id, data_matricula, alunos(nome_completo, cpf), cursos(titulo), turmas(nome)`)
      .order("data_matricula", { ascending: false }),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <RelatoriosClient
        cursos={resCursos.data || []}
        turmas={resTurmas.data || []}
        operadores={resOperadores.data || []}
        matriculas={resMatriculas.data || []}
      />
    </div>
  );
}
