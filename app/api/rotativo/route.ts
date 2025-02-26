// api/rotatio/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';


// Essa rota aceita uploads para "Nova Análise de Rotativo".
// Ela recebe um arquivo Excel com as colunas:
// cod_posicao, material, descricao, um, quantidade_informada, quantidade_contada, status, usuario, data_rotativo
// E mapeia para a tabela ss_setores conforme:
//   cod_posicao  -> endereco
//   material     -> codigo
//   descricao    -> descricao
//   um           -> um
//   quantidade_informada -> contagem
// (quantidade_contada e usuario são ignorados)
// Apenas registros com status igual a "contado" (case-insensitive) são processados.
// O campo data_feita será definido com a data atual de São Paulo.

function getCurrentSaoPauloDate(): string {
  const now = new Date();
  const saoPauloDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  const day = String(saoPauloDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Transforma um registro do Excel para o formato da tabela ss_setores.
 */
function transformRotativoRecord(record: any): any | null {
  const newRecord: any = {};
  // Trima as chaves e os valores
  for (const key in record) {
    const trimmedKey = key.trim();
    if (typeof record[key] === 'string') {
      newRecord[trimmedKey] = record[key].trim();
    } else {
      newRecord[trimmedKey] = record[key];
    }
  }
  
  // Filtra registros: somente os que têm status "contado"
  if (!newRecord.status || newRecord.status.toLowerCase() !== 'contado') {
    return null;
  }
  
  return {
    endereco: newRecord.cod_posicao,            // cod_posicao -> endereco
    codigo: newRecord.material,                  // material -> codigo
    descricao: newRecord.descricao,              // descricao -> descricao
    um: newRecord.um,                            // um -> um
    contagem: Number(newRecord.quantidade_informada) || 0, // quantidade_informada -> contagem
    data_feita: getCurrentSaoPauloDate(),         // data_feita = data atual de São Paulo
    // As demais colunas (qtd_cx, qtd_por_cx, saldo, diferenca, preco, v_ajuste, corte) ficam como NULL.
  };
}

/**
 * Retorna um tamanho de batch dinâmico conforme o total de linhas.
 */
function getBatchSize(total: number): number {
  if (total < 100) return 10;
  if (total < 500) return 50;
  return 100;
}

export async function POST(req: Request) {
  try {
    console.log('API /api/rotativo - Recebendo requisição de upload de Rotativo');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Campo "file" é obrigatório.' }, { status: 400 });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Credenciais do Supabase não configuradas.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('API /api/rotativo - Lendo arquivo Excel');
    const fileBuffer = await file.arrayBuffer();
    console.log(`API /api/rotativo - Tamanho do arquivo: ${fileBuffer.byteLength}`);
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    console.log(`API /api/rotativo - Número de linhas extraídas: ${jsonData.length}`);
    
    // Transforma e filtra os registros válidos
    const transformedData = jsonData
      .map(record => transformRotativoRecord(record))
      .filter((r) => r !== null);
    console.log(`API /api/rotativo - Registros válidos (status "contado"): ${transformedData.length}`);
    
    const totalRows = transformedData.length;
    const batchSize = getBatchSize(totalRows);
    console.log(`API /api/rotativo - Batch size definido: ${batchSize}`);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < totalRows; i += batchSize) {
            const batch = transformedData.slice(i, i + batchSize);
            console.log(`API /api/rotativo - Inserindo batch: linhas ${i} a ${i + batch.length}`);
            const { error } = await supabase.from('ss_setores').insert(batch);
            if (error) {
              console.error(`API /api/rotativo - Erro ao inserir batch a partir da linha ${i}:`, error);
              controller.enqueue(encoder.encode(`data: Erro ao inserir dados: ${error.message}\n\n`));
              controller.close();
              return;
            }
            const progress = Math.floor(((i + batch.length) / totalRows) * 100);
            console.log(`API /api/rotativo - Progresso: ${progress}% concluído`);
            controller.enqueue(encoder.encode(`data: ${progress}% concluído\n\n`));
          }
          controller.enqueue(encoder.encode(`data: Upload realizado com sucesso!\n\n`));
          controller.close();
        } catch (err: any) {
          console.error('API /api/rotativo - Erro no processamento do stream SSE:', err);
          controller.enqueue(encoder.encode(`data: Erro no processamento do upload: ${err.message}\n\n`));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error: any) {
    console.error('API /api/rotativo - Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    // Se necessário, implemente a consulta para análises de rotativo
    return NextResponse.json({ message: "GET não implementado para /api/rotativo" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
