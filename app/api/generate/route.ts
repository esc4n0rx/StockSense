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

    // Processar dados de corte
    if (includeCorte) {
      console.log('[CORTE] Buscando data mais recente...');
      const { data: corteDatas, error: corteDataError } = await supabase
        .from('ss_corte_geral')
        .select('data')
        .eq('dep', deposito)
        .order('data', { ascending: false })
        .limit(1);

      if (corteDataError) throw new Error('Erro ao buscar data de corte');
      if (corteDatas?.length) {
        const maxData = corteDatas[0].data;
        console.log(`[CORTE] Última data encontrada: ${maxData}`);

        const { data: corteRows, error: corteError } = await supabase
          .from('ss_corte_geral')
          .select('*')
          .eq('dep', deposito)
          .eq('data', maxData);

        if (corteError) throw new Error('Erro ao buscar registros de corte');
        console.log(`[CORTE] Registros encontrados: ${corteRows?.length}`);

        const cortePromessas = corteRows.map(async (row) => {
          const { data: estoqueData, error: estoqueError } = await supabase
            .from('ss_estoque_wms')
            .select('pos_depos, umb')
            .eq('material', row.material)
            .maybeSingle();

          if (estoqueError) console.warn(`[CORTE] Falha ao buscar estoque do material ${row.material}`);

          return {
            cod_posicao: estoqueData?.pos_depos || 'Posição não encontrada',
            material: row.material,
            descricao: row.descricao || '',
            um: estoqueData?.umb || '',
            deposito,
            usuario,
          };
        });

        const corteFinal = await Promise.all(cortePromessas);
        planilhaData.push(...corteFinal);
      }
    }

    // Processar itens zerados
    if (includeZerados) {
      console.log('[ZERADOS] Buscando data mais recente...');
      const { data: setoresDatas, error: setoresDataError } = await supabase
        .from('ss_setores')
        .select('data_feita')
        .order('data_feita', { ascending: false })
        .limit(1);

      if (setoresDataError) throw new Error('Erro ao buscar datas de setores');
      if (setoresDatas?.length) {
        const ultimaData = setoresDatas[0].data_feita;
        console.log(`[ZERADOS] Última data encontrada: ${ultimaData}`);

        const { data: setoresZerados, error: setoresZeradosError } = await supabase
          .from('ss_setores')
          .select('*')
          .eq('data_feita', ultimaData)
          .eq('contagem', 0);

        if (setoresZeradosError) throw new Error('Erro ao buscar itens zerados');
        console.log(`[ZERADOS] Registros encontrados: ${setoresZerados?.length}`);

        const zeradosFinal = setoresZerados.map((row) => {
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

    // Itens manuais
    if (manualItems?.length > 0) {
      console.log('[MANUAIS] Adicionando itens manuais...');
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
      return NextResponse.json({ error: 'Nenhum dado gerado com as opções selecionadas.' }, { status: 400 });
    }

    console.log(`[PLANILHA] Total de registros finais: ${planilhaData.length}`);

    // Enviar dados para API de controle rotativo ANTES do retorno
    console.log('[CONTROLE ROTATIVO] Enviando dados antes do return...');
    const materiaisParaControle = planilhaData.map((item) => ({
      codigo: item.material,
      descricao: item.descricao,
      unidade_medida: item.um,
    }));

    try {
      const respostaControle = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/controle_rotativo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materiais: materiaisParaControle }),
      });

      if (!respostaControle.ok) {
        const erro = await respostaControle.json();
        console.warn('[CONTROLE ROTATIVO] Falha no POST:', erro);
      } else {
        const sucesso = await respostaControle.json();
        console.log('[CONTROLE ROTATIVO] Dados inseridos com sucesso:', sucesso);
      }
    } catch (e) {
      console.error('[CONTROLE ROTATIVO] Erro ao enviar para API:', e);
    }

    // Geração da planilha
    const worksheet = XLSX.utils.json_to_sheet(planilhaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rotativo');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    console.log('[PLANILHA] Planilha gerada com sucesso. Retornando ao cliente...');

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="rotativo.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('[ERRO] Detalhes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    console.log('--- Fim da requisição ---');
  }
}
