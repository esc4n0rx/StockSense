// app/api/controle_rotativo/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function gerarCodigoRotativo(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  return `rotativo_ROTATIVO${ano}${mes}${dia}_${aleatorio}`;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('inventario_rotativo')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { materiais } = await req.json(); // Ex: [{ codigo, descricao, unidade_medida }]
    if (!materiais || !Array.isArray(materiais)) {
      return NextResponse.json({ error: 'Lista de materiais inválida.' }, { status: 400 });
    }

    const codRotativo = gerarCodigoRotativo();
    const dataAtual = new Date().toISOString().split('T')[0];

    // 🔸 Coletar todos os códigos para uma única query
    const codigosUnicos = [...new Set(materiais.map((m: any) => m.codigo))];

    const { data: estoquesData, error: estoquesError } = await supabase
      .from('ss_estoque_wms')
      .select('material, estoque_disponivel')
      .in('material', codigosUnicos);

    if (estoquesError) {
      return NextResponse.json({ error: estoquesError.message }, { status: 500 });
    }

    // 🔸 Agrupar os saldos por material
    const saldoMap = new Map<string, number>();
    for (const item of estoquesData || []) {
      const material = item.material;
      const estoque = item.estoque_disponivel || 0;
      saldoMap.set(material, (saldoMap.get(material) || 0) + estoque);
    }

    // 🔸 Montar os registros de inserção
    const registrosParaInserir = materiais.map((item: any) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      unidade_medida: item.unidade_medida,
      saldo_sap: saldoMap.get(item.codigo) || 0,
      contagem: 0,
      data: dataAtual,
      cod_rotativo: codRotativo,
      status: 'pendente'
    }));

    // 🔸 Inserir em lote
    const { error: insertError } = await supabase
      .from('inventario_rotativo')
      .insert(registrosParaInserir);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Itens inseridos com sucesso.',
      cod_rotativo: codRotativo,
      total: registrosParaInserir.length
    }, { status: 201 });

  } catch (err: any) {
    console.error('[API CONTROLE ROTATIVO] Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
