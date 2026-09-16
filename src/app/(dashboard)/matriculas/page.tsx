import { createClient } from "@/lib/supabase/server";
import MatriculasClient from "@/components/matriculas/MatriculasClient";
import { redirect } from "next/navigation";

export default async function MatriculasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("*, alunos(nome_completo, cpf), cursos(titulo), turmas(nome, horario)")
    .order("data_matricula", { ascending: false });

  return <MatriculasClient matriculasIniciais={matriculas || []} />;
}
