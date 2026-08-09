/**
 * Jobz Carreira Multi-Step Form Data Types & Schema
 * Unified definitions for intake forms, client identity, job details, and options.
 */

export type ServiceType = 'EMPREGO_CLT_PJ' | 'RS_ESTAGIO' | 'FORMALIZACAO_ESTAGIO' | null;

export interface ServiceDescription {
  title: string;
  description: string;
}

export const SERVICE_DESCRIPTIONS: Record<Exclude<ServiceType, null>, ServiceDescription> = {
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

export type ContractType = 'CLT' | 'Freelancer' | 'PJ';
export type WorkModel = 'Presencial' | 'Remoto' | 'Híbrido';
export type GenderPreference = 'Indiferente' | 'Feminino' | 'Masculino' | 'Outro';

export interface ContactPerson {
  nome: string;
  cargo: string;
  email: string;
  celular: string;
}

// ----------------------------------------------------------------------
// Fase 1: Cadastro da Empresa
// ----------------------------------------------------------------------
export interface CadastroFields {
  origem: string;
  origemParceiro?: string;
  contatoComercial: string;
  tipoContratacao: 'CNPJ' | 'CPF';
  cnpjCpf: string;
  razaoSocial: string;
  nomeFantasia: string;
  celularPrincipal: string;
  telefonePrincipal?: string;
  site?: string;
  enderecoSede: {
    ruaNumeroComplemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  representanteLegal: ContactPerson;
  contatoVagas: 'Representante' | 'Outra Pessoa';
  responsavelRh?: ContactPerson;
  contatoFinanceiro: 'Representante' | 'Outra Pessoa';
  responsavelFinanceiro?: ContactPerson;
  aceiteGdpr: boolean;
  aceiteInformativos: boolean;
}

// ----------------------------------------------------------------------
// Fase 2: Vaga de Emprego (CLT/PJ)
// ----------------------------------------------------------------------
export interface EmpregoFields {
  origemVaga: string;
  origemVagaOutro?: string;
  aceitePagamento: boolean;
  aceiteProposta: boolean;
  aceitePrazo: boolean;
  
  vagaSigilosa: boolean;
  nomeDesligado?: string;
  treinamentoPla?: boolean;
  
  tituloCargo: string;
  modeloContrato: ContractType;
  nivel: string;
  quantidadeVagas: number;
  escolaridade: string[];
  genero: GenderPreference;
  generoOutro?: string;
  restricaoIdade: boolean;
  faixaEtaria?: string;
  
  temDescricaoPronta: boolean;
  anexoDescricaoUrl?: string; // vira URL do Supabase
  descricaoCargo?: string;
  responsabilidades?: string;
  hardSkills?: string;
  softSkills?: string;
  
  modeloTrabalho: WorkModel;
  comoEModelo?: string; // Para hibrido
  mesmoLocalSede: boolean;
  enderecoTrabalho?: string;
  jornadaDias: string[];
  horarioInicio: string;
  tempoIntervalo: string;
  horarioFim: string;
  salarioBruto: string;
  beneficios: string[];
  descricaoBeneficios: string;
  valorVaVr?: string;
  
  aceiteAviso24h: boolean;
}

// ----------------------------------------------------------------------
// Fase 3: R&S Estágio
// ----------------------------------------------------------------------
export interface EstagioFields {
  jaAbriuVaga: boolean;
  modeloTrabalho: WorkModel;
  comoEModelo?: string; // Para hibrido
  mesmoLocalSede: boolean;
  enderecoTrabalho?: string;
  
  tipoContrato: string;
  quantidadeVagas: number;
  aceiteGdprPrazo: boolean;
  
  entrevistador: ContactPerson;
  supervisorMesmoEntrevistador: boolean;
  supervisor?: ContactPerson;
  
  tituloCargo: string;
  hardSkills: string;
  softSkills: string;
  atividades: string;
  comentariosGerais: string;
  nivelEstudante: string[];
  genero: GenderPreference;
  generoOutro?: string;
  sugestaoCurso: string;
  
  periodoEstagio: string[];
  jornadaDias: string[];
  horarioEntrada: string;
  horarioSaida: string;
  valorBolsa: string;
  valorTransporte: string;
  contemplaBonificacao: boolean;
  descricaoBonificacao?: string;
  contemplaOutroBeneficio: boolean;
  outroBeneficio?: string;
  
  aceiteGdprTermos: boolean;
}

// ----------------------------------------------------------------------
// Fase 4: Formalização de Estágio
// ----------------------------------------------------------------------
export interface FormalizacaoFields {
  jaTemCadastro: boolean; // Confirmação manual além da busca
  aceiteGdpr: boolean;
  modeloTrabalho: WorkModel;
  comoEModelo?: string;
  mesmoLocalSede: boolean;
  enderecoTrabalho?: string;
  
  supervisor: ContactPerson & { cursoFormacao: string; registroConselho?: string };
  
  estagiario: { nome: string; cpf: string; telefone: string };
  instituicaoEnsino: string;
  nomeCurso: string;
  periodoSemestre: string;
  matricula?: string;
  
  tituloFuncao: string;
  descricaoAtividades: string;
  nivelEstudante: string;
  genero: GenderPreference;
  generoOutro?: string;
  jornadaDias: string[];
  dataInicio: string;
  dataTermino: string;
  horarioEntrada: string;
  tempoIntervalo: string;
  horarioSaida: string;
  
  valorBolsa: string;
  valorTransporte: string;
  contemplaBonificacao: boolean;
  descricaoBonificacao?: string;
  contemplaOutroBeneficio: boolean;
  outroBeneficio?: string;
  
  aceiteGdprTce: boolean;
}

// ----------------------------------------------------------------------
// Estado Global do Formulário
// ----------------------------------------------------------------------
export interface JobzFormData {
  // Identificação e Integrações (Step 0)
  cnpjOuCpfBusca: string;
  agendorData?: any | null; // Dados retornados pelo Agendor
  ablerCustomerId?: number | null; // ID se a empresa já existir na Abler
  isNewCompany: boolean;
  
  serviceType: ServiceType;
  
  // Fluxos preenchidos dinamicamente
  cadastroFields?: CadastroFields;
  empregoFields?: EmpregoFields;
  estagioFields?: EstagioFields;
  formalizacaoFields?: FormalizacaoFields;
  
  currentStep: number;
}

/**
 * Cria o estado inicial vazio
 */
export function createInitialFormState(): JobzFormData {
  return {
    cnpjOuCpfBusca: '',
    agendorData: null,
    ablerCustomerId: null,
    isNewCompany: false,
    serviceType: null,
    currentStep: 0, // Step 0 é a busca de CNPJ
  };
}
