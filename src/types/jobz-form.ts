/**
 * Jobz Carreira Multi-Step Form Data Types & Schema
 * Unified definitions for intake forms, client identity, job details, and options.
 */

export type ServiceType = 'EMPREGO_CLT_PJ' | 'RS_ESTAGIO' | 'FORMALIZACAO_ESTAGIO';

export interface ServiceDescription {
  title: string;
  description: string;
}

export const SERVICE_DESCRIPTIONS: Record<ServiceType, ServiceDescription> = {
  EMPREGO_CLT_PJ: {
    title: 'R&S - Vaga de Emprego (CLT/PJ)',
    description: 'Buscamos e selecionamos o profissional ideal para a sua empresa do zero.',
  },
  RS_ESTAGIO: {
    title: 'R&S - Estágio',
    description: 'Encontramos o estudante com o perfil certo para integrar sua equipe.',
  },
  FORMALIZACAO_ESTAGIO: {
    title: 'Formalização de Contrato de Estágio',
    description: 'Já encontrou seu estagiário? A Jobz cuida de toda a burocracia, documentos e contrato legal para você.',
  },
};

/**
 * ContractType strictly excludes "Temporário" and "Associado(a)".
 */
export type ContractType = 'CLT' | 'PJ';

export const VALID_CONTRACT_TYPES: readonly ContractType[] = ['CLT', 'PJ'] as const;

export interface ContactPerson {
  nome: string;
  cargo: string;
  email: string;
  celular: string;
}

export interface ClientIdentity {
  cnpjCpf: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefone: string;
  endereco: string;
  representanteLegal: ContactPerson;
  responsavelRh?: ContactPerson;
  responsavelFinanceiro?: ContactPerson;
}

export type ExperienceLevel = 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista' | 'Estágio' | 'Indiferente';
export type WorkModel = 'Presencial' | 'Remoto' | 'Híbrido';
export type GenderPreference = 'Indiferente' | 'Feminino' | 'Masculino' | 'Outro';

export interface JobAttachment {
  name: string;
  size: number;
  type: string;
  content?: string;
}

export interface JobDetails {
  tituloCargo: string;
  modeloContrato: ContractType;
  nivel: ExperienceLevel;
  quantidadeVagas: number;
  escolaridade: string;
  genero: GenderPreference;
  restricaoIdade: string;
  anexoDescricao?: JobAttachment | null;
  funcao: string;
  responsabilidades: string;
  hardSkills: string[];
  softSkills: string[];
  modeloTrabalho: WorkModel;
  enderecoTrabalho: string;
  faixaSalarial: string;
  beneficios: string[];
  horarioTrabalho: string;
  aceitePropostaComercial: boolean;
  aceiteTermosLgpd: boolean;
}

export interface JobzFormData {
  serviceType: ServiceType;
  clientIdentity: ClientIdentity;
  jobDetails: JobDetails;
  currentStep?: number;
}

/**
 * Generates a clean initial state object for the Jobz Carreira Multi-Step Form.
 */
export function createInitialFormState(): JobzFormData {
  return {
    serviceType: 'EMPREGO_CLT_PJ',
    clientIdentity: {
      cnpjCpf: '',
      razaoSocial: '',
      nomeFantasia: '',
      telefone: '',
      endereco: '',
      representanteLegal: {
        nome: '',
        cargo: '',
        email: '',
        celular: '',
      },
      responsavelRh: {
        nome: '',
        cargo: '',
        email: '',
        celular: '',
      },
      responsavelFinanceiro: {
        nome: '',
        cargo: '',
        email: '',
        celular: '',
      },
    },
    jobDetails: {
      tituloCargo: '',
      modeloContrato: 'CLT',
      nivel: 'Júnior',
      quantidadeVagas: 1,
      escolaridade: 'Indiferente',
      genero: 'Indiferente',
      restricaoIdade: '',
      anexoDescricao: null,
      funcao: '',
      responsabilidades: '',
      hardSkills: [],
      softSkills: [],
      modeloTrabalho: 'Presencial',
      enderecoTrabalho: '',
      faixaSalarial: '',
      beneficios: [],
      horarioTrabalho: '',
      aceitePropostaComercial: false,
      aceiteTermosLgpd: false,
    },
    currentStep: 1,
  };
}
