// app/api/controle_rotativo/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Geração do código rotativo: rotativo_ROTATIVOAAAAMMDD_XXXX
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
    const dataAtual = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const registrosParaInserir = [];

    for (const item of materiais) {
      const { codigo, descricao, unidade_medida } = item;

      const { data: estoqueData, error: estoqueError } = await supabase
        .from('ss_estoque_wms')
        .select('estoque_disponivel')
        .eq('material', codigo);

      if (estoqueError) {
        console.error(`Erro ao buscar estoque de ${codigo}`, estoqueError.message);
        continue;
      }

      const saldoSAP = estoqueData?.reduce((acc, cur) => acc + (cur.estoque_disponivel || 0), 0) || 0;

      registrosParaInserir.push({
        codigo,
        descricao,
        unidade_medida,
        saldo_sap: saldoSAP,
        contagem: 0,
        data: new Date().toISOString().split('T')[0],
        cod_rotativo: codRotativo,
        status: 'pendente'
      });
    }

    const { error: insertError } = await supabase
      .from('inventario_rotativo')
      .insert(registrosParaInserir);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Itens inseridos com sucesso.', cod_rotativo: codRotativo }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
