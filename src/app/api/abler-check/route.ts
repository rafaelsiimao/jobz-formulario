import { NextRequest, NextResponse } from 'next/server';

const ABLER_API_URL = process.env.ABLER_API_URL || 'https://api.abler.com.br';
const ABLER_API_TOKEN = process.env.ABLER_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (!ABLER_API_TOKEN) {
      console.error('ABLER_API_TOKEN não configurado no servidor.');
      return NextResponse.json({ error: 'Erro de configuração interna do servidor.' }, { status: 500 });
    }

    const { cnpj } = await request.json();

    if (!cnpj) {
      return NextResponse.json({ error: 'O parâmetro CNPJ é obrigatório.' }, { status: 400 });
    }

    // A Abler aceita o CNPJ com ou sem pontuação, mas é melhor remover a pontuação só por garantia
    const cleanCnpj = cnpj.replace(/\D/g, '');

    const response = await fetch(`${ABLER_API_URL}/api/company/v1/customers?cnpj=${cleanCnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-INT-TOKEN': ABLER_API_TOKEN,
      },
      // Usar 'no-cache' para garantir que não vamos pegar um resultado antigo se a empresa acabou de ser criada
      cache: 'no-cache'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API Abler [${response.status}]:`, errorText);
      return NextResponse.json({ error: 'Erro ao consultar a base da Abler.' }, { status: response.status });
    }

    const data = await response.json();

    // Se a propriedade data vier vazia, a empresa não existe na Abler
    if (data.data && data.data.length > 0) {
      // Pega o ID do primeiro cliente retornado
      const customerId = data.data[0].id;
      return NextResponse.json({ exists: true, customerId });
    } else {
      return NextResponse.json({ exists: false, customerId: null });
    }

  } catch (error: any) {
    console.error('Exceção ao consultar Abler:', error.message);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
