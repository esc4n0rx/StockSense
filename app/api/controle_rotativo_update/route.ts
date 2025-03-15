// app/api/atualizar-contagem/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET → Datas disponíveis agrupadas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ss_setores')
      .select('data_feita')
      .order('data_feita', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const datasUnicas = Array.from(new Set(data.map((item) => item.data_feita)));
    return NextResponse.json({ datas: datasUnicas }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST → Atualização de contagem por data
export async function POST(req: Request) {
  try {
    const { data_feita } = await req.json();

    if (!data_feita)
      return NextResponse.json({ error: 'Data não informada.' }, { status: 400 });

    // Busca os itens de inventário com essa data
    const { data: inventario, error: errorInventario } = await supabase
      .from('inventario_rotativo')
      .select('*')
      .eq('data', data_feita);

    if (errorInventario)
      return NextResponse.json({ error: errorInventario.message }, { status: 500 });

    // Busca todas contagens dessa data (uma vez só)
    const { data: setores, error: setoresError } = await supabase
      .from('ss_setores')
      .select('codigo, contagem')
      .eq('data_feita', data_feita);

    if (setoresError)
      return NextResponse.json({ error: setoresError.message }, { status: 500 });

    // Mapeia contagens por código para acesso rápido
    const contagemMap = new Map<string, number>();
    setores.forEach((item) => {
      contagemMap.set(item.codigo, item.contagem ?? 0);
    });

    // Monta o array de updates
    const updates: { id: number; contagem: number; status: string }[] = [];

    for (const item of inventario) {
      const contagem = contagemMap.get(item.codigo) ?? 0;
      const saldo_sap = item.saldo_sap ?? 0;
      const diferenca = contagem - saldo_sap;

      let status = 'pendente';
      if (diferenca === 0) status = 'ok';
      else status = 'erro';

      updates.push({ id: item.id, contagem, status });
    }

    // Atualiza os dados em lote usando Promise.allSettled
    const batchUpdates = updates.map((item) =>
      supabase
        .from('inventario_rotativo')
        .update({ contagem: item.contagem, status: item.status })
        .eq('id', item.id)
    );

    const results = await Promise.allSettled(batchUpdates);
    const resultados: any[] = [];

    results.forEach((result, i) => {
      const u = updates[i];
      if (result.status === 'fulfilled') {
        resultados.push({ ...u, result: 'atualizado' });
      } else {
        resultados.push({ ...u, result: 'erro', message: result.reason?.message || 'Falha desconhecida' });
      }
    });

    return NextResponse.json({ message: 'Atualização concluída.', resultados }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
