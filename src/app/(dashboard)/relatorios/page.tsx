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

  const [resCursos, resTurmas, resOperadores] = await Promise.all([
    supabase.from("cursos").select("id, titulo").order("titulo"),
    supabase.from("turmas").select("id, nome, curso_id").order("nome"),
    supabase.from("operadores").select("id, nome").order("nome"),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <RelatoriosClient
        cursos={resCursos.data || []}
        turmas={resTurmas.data || []}
        operadores={resOperadores.data || []}
      />
    </div>
  );
}
