'use client';

import React, { useState, useEffect, useRef } from 'react';
import { checkAblerCompany, lookupCnpjInAgendor } from '@/lib/client-api';
import { uploadVagaFile } from '@/lib/supabase-client';
import { lookupCep } from '@/lib/viacep-client';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import {
  createInitialFormState,
  JobzFormData,
  SERVICE_DESCRIPTIONS,
  ServiceType,
  EmpregoFields,
  EstagioFields,
  FormalizacaoFields,
  ContractType,
  WorkModel
} from '@/types/jobz-form';

// Função utilitária para aplicar máscara de moeda (R$ 3.500,00)
function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numberValue = parseFloat(digits) / 100;
  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Atalhos dos 6 benefícios mais populares
const QUICK_BENEFITS = [
  'Vale Refeição (VR)',
  'Vale Alimentação (VA)',
  'Vale Transporte (VT)',
  'Plano de Saúde',
  'Plano Odontológico',
  'Gympass / Totalpass'
];

export default function JobzIntakeForm() {
  const [formData, setFormData] = useState<JobzFormData>(createInitialFormState());
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Metadados da API (benefícios, contratos, escolaridade)
  const [ablerBenefitsList, setAblerBenefitsList] = useState<string[]>([]);
  const [ablerContracts, setAblerContracts] = useState<string[]>(['CLT', 'PJ', 'Estágio', 'Freelancer', 'Temporário']);
  const [ablerEducationLevels, setAblerEducationLevels] = useState<string[]>([
    'Ensino Médio', 'Ensino Técnico', 'Ensino Superior Cursando', 'Ensino Superior Completo', 'Pós-graduação / Especialização'
  ]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [benefitSearchQuery, setBenefitSearchQuery] = useState('');
  const [showBenefitDropdown, setShowBenefitDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = formData.currentStep || 0;
  const totalSteps = 6;

  // Carregar metadados ao inicializar
  useEffect(() => {
    async function loadAblerMetadata() {
      setLoadingBenefits(true);
      try {
        const res = await fetch('/api/abler-benefits');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.benefits)) setAblerBenefitsList(data.benefits);
          if (Array.isArray(data.contracts)) setAblerContracts(data.contracts);
          if (Array.isArray(data.educationLevels)) setAblerEducationLevels(data.educationLevels);
        }
      } catch (err) {
        console.error('Erro ao carregar metadados:', err);
      } finally {
        setLoadingBenefits(false);
      }
    }
    loadAblerMetadata();
  }, []);

  const nextStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFormData(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };
  
  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFormData(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  };

  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      value = value.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    setFormData(prev => ({ ...prev, cnpjOuCpfBusca: value }));
  };

  const verifyCompany = async () => {
    const rawDoc = formData.cnpjOuCpfBusca.replace(/\D/g, '');
    if (rawDoc.length !== 11 && rawDoc.length !== 14) {
      setErrorMsg('Digite um CPF ou CNPJ válido.');
      return;
    }

    setIsChecking(true);
    setErrorMsg(null);

    try {
      let agendorResult = null;
      if (rawDoc.length === 14) {
        agendorResult = await lookupCnpjInAgendor(rawDoc);
        if (!agendorResult.found) {
          setErrorMsg('Empresa não cadastrada. Não é possível prosseguir.');
          setIsChecking(false);
          return;
        }
      }

      const ablerResult = await checkAblerCompany(rawDoc);
      
      setFormData(prev => ({
        ...prev,
        agendorData: agendorResult,
        ablerCustomerId: ablerResult.customerId || null,
        isNewCompany: !ablerResult.exists,
        empregoFields: prev.empregoFields || {
          origemVaga: '',
          aceitePagamento: true,
          aceiteProposta: true,
          aceitePrazo: true,
          vagaSigilosa: false,
          tituloCargo: '',
          modeloContrato: 'CLT' as ContractType,
          nivel: '',
          quantidadeVagas: 1,
          escolaridade: [],
          genero: 'Indiferente',
          restricaoIdade: false,
          temDescricaoPronta: false,
          modeloTrabalho: 'Presencial',
          mesmoLocalSede: true,
          jornadaDias: [],
          horarioInicio: '08:00',
          tempoIntervalo: '01:00',
          horarioFim: '18:00',
          salarioBruto: '',
          beneficios: [],
          descricaoBeneficios: '',
          emailContatoConfirmado: agendorResult?.email || '',
          celularContatoConfirmado: agendorResult?.phone || '',
          valoresBeneficios: {},
          aceiteAviso24h: true
        }
      }));

      // Avança para o Step 1 (Escolha do Serviço)
      setFormData(prev => ({ ...prev, currentStep: 1 }));
    } catch (err) {
      setErrorMsg('Erro ao consultar os dados da empresa.');
    } finally {
      setIsChecking(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 0: Identificação da Empresa (CNPJ / CPF)
  // ---------------------------------------------------------------------------
  const renderStep0 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Identificação da Empresa</h2>
        <p className="text-sm text-gray-500">Informe o CNPJ ou CPF para iniciarmos a solicitação na Jobz.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">CNPJ ou CPF da Empresa</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={formData.cnpjOuCpfBusca} 
              onChange={handleCnpjCpfChange} 
              onKeyDown={(e) => e.key === 'Enter' && verifyCompany()} 
              placeholder="00.000.000/0000-00" 
              className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)] focus:ring-4 focus:ring-blue-500/10 transition-all duration-200" 
            />
            <button 
              onClick={verifyCompany} 
              disabled={isChecking || !formData.cnpjOuCpfBusca} 
              className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 rounded-xl font-semibold shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 shrink-0 min-h-[48px]"
            >
              {isChecking ? 'Buscando...' : 'Continuar'}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-sm mt-2.5 font-medium">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // STEP 1: Escolha do Serviço
  // ---------------------------------------------------------------------------
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold mb-2">
          <span>✓ Empresa identificada</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Qual serviço você precisa hoje?</h2>
        <p className="text-sm text-gray-500">
          Empresa: <strong className="text-gray-900">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</strong>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {(Object.entries(SERVICE_DESCRIPTIONS) as [ServiceType, {title: string, description: string}][]).map(([key, service]) => (
          <div 
            key={String(key)} 
            onClick={() => setFormData(prev => ({ ...prev, serviceType: key }))} 
            className={`group cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${
              formData.serviceType === key 
                ? 'border-[var(--color-blue-jobz)] bg-blue-50/50 shadow-sm' 
                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900 group-hover:text-[var(--color-blue-jobz)] transition-colors">{service.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{service.description}</p>
              </div>
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                formData.serviceType === key ? 'border-[var(--color-blue-jobz)] bg-[var(--color-blue-jobz)]' : 'border-gray-300'
              }`}>
                {formData.serviceType === key && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 0 }))} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">Voltar</button>
        <button
          onClick={() => {
            if (formData.serviceType === 'EMPREGO_CLT_PJ') {
              setFormData(prev => ({ ...prev, currentStep: 2 }));
            }
          }}
          disabled={!formData.serviceType}
          className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
        >
          Iniciar Preenchimento
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // STEP 2: Confirmação de Contatos & 3 Acordos Comerciais (CLT/PJ)
  // ---------------------------------------------------------------------------
  const getEmp = (): EmpregoFields => formData.empregoFields!;
  const setEmp = (updates: Partial<EmpregoFields>) => {
    setFormData(prev => ({ ...prev, empregoFields: { ...prev.empregoFields!, ...updates } }));
  };

  const renderStep2Acordos = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Confirmação de Dados & Termos</h2>
          <p className="text-sm text-gray-500">Confirme o contato responsável e os termos de abertura da vaga.</p>
        </div>

        {/* E-mail e Celular */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">E-mail para Acompanhamento</label>
            <input 
              type="email" 
              placeholder="exemplo@empresa.com.br"
              value={emp.emailContatoConfirmado || ''} 
              onChange={e => setEmp({ emailContatoConfirmado: e.target.value })}
              className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-3.5 text-sm font-medium outline-none focus:border-[var(--color-blue-jobz)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Celular / WhatsApp do Responsável</label>
            <input 
              type="text" 
              placeholder="(00) 90000-0000"
              value={emp.celularContatoConfirmado || ''} 
              onChange={e => setEmp({ celularContatoConfirmado: e.target.value })}
              className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-3.5 text-sm font-medium outline-none focus:border-[var(--color-blue-jobz)]"
            />
          </div>
        </div>

        {/* 3 Acordos Comerciais com Alinhamento Flexbox Perfeito (items-start gap-3.5) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Acordos Comerciais da Abertura</h3>

          <div 
            onClick={() => setEmp({ aceitePagamento: !emp.aceitePagamento })}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              emp.aceitePagamento ? 'bg-blue-50/50 border-[var(--color-blue-jobz)]' : 'bg-white border-gray-200'
            }`}
          >
            <input type="checkbox" checked={emp.aceitePagamento} onChange={() => {}} className="mt-0.5 shrink-0 h-4 w-4 rounded border-gray-300 text-[var(--color-blue-jobz)] focus:ring-0 cursor-pointer" />
            <span className="text-xs text-gray-700 font-medium leading-relaxed select-none">
              Conforme proposta comercial enviada, eu concordo com o <strong>pagamento de 50%, à vista</strong>, referente à abertura do processo seletivo.
            </span>
          </div>

          <div 
            onClick={() => setEmp({ aceiteProposta: !emp.aceiteProposta })}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              emp.aceiteProposta ? 'bg-blue-50/50 border-[var(--color-blue-jobz)]' : 'bg-white border-gray-200'
            }`}
          >
            <input type="checkbox" checked={emp.aceiteProposta} onChange={() => {}} className="mt-0.5 shrink-0 h-4 w-4 rounded border-gray-300 text-[var(--color-blue-jobz)] focus:ring-0 cursor-pointer" />
            <span className="text-xs text-gray-700 font-medium leading-relaxed select-none">
              Estou ciente de que o preenchimento deste formulário constitui o <strong>aceite formal da Proposta Comercial</strong>.
            </span>
          </div>

          <div 
            onClick={() => setEmp({ aceitePrazo: !emp.aceitePrazo })}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              emp.aceitePrazo ? 'bg-blue-50/50 border-[var(--color-blue-jobz)]' : 'bg-white border-gray-200'
            }`}
          >
            <input type="checkbox" checked={emp.aceitePrazo} onChange={() => {}} className="mt-0.5 shrink-0 h-4 w-4 rounded border-gray-300 text-[var(--color-blue-jobz)] focus:ring-0 cursor-pointer" />
            <span className="text-xs text-gray-700 font-medium leading-relaxed select-none">
              Estou ciente que, após o recebimento dos currículos, tenho <strong>até 3 dias úteis</strong> para avaliar e agendar entrevistas com os candidatos.
            </span>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button 
            onClick={nextStep} 
            disabled={!emp.aceitePagamento || !emp.aceiteProposta || !emp.aceitePrazo || !emp.emailContatoConfirmado} 
            className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            Avançar para Vaga
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // STEP 3: Perfil da Vaga & Especificações
  // ---------------------------------------------------------------------------
  const renderStep3PerfilVaga = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Perfil da Vaga</h2>
          <p className="text-sm text-gray-500">Defina o cargo, regime contratual e critérios da oportunidade.</p>
        </div>

        {/* Vaga Sigilosa */}
        <ToggleSwitch 
          label="A vaga é sigilosa?"
          description="Ative caso seja para substituição sigilosa na empresa."
          checked={emp.vagaSigilosa}
          onChange={val => setEmp({ vagaSigilosa: val })}
        />

        {emp.vagaSigilosa && (
          <div className="p-5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Nome da pessoa a ser desligada</label>
              <input 
                type="text" 
                placeholder="Ex: Nome do antigo ocupante" 
                value={emp.nomeDesligado || ''} 
                onChange={e => setEmp({ nomeDesligado: e.target.value })} 
                className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[var(--color-blue-jobz)]" 
              />
            </div>
            <ToggleSwitch 
              label="Treinamento de Liderança PLA?"
              description="A vaga possui treinamento de liderança PLA ou consultoria vinculada?"
              checked={emp.treinamentoPla || false}
              onChange={val => setEmp({ treinamentoPla: val })}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Título do Cargo</label>
          <input 
            type="text" 
            placeholder="Ex: Analista Contábil Senior" 
            value={emp.tituloCargo} 
            onChange={e => setEmp({ tituloCargo: e.target.value })} 
            className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)] transition-all" 
          />
        </div>

        {/* Modelo de Contrato */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Modelo de Contrato</label>
          <div className="flex flex-wrap gap-2">
            {ablerContracts.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setEmp({ modeloContrato: type as ContractType })}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                  emp.modeloContrato === type 
                    ? 'bg-[var(--color-blue-jobz)] text-white border-[var(--color-blue-jobz)] shadow-xs' 
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Nível da Vaga</label>
            <select 
              value={emp.nivel} 
              onChange={e => setEmp({ nivel: e.target.value })} 
              className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)] transition-all"
            >
              <option value="">Selecione...</option>
              <option value="Operacional">Operacional</option>
              <option value="Assistente">Assistente</option>
              <option value="Analista">Analista</option>
              <option value="Especialista">Especialista</option>
              <option value="Liderança / Gestão">Liderança / Gestão</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Qtd de Vagas</label>
            <input 
              type="number" 
              min={1} 
              value={emp.quantidadeVagas} 
              onChange={e => setEmp({ quantidadeVagas: parseInt(e.target.value)||1 })} 
              className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)] transition-all" 
            />
          </div>
        </div>

        {/* Escolaridade */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Escolaridade Mínima</label>
          <div className="flex flex-wrap gap-2">
            {ablerEducationLevels.map(edu => {
              const isSelected = (emp.escolaridade || []).includes(edu);
              return (
                <button
                  key={edu}
                  type="button"
                  onClick={() => {
                    const current = emp.escolaridade || [];
                    if (isSelected) {
                      setEmp({ escolaridade: current.filter(e => e !== edu) });
                    } else {
                      setEmp({ escolaridade: [...current, edu] });
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected 
                      ? 'bg-[var(--color-blue-jobz)] text-white border-[var(--color-blue-jobz)]' 
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {isSelected ? `✓ ${edu}` : edu}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gênero + Campo Dinâmico no Outro */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Gênero</label>
          <div className="flex flex-wrap gap-2">
            {(['Indiferente', 'Feminino', 'Masculino', 'Outro'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setEmp({ genero: g })}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  emp.genero === g 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Campo Dinâmico ao Selecionar Outro Gênero */}
          {emp.genero === 'Outro' && (
            <div className="pt-1 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-gray-600 mb-1">Especifique o Gênero</label>
              <input 
                type="text" 
                placeholder="Informe a especificação..." 
                value={emp.generoOutro || ''} 
                onChange={e => setEmp({ generoOutro: e.target.value })} 
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" 
              />
            </div>
          )}
        </div>

        {/* Restrição de Idade */}
        <ToggleSwitch 
          label="Há restrição ou preferência legal de idade?"
          description="Ative caso exista uma faixa etária específica necessária."
          checked={emp.restricaoIdade}
          onChange={val => setEmp({ restricaoIdade: val })}
        />

        {emp.restricaoIdade && (
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Qual a faixa etária desejada?</label>
            <input 
              type="text" 
              placeholder="Ex: Entre 25 e 40 anos" 
              value={emp.faixaEtaria || ''} 
              onChange={e => setEmp({ faixaEtaria: e.target.value })} 
              className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" 
            />
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!emp.tituloCargo || !emp.nivel} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // STEP 4: Descrição & Requisitos
  // ---------------------------------------------------------------------------
  const renderStep4Descricao = () => {
    const emp = getEmp();
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      setUploadError(null);
      
      try {
        const url = await uploadVagaFile(file, formData.agendorData?.name || formData.cnpjOuCpfBusca || 'empresa_jobz');
        setEmp({ anexoDescricaoUrl: url });
      } catch (err) {
        setUploadError('Erro ao fazer upload do arquivo.');
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Descrição e Requisitos</h2>
          <p className="text-sm text-gray-500">Você pode anexar um documento pronto para economizar tempo ou preencher manualmente.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div 
            onClick={() => setEmp({ temDescricaoPronta: true })}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
              emp.temDescricaoPronta ? 'border-[var(--color-blue-jobz)] bg-blue-50/60 font-semibold' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm">📄 Tenho descrição em arquivo (PDF/Doc)</div>
          </div>
          <div 
            onClick={() => setEmp({ temDescricaoPronta: false })}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
              !emp.temDescricaoPronta ? 'border-[var(--color-blue-jobz)] bg-blue-50/60 font-semibold' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm">✏️ Preencher campos manualmente</div>
          </div>
        </div>

        {emp.temDescricaoPronta ? (
          <div className="border-2 border-dashed border-gray-200 p-8 text-center rounded-2xl bg-gray-50/50">
            {emp.anexoDescricaoUrl ? (
              <div className="text-green-600 font-bold flex items-center justify-center gap-2">
                <span>✅ Arquivo da vaga anexado com sucesso!</span>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Anexe o documento da vaga em PDF ou Word</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx" className="hidden" />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading} 
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
                >
                  {isUploading ? 'Enviando...' : 'Escolher Arquivo'}
                </button>
                {uploadError && <p className="text-red-500 text-xs mt-2 font-medium">{uploadError}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Descrição do Cargo (Função)</label>
              <textarea rows={3} placeholder="Descreva a função do contratado..." value={emp.descricaoCargo || ''} onChange={e => setEmp({ descricaoCargo: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Principais Responsabilidades</label>
              <textarea rows={3} placeholder="Atribuições do dia a dia..." value={emp.responsabilidades || ''} onChange={e => setEmp({ responsabilidades: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Requisitos Técnicos (Hard Skills)</label>
              <textarea rows={2} placeholder="Ex: Excel avançado, Python, Legislação..." value={emp.hardSkills || ''} onChange={e => setEmp({ hardSkills: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Perfil Comportamental (Soft Skills)</label>
              <textarea rows={2} placeholder="Ex: Liderança, proatividade, boa comunicação..." value={emp.softSkills || ''} onChange={e => setEmp({ softSkills: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={emp.temDescricaoPronta ? !emp.anexoDescricaoUrl : (!emp.descricaoCargo || !emp.responsabilidades)} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // STEP 5: Local, Jornada, Salário & Benefícios Inteligentes
  // ---------------------------------------------------------------------------
  const renderStep5LocalSalario = () => {
    const emp = getEmp();

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmp({ salarioBruto: formatCurrency(e.target.value) });
    };

    const handleCepSearch = async (cepInput: string) => {
      if (cepInput.replace(/\D/g, '').length === 8) {
        setIsSearchingCep(true);
        const data = await lookupCep(cepInput);
        setIsSearchingCep(false);
        if (data) {
          setEmp({
            enderecoOutroData: {
              ...(emp.enderecoOutroData || { numero: '', complemento: '' }),
              cep: data.cep,
              rua: data.logradouro,
              bairro: data.bairro,
              cidade: data.localidade,
              estado: data.uf
            }
          });
        }
      }
    };

    const updateBenefitValue = (bName: string, valor: string, frequencia: 'dia' | 'mes') => {
      const currentMap = emp.valoresBeneficios || {};
      setEmp({
        valoresBeneficios: {
          ...currentMap,
          [bName]: { valor, frequencia }
        }
      });
    };

    const addBenefit = (bName: string) => {
      const current = emp.beneficios || [];
      if (!current.includes(bName)) {
        setEmp({ beneficios: [...current, bName] });
      }
      setBenefitSearchQuery('');
      setShowBenefitDropdown(false);
    };

    const removeBenefit = (bName: string) => {
      const current = emp.beneficios || [];
      const updatedMap = { ...(emp.valoresBeneficios || {}) };
      delete updatedMap[bName];
      setEmp({ 
        beneficios: current.filter(b => b !== bName),
        valoresBeneficios: updatedMap
      });
    };

    const filteredSuggestions = benefitSearchQuery.trim()
      ? ablerBenefitsList.filter(b => 
          b.toLowerCase().includes(benefitSearchQuery.toLowerCase()) && 
          !(emp.beneficios || []).includes(b)
        ).slice(0, 5)
      : [];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Local, Jornada & Remuneração</h2>
          <p className="text-sm text-gray-500">Defina os detalhes de atendimento, horários e benefícios.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Modelo de Trabalho</label>
            <select 
              value={emp.modeloTrabalho} 
              onChange={e => setEmp({ modeloTrabalho: e.target.value as WorkModel })} 
              className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]"
            >
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto (Home Office)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Salário Bruto Mensal</label>
            <input 
              type="text" 
              placeholder="R$ 0,00" 
              value={emp.salarioBruto} 
              onChange={handleSalaryChange} 
              className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-bold outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" 
            />
          </div>
        </div>

        {/* Local de Atuação: botão sem "Sede Agendor", com CEP limpo e Número */}
        <div className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3">
          <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Local de atuação é o mesmo da sede da empresa?</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEmp({ mesmoLocalSede: true })}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
                emp.mesmoLocalSede ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              Sim (Mesmo endereço da Sede)
            </button>
            <button
              type="button"
              onClick={() => setEmp({ mesmoLocalSede: false })}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
                !emp.mesmoLocalSede ? 'bg-[var(--color-blue-jobz)] text-white border-[var(--color-blue-jobz)]' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              Não (Outro Endereço)
            </button>
          </div>

          {!emp.mesmoLocalSede && (
            <div className="pt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">CEP</label>
                  <input 
                    type="text" 
                    placeholder="00000-000" 
                    value={emp.enderecoOutroData?.cep || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setEmp({ enderecoOutroData: { ...(emp.enderecoOutroData || { rua: '', bairro: '', cidade: '', estado: '', numero: '', complemento: '' }), cep: val } });
                      handleCepSearch(val);
                    }}
                    className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none"
                  />
                  {isSearchingCep && <span className="text-[10px] text-gray-500">Buscando CEP...</span>}
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Número</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 123" 
                    value={emp.enderecoOutroData?.numero || ''} 
                    onChange={e => setEmp({ enderecoOutroData: { ...(emp.enderecoOutroData || { cep: '', rua: '', bairro: '', cidade: '', estado: '', complemento: '' }), numero: e.target.value } })}
                    className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Complemento</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Sala 402" 
                    value={emp.enderecoOutroData?.complemento || ''} 
                    onChange={e => setEmp({ enderecoOutroData: { ...(emp.enderecoOutroData || { cep: '', rua: '', bairro: '', cidade: '', estado: '', numero: '' }), complemento: e.target.value } })}
                    className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-4 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {emp.enderecoOutroData?.cidade && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white p-3 rounded-xl border text-xs">
                  <div className="col-span-2"><strong>Rua:</strong> {emp.enderecoOutroData.rua}, {emp.enderecoOutroData.bairro}</div>
                  <div><strong>Cidade/UF:</strong> {emp.enderecoOutroData.cidade}/{emp.enderecoOutroData.estado}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Jornada Completa */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Jornada de Trabalho (Segunda a Sexta)</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entrada</label>
              <input type="time" value={emp.horarioInicio} onChange={e => setEmp({ horarioInicio: e.target.value })} className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 font-medium outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Intervalo</label>
              <input type="text" placeholder="Ex: 01:00" value={emp.tempoIntervalo} onChange={e => setEmp({ tempoIntervalo: e.target.value })} className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 font-medium outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Saída</label>
              <input type="time" value={emp.horarioFim} onChange={e => setEmp({ horarioFim: e.target.value })} className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 font-medium outline-none" />
            </div>
          </div>
        </div>

        {/* Benefícios Inteligentes (sem menção à Abler) */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Atalhos de Benefícios Principais</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_BENEFITS.map(bName => {
                const isSelected = (emp.beneficios || []).includes(bName);
                return (
                  <button
                    key={bName}
                    type="button"
                    onClick={() => isSelected ? removeBenefit(bName) : addBenefit(bName)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      isSelected 
                        ? 'bg-[var(--color-blue-jobz)] text-white border-[var(--color-blue-jobz)] shadow-xs' 
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {isSelected ? `✓ ${bName}` : `+ ${bName}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Autocomplete com Marca Jobz */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Buscar ou Adicionar Outro Benefício</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: Auxílio Creche, Seguro de Vida..." 
                value={benefitSearchQuery} 
                onChange={e => {
                  setBenefitSearchQuery(e.target.value);
                  setShowBenefitDropdown(true);
                }} 
                onFocus={() => setShowBenefitDropdown(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && benefitSearchQuery.trim()) {
                    e.preventDefault();
                    addBenefit(benefitSearchQuery.trim());
                  }
                }}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" 
              />
              {benefitSearchQuery.trim() && (
                <button type="button" onClick={() => addBenefit(benefitSearchQuery.trim())} className="bg-gray-900 text-white text-xs font-semibold px-4 rounded-xl hover:bg-black shrink-0">
                  Adicionar
                </button>
              )}
            </div>

            {showBenefitDropdown && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                {filteredSuggestions.map(sugg => (
                  <div key={sugg} onClick={() => addBenefit(sugg)} className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 cursor-pointer">
                    + {sugg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Benefícios Selecionados com Frequência (/dia ou /mês) */}
          {emp.beneficios && emp.beneficios.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                Informar Valores dos Benefícios ({emp.beneficios.length}):
              </label>
              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                {emp.beneficios.map(bName => {
                  const bValObj = (emp.valoresBeneficios || {})[bName] || { valor: '', frequencia: 'dia' };
                  const isValuable = /refei[çc][ãa]o|alimenta[çc][ãa]o|transporte|vr|va|vt|aux[íi]lio/i.test(bName);

                  return (
                    <div key={bName} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-gray-200/60 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{bName}</span>
                        <button type="button" onClick={() => removeBenefit(bName)} className="text-xs text-red-500 hover:underline">Remover</button>
                      </div>

                      {isValuable && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input 
                            type="text" 
                            placeholder="R$ 0,00" 
                            value={bValObj.valor} 
                            onChange={e => updateBenefitValue(bName, formatCurrency(e.target.value), bValObj.frequencia)}
                            className="w-28 min-h-[36px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 text-xs font-bold outline-none"
                          />
                          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                            <button
                              type="button"
                              onClick={() => updateBenefitValue(bName, bValObj.valor, 'dia')}
                              className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${bValObj.frequencia === 'dia' ? 'bg-[var(--color-blue-jobz)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              / dia
                            </button>
                            <button
                              type="button"
                              onClick={() => updateBenefitValue(bName, bValObj.valor, 'mes')}
                              className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${bValObj.frequencia === 'mes' ? 'bg-[var(--color-blue-jobz)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              / mês
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!emp.salarioBruto} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // STEP 6: Avisos Finais & Confirmação Executiva
  // ---------------------------------------------------------------------------
  const renderStep6EmpregoReview = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold mb-2">
            <span>✨ Tudo pronto para envio</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Revisão Executiva da Vaga</h2>
          <p className="text-sm text-gray-500">Confira o resumo das especificações da oportunidade.</p>
        </div>
        
        <div className="bg-gray-50/70 border border-gray-200/80 p-5 rounded-2xl space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Empresa</span>
            <span className="font-bold text-gray-900">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">E-mail de Contato</span>
            <span className="font-bold text-gray-900">{emp.emailContatoConfirmado}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Cargo & Contrato</span>
            <span className="font-bold text-gray-900">{emp.tituloCargo} ({emp.modeloContrato})</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Nível & Vagas</span>
            <span className="font-bold text-gray-900">{emp.nivel} • {emp.quantidadeVagas} vaga(s)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Salário Bruto</span>
            <span className="font-bold text-green-700">{emp.salarioBruto}</span>
          </div>
        </div>

        {/* Card de Avisos Finais e Prazos Obrigatórios */}
        <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2.5 text-xs text-blue-950 font-medium leading-relaxed">
          <p>📌 <strong>Próximas 24h:</strong> O recrutador responsável fará contato por e-mail, ligação ou WhatsApp para seguir com o alinhamento da vaga.</p>
          <p>🗓️ <strong>Agenda de Entrevistas:</strong> As entrevistas com os candidatos selecionados acontecerão na empresa após <strong>11 dias</strong> da data de hoje. <em>(Caso não seja possível, sinalize ao recrutador no ato do alinhamento)</em>.</p>
          <p>⌛ <strong>Prazo de Retorno:</strong> Conforme proposta recebida, aguardamos até <strong>3 dias úteis</strong> para a realização das entrevistas após a entrega dos currículos selecionados.</p>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">Voltar e Editar</button>
          <button 
            onClick={() => alert('Vaga enviada com sucesso para a Jobz!')}
            className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all"
          >
            Confirmar e Abrir Vaga
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 md:p-10 relative overflow-hidden max-w-3xl mx-auto">
      {/* Barra de Progresso Superior */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
        <div className="h-full bg-[var(--color-blue-jobz)] transition-all duration-500 ease-out" style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }} />
      </div>
      
      {currentStep === 0 && renderStep0()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2Acordos()}
      {currentStep === 3 && renderStep3PerfilVaga()}
      {currentStep === 4 && renderStep4Descricao()}
      {currentStep === 5 && renderStep5LocalSalario()}
      {currentStep === 6 && renderStep6EmpregoReview()}
    </div>
  );
}
