import { NextRequest, NextResponse } from 'next/server';
import { JobzFormData } from '@/types/jobz-form';

const ABLER_BASE_URL = process.env.ABLER_API_URL || 'https://hulk-smash.abler.com.br';
const ABLER_API_TOKEN = process.env.ABLER_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const formData: JobzFormData = await request.json();

    if (!ABLER_API_TOKEN) {
      console.error('ABLER_API_TOKEN não configurado.');
      return NextResponse.json({ success: false, error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    // Montar o payload da vaga para a Abler API V2
    const vacancyPayload = {
      vacancy: {
        title: formData.jobDetails.tituloCargo || `Vaga ${formData.jobDetails.modeloContrato} - ${formData.clientIdentity.razaoSocial}`,
        contracting_regime: formData.jobDetails.modeloContrato === 'PJ' ? 'pj' : 'clt',
        seniority_level: mapSeniorityLevel(formData.jobDetails.nivel),
        number_of_positions: formData.jobDetails.quantidadeVagas || 1,
        role_description: formData.jobDetails.responsabilidades || 'Conforme briefing do cliente.',
        salary: parseSalary(formData.jobDetails.faixaSalarial),
        work_type: mapWorkModel(formData.jobDetails.modeloTrabalho),
        status: 'draft',
      },
    };

    const ablerRes = await fetch(`${ABLER_BASE_URL}/api/company/v1/vacancies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-INT-TOKEN': ABLER_API_TOKEN,
      },
      body: JSON.stringify(vacancyPayload),
    });

    if (!ablerRes.ok) {
      const errorText = await ablerRes.text();
      console.error(`Abler API retornou ${ablerRes.status}: ${errorText}`);
      return NextResponse.json({ success: false, error: 'Erro ao criar vaga na Abler.' }, { status: 502 });
    }

    const ablerData = await ablerRes.json();
    const vacancyId = ablerData?.data?.id || 'desconhecido';

    // Disparar e-mail de notificação (fire-and-forget — não bloqueia a resposta)
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa: formData.clientIdentity.razaoSocial,
        cnpj: formData.clientIdentity.cnpjCpf,
        servico: formData.serviceType,
        contrato: formData.jobDetails.modeloContrato,
        nivel: formData.jobDetails.nivel,
        qtdVagas: formData.jobDetails.quantidadeVagas,
        faixaSalarial: formData.jobDetails.faixaSalarial,
        responsabilidades: formData.jobDetails.responsabilidades,
        vacancyId,
      }),
    }).catch(err => console.error('Falha ao disparar notificação por e-mail:', err?.message));

    return NextResponse.json({ success: true, vacancyId });
  } catch (error: any) {
    console.error('Erro na rota /api/submit-form:', error?.message);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

function mapSeniorityLevel(nivel: string): string {
  const map: Record<string, string> = {
    'Júnior': 'junior',
    'Pleno': 'full',
    'Sênior': 'senior',
    'Especialista': 'specialist',
    'Estágio': 'intern',
    'Indiferente': 'full',
  };
  return map[nivel] || 'full';
}

function mapWorkModel(modelo: string): string {
  const map: Record<string, string> = {
    'Presencial': 'presential',
    'Remoto': 'remote',
    'Híbrido': 'hybrid',
  };
  return map[modelo] || 'presential';
}

function parseSalary(faixa: string): number | undefined {
  if (!faixa) return undefined;
  // Tenta extrair o primeiro número da faixa salarial
  const match = faixa.replace(/\./g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}
