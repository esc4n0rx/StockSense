import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';



const allowedTables = ['ss_rotativo', 'ss_dados_cadastral', 'ss_mm60','ss_setores'];

/**
 * Converte data e hora do formato "DD/MM/YYYY HH:mm:ss" para "YYYY-MM-DD HH:mm:ss".
 */
function convertDateTime(dateStr: string): string {
  const [datePart, timePart] = dateStr.split(" ");
  if (!datePart || !timePart) return dateStr;
  const [day, month, year] = datePart.split("/");
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`;
}

/**
 * Transforma um registro conforme a tabela alvo.
 */
function transformRecord(record: any, table: string): any {
  const newRecord: any = {};
  // Remover espaços em branco das strings.
  for (const key in record) {
    if (typeof record[key] === 'string') {
      newRecord[key] = record[key].trim();
    } else {
      newRecord[key] = record[key];
    }
  }
  
  if (table === 'ss_rotativo') {
    // Converte data_rotativo do formato "DD/MM/YYYY HH:mm:ss" para ISO.
    if (newRecord.data_rotativo && typeof newRecord.data_rotativo === 'string') {
      newRecord.data_rotativo = convertDateTime(newRecord.data_rotativo);
    }
    // Converte quantidades para números.
    newRecord.quantidade_informada = Number(newRecord.quantidade_informada) || 0;
    newRecord.quantidade_contada = Number(newRecord.quantidade_contada) || 0;
  } else if (table === 'ss_mm60') {
    // Converte datas para ult_modif e criado_a.
    if (newRecord.ult_modif && typeof newRecord.ult_modif === 'string') {
      newRecord.ult_modif = convertDateTime(newRecord.ult_modif);
    }
    if (newRecord.criado_a && typeof newRecord.criado_a === 'string') {
      newRecord.criado_a = convertDateTime(newRecord.criado_a);
    }
    // Converte campos numéricos.
    newRecord.gcm = Number(newRecord.gcm) || 0;
    newRecord.clav = Number(newRecord.clav) || 0;
    newRecord.preco = Number(newRecord.preco) || 0;
  }
  // Para ss_dados_cadastral, apenas o trim é aplicado (pode ser estendido conforme necessário)
  
  return newRecord;
}

// Rota POST: upload dos dados
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const table = formData.get('table')?.toString();
    const file = formData.get('file') as File;
    if (!table || !file) {
      return NextResponse.json(
        { error: 'Campos "table" e "file" são obrigatórios.' },
        { status: 400 }
      );
    }
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: 'Tabela inválida.' }, { status: 400 });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Credenciais do Supabase não configuradas.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Lê o arquivo Excel e converte para JSON.
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    // Aplica transformação para cada registro.
    const transformedData = jsonData.map(record => transformRecord(record, table));
    
    // Insere os dados em lotes.
    const batchSize = 100;
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      const { error } = await supabase.from(table).insert(batch);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ message: 'Upload realizado com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Rota GET: consulta dos dados
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");
    if (!table) {
      return NextResponse.json({ error: "Parâmetro 'table' é obrigatório." }, { status: 400 });
    }
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Credenciais do Supabase não configuradas." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("data_feita", { ascending: false }); // Ordena por data decrescente

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
