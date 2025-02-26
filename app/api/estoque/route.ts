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
      return NextResponse.json(
        { error: 'Campos "type" e "file" são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Credenciais do Supabase não configuradas.');
      return NextResponse.json(
        { error: 'Credenciais do Supabase não configuradas.' },
        { status: 500 }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    let table = '';
    switch (uploadType) {
      case 'estoque_wms':
        table = 'ss_estoque_wms';
        break;
      case 'estoque_mm':
        table = 'ss_estoque_mm';
        break;
      case 'corte':
        table = 'ss_corte_geral';
        break;
      default:
        console.error('Tipo de upload inválido:', uploadType);
        return NextResponse.json(
          { error: 'Tipo de upload inválido.' },
          { status: 400 }
        );
    }

    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const totalRows = jsonData.length;
    const batchSize = 100;

    const transformedData = jsonData.map((record) => {
      const newRecord: any = {};
      for (const key in record) {
        if (typeof record[key] === 'string') {
          newRecord[key] = record[key].trim();
        } else {
          newRecord[key] = record[key];
        }
      }
      newRecord.nro_estoque_especial =
        newRecord.nro_estoque_especial === '' || newRecord.nro_estoque_especial === null
          ? 0
          : parseInt(newRecord.nro_estoque_especial, 10);

      if (newRecord.data_em && typeof newRecord.data_em === 'string') {
        const parts = newRecord.data_em.split('.');
        if (parts.length === 3) {
          newRecord.data_em = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return newRecord;
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Inserindo registro de teste');
          const testRecord = [
            {
              material: "1",
              centro: "TESTE",
              dep: "TESTE",
              t: "",
              lote: "",
              e: "",
              nro_estoque_especial: 0,
              texto_breve_material: "TESTE MATERIAL",
              tp: "D01",
              pos_depos: 1,
              estoque_disponivel: 1,
              umb: "KG",
              data_em: "2024-02-05"
            }
          ];
          const { error: testError } = await supabase.from(table).insert(testRecord);
          if (testError) {
            console.error('Erro ao inserir registro de teste:', testError);
            controller.enqueue(encoder.encode(`data: Erro ao inserir registro de teste: ${testError.message}\n\n`));
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(`data: Registro de teste inserido com sucesso. Iniciando upload real.\n\n`));

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
          console.error('Erro durante o processamento do stream SSE:', err);
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
      return NextResponse.json(
        { error: "Parâmetro 'table' é obrigatório" },
        { status: 400 }
      );
    }
    const allowedTables = ["ss_estoque_wms", "ss_estoque_mm", "ss_corte_geral"];
    if (!allowedTables.includes(tableParam)) {
      return NextResponse.json(
        { error: "Tabela inválida" },
        { status: 400 }
      );
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas." },
        { status: 500 }
      );
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
