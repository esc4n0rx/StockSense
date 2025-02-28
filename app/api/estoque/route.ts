// app/api/estoque/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const uploadType = formData.get('type')?.toString();
    const file = formData.get('file') as File;
    if (!uploadType || !file) {
      console.error('Campos "type" e "file" são obrigatórios.');
      return NextResponse.json({ error: 'Campos "type" e "file" são obrigatórios.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Credenciais do Supabase não configuradas.');
      return NextResponse.json({ error: 'Credenciais do Supabase não configuradas.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define a tabela e a transformação de colunas conforme o tipo de upload
    let table = '';
    let transformRecord: (record: any) => any;

    switch (uploadType) {
      case 'estoque_wms':
        table = 'ss_estoque_wms';
        // Mantém a transformação já existente para estoque_wms (ajuste conforme necessário)
        transformRecord = (record: any) => {
          const newRecord: any = {};
          for (const key in record) {
            newRecord[key.trim()] = typeof record[key] === 'string' ? record[key].trim() : record[key];
          }
          // Exemplo: conversão de data_em
          if (newRecord.data_em && typeof newRecord.data_em === 'string') {
            const parts = newRecord.data_em.split('.');
            if (parts.length === 3) {
              newRecord.data_em = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          return newRecord;
        };
        break;
      case 'estoque_mm':
        table = 'ss_estoque_mm';
        // Mapeia as colunas conforme a estrutura de ss_estoque_mm
        transformRecord = (record: any) => {
          const newRecord: any = {};
          // Trima as chaves e valores
          for (const key in record) {
            newRecord[key.trim()] = typeof record[key] === 'string' ? record[key].trim() : record[key];
          }
          // Conversão de datas para data_em e data_ate (assume o formato "dd.mm.yyyy")
          if (newRecord.data_em && typeof newRecord.data_em === 'string') {
            const parts = newRecord.data_em.split('.');
            if (parts.length === 3) {
              newRecord.data_em = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          if (newRecord.data_ate && typeof newRecord.data_ate === 'string') {
            const parts = newRecord.data_ate.split('.');
            if (parts.length === 3) {
              newRecord.data_ate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          // Conversão numérica para saldo_inicial, qtds_entrada, qtds_saida
          newRecord.saldo_inicial = newRecord.saldo_inicial ? Number(newRecord.saldo_inicial) : 0;
          newRecord.qtds_entrada = newRecord.qtds_entrada ? Number(newRecord.qtds_entrada) : 0;
          newRecord.qtds_saida = newRecord.qtds_saida ? Number(newRecord.qtds_saida) : 0;
          // estoque_final e umb são mantidos como strings
          return newRecord;
        };
        break;
      case 'corte':
        table = 'ss_corte_geral';
        // Mapeia as colunas conforme a estrutura de ss_corte_geral
        transformRecord = (record: any) => {
          const newRecord: any = {};
          for (const key in record) {
            newRecord[key.trim()] = typeof record[key] === 'string' ? record[key].trim() : record[key];
          }
          // Converte a data para o formato ISO, se necessário (assume formato "dd.mm.yyyy")
          if (newRecord.data && typeof newRecord.data === 'string') {
            const parts = newRecord.data.split('.');
            if (parts.length === 3) {
              newRecord.data = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          // A coluna "quantidade" deve ser numérica
          newRecord.quantidade = newRecord.quantidade ? Number(newRecord.quantidade) : 0;
          return newRecord;
        };
        break;
      default:
        console.error('Tipo de upload inválido:', uploadType);
        return NextResponse.json({ error: 'Tipo de upload inválido.' }, { status: 400 });
    }

    // Lê e converte o arquivo Excel
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const totalRows = jsonData.length;
    const batchSize = 100;
    const transformedData = jsonData.map(record => transformRecord(record));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < totalRows; i += batchSize) {
            const batch = transformedData.slice(i, i + batchSize);
            try {
              const { error } = await supabase.from(table).insert(batch);
              if (error) {
                controller.enqueue(encoder.encode(`data: Erro ao inserir dados: ${error.message}\n\n`));
                controller.close();
                return;
              }
            } catch (e: any) {
              controller.enqueue(encoder.encode(`data: Exceção ao inserir dados: ${e.message}\n\n`));
              controller.close();
              return;
            }
            const progress = Math.min(100, Math.floor(((i + batch.length) / totalRows) * 100));
            controller.enqueue(encoder.encode(`data: ${progress}% concluído\n\n`));
          }
          controller.enqueue(encoder.encode(`data: Upload concluído com sucesso!\n\n`));
          controller.close();
        } catch (err: any) {
          console.error('Erro durante o processamento do upload:', err);
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
    console.error('Erro geral na API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tableParam = searchParams.get("table");
    if (!tableParam) {
      return NextResponse.json({ error: "Parâmetro 'table' é obrigatório" }, { status: 400 });
    }
    const allowedTables = ["ss_estoque_wms", "ss_estoque_mm", "ss_corte_geral"];
    if (!allowedTables.includes(tableParam)) {
      return NextResponse.json({ error: "Tabela inválida" }, { status: 400 });
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Credenciais do Supabase não configuradas." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from(tableParam).select("*");
    if (error) {
      console.error("Erro ao buscar dados:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Erro geral na API (GET):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
