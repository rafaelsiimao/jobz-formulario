import { NextRequest, NextResponse } from 'next/server';

const AGENDOR_API_TOKEN = process.env.AGENDOR_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cnpj = (body.cnpj || '').replace(/\D/g, '');

    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json({ found: false, error: 'CNPJ inválido.' }, { status: 400 });
    }

    if (!AGENDOR_API_TOKEN) {
      console.error('AGENDOR_API_TOKEN não configurado.');
      return NextResponse.json({ found: false, error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    const agendorRes = await fetch(
      `https://api.agendor.com.br/v3/organizations?cnpj=${cnpj}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${AGENDOR_API_TOKEN}`,
        },
      }
    );

    if (!agendorRes.ok) {
      console.error(`Agendor API retornou ${agendorRes.status}`);
      return NextResponse.json({ found: false, error: 'Erro ao consultar CRM.' }, { status: 502 });
    }

    const data = await agendorRes.json();

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const org = data.data[0];
      return NextResponse.json({
        found: true,
        name: org.name || org.legalName || 'Empresa encontrada',
        id: org.id,
      });
    }

    return NextResponse.json({ found: false });
  } catch (error: any) {
    console.error('Erro na rota /api/agendor-lookup:', error?.message);
    return NextResponse.json({ found: false, error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
