// app/api/calculos_dashboard/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Função auxiliar para converter uma data no formato "dd/mm/yyyy" para um objeto Date.
 */
function parseDate(dateStr: string): Date {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return new Date(`${year}-${month}-${day}`);
  }
  // Se não for o formato esperado, tenta converter diretamente
  return new Date(dateStr);
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Credenciais do Supabase não configuradas." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: setores, error } = await supabase
      .from('ss_setores')
      .select('*');
    if (error) {
      throw new Error(error.message);
    }
    if (!setores || setores.length === 0) {
      return NextResponse.json({
        totalRotativos: 0,
        totalItensContados: 0,
        totalDivergencia: 0,
        ultimoRotativo: null,
        consumoEstoque: [],
        atividadeRecente: "a ser implementado"
      });
    }

    // 1. Total de Rotativos do Mes: contagem de datas únicas
    const uniqueDates = Array.from(new Set(setores.map((r: any) => r.data_feita)));
    // Converte para objetos com a data convertida
    const uniqueDatesParsed = uniqueDates.map(dateStr => ({
      original: dateStr,
      parsed: parseDate(dateStr)
    }));
    uniqueDatesParsed.sort((a, b) => b.parsed.getTime() - a.parsed.getTime());
    const totalRotativos = uniqueDatesParsed.length;

    // 2. Último Rotativo feito: a data mais recente (original)
    const ultimoRotativo = uniqueDatesParsed[0].original;

    // Filtra os registros para a data mais recente
    const registrosRecentes = setores.filter((r: any) => r.data_feita === ultimoRotativo);

    // 3. Total de Itens Contados: contagem de códigos únicos na data mais recente
    const uniqueCodigosRecent = Array.from(new Set(registrosRecentes.map((r: any) => r.codigo)));
    const totalItensContados = uniqueCodigosRecent.length;

    // 4. Total de divergência: contar códigos únicos com diferença diferente de zero na data mais recente
    const uniqueDivergencia = Array.from(
      new Set(registrosRecentes.filter((r: any) => Number(r.diferenca) !== 0).map((r: any) => r.codigo))
    );
    const totalDivergencia = uniqueDivergencia.length;

    // 5. Consumo de Estoque: para cada data, soma a contagem de registros únicos (sem repetir código)
    const consumoMap: Record<string, { totalContagem: number; uniqueCodes: Set<string> }> = {};
    setores.forEach((r: any) => {
      const date = r.data_feita;
      if (!consumoMap[date]) {
        consumoMap[date] = { totalContagem: 0, uniqueCodes: new Set() };
      }
      if (!consumoMap[date].uniqueCodes.has(r.codigo)) {
        consumoMap[date].uniqueCodes.add(r.codigo);
        consumoMap[date].totalContagem += Number(r.contagem) || 0;
      }
    });
    const consumoEstoque = Object.entries(consumoMap)
      .map(([date, { totalContagem }]) => ({ data_feita: date, totalContagem }))
      .sort((a, b) => parseDate(a.data_feita).getTime() - parseDate(b.data_feita).getTime());

    return NextResponse.json({
      totalRotativos,
      totalItensContados,
      totalDivergencia,
      ultimoRotativo,
      consumoEstoque,
      atividadeRecente: "a ser implementado"
    });
  } catch (error: any) {
    console.error("[API calculos_dashboard] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
