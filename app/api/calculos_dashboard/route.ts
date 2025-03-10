// app/api/calculos_dashboard/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Credenciais do Supabase não configuradas." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Conta o total de registros sem buscar dados
    const { error: countError, count: totalRecords } = await supabase
      .from('ss_setores')
      .select('id', { count: 'exact', head: true }); // apenas conta e não traz dados

    if (countError) {
      throw new Error(countError.message);
    }

    // Se não há registros, retorne um objeto "vazio"
    if (!totalRecords || totalRecords === 0) {
      return NextResponse.json({
        totalRotativos: 0,
        totalItensContados: 0,
        totalDivergencia: 0,
        ultimoRotativo: null,
        consumoEstoque: [],
        atividadeRecente: "a ser implementado",
        debug: "Nenhum registro encontrado em ss_setores"
      });
    }

    // 2. Busca em lotes (batch) todos os registros
    const chunkSize = 1000; // Ajuste conforme necessidade
    let allSetores: any[] = [];

    for (let start = 0; start < totalRecords; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalRecords - 1);

      const { data, error } = await supabase
        .from('ss_setores')
        .select('*')
        .range(start, end);

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        allSetores.push(...data);
      }
    }

    // 3. Lógica de agregação

    // 3.1. Total de Rotativos do Mês = contagem de datas únicas
    // As datas vêm em formato YYYY-MM-DD, então a ordenação lexicográfica funciona corretamente
    const uniqueDates = Array.from(new Set(allSetores.map((r: any) => r.data_feita)));
    // Ordena da mais recente para a mais antiga
    uniqueDates.sort((a, b) => b.localeCompare(a));
    const totalRotativos = uniqueDates.length;

    // 3.2. Último Rotativo (a data mais recente)
    const ultimoRotativo = uniqueDates[0] ?? null;

    // 3.3. Filtra registros para a data mais recente
    const registrosRecentes = allSetores.filter((r: any) => r.data_feita === ultimoRotativo);

    // 3.4. Total de Itens Contados: códigos únicos na data mais recente
    const uniqueCodigosRecent = new Set(registrosRecentes.map((r: any) => r.codigo));
    const totalItensContados = uniqueCodigosRecent.size;

    // 3.5. Total de Divergência: códigos únicos com diferença != 0 na data mais recente
    const uniqueDivergencia = new Set(
      registrosRecentes.filter((r: any) => Number(r.diferenca) !== 0).map((r: any) => r.codigo)
    );
    const totalDivergencia = uniqueDivergencia.size;

    // 3.6. Consumo de Estoque
      const consumoMap: Record<string, Record<string, number>> = {};

      allSetores.forEach((r: any) => {
        const date = r.data_feita;
        const codigo = r.codigo;
        const contagem = Number(r.contagem) || 0;

        if (!consumoMap[date]) {
          consumoMap[date] = {};
        }
        // Se o código ainda não foi registrado para esta data, adiciona-o com a contagem
        if (!consumoMap[date][codigo]) {
          consumoMap[date][codigo] = contagem;
        }
      });

      // Monta o array final: para cada data, soma as contagens dos códigos únicos
      const consumoEstoque = Object.entries(consumoMap)
        .map(([data_feita, codigos]) => {
          const totalContagem = Object.values(codigos).reduce((sum, contagem) => sum + contagem, 0);
          return { data_feita, totalContagem };
        })
        // Ordena as datas em ordem crescente (mais antiga -> mais recente)
        .sort((a, b) => a.data_feita.localeCompare(b.data_feita));

    // 4. Retorno final
    return NextResponse.json({
      totalRotativos,
      totalItensContados,
      totalDivergencia,
      ultimoRotativo,
      consumoEstoque,
      atividadeRecente: "a ser implementado",
      debug: {
        totalRecords,
        carregados: allSetores.length
      }
    });
  } catch (error: any) {
    console.error("[API calculos_dashboard] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
