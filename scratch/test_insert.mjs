import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const payload = {
    titulo: 'Teste Inserção Script',
    descricao: 'Testando se dá erro de RLS ou constraints',
  };

  const { data, error } = await supabase.from('cursos').insert([payload]).select();
  console.log("Result:", data);
  if (error) console.error("Error:", error);
}

testInsert();

