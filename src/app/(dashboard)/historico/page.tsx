import { createClient } from "@/lib/supabase/server";
import HistoricoClient from "@/components/historico/HistoricoClient";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Carregar cursos e turmas para os filtros
  const [resCursos, resTurmas] = await Promise.all([
    supabase.from("cursos").select("id, titulo").order("titulo"),
    supabase.from("turmas").select("id, nome, curso_id").order("nome"),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <HistoricoClient
        cursos={resCursos.data || []}
        turmas={resTurmas.data || []}
      />
    </div>
  );
}
