// ✅ API ajustada com envio de header contendo os dados do controle rotativo
// File: app/api/generate/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  console.log('--- Início da requisição ---');
  try {
    const requestBody = await req.json();
    console.log('Corpo da requisição recebido:', JSON.stringify(requestBody, null, 2));

    const { deposito, includeCorte, includeZerados, manualItems } = requestBody;
    if (!deposito) throw new Error("O campo 'deposito' é obrigatório.");

    const userDP01 = 'Usuário DP01';
    const userDP40 = 'Usuário DP40';
    const usuario = deposito === 'DP40' ? userDP40 : userDP01;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Credenciais do Supabase não configuradas.');

    const supabase = createClient(supabaseUrl, supabaseKey);
    let planilhaData: any[] = [];

    // Coleta de dados
    if (includeCorte) {
      const { data: corteDatas } = await supabase
        .from('ss_corte_geral')
        .select('data')
        .eq('dep', deposito)
        .order('data', { ascending: false })
        .limit(1);

      if (corteDatas?.length) {
        const maxData = corteDatas[0].data;
        const { data: corteRows } = await supabase
          .from('ss_corte_geral')
          .select('*')
          .eq('dep', deposito)
          .eq('data', maxData);

        const corteFinal = await Promise.all((corteRows || []).map(async (row) => {
          const { data: estoqueData } = await supabase
            .from('ss_estoque_wms')
            .select('pos_depos, umb')
            .eq('material', row.material)
            .maybeSingle();

          return {
            cod_posicao: estoqueData?.pos_depos || 'Posição não encontrada',
            material: row.material,
            descricao: row.descricao || '',
            um: estoqueData?.umb || '',
            deposito,
            usuario,
          };
        }));

        planilhaData.push(...corteFinal);
      }
    }

    if (includeZerados) {
      const { data: setoresDatas } = await supabase
        .from('ss_setores')
        .select('data_feita')
        .order('data_feita', { ascending: false })
        .limit(1);

      if (setoresDatas?.length) {
        const ultimaData = setoresDatas[0].data_feita;
        const { data: setoresZerados } = await supabase
          .from('ss_setores')
          .select('*')
          .eq('data_feita', ultimaData)
          .eq('contagem', 0);

        const zeradosFinal = (setoresZerados || []).map((row) => {
          const depCalc = row.endereco?.trim().toUpperCase().startsWith('H3C') ? 'DP40' : 'DP01';
          return {
            cod_posicao: row.endereco || 'Endereço não encontrado',
            material: row.codigo || 'Material não encontrado',
            descricao: row.descricao || '',
            um: row.um || '',
            deposito: depCalc,
            usuario: depCalc === 'DP40' ? userDP40 : userDP01,
          };
        });

        planilhaData.push(...zeradosFinal);
      }
    }

    if (manualItems?.length > 0) {
      const manuaisFinal = manualItems.map((item: { posicao?: string; material?: string; descricao?: string; um?: string }) => ({
        cod_posicao: item.posicao || 'Posição não informada',
        material: item.material || 'Material não informado',
        descricao: item.descricao || '',
        um: item.um || '',
        deposito,
        usuario,
      }));
      planilhaData.push(...manuaisFinal);
    }

    if (planilhaData.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado gerado.' }, { status: 400 });
    }

    const materiaisParaControle = planilhaData.map((item) => ({
      codigo: item.material,
      descricao: item.descricao,
      unidade_medida: item.um,
    }));

    const headerEncoded = Buffer.from(JSON.stringify(materiaisParaControle)).toString('base64');

    const worksheet = XLSX.utils.json_to_sheet(planilhaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rotativo');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="rotativo.xlsx"',
        'x-rotativo-data': headerEncoded,
      },
    });
  } catch (error: any) {
    console.error('[ERRO] Detalhes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}