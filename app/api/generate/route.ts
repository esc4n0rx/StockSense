// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  try {
    const { deposito, incluirCorte, incluirZerados, incluirManual, manualItems } = await req.json();
    if (!deposito) {
      throw new Error("O campo 'deposito' é obrigatório.");
    }
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

    if (incluirCorte) {
      const { data: corteDatas, error: corteDataError } = await supabase
        .from('ss_corte_geral')
        .select('data')
        .eq('dep', deposito)
        .order('data', { ascending: false })
        .limit(1);
      if (corteDataError) {
        console.error("Erro ao buscar data de corte:", corteDataError.message);
      } else if (corteDatas && corteDatas.length > 0) {
        const maxData = corteDatas[0].data;
        const { data: corteRows, error: corteError } = await supabase
          .from('ss_corte_geral')
          .select('*')
          .eq('dep', deposito)
          .eq('data', maxData);
        if (corteError) {
          console.error("Erro ao buscar registros de corte:", corteError.message);
        } else if (corteRows) {
          for (const row of corteRows) {
            const material = row.material;
            const descricao = row.descricao || "";
            const { data: estoqueData, error: estoqueError } = await supabase
              .from('ss_estoque_wms')
              .select('pos_depos, umb')
              .eq('material', material)
              .maybeSingle();
            let cod_posicao = "Posição não encontrada";
            let um = "";
            if (!estoqueError && estoqueData) {
              if (estoqueData.pos_depos) cod_posicao = estoqueData.pos_depos;
              if (estoqueData.umb) um = estoqueData.umb;
            }
            planilhaData.push({
              cod_posicao,
              material,
              descricao,
              um,
              deposito,
              usuario,
            });
          }
        }
      }
    }

    if (incluirZerados) {
      const { data: setoresDatas, error: setoresDataError } = await supabase
        .from('ss_setores')
        .select('data_feita')
        .order('data_feita', { ascending: false })
        .limit(1);
      if (setoresDataError) {
        console.error("Erro ao buscar data em ss_setores:", setoresDataError.message);
      } else if (setoresDatas && setoresDatas.length > 0) {
        const ultimaData = setoresDatas[0].data_feita;
        const { data: setoresZerados, error: setoresZeradosError } = await supabase
          .from('ss_setores')
          .select('*')
          .eq('data_feita', ultimaData)
          .eq('contagem', 0);
        if (setoresZeradosError) {
          console.error("Erro ao buscar registros zerados:", setoresZeradosError.message);
        } else if (setoresZerados) {
          for (const row of setoresZerados) {
            const depCalc = row.endereco && row.endereco.trim().toUpperCase().startsWith("H3C") ? "DP40" : "DP01";
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
    }

    if (incluirManual && Array.isArray(manualItems)) {
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

    if (planilhaData.length === 0) {
      return NextResponse.json({ error: "Nenhum dado gerado com as opções selecionadas." }, { status: 400 });
    }

    const worksheet = XLSX.utils.json_to_sheet(planilhaData, { header: ["cod_posicao", "material", "descricao", "um", "deposito", "usuario"] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rotativo");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="rotativo.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("[API generate] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
