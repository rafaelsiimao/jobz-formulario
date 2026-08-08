import { describe, it, expect } from 'vitest';
import {
  SERVICE_DESCRIPTIONS,
  createInitialFormState,
  VALID_CONTRACT_TYPES,
  ServiceType,
  ContractType,
} from '../src/types/jobz-form';

describe('Jobz Form Types & Schema', () => {
  describe('ContractType constraints', () => {
    it('should strictly allow only CLT and PJ as valid ContractTypes', () => {
      expect(VALID_CONTRACT_TYPES).toEqual(['CLT', 'PJ']);
      expect(VALID_CONTRACT_TYPES).toHaveLength(2);
      expect(VALID_CONTRACT_TYPES).toContain('CLT');
      expect(VALID_CONTRACT_TYPES).toContain('PJ');
    });

    it('should exclude "Temporário" and "Associado" from contract types', () => {
      const invalidTypes = ['Temporário', 'Associado', 'Associado(a)', 'Estagiário', 'Terceirizado'];
      
      invalidTypes.forEach((type) => {
        expect(VALID_CONTRACT_TYPES).not.toContain(type);
      });
    });
  });

  describe('SERVICE_DESCRIPTIONS mapping', () => {
    it('should contain correct descriptions for EMPREGO_CLT_PJ', () => {
      const service: ServiceType = 'EMPREGO_CLT_PJ';
      expect(SERVICE_DESCRIPTIONS[service]).toEqual({
        title: 'R&S - Vaga de Emprego (CLT/PJ)',
        description: 'Buscamos e selecionamos o profissional ideal para a sua empresa do zero.',
      });
    });

    it('should contain correct descriptions for RS_ESTAGIO', () => {
      const service: ServiceType = 'RS_ESTAGIO';
      expect(SERVICE_DESCRIPTIONS[service]).toEqual({
        title: 'R&S - Estágio',
        description: 'Encontramos o estudante com o perfil certo para integrar sua equipe.',
      });
    });

    it('should contain correct descriptions for FORMALIZACAO_ESTAGIO', () => {
      const service: ServiceType = 'FORMALIZACAO_ESTAGIO';
      expect(SERVICE_DESCRIPTIONS[service]).toEqual({
        title: 'Formalização de Contrato de Estágio',
        description: 'Já encontrou seu estagiário? A Jobz cuida de toda a burocracia, documentos e contrato legal para você.',
      });
    });

    it('should cover all 3 ServiceTypes in SERVICE_DESCRIPTIONS', () => {
      const keys = Object.keys(SERVICE_DESCRIPTIONS);
      expect(keys).toEqual(['EMPREGO_CLT_PJ', 'RS_ESTAGIO', 'FORMALIZACAO_ESTAGIO']);
    });
  });

  describe('createInitialFormState()', () => {
    it('should return a valid default JobzFormData object', () => {
      const initialState = createInitialFormState();

      // Check top-level properties
      expect(initialState).toBeDefined();
      expect(initialState.serviceType).toBe('EMPREGO_CLT_PJ');
      expect(initialState.currentStep).toBe(1);

      // Check clientIdentity properties
      expect(initialState.clientIdentity).toBeDefined();
      expect(initialState.clientIdentity.cnpjCpf).toBe('');
      expect(initialState.clientIdentity.razaoSocial).toBe('');
      expect(initialState.clientIdentity.nomeFantasia).toBe('');
      expect(initialState.clientIdentity.telefone).toBe('');
      expect(initialState.clientIdentity.endereco).toBe('');

      // Check contact persons inside clientIdentity
      expect(initialState.clientIdentity.representanteLegal).toEqual({
        nome: '',
        cargo: '',
        email: '',
        celular: '',
      });
      expect(initialState.clientIdentity.responsavelRh).toEqual({
        nome: '',
        cargo: '',
        email: '',
        celular: '',
      });
      expect(initialState.clientIdentity.responsavelFinanceiro).toEqual({
        nome: '',
        cargo: '',
        email: '',
        celular: '',
      });

      // Check jobDetails properties
      expect(initialState.jobDetails).toBeDefined();
      expect(initialState.jobDetails.tituloCargo).toBe('');
      expect(initialState.jobDetails.modeloContrato).toBe('CLT');
      expect(initialState.jobDetails.nivel).toBe('Júnior');
      expect(initialState.jobDetails.quantidadeVagas).toBe(1);
      expect(initialState.jobDetails.escolaridade).toBe('Indiferente');
      expect(initialState.jobDetails.genero).toBe('Indiferente');
      expect(initialState.jobDetails.restricaoIdade).toBe('');
      expect(initialState.jobDetails.anexoDescricao).toBeNull();
      expect(initialState.jobDetails.funcao).toBe('');
      expect(initialState.jobDetails.responsabilidades).toBe('');
      expect(initialState.jobDetails.hardSkills).toEqual([]);
      expect(initialState.jobDetails.softSkills).toEqual([]);
      expect(initialState.jobDetails.modeloTrabalho).toBe('Presencial');
      expect(initialState.jobDetails.enderecoTrabalho).toBe('');
      expect(initialState.jobDetails.faixaSalarial).toBe('');
      expect(initialState.jobDetails.beneficios).toEqual([]);
      expect(initialState.jobDetails.horarioTrabalho).toBe('');
      expect(initialState.jobDetails.aceitePropostaComercial).toBe(false);
      expect(initialState.jobDetails.aceiteTermosLgpd).toBe(false);
    });

    it('should return a fresh instance on each invocation', () => {
      const state1 = createInitialFormState();
      const state2 = createInitialFormState();

      expect(state1).not.toBe(state2);
      expect(state1.clientIdentity).not.toBe(state2.clientIdentity);
      expect(state1.jobDetails).not.toBe(state2.jobDetails);

      // Mutate state1 and ensure state2 is unchanged
      state1.jobDetails.tituloCargo = 'Desenvolvedor Frontend';
      expect(state2.jobDetails.tituloCargo).toBe('');
    });
  });
});
