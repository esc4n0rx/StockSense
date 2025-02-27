// app/api/dados_colheita/route.ts
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  try {
    const host = process.env.MYSQL_HOST;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const database = process.env.MYSQL_DB;

    if (!host || !user || !password || !database) {
      return NextResponse.json(
        { success: false, message: 'Variáveis de ambiente não configuradas corretamente.' },
        { status: 500 }
      );
    }

    // Cria a conexão com SSL habilitado
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false }, // ATENÇÃO: isso ignora a validação do certificado
    });

    // Executa uma query simples para testar a conexão
    await connection.execute('SELECT 1');
    await connection.end();

    return NextResponse.json({ success: true, message: 'Conexão bem-sucedida com o MySQL via SSL.' });
  } catch (error: any) {
    console.error('Erro ao conectar ao MySQL:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao conectar ao MySQL: ' + error.message },
      { status: 500 }
    );
  }
}
