// app/api/calculos/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeRotativosBatch } from '@/lib/analise_rotativo';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dataFilter = searchParams.get('data');
    if (!dataFilter) {
      return NextResponse.json(
        { error: "Parâmetro 'data' é obrigatório." },
        { status: 400 }
      );
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas." },
        { status: 500 }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: setoresData, error } = await supabase
      .from('ss_setores')
      .select('*')
      .eq('data_feita', dataFilter);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const updatedRecords = await analyzeRotativosBatch(setoresData);
    
    return NextResponse.json({ data: updatedRecords });
  } catch (error: any) {
    console.error("[API calculos] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
