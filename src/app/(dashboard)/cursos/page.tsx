import { supabase } from "@/lib/supabase";
import { CursosClient } from "@/components/cursos/CursosClient";

export const revalidate = 0; // Disable cache during development

export default async function CursosPage() {
  const { data: cursos, error: cursosError } = await supabase
    .from("cursos")
    .select("*")
    .order("titulo", { ascending: true });

  const { data: turmas, error: turmasError } = await supabase
    .from("turmas")
    .select(`
      *,
      cursos (
        titulo
      )
    `)
    .order("nome", { ascending: true });

  if (cursosError || turmasError) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-100">
          Erro ao carregar dados: {cursosError?.message || turmasError?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CursosClient cursos={cursos || []} turmas={turmas || []} />
    </div>
  );
}