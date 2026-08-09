import { NextResponse } from 'next/server';

const ABLER_BASE_URL = process.env.ABLER_API_URL || 'https://hulk-smash.abler.com.br';
const ABLER_API_TOKEN = process.env.ABLER_API_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJjb21wYW55X2lkIjo1ODIsInRpbWVzdGFtcCI6MTc4NTU0MzMyNiwiY29tcGFueV91c2VyX2lkIjoxNDQyfQ.yPAeDlvUJ-20I-4Y1S3ehx5hdvMlVGVQsdg6Iq_SBro';

const DEFAULT_BENEFITS = [
  'Vale Transporte (VT)',
  'Vale Refeição (VR)',
  'Vale Alimentação (VA)',
  'Plano de Saúde',
  'Plano Odontológico',
  'Auxílio Home Office',
  'Seguro de Vida',
  'Gympass / Totalpass',
  'Participação nos Lucros (PLR)',
  'Auxílio Creche',
  'Horário Flexível',
  'Desconto em Cursos / Faculdades'
];

export async function GET() {
  try {
    const res = await fetch(`${ABLER_BASE_URL}/api/company/v1/collections/benefits`, {
      headers: {
        'Accept': 'application/json',
        'X-API-INT-TOKEN': ABLER_API_TOKEN,
      },
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        const ablerBenefits = json.data.map((item: any) => item?.attributes?.name).filter(Boolean);
        // Combina com os padrões garantindo que não haja duplicatas
        const combined = Array.from(new Set([...ablerBenefits, ...DEFAULT_BENEFITS]));
        return NextResponse.json({ benefits: combined });
      }
    }
    
    return NextResponse.json({ benefits: DEFAULT_BENEFITS });
  } catch (error) {
    console.error('Erro ao buscar benefícios da Abler:', error);
    return NextResponse.json({ benefits: DEFAULT_BENEFITS });
  }
}
