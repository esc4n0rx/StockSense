// lib/analise_rotativo.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';


const logFilePath = path.join(process.cwd(), 'logs_analise_rotativo.txt');


function logToFile(message: string): void {
  const timestamp = new Date().toISOString();
   fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
}

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
 * Para otimizar, realiza consultas em batch para cada tabela necessária e junta os resultados.
 */
export async function analyzeRotativosBatch(rows: any[]): Promise<any[]> {
   logToFile(`[analyzeRotativosBatch] Iniciando processamento em lote para ${rows.length} registros.`);

  // Extrai os códigos únicos (garante que o campo 'codigo' esteja definido)
  const codigos = Array.from(new Set(rows.map(r => r.codigo).filter((c: string) => c)));
   logToFile(`[analyzeRotativosBatch] Codigos únicos: ${JSON.stringify(codigos)}`);

  // Separe os códigos em dois grupos:
  const codigosCurto = codigos.filter(c => c.length <= 6);
  const codigosLongo = codigos.filter(c => c.length > 6);

  // Consulta em ss_dados_cadastral para códigos curtos (usando o campo "material")
  let dadosCurto: Record<string, number> = {};
  if (codigosCurto.length > 0) {
    const { data, error } = await supabase
      .from('ss_dados_cadastral')
      .select('material, qtd_cx')
      .in('material', codigosCurto);
    if (error) {
      logToFile(`[analyzeRotativosBatch] Erro na consulta ss_dados_cadastral (material): ${error.message}`);
    } else if (data) {
      data.forEach((item: any) => {
        if (item.material) {
          dadosCurto[item.material] = Number(item.qtd_cx) || 0;
        }
      });
    }
  }
logToFile(`[analyzeRotativosBatch] Resultado ss_dados_cadastral (material): ${JSON.stringify(dadosCurto)}`);

  // Consulta para códigos longos: primeiro usando ean1
  let dadosLongoEan1: Record<string, number> = {};
  if (codigosLongo.length > 0) {
    const { data, error } = await supabase
      .from('ss_dados_cadastral')
      .select('ean1, qtd_cx')
      .in('ean1', codigosLongo);
    if (error) {
 logToFile(`[analyzeRotativosBatch] Erro na consulta ss_dados_cadastral (ean1): ${error.message}`);
    } else if (data) {
      data.forEach((item: any) => {
        if (item.ean1) {
          dadosLongoEan1[item.ean1] = Number(item.qtd_cx) || 0;
        }
      });
    }
  }
logToFile(`[analyzeRotativosBatch] Resultado ss_dados_cadastral (ean1): ${JSON.stringify(dadosLongoEan1)}`);

  // Para os códigos longos que não foram encontrados com ean1, tentar com ean2
  let dadosLongoEan2: Record<string, number> = {};
  const codigosLongoNaoEncontrados = codigosLongo.filter(c => !(c in dadosLongoEan1));
  if (codigosLongoNaoEncontrados.length > 0) {
    const { data, error } = await supabase
      .from('ss_dados_cadastral')
      .select('ean2, qtd_cx')
      .in('ean2', codigosLongoNaoEncontrados);
    if (error) {
 logToFile(`[analyzeRotativosBatch] Erro na consulta ss_dados_cadastral (ean2): ${error.message}`);
    } else if (data) {
      data.forEach((item: any) => {
        if (item.ean2) {
          dadosLongoEan2[item.ean2] = Number(item.qtd_cx) || 0;
        }
      });
    }
  }
logToFile(`[analyzeRotativosBatch] Resultado ss_dados_cadastral (ean2): ${JSON.stringify(dadosLongoEan2)}`);

  // Consulta para ss_estoque_wms para todos os códigos
  let estoqueWms: Record<string, number> = {};
  if (codigos.length > 0) {
    const { data, error } = await supabase
      .from('ss_estoque_wms')
      .select('material, estoque_disponivel')
      .in('material', codigos);
    if (error) {
logToFile(`[analyzeRotativosBatch] Erro na consulta ss_estoque_wms: ${error.message}`);
    } else if (data) {
      data.forEach((item: any) => {
        if (item.material) {
          estoqueWms[item.material] = Number(item.estoque_disponivel) || 0;
        }
      });
    }
  }
logToFile(`[analyzeRotativosBatch] Resultado ss_estoque_wms: ${JSON.stringify(estoqueWms)}`);

  // Consulta para ss_mm60 para todos os códigos
  let mm60: Record<string, number> = {};
  if (codigos.length > 0) {
    const { data, error } = await supabase
      .from('ss_mm60')
      .select('material, preco')
      .in('material', codigos);
    if (error) {
logToFile(`[analyzeRotativosBatch] Erro na consulta ss_mm60: ${error.message}`);
    } else if (data) {
      data.forEach((item: any) => {
        if (item.material) {
          mm60[item.material] = Number(item.preco) || 0;
        }
      });
    }
  }
logToFile(`[analyzeRotativosBatch] Resultado ss_mm60: ${JSON.stringify(mm60)}`);

  // Consulta para ss_corte_geral para todos os códigos (agrupando por material e pegando a data máxima)
  let corteData: Record<string, string> = {};
  if (codigos.length > 0) {
    const { data, error } = await supabase
      .from('ss_corte_geral')
      .select('material, data')
      .in('material', codigos)
      .order('data', { ascending: false });
    if (error) {
logToFile(`[analyzeRotativosBatch] Erro na consulta ss_corte_geral: ${error.message}`);
    } else if (data) {
      data.forEach((item: any) => {
        if (item.material && item.data && !corteData[item.material]) {
          corteData[item.material] = item.data;
        }
      });
    }
  }
logToFile(`[analyzeRotativosBatch] Resultado ss_corte_geral: ${JSON.stringify(corteData)}`);

  // Para cada registro, juntar os resultados obtidos
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

  logToFile(`[analyzeRotativosBatch] Processamento finalizado. Total registros processados: ${updatedRows.length}`);
  return updatedRows;
}
