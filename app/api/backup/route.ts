// app/api/backup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Obtém as credenciais do Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas." },
        { status: 500 }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define as tabelas principais e de backup
    const tables = [
      { main: 'ss_estoque_wms', backup: 'ss_estoque_wms_backup' },
      { main: 'ss_estoque_mm', backup: 'ss_estoque_mm_backup' },
      { main: 'ss_corte_geral', backup: 'ss_corte_geral_backup' }
    ];

    const backupResults: { table: string; backedUp: number }[] = [];

    // Para cada par de tabelas, copia os registros para a tabela de backup e, se bem-sucedido, deleta-os da tabela principal.
    for (const pair of tables) {
      // Busca os registros da tabela principal
      const { data: records, error: fetchError } = await supabase
        .from(pair.main)
        .select('*');
      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }
      // Se há registros, insere-os na tabela de backup
      if (records && records.length > 0) {
        const { error: insertError } = await supabase
          .from(pair.backup)
          .insert(records);
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        // Remove os registros da tabela principal
        const { error: deleteError } = await supabase
          .from(pair.main)
          .delete()
          .neq('id', 0); // Assume que o id é sempre maior que zero
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
        backupResults.push({ table: pair.main, backedUp: records.length });
      } else {
        backupResults.push({ table: pair.main, backedUp: 0 });
      }
    }

    return NextResponse.json({
      message: "Backup realizado com sucesso.",
      backupResults
    });
  } catch (error: any) {
    console.error("Erro na API de backup:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
