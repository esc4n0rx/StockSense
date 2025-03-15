// app/api/atualizar-contagem/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Etapa 1 - GET para listar datas disponíveis do ss_setores agrupadas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ss_setores')
      .select('data_feita')
      .order('data_feita', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar datas únicas
    const datasUnicas = Array.from(new Set(data.map((item) => item.data_feita)));
    return NextResponse.json({ datas: datasUnicas }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Etapa 2 - POST para atualizar a contagem do inventario_rotativo com base na data_feita
export async function POST(req: Request) {
  try {
    const { data_feita } = await req.json();

    if (!data_feita) {
      return NextResponse.json({ error: 'Data não informada.' }, { status: 400 });
    }

    // Busca todos os inventários criados com essa data
    const { data: inventarioRotativo, error: errorInventario } = await supabase
      .from('inventario_rotativo')
      .select('*')
      .eq('data', data_feita);

    if (errorInventario) {
      return NextResponse.json({ error: errorInventario.message }, { status: 500 });
    }

    const resultadosAtualizados: any[] = [];

    for (const item of inventarioRotativo) {
      const { codigo, id } = item;

      // Buscar contagem correspondente no ss_setores
      const { data: setorData, error: setorError } = await supabase
        .from('ss_setores')
        .select('contagem')
        .eq('codigo', codigo)
        .eq('data_feita', data_feita)
        .maybeSingle();

      if (setorError) {
        console.warn(`[Contagem] Erro ao buscar contagem para ${codigo}:`, setorError.message);
        continue;
      }

      if (!setorData) continue;

      const contagem = setorData.contagem || 0;
      const saldo_sap = item.saldo_sap || 0;
      const diferenca = contagem - saldo_sap;

      let status = 'pendente';
      if (diferenca === 0) status = 'ok';
      else status = 'erro';

      // Atualiza o item
      const { error: updateError } = await supabase
        .from('inventario_rotativo')
        .update({ contagem, status })
        .eq('id', id);

      if (updateError) {
        console.warn(`[Contagem] Falha ao atualizar ${codigo}:`, updateError.message);
        continue;
      }

      resultadosAtualizados.push({ codigo, saldo_sap, contagem, diferenca, status });
    }

    return NextResponse.json({ message: 'Contagem atualizada.', resultados: resultadosAtualizados }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
