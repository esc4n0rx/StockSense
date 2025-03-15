import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  console.log('--- Início da requisição ---');
  try {
    const requestBody = await req.json();
    console.log('Corpo da requisição:', JSON.stringify(requestBody, null, 2));
    
    const { deposito, includeCorte, includeZerados, manualItems } = requestBody;
    
    if (!deposito) {
      throw new Error("O campo 'deposito' é obrigatório.");
    }
    
    console.log(`Processando depósito: ${deposito}`);
    console.log(`Incluir corte: ${includeCorte}`);
    console.log(`Incluir zerados: ${includeZerados}`);
    console.log(`Itens manuais: ${manualItems?.length || 0}`);

    const userDP01 = "Usuário DP01";
    const userDP40 = "Usuário DP40";
    const usuario = deposito === "DP40" ? userDP40 : userDP01;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Credenciais do Supabase não configuradas.");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    let planilhaData: any[] = [];

    if (includeCorte) {
      console.log('Buscando dados de corte...');
      const { data: corteDatas, error: corteDataError } = await supabase
        .from('ss_corte_geral')
        .select('data')
        .eq('dep', deposito)
        .order('data', { ascending: false })
        .limit(1);

      if (corteDataError) {
        console.error("Erro ao buscar data de corte:", corteDataError);
        throw new Error("Falha ao buscar data de corte");
      }

      if (corteDatas && corteDatas.length > 0) {
        const maxData = corteDatas[0].data;
        console.log(`Última data de corte encontrada: ${maxData}`);

        const { data: corteRows, error: corteError } = await supabase
          .from('ss_corte_geral')
          .select('*')
          .eq('dep', deposito)
          .eq('data', maxData);

        if (corteError) {
          console.error("Erro ao buscar registros de corte:", corteError);
          throw new Error("Falha ao buscar dados de corte");
        }

        console.log(`Encontrados ${corteRows?.length || 0} itens de corte`);
        
        for (const row of corteRows || []) {
          const material = row.material;
          const descricao = row.descricao || "";
          const { data: estoqueData, error: estoqueError } = await supabase
            .from('ss_estoque_wms')
            .select('pos_depos, umb')
            .eq('material', material)
            .maybeSingle();

          if (estoqueError) {
            console.error(`Erro ao buscar estoque para material ${material}:`, estoqueError);
          }

          planilhaData.push({
            cod_posicao: estoqueData?.pos_depos || "Posição não encontrada",
            material,
            descricao,
            um: estoqueData?.umb || "",
            deposito,
            usuario,
          });
        }
      }
    }

    if (includeZerados) {
      console.log('Buscando itens zerados...');
      const { data: setoresDatas, error: setoresDataError } = await supabase
        .from('ss_setores')
        .select('data_feita')
        .order('data_feita', { ascending: false })
        .limit(1);

      if (setoresDataError) {
        console.error("Erro ao buscar datas em ss_setores:", setoresDataError);
        throw new Error("Falha ao buscar dados de setores");
      }

      if (setoresDatas && setoresDatas.length > 0) {
        const ultimaData = setoresDatas[0].data_feita;
        console.log(`Última data de setores: ${ultimaData}`);

        const { data: setoresZerados, error: setoresZeradosError } = await supabase
          .from('ss_setores')
          .select('*')
          .eq('data_feita', ultimaData)
          .eq('contagem', 0);

        if (setoresZeradosError) {
          console.error("Erro ao buscar zerados:", setoresZeradosError);
          throw new Error("Falha ao buscar itens zerados");
        }

        console.log(`Encontrados ${setoresZerados?.length || 0} itens zerados`);
        
        for (const row of setoresZerados || []) {
          const depCalc = row.endereco?.trim().toUpperCase().startsWith("H3C") ? "DP40" : "DP01";
          planilhaData.push({
            cod_posicao: row.endereco || "Endereço não encontrado",
            material: row.codigo || "Material não encontrado",
            descricao: row.descricao || "",
            um: row.um || "",
            deposito: depCalc,
            usuario: depCalc === "DP40" ? userDP40 : userDP01,
          });
        }
      }
    }

    if (manualItems?.length > 0) {
      console.log('Processando itens manuais...');
      for (const item of manualItems) {
        planilhaData.push({
          cod_posicao: item.posicao || "Posição não informada",
          material: item.material || "Material não informado",
          descricao: item.descricao || "",
          um: item.um || "",
          deposito,
          usuario,
        });
      }
    }

    console.log(`Total de registros gerados: ${planilhaData.length}`);


    const materiaisParaControle = planilhaData.map(item => ({
      codigo: item.material,
      descricao: item.descricao,
      unidade_medida: item.um,
    }));


    try {
      const respostaControle = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/controle_rotativo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          materiais: materiaisParaControle
        })
      });
    
      if (!respostaControle.ok) {
        console.error('[AVISO] Falha ao registrar materiais no controle rotativo');
        const erro = await respostaControle.json();
        console.error(erro);
      } else {
        console.log('[INFO] Materiais registrados no controle rotativo com sucesso.');
      }
    } catch (e) {
      console.error('[ERRO] Erro ao fazer requisição para controle rotativo:', e);
    }



    if (planilhaData.length === 0) {
      return NextResponse.json({ error: "Nenhum dado gerado com as opções selecionadas." }, { status: 400 });
    }

    const worksheet = XLSX.utils.json_to_sheet(planilhaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rotativo");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    console.log('Planilha gerada com sucesso');

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="rotativo.xlsx"',
      },
    });

  } catch (error: any) {
    console.error("[ERRO] Detalhes do erro:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    console.log('--- Fim da requisição ---\n');
  }
}