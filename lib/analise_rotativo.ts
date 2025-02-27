// lib/analise_rotativo.ts
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface RotativoAnalysis {
  qtd_por_cx: number;
  saldo: number;
  diferenca: number;
  preco: number;
  v_ajuste: number;
  corte: string;
  setor: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Processa em lote um array de registros da tabela ss_setores.
 * Realiza consultas em batch para cada tabela necessária e junta os resultados.
 */
export async function analyzeRotativosBatch(rows: any[]): Promise<any[]> {
  // Extrai os códigos únicos, garantindo que o campo 'codigo' esteja definido
  const codigos = Array.from(new Set(rows.map(r => r.codigo).filter((c: string) => c)));

  const codigosCurto = codigos.filter(c => c.length <= 6);
  const codigosLongo = codigos.filter(c => c.length > 6);

  let dadosCurto: Record<string, number> = {};
  if (codigosCurto.length > 0) {
    const { data, error } = await supabase
      .from('ss_dados_cadastral')
      .select('material, qtd_cx')
      .in('material', codigosCurto);
    if (!error && data) {
      data.forEach((item: any) => {
        if (item.material) {
          dadosCurto[item.material] = Number(item.qtd_cx) || 0;
        }
      });
    }
  }

  let dadosLongoEan1: Record<string, number> = {};
  if (codigosLongo.length > 0) {
    const { data, error } = await supabase
      .from('ss_dados_cadastral')
      .select('ean1, qtd_cx')
      .in('ean1', codigosLongo);
    if (!error && data) {
      data.forEach((item: any) => {
        if (item.ean1) {
          dadosLongoEan1[item.ean1] = Number(item.qtd_cx) || 0;
        }
      });
    }
  }

  let dadosLongoEan2: Record<string, number> = {};
  const codigosLongoNaoEncontrados = codigosLongo.filter(c => !(c in dadosLongoEan1));
  if (codigosLongoNaoEncontrados.length > 0) {
    const { data, error } = await supabase
      .from('ss_dados_cadastral')
      .select('ean2, qtd_cx')
      .in('ean2', codigosLongoNaoEncontrados);
    if (!error && data) {
      data.forEach((item: any) => {
        if (item.ean2) {
          dadosLongoEan2[item.ean2] = Number(item.qtd_cx) || 0;
        }
      });
    }
  }

  let estoqueWms: Record<string, number> = {};
  if (codigos.length > 0) {
    const { data, error } = await supabase
      .from('ss_estoque_wms')
      .select('material, estoque_disponivel')
      .in('material', codigos);
    if (!error && data) {
      data.forEach((item: any) => {
        if (item.material) {
          estoqueWms[item.material] = Number(item.estoque_disponivel) || 0;
        }
      });
    }
  }

  let mm60: Record<string, number> = {};
  if (codigos.length > 0) {
    const { data, error } = await supabase
      .from('ss_mm60')
      .select('material, preco')
      .in('material', codigos);
    if (!error && data) {
      data.forEach((item: any) => {
        if (item.material) {
          mm60[item.material] = Number(item.preco) || 0;
        }
      });
    }
  }

  let corteData: Record<string, string> = {};
  if (codigos.length > 0) {
    const { data, error } = await supabase
      .from('ss_corte_geral')
      .select('material, data')
      .in('material', codigos)
      .order('data', { ascending: false });
    if (!error && data) {
      data.forEach((item: any) => {
        if (item.material && item.data && !corteData[item.material]) {
          corteData[item.material] = item.data;
        }
      });
    }
  }

  const updatedRows = rows.map(row => {
    const codigo = row.codigo;
    const contagem = Number(row.contagem) || 0;
    let qtd_por_cx = 0;
    if (codigo.length <= 6) {
      qtd_por_cx = dadosCurto[codigo] || 0;
    } else {
      qtd_por_cx = dadosLongoEan1[codigo] || dadosLongoEan2[codigo] || 0;
    }
    const saldo = estoqueWms[codigo] || 0;
    const preco = mm60[codigo] || 0;
    const diferenca = contagem - saldo;
    const v_ajuste = diferenca * preco;
    const corte = corteData[codigo] || "";
    const setor = (row.endereco || "").trim().toUpperCase().startsWith("H3C") ? "Perecíveis" : "Mercearia";
    return { ...row, qtd_por_cx, saldo, diferenca, preco, v_ajuste, corte, setor };
  });

  return updatedRows;
}
