import { createClient } from "@/lib/supabase/server";
import { AlunosClient } from "@/components/alunos/AlunosClient";

export const revalidate = 0; // Disable cache during development

export default async function AlunosPage() {
  const supabase = await createClient();

  const { data: alunos, error } = await supabase
    .from("alunos")
    .select(`
      *,
      matriculas (
        id
      )
    `)
    .order("nome_completo", { ascending: true });

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-100">
          Erro ao carregar alunos: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <AlunosClient alunos={alunos || []} />
    </div>
  );
}
