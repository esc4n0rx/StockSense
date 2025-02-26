// app/api/calculos/route.ts
import { NextResponse } from 'next/server';
import { analyzeRotativosBatch } from '@/lib/analise_rotativo';

export async function POST(req: Request) {
  try {
    console.log('[API calculos] Recebendo requisição em batch');
    const { data } = await req.json(); // espera { data: [...] }
    console.log('[API calculos] Dados recebidos:', data);
    if (!Array.isArray(data)) {
      throw new Error("O campo 'data' deve ser um array");
    }
    
    const total = data.length;
    const results = await analyzeRotativosBatch(data);
    console.log('[API calculos] Processamento finalizado para ' + total + " registros");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: 100% - Processado ${total} de ${total}\n\n`));
        controller.enqueue(encoder.encode(`data: Upload realizado com sucesso!\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(results)}\n\n`));
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error('[API calculos] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
