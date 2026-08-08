import { ExtractedJobData, ContractType } from './types';

const ABLER_BASE_URL = process.env.ABLER_API_URL || 'https://hulk-smash.abler.com.br';
const DEFAULT_ABLER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJjb21wYW55X2lkIjo1ODIsInRpbWVzdGFtcCI6MTc4NTU0MzMyNiwiY29tcGFueV91c2VyX2lkIjoxNDQyfQ.yPAeDlvUJ-20I-4Y1S3ehx5hdvMlVGVQsdg6Iq_SBro';

export interface AblerVacancyItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  statusKey: string;
  contractingRegime: string;
  workType: string;
  location: string;
  salary: string;
  benefits?: string[];
  createdAt: string;
  publishedAt: string;
}

function getAblerHeaders() {
  const token = process.env.ABLER_API_TOKEN || DEFAULT_ABLER_TOKEN;
  return {
    'Content-Type': 'application/json',
    'X-API-INT-TOKEN': token,
  };
}

export function cleanBenefits(raw: string): string[] {
  if (!raw) return [];
  const clean = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 3) return [];

  const benefitKeywords = [
    /alimenta[çc][ãa]o/i,
    /refei[çc][ãa]o/i,
    /vale/i,
    /plano\s*de\s*sa[úu]de/i,
    /conv[êe]nio/i,
    /unimed/i,
    /odontol[óo]gico/i,
    /seguro/i,
    /aux[íi]lio/i,
    /\bvt\b/i,
    /\bvr\b/i,
    /\bva\b/i,
    /recesso/i,
    /flex[íi]vel/i,
    /home\s*office/i,
    /gympass/i,
    /totalpass/i,
    /comiss[ãa]o/i,
    /bonifica[çc][ãa]o/i,
    /plr/i,
  ];

  const sentences = clean.split(/[.;\n]/).map(s => s.trim()).filter(Boolean);
  const matchedBenefits: string[] = [];

  for (const sentence of sentences) {
    const isContactInfo = /@|\+?\d{8,}|s[óo]cio|contador|representante|hunting|alinhamento|confirmar|faturar/i.test(sentence);
    const hasBenefit = benefitKeywords.some(kw => kw.test(sentence));
    if (hasBenefit && !isContactInfo && sentence.length > 2) {
      matchedBenefits.push(sentence);
    }
  }

  return matchedBenefits;
}

