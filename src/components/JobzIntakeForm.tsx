'use client';

import React, { useState, useEffect, useRef } from 'react';
import { checkAblerCompany, lookupCnpjInAgendor } from '@/lib/client-api';
import { uploadVagaFile } from '@/lib/supabase-client';
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

export default function JobzIntakeForm() {
  const [formData, setFormData] = useState<JobzFormData>(createInitialFormState());
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Benefícios carregados da API da Abler
  const [ablerBenefitsList, setAblerBenefitsList] = useState<string[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [customBenefit, setCustomBenefit] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = formData.currentStep || 0;
  const totalSteps = 5;

  // Carregar a lista de benefícios da Abler ao carregar o componente
  useEffect(() => {
    async function loadBenefits() {
      setLoadingBenefits(true);
      try {
        const res = await fetch('/api/abler-benefits');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.benefits)) {
            setAblerBenefitsList(data.benefits);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar benefícios:', err);
      } finally {
        setLoadingBenefits(false);
      }
    }
    loadBenefits();
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
          setErrorMsg('Empresa não cadastrada no Agendor (CRM). Não é possível prosseguir.');
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
      }));

      setFormData(prev => ({ ...prev, currentStep: 1 }));
    } catch (err) {
      setErrorMsg('Erro ao consultar as integrações.');
    } finally {
      setIsChecking(false);
    }
  };

  // STEP 0: Identificação da Empresa
  const renderStep0 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Identificação da Empresa</h2>
        <p className="text-sm text-gray-500">Informe o CNPJ ou CPF para consultar seu cadastro.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">CNPJ ou CPF</label>
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

  // STEP 1: Escolha do Serviço
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold mb-2">
          <span>✓ Empresa identificada</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Qual vaga deseja abrir hoje?</h2>
        <p className="text-sm text-gray-500">
          Cliente: <strong className="text-gray-900">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</strong>
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
              setFormData(prev => ({
                ...prev, currentStep: 2,
                empregoFields: prev.empregoFields || {
                  origemVaga: '', aceitePagamento: true, aceiteProposta: true, aceitePrazo: true,
                  vagaSigilosa: false, tituloCargo: '', modeloContrato: 'CLT', nivel: '', quantidadeVagas: 1,
                  escolaridade: [], genero: 'Indiferente', restricaoIdade: false, temDescricaoPronta: false,
                  modeloTrabalho: 'Presencial', mesmoLocalSede: true, jornadaDias: [], horarioInicio: '',
                  tempoIntervalo: '', horarioFim: '', salarioBruto: '', beneficios: [], descricaoBeneficios: '', aceiteAviso24h: false
                }
              }));
            } else if (formData.serviceType === 'RS_ESTAGIO') {
              setFormData(prev => ({
                ...prev, currentStep: 2,
                estagioFields: prev.estagioFields || {
                  jaAbriuVaga: false, modeloTrabalho: 'Presencial', mesmoLocalSede: true,
                  tipoContrato: 'R&S com Formalização', quantidadeVagas: 1, aceiteGdprPrazo: true,
                  entrevistador: { nome: '', cargo: '', email: '', celular: '' },
                  supervisorMesmoEntrevistador: true,
                  tituloCargo: '', hardSkills: '', softSkills: '', atividades: '', comentariosGerais: '',
                  nivelEstudante: [], genero: 'Indiferente', sugestaoCurso: '',
                  periodoEstagio: [], jornadaDias: [], horarioEntrada: '', horarioSaida: '',
                  valorBolsa: '', valorTransporte: '', contemplaBonificacao: false, contemplaOutroBeneficio: false,
                  aceiteGdprTermos: true
                }
              }));
            } else if (formData.serviceType === 'FORMALIZACAO_ESTAGIO') {
              setFormData(prev => ({
                ...prev, currentStep: 2,
                formalizacaoFields: prev.formalizacaoFields || {
                  jaTemCadastro: true, aceiteGdpr: true, modeloTrabalho: 'Presencial', mesmoLocalSede: true,
                  supervisor: { nome: '', cargo: '', email: '', celular: '', cursoFormacao: '' },
                  estagiario: { nome: '', cpf: '', telefone: '' },
                  instituicaoEnsino: '', nomeCurso: '', periodoSemestre: '',
                  tituloFuncao: '', descricaoAtividades: '', nivelEstudante: '', genero: 'Indiferente',
                  jornadaDias: [], dataInicio: '', dataTermino: '', horarioEntrada: '', tempoIntervalo: '', horarioSaida: '',
                  valorBolsa: '', valorTransporte: '', contemplaBonificacao: false, contemplaOutroBeneficio: false, aceiteGdprTce: true
                }
              }));
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
  // FLUXO 1: EMPREGO CLT / PJ (STEPS 2 a 5)
  // ---------------------------------------------------------------------------
  const getEmp = (): EmpregoFields => formData.empregoFields!;
  const setEmp = (updates: Partial<EmpregoFields>) => {
    setFormData(prev => ({ ...prev, empregoFields: { ...prev.empregoFields!, ...updates } }));
  };

  const toggleBenefit = (bName: string) => {
    const current = getEmp().beneficios || [];
    if (current.includes(bName)) {
      setEmp({ beneficios: current.filter(b => b !== bName) });
    } else {
      setEmp({ beneficios: [...current, bName] });
    }
  };

  const renderStep2Emprego = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Perfil da Vaga</h2>
          <p className="text-sm text-gray-500">Defina o cargo, modalidade e requisitos da oportunidade.</p>
        </div>

        {/* Toggle Vaga Sigilosa */}
        <ToggleSwitch 
          label="Vaga Sigilosa?"
          description="Ative caso a contratação seja para substituição sigilosa na empresa."
          checked={emp.vagaSigilosa}
          onChange={val => setEmp({ vagaSigilosa: val })}
        />

        {emp.vagaSigilosa && (
          <div className="p-5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Nome do profissional a ser desligado</label>
              <input 
                type="text" 
                placeholder="Ex: João da Silva" 
                value={emp.nomeDesligado || ''} 
                onChange={e => setEmp({ nomeDesligado: e.target.value })} 
                className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[var(--color-blue-jobz)]" 
              />
            </div>
            <ToggleSwitch 
              label="Treinamento de Liderança PLA / Consultoria?"
              description="Realizaremos treinamento ou consultoria neste cliente durante o processo?"
              checked={emp.treinamentoPla || false}
              onChange={val => setEmp({ treinamentoPla: val })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Título do Cargo</label>
            <input 
              type="text" 
              placeholder="Ex: Analista Financeiro Senior" 
              value={emp.tituloCargo} 
              onChange={e => setEmp({ tituloCargo: e.target.value })} 
              className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)] transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Modelo de Contrato</label>
            <div className="grid grid-cols-2 gap-2">
              {(['CLT', 'PJ'] as ContractType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEmp({ modeloContrato: type })}
                  className={`min-h-[48px] rounded-xl font-bold text-sm transition-all border ${
                    emp.modeloContrato === type 
                      ? 'bg-[var(--color-blue-jobz)] text-white border-[var(--color-blue-jobz)] shadow-sm' 
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Nível Hierárquico</label>
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
              <option value="Liderança">Liderança / Gestão</option>
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

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">Voltar</button>
          <button onClick={nextStep} disabled={!emp.tituloCargo || !emp.nivel} className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep3Emprego = () => {
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
          <p className="text-sm text-gray-500">Como você prefere nos enviar as atribuições do cargo?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div 
            onClick={() => setEmp({ temDescricaoPronta: true })}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              emp.temDescricaoPronta ? 'border-[var(--color-blue-jobz)] bg-blue-50/60 font-semibold' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm">📄 Tenho descrição em arquivo (PDF/Doc)</div>
          </div>
          <div 
            onClick={() => setEmp({ temDescricaoPronta: false })}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
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
                <span>✅ Arquivo anexado com sucesso!</span>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Selecione o PDF ou documento com o perfil completo</p>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Descrição da Função</label>
              <textarea rows={3} placeholder="Descreva as atribuições do dia a dia..." value={emp.descricaoCargo || ''} onChange={e => setEmp({ descricaoCargo: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Principais Responsabilidades</label>
              <textarea rows={3} placeholder="Ex: Gestão de estoque, emissão de NF..." value={emp.responsabilidades || ''} onChange={e => setEmp({ responsabilidades: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Hard Skills (Requisitos Técnicos)</label>
              <textarea rows={2} placeholder="Ex: Excel avançado, Python, CRM..." value={emp.hardSkills || ''} onChange={e => setEmp({ hardSkills: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Soft Skills (Comportamentais)</label>
              <textarea rows={2} placeholder="Ex: Trabalho em equipe, resiliência..." value={emp.softSkills || ''} onChange={e => setEmp({ softSkills: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">Voltar</button>
          <button onClick={nextStep} disabled={emp.temDescricaoPronta ? !emp.anexoDescricaoUrl : (!emp.descricaoCargo || !emp.responsabilidades)} className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Emprego = () => {
    const emp = getEmp();

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrency(e.target.value);
      setEmp({ salarioBruto: formatted });
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Trabalho & Benefícios</h2>
          <p className="text-sm text-gray-500">Defina o modelo de trabalho e a proposta de remuneração.</p>
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

        {/* Seleção de Benefícios da Abler */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Benefícios Oferecidos {loadingBenefits && <span className="text-xs font-normal text-gray-400">(carregando Abler...)</span>}
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {ablerBenefitsList.map(bName => {
              const isSelected = (emp.beneficios || []).includes(bName);
              return (
                <button
                  key={bName}
                  type="button"
                  onClick={() => toggleBenefit(bName)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isSelected 
                      ? 'bg-[var(--color-blue-jobz)] text-white border-[var(--color-blue-jobz)] shadow-xs' 
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isSelected ? `✓ ${bName}` : `+ ${bName}`}
                </button>
              );
            })}
          </div>

          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1 font-medium">Outro Benefício / Observação</label>
            <input 
              type="text" 
              placeholder="Ex: Auxílio combustível, Day off de aniversário..." 
              value={emp.descricaoBeneficios} 
              onChange={e => setEmp({ descricaoBeneficios: e.target.value })} 
              className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-medium outline-none focus:bg-white focus:border-[var(--color-blue-jobz)]" 
            />
          </div>
        </div>

        {/* Toggle Aceite 24h */}
        <ToggleSwitch 
          label="Ciente do prazo de início (24h a 48h)"
          description="Estou ciente que após o alinhamento da vaga, o processo seletivo inicia em até 48 horas."
          checked={emp.aceiteAviso24h}
          onChange={val => setEmp({ aceiteAviso24h: val })}
        />

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">Voltar</button>
          <button onClick={nextStep} disabled={!emp.salarioBruto || !emp.aceiteAviso24h} className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  const renderStep5EmpregoReview = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold mb-2">
            <span>✨ Tudo pronto para publicação</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Revisão da Vaga de Emprego</h2>
          <p className="text-sm text-gray-500">Confira as informações antes de finalizar.</p>
        </div>
        
        <div className="bg-gray-50/70 border border-gray-200/80 p-5 rounded-2xl space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Empresa</span>
            <span className="font-bold text-gray-900">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</span>
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
          {emp.beneficios && emp.beneficios.length > 0 && (
            <div className="py-1">
              <span className="text-gray-500 font-medium block mb-1">Benefícios</span>
              <div className="flex flex-wrap gap-1">
                {emp.beneficios.map(b => (
                  <span key={b} className="bg-blue-50 text-[var(--color-blue-jobz)] font-semibold text-xs px-2.5 py-0.5 rounded-full">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">Voltar e Editar</button>
          <button 
            onClick={() => alert('Vaga enviada com sucesso!')}
            className="bg-[var(--color-blue-jobz)] hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all"
          >
            Confirmar e Abrir Vaga
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // FLUXO 2: R&S ESTÁGIO (STEPS 2 a 5)
  // ---------------------------------------------------------------------------
  const getEst = (): EstagioFields => formData.estagioFields!;
  const setEst = (updates: Partial<EstagioFields>) => {
    setFormData(prev => ({ ...prev, estagioFields: { ...prev.estagioFields!, ...updates } }));
  };

  const renderStep2Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Modalidade do Estágio</h2></div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Modelo de Trabalho</label>
              <select value={est.modeloTrabalho} onChange={e => setEst({ modeloTrabalho: e.target.value as WorkModel })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none">
                <option value="Presencial">Presencial</option><option value="Híbrido">Híbrido</option><option value="Remoto">Remoto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Qtd de Vagas</label>
              <input type="number" min={1} value={est.quantidadeVagas} onChange={e => setEst({ quantidadeVagas: parseInt(e.target.value)||1 })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Tipo de Contratação</label>
            <select value={est.tipoContrato} onChange={e => setEst({ tipoContrato: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none">
              <option value="R&S com Formalização">R&S com Formalização (Jobz cuida do contrato)</option>
              <option value="Apenas R&S">Apenas R&S (Cliente cuida do contrato)</option>
            </select>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Dados do Entrevistador na Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Entrevistador</label><input type="text" value={est.entrevistador.nome} onChange={e => setEst({ entrevistador: { ...est.entrevistador, nome: e.target.value }})} className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Celular de Contato</label><input type="text" value={est.entrevistador.celular} onChange={e => setEst({ entrevistador: { ...est.entrevistador, celular: e.target.value }})} className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!est.entrevistador.nome || !est.entrevistador.celular} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep3Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Perfil do Estagiário</h2></div>
        
        <div className="space-y-4">
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Título da Vaga</label><input type="text" placeholder="Ex: Estagiário de Comunicação" value={est.tituloCargo} onChange={e => setEst({ tituloCargo: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Cursos Sugeridos</label><input type="text" placeholder="Ex: Jornalismo, Publicidade, Marketing" value={est.sugestaoCurso} onChange={e => setEst({ sugestaoCurso: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Atividades do Estágio</label><textarea rows={3} value={est.atividades} onChange={e => setEst({ atividades: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Hard Skills (Conhecimentos Técnicos)</label><textarea rows={2} value={est.hardSkills} onChange={e => setEst({ hardSkills: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Soft Skills (Comportamento)</label><textarea rows={2} value={est.softSkills} onChange={e => setEst({ softSkills: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!est.tituloCargo || !est.sugestaoCurso || !est.atividades} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Estagio = () => {
    const est = getEst();
    const handleBolsaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEst({ valorBolsa: formatCurrency(e.target.value) });
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Jornada e Remuneração</h2></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Bolsa Auxílio Mensal</label><input type="text" placeholder="R$ 0,00" value={est.valorBolsa} onChange={handleBolsaChange} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-bold outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Auxílio Transporte</label><input type="text" placeholder="Ex: R$ 150,00 ou Passagem integrativa" value={est.valorTransporte} onChange={e => setEst({ valorTransporte: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Horário de Entrada</label><input type="time" value={est.horarioEntrada} onChange={e => setEst({ horarioEntrada: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Horário de Saída</label><input type="time" value={est.horarioSaida} onChange={e => setEst({ horarioSaida: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!est.valorBolsa || !est.horarioEntrada} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  const renderStep5EstagioReview = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Revisão da Vaga de Estágio</h2></div>
        
        <div className="bg-gray-50/70 border border-gray-200 p-5 rounded-2xl space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Empresa</span>
            <span className="font-bold text-gray-900">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Vaga & Contrato</span>
            <span className="font-bold text-gray-900">{formData.estagioFields?.tituloCargo} ({formData.estagioFields?.tipoContrato})</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Cursos Sugeridos</span>
            <span className="font-bold text-gray-900">{formData.estagioFields?.sugestaoCurso}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Bolsa Auxílio</span>
            <span className="font-bold text-green-700">{formData.estagioFields?.valorBolsa}</span>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar e Editar</button>
          <button onClick={() => alert('Vaga de estágio aberta!')} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all">
            Confirmar e Abrir Vaga
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // FLUXO 3: FORMALIZAÇÃO DE ESTÁGIO (STEPS 2 a 5)
  // ---------------------------------------------------------------------------
  const getForm = (): FormalizacaoFields => formData.formalizacaoFields!;
  const setForm = (updates: Partial<FormalizacaoFields>) => {
    setFormData(prev => ({ ...prev, formalizacaoFields: { ...prev.formalizacaoFields!, ...updates } }));
  };

  const renderStep2Formalizacao = () => {
    const form = getForm();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Dados do Supervisor do Estágio</h2></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Nome do Supervisor</label><input type="text" value={form.supervisor.nome} onChange={e => setForm({ supervisor: { ...form.supervisor, nome: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Cargo</label><input type="text" value={form.supervisor.cargo} onChange={e => setForm({ supervisor: { ...form.supervisor, cargo: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">E-mail</label><input type="email" value={form.supervisor.email} onChange={e => setForm({ supervisor: { ...form.supervisor, email: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Celular</label><input type="text" value={form.supervisor.celular} onChange={e => setForm({ supervisor: { ...form.supervisor, celular: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Curso de Formação</label><input type="text" value={form.supervisor.cursoFormacao} onChange={e => setForm({ supervisor: { ...form.supervisor, cursoFormacao: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!form.supervisor.nome || !form.supervisor.cursoFormacao} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep3Formalizacao = () => {
    const form = getForm();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Dados do Estudante</h2></div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Nome do Estudante</label><input type="text" value={form.estagiario.nome} onChange={e => setForm({ estagiario: { ...form.estagiario, nome: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">CPF</label><input type="text" value={form.estagiario.cpf} onChange={e => setForm({ estagiario: { ...form.estagiario, cpf: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Telefone do Estudante</label><input type="text" value={form.estagiario.telefone} onChange={e => setForm({ estagiario: { ...form.estagiario, telefone: e.target.value }})} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          </div>
          
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Instituição de Ensino</label><input type="text" value={form.instituicaoEnsino} onChange={e => setForm({ instituicaoEnsino: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Nome do Curso</label><input type="text" value={form.nomeCurso} onChange={e => setForm({ nomeCurso: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Semestre Atual</label><input type="text" value={form.periodoSemestre} onChange={e => setForm({ periodoSemestre: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!form.estagiario.nome || !form.estagiario.cpf || !form.instituicaoEnsino} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Formalizacao = () => {
    const form = getForm();
    const handleBolsaFormalizacaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ valorBolsa: formatCurrency(e.target.value) });
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Funções & Bolsa</h2></div>
        
        <div className="space-y-4">
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Título da Função (Estágio em...)</label><input type="text" value={form.tituloFuncao} onChange={e => setForm({ tituloFuncao: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
          <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Descrição das Atividades</label><textarea rows={3} value={form.descricaoAtividades} onChange={e => setForm({ descricaoAtividades: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none" /></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Data Início</label><input type="date" value={form.dataInicio} onChange={e => setForm({ dataInicio: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Data Término</label><input type="date" value={form.dataTermino} onChange={e => setForm({ dataTermino: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium outline-none" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Bolsa Auxílio</label><input type="text" placeholder="R$ 0,00" value={form.valorBolsa} onChange={handleBolsaFormalizacaoChange} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 font-bold outline-none" /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Auxílio Transporte</label><input type="text" placeholder="R$" value={form.valorTransporte} onChange={e => setForm({ valorTransporte: e.target.value })} className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none" /></div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar</button>
          <button onClick={nextStep} disabled={!form.tituloFuncao || !form.valorBolsa} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50">Revisar Formalização</button>
        </div>
      </div>
    );
  };

  const renderStep5FormalizacaoReview = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Pronto para emitir o TCE!</h2></div>
        
        <div className="bg-gray-50/70 border border-gray-200 p-5 rounded-2xl space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Empresa</span>
            <span className="font-bold text-gray-900">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Estudante</span>
            <span className="font-bold text-gray-900">{formData.formalizacaoFields?.estagiario.nome}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Curso</span>
            <span className="font-bold text-gray-900">{formData.formalizacaoFields?.nomeCurso}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/50">
            <span className="text-gray-500 font-medium">Bolsa Auxílio</span>
            <span className="font-bold text-green-700">{formData.formalizacaoFields?.valorBolsa}</span>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <button onClick={prevStep} className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm">Voltar e Editar</button>
          <button onClick={() => alert('Formalização finalizada!')} className="bg-[var(--color-blue-jobz)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-all">
            Finalizar Formalização
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
      
      {formData.serviceType === 'EMPREGO_CLT_PJ' && (
        <>
          {currentStep === 2 && renderStep2Emprego()}
          {currentStep === 3 && renderStep3Emprego()}
          {currentStep === 4 && renderStep4Emprego()}
          {currentStep === 5 && renderStep5EmpregoReview()}
        </>
      )}

      {formData.serviceType === 'RS_ESTAGIO' && (
        <>
          {currentStep === 2 && renderStep2Estagio()}
          {currentStep === 3 && renderStep3Estagio()}
          {currentStep === 4 && renderStep4Estagio()}
          {currentStep === 5 && renderStep5EstagioReview()}
        </>
      )}

      {formData.serviceType === 'FORMALIZACAO_ESTAGIO' && (
        <>
          {currentStep === 2 && renderStep2Formalizacao()}
          {currentStep === 3 && renderStep3Formalizacao()}
          {currentStep === 4 && renderStep4Formalizacao()}
          {currentStep === 5 && renderStep5FormalizacaoReview()}
        </>
      )}
    </div>
  );
}
