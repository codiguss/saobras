import { createClient } from "@/lib/supabase/server";
import HistoricoClient from "@/components/historico/HistoricoClient";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function HistoricoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [resCursos, resTurmas] = await Promise.all([
    supabase
      .from("cursos")
      .select("id, titulo")
      .order("titulo"),

    supabase
      .from("turmas")
      .select(
        "id, nome, curso_id, horario, turno, vagas, cursos(titulo)"
      )
      .order("nome"),
  ]);

  return (
    <HistoricoClient
      cursos={resCursos.data || []}
      turmas={resTurmas.data || []}
    />
  );
}
