// app/api/salvar/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(req: Request) {
  try {

    const { data } = await req.json();
    if (!Array.isArray(data)) {
      throw new Error("O campo 'data' deve ser um array.");
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Credenciais do Supabase não configuradas.");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('ss_setores')
      .upsert(data, { onConflict: 'id' });
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Registros atualizados com sucesso!' });
  } catch (error: any) {
    console.error('Erro no salvamento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