export async function fetchCompanyVacancies(): Promise<AblerVacancyItem[]> {
  try {
    const res = await fetch(`${ABLER_BASE_URL}/api/company/v1/vacancies?per_page=50`, {
      headers: getAblerHeaders(),
      next: { revalidate: 15 }
    });

    if (!res.ok) {
      throw new Error(`Erro HTTP Abler: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];

    return data.map((item: any) => {
      const attrs = item?.attributes || {};
      const cities = Array.isArray(attrs.search_cities_term) ? attrs.search_cities_term : [];
      const firstCity = cities[0] || {};
      const cityName = firstCity.full_name || firstCity.name || 'Espírito Santo';

      const rawWorkType = [
        ...(Array.isArray(attrs.work_type) ? attrs.work_type : [attrs.work_type]),
        ...(Array.isArray(attrs.work_type_formatted) ? attrs.work_type_formatted : [attrs.work_type_formatted]),
      ].filter(Boolean).join(' ');

      let workTypes = 'Presencial';
      if (/h[ií]brid/i.test(rawWorkType)) {
        workTypes = 'Híbrido';
      } else if (/remot|home\s*office/i.test(rawWorkType)) {
        workTypes = 'Remoto';
      }

      let salaryStr = 'Compatível com o mercado';
      if (attrs.salary_value) {
        salaryStr = `R$ ${Number(attrs.salary_value).toLocaleString('pt-BR')}`;
      } else if (attrs.salary) {
        salaryStr = `R$ ${Number(attrs.salary).toLocaleString('pt-BR')}`;
      }

      const rawB = [
        attrs.benefits_without_tags,
        attrs.benefits,
        attrs.job_benefits,
        attrs.additional_info_without_tags,
      ].filter(Boolean).join(' ; ');

      const bList = cleanBenefits(rawB);

      return {
        id: String(item?.id || Math.random()),
        title: attrs.title || 'Vaga Sem Título',
        slug: attrs.slug || '',
        status: attrs.status || 'Ativa',
        statusKey: attrs.status_key || 'published',
        contractingRegime: attrs.contracting_regime || 'CLT',
        workType: workTypes,
        location: cityName,
        salary: salaryStr,
        benefits: bList,
        createdAt: attrs.created_at || '',
        publishedAt: attrs.published_at || '',
      };
    });
  } catch (err: any) {
    console.error('Falha ao buscar vagas na Abler API V2:', err?.message);
    return [];
  }
}

// Cache simples do catálogo de benefícios para evitar chamada duplicada
let benefitsCatalogCache: Map<string, string> | null = null;

async function fetchBenefitsCatalog(): Promise<Map<string, string>> {
  if (benefitsCatalogCache) return benefitsCatalogCache;
  try {
    const res = await fetch(`${ABLER_BASE_URL}/api/company/v1/collections/benefits`, {
      headers: getAblerHeaders(),
      next: { revalidate: 3600 }, // cache por 1h
    });
    if (!res.ok) return new Map();
    const json = await res.json();
    const map = new Map<string, string>();
    if (Array.isArray(json?.data)) {
      for (const item of json.data) {
        const id = String(item?.id || '');
        const name = item?.attributes?.name || '';
        if (id && name) map.set(id, name);
      }
    }
    benefitsCatalogCache = map;
    return map;
  } catch {
    return new Map();
  }
}

export async function fetchVacancyDetailsFromAbler(vacancyId: string): Promise<ExtractedJobData> {
  const [res, benefitsMap] = await Promise.all([
    fetch(`${ABLER_BASE_URL}/api/company/v1/vacancies/${vacancyId}?include=vacancies_benefits,responsible`, {
      headers: getAblerHeaders(),
    }),
    fetchBenefitsCatalog(),
  ]);

  if (!res.ok) {
    throw new Error(`Vaga #${vacancyId} não encontrada na Abler (Status ${res.status})`);
  }

  const json = await res.json();
  const attrs = json?.data?.attributes || {};
  const included: any[] = Array.isArray(json?.included) ? json.included : [];

  // Extract responsible recruiter from included company_user
  const responsibleUser = included.find((inc: any) => inc?.type === 'company_user');
  const responsibleEmail = responsibleUser?.attributes?.email || undefined;
  const responsibleName = responsibleUser?.attributes?.name || undefined;

  const title = attrs.title || 'Vaga Sem Título';
  
  // Modality mapping (handles "hibrida", "Hibrida", "remoto", etc.)
  const rawWorkTypeStr = [
    ...(Array.isArray(attrs.work_type) ? attrs.work_type : [attrs.work_type]),
    ...(Array.isArray(attrs.work_type_formatted) ? attrs.work_type_formatted : [attrs.work_type_formatted]),
  ].filter(Boolean).join(' ');

  let modality = 'Presencial';
  if (/h[ií]brid/i.test(rawWorkTypeStr)) {
    modality = 'Híbrido';
  } else if (/remot|home\s*office/i.test(rawWorkTypeStr)) {
    modality = 'Remoto';
  }

  // Location mapping
  const cities = Array.isArray(attrs.search_cities_term) ? attrs.search_cities_term : [];
  const firstCity = cities[0] || {};
  let location = firstCity.full_name || firstCity.name || 'Vitória / ES';
  if (modality === 'Remoto' && !location.includes('Remoto')) {
    location = `${location} (Remoto)`;
  }

  // Salary mapping
  let salary = 'Compatível com o mercado';
  if (attrs.salary_value) {
    salary = `R$ ${Number(attrs.salary_value).toLocaleString('pt-BR')}`;
  } else if (attrs.salary) {
    salary = `R$ ${Number(attrs.salary).toLocaleString('pt-BR')}`;
  }

  // Contract Type mapping
  let contractType: ContractType = 'CLT';
  const regime = (attrs.contracting_regime_value || attrs.contracting_regime || '').toUpperCase();
  if (regime.includes('ESTAGIO') || regime.includes('ESTÁGIO') || /est[áa]gio/i.test(title)) {
    contractType = 'ESTAGIO';
  } else if (regime.includes('PJ') || regime.includes('PRESTADOR') || /pj\b/i.test(title)) {
    contractType = 'PJ';
  }

  // Schedule mapping with clean formatting (fixes joined text like "SextaHorario: 08h")
  let rawSchedule = attrs.working_journey_without_tags || attrs.working_journey || '';
  rawSchedule = rawSchedule.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Format schedule text nicely
  let schedule = rawSchedule
    .replace(/Segunda\s*a\s*SextaHorario/i, 'Segunda a Sexta • Horário')
    .replace(/([a-zA-Z0-9])Horario/gi, '$1 • Horário')
    .replace(/Sexta(\d)/gi, 'Sexta • $1')
    .replace(/\s+/g, ' ').trim();

  if (!schedule || schedule.length < 3) {
    schedule = contractType === 'ESTAGIO' ? '6h diárias (30h semanais)' : 'Segunda a Sexta • Horário comercial (40h/semana)';
  }

  // Requirements parsing
  const reqsText = attrs.mandatory_requirements_without_tags || attrs.mandatory_requirements || '';
  const requirements = reqsText
    ? reqsText.split('\n').map((s: string) => s.replace(/<[^>]+>/g, '').trim()).filter((s: string) => s.length > 3)
    : ['Experiência técnica na área', 'Boa comunicação interpessoal'];

  // 1. Tenta pegar benefícios estruturados via include=vacancies_benefits + catálogo de nomes
  const structuredBenefits: string[] = included
    .filter((inc: any) => inc?.type === 'vacancies_benefit')
    .map((inc: any) => {
      const benefitId = String(inc?.attributes?.benefit_id || '');
      return benefitsMap.get(benefitId) || '';
    })
    .filter((name: string) => name.length > 1);

  // 2. Fallback: extrai de campos de texto livre da vaga
  const rawBenefitsSources = [
    attrs.benefits_without_tags,
    attrs.benefits,
    attrs.job_benefits,
    attrs.additional_info_without_tags,
    attrs.additional_info
  ].filter(Boolean).join(' ; ');
  const parsedBenefits = cleanBenefits(rawBenefitsSources);

  // 3. Fallback final: defaults por tipo de contrato
  let benefits: string[];
  if (structuredBenefits.length > 0) {
    benefits = structuredBenefits;
  } else if (parsedBenefits.length > 0) {
    benefits = parsedBenefits;
  } else if (contractType === 'ESTAGIO') {
    benefits = ['Vale Transporte', 'Vale Refeição', 'Plano de Saúde', 'Auxílio Educação'];
  } else if (contractType === 'PJ') {
    benefits = ['Contrato PJ Flexível', 'Home Office', 'Pagamento via NF'];
  } else {
    // CLT
    benefits = ['Vale Transporte', 'Vale Refeição', 'Plano de Saúde', 'Plano Odontológico'];
  }

  const rawDescription = attrs.role_description_without_tags || attrs.description || title;

  return {
    title,
    location,
    modality,
    salary,
    benefits,
    schedule,
    requirements: Array.isArray(requirements) && requirements.length > 0 ? requirements : ['Formação ou experiência relevante'],
    activities: ['Executar atribuições e entregas do cargo com excelência'],
    contractType,
    seniorityLevel: attrs.seniority_level_formatted || 'Pleno',
    rawDescription,
    responsibleEmail,
    responsibleName,
  };
}

export interface WebhookPayload {
  cnpj: string;
  vacancyType: string;
  title: string;
  rawBriefing?: string;
  quantity?: number;
  requisitionType?: string;
}

export interface AblerVacancyCreationPayload {
  vacancy: {
    form: 'process_data';
    title: string;
    quantity: number;
    contracting_regime: string;
    requisition_type: string;
  };
}

export function transformWebhookPayloadToAblerPayload(payload: WebhookPayload): AblerVacancyCreationPayload {
  const rawType = (payload.vacancyType || 'CLT').toUpperCase();
  let contracting_regime = 'clt';
  if (rawType.includes('PJ')) {
    contracting_regime = 'pj';
  } else if (rawType.includes('ESTAGIO') || rawType.includes('ESTÁGIO')) {
    contracting_regime = 'estagiario';
  } else if (rawType.includes('FREELANCER')) {
    contracting_regime = 'freelancer';
  } else if (rawType.includes('TEMPORARIO') || rawType.includes('TEMPORÁRIO')) {
    contracting_regime = 'temporario';
  } else if (rawType.includes('TERCEIRO')) {
    contracting_regime = 'terceiro';
  }

  return {
    vacancy: {
      form: 'process_data',
      title: payload.title || 'Vaga Sem Título',
      quantity: payload.quantity || 1,
      contracting_regime,
      requisition_type: payload.requisitionType || 'expansao',
    },
  };
}

export async function createAblerDraftVacancy(
  payload: AblerVacancyCreationPayload,
  customBaseUrl?: string,
  customToken?: string
): Promise<{ id: string; statusKey: string; status: string; statusCode: number }> {
  const token = customToken || process.env.ABLER_API_TOKEN || DEFAULT_ABLER_TOKEN;
  const primaryUrl = customBaseUrl || process.env.ABLER_API_URL || ABLER_BASE_URL;

  let res = await fetch(`${primaryUrl}/api/company/v1/vacancies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-INT-TOKEN': token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok && primaryUrl !== 'https://hulk-smash.abler.com.br' && res.status === 401) {
    res = await fetch(`https://hulk-smash.abler.com.br/api/company/v1/vacancies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-INT-TOKEN': DEFAULT_ABLER_TOKEN,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro Abler API [${res.status}]: ${errorText}`);
  }

  const json = await res.json();
  const attrs = json?.data?.attributes || {};
  return {
    id: String(json?.data?.id || ''),
    statusKey: attrs.status_key || 'draft',
    status: attrs.status || 'Rascunho',
    statusCode: res.status,
  };
}

