'use client';

import React, { useState } from 'react';
import {
  createInitialFormState,
  ExperienceLevel,
  JobzFormData,
  SERVICE_DESCRIPTIONS,
  ServiceType,
} from '@/types/jobz-form';

export default function JobzIntakeForm() {
  const [formData, setFormData] = useState<JobzFormData>(createInitialFormState());
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { currentStep = 1 } = formData;

  const nextStep = () => setFormData(prev => ({ ...prev, currentStep: (prev.currentStep || 1) + 1 }));
  const prevStep = () => setFormData(prev => ({ ...prev, currentStep: Math.max(1, (prev.currentStep || 1) - 1) }));

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    // Format CNPJ
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');

    setFormData(prev => ({
      ...prev,
      clientIdentity: { ...prev.clientIdentity, cnpjCpf: value }
    }));
  };

  const simulateCrmLookup = () => {
    const rawCnpj = formData.clientIdentity.cnpjCpf.replace(/\D/g, '');
    if (rawCnpj.length === 14) {
      setIsFetchingCnpj(true);
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          clientIdentity: {
            ...prev.clientIdentity,
            razaoSocial: 'Empresa Fictícia Simulada LTDA'
          }
        }));
        setIsFetchingCnpj(false);
      }, 1500);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-2">Identificação</h2>
        <p className="text-[var(--color-text-secondary)]">Informe o CNPJ da empresa para iniciarmos.</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">CNPJ</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.clientIdentity.cnpjCpf}
              onChange={handleCnpjChange}
              onBlur={simulateCrmLookup}
              placeholder="00.000.000/0000-00"
              className="w-full min-h-[44px] border border-[var(--color-line)] rounded-md px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--effect-focus-ring)] transition-shadow"
            />
            <button 
              type="button" 
              onClick={simulateCrmLookup}
              className="bg-[var(--color-blue-jobz)] text-white px-4 rounded-md font-semibold min-h-[44px] hover:bg-blue-600 transition-colors"
            >
              {isFetchingCnpj ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Razão Social</label>
          <input
            type="text"
            value={formData.clientIdentity.razaoSocial}
            onChange={(e) => setFormData(prev => ({ ...prev, clientIdentity: { ...prev.clientIdentity, razaoSocial: e.target.value } }))}
            placeholder="Preenchimento automático"
            className="w-full min-h-[44px] border border-[var(--color-line)] rounded-md px-3 py-2 text-base bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--effect-focus-ring)] transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={nextStep}
          disabled={!formData.clientIdentity.cnpjCpf || !formData.clientIdentity.razaoSocial}
          className="bg-[var(--color-blue-jobz)] text-white px-6 rounded-md font-semibold min-h-[44px] hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          Próximo
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-2">Serviço</h2>
        <p className="text-[var(--color-text-secondary)]">Qual serviço você precisa?</p>
      </div>
      
      <div className="space-y-4">
        {(Object.entries(SERVICE_DESCRIPTIONS) as [ServiceType, {title: string, description: string}][]).map(([key, service]) => (
          <div 
            key={key}
            onClick={() => setFormData(prev => ({ ...prev, serviceType: key }))}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
              formData.serviceType === key 
                ? 'border-[var(--color-blue-jobz)] bg-blue-50' 
                : 'border-[var(--color-line)] bg-white hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-lg">{service.title}</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">{service.description}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={prevStep}
          className="bg-white border border-[var(--color-line)] text-gray-700 px-6 rounded-md font-semibold min-h-[44px] hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="bg-[var(--color-blue-jobz)] text-white px-6 rounded-md font-semibold min-h-[44px] hover:bg-blue-600 transition-colors"
        >
          Próximo
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-2xl font-bold mb-2">Briefing da Vaga</h2>
          <p className="text-[var(--color-text-secondary)]">Detalhes da oportunidade.</p>
        </div>
        
        {formData.serviceType === 'EMPREGO_CLT_PJ' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Tipo de Contrato</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input 
                    type="radio" 
                    name="contrato" 
                    value="CLT"
                    checked={formData.jobDetails.modeloContrato === 'CLT'}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, modeloContrato: 'CLT' } }))}
                    className="w-4 h-4 text-[var(--color-blue-jobz)]"
                  />
                  <span>CLT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input 
                    type="radio" 
                    name="contrato" 
                    value="PJ"
                    checked={formData.jobDetails.modeloContrato === 'PJ'}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, modeloContrato: 'PJ' } }))}
                    className="w-4 h-4 text-[var(--color-blue-jobz)]"
                  />
                  <span>PJ</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nível</label>
                <select
                  value={formData.jobDetails.nivel}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, nivel: e.target.value as ExperienceLevel } }))}
                  className="w-full min-h-[44px] border border-[var(--color-line)] rounded-md px-3 py-2 bg-white focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--effect-focus-ring)] transition-shadow"
                >
                  <option value="Júnior">Júnior</option>
                  <option value="Pleno">Pleno</option>
                  <option value="Sênior">Sênior</option>
                  <option value="Especialista">Especialista</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Qtd. Vagas</label>
                <input
                  type="number"
                  min="1"
                  value={formData.jobDetails.quantidadeVagas}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, quantidadeVagas: parseInt(e.target.value) || 1 } }))}
                  className="w-full min-h-[44px] border border-[var(--color-line)] rounded-md px-3 py-2 bg-white focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--effect-focus-ring)] transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Faixa Salarial</label>
              <input
                type="text"
                placeholder="Ex: R$ 3.000 a R$ 4.000"
                value={formData.jobDetails.faixaSalarial}
                onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, faixaSalarial: e.target.value } }))}
                className="w-full min-h-[44px] border border-[var(--color-line)] rounded-md px-3 py-2 bg-white focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--effect-focus-ring)] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Descrição / Responsabilidades</label>
              <textarea
                rows={4}
                value={formData.jobDetails.responsabilidades}
                onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, responsabilidades: e.target.value } }))}
                className="w-full min-h-[44px] border border-[var(--color-line)] rounded-md px-3 py-2 bg-white focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--effect-focus-ring)] transition-shadow resize-y"
              />
            </div>
          </div>
        )}
        
        {formData.serviceType !== 'EMPREGO_CLT_PJ' && (
           <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
             Campos de estágio ou formalização omitidos para brevidade neste demo.
           </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={prevStep}
            className="bg-white border border-[var(--color-line)] text-gray-700 px-6 rounded-md font-semibold min-h-[44px] hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="bg-[var(--color-blue-jobz)] text-white px-6 rounded-md font-semibold min-h-[44px] hover:bg-blue-600 transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-2">Envio & Aceite</h2>
        <p className="text-[var(--color-text-secondary)]">Revise e confirme sua solicitação.</p>
      </div>
      
      <div className="bg-[var(--color-surface)] p-4 rounded-md border border-[var(--color-line)] space-y-2 text-sm">
        <p><strong>Empresa:</strong> {formData.clientIdentity.razaoSocial} ({formData.clientIdentity.cnpjCpf})</p>
        <p><strong>Serviço:</strong> {SERVICE_DESCRIPTIONS[formData.serviceType].title}</p>
        {formData.serviceType === 'EMPREGO_CLT_PJ' && (
          <p><strong>Vaga:</strong> {formData.jobDetails.nivel} - {formData.jobDetails.modeloContrato} ({formData.jobDetails.quantidadeVagas} vaga{formData.jobDetails.quantidadeVagas > 1 ? 's' : ''})</p>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
          <input 
            type="checkbox" 
            checked={formData.jobDetails.aceiteTermosLgpd}
            onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, aceiteTermosLgpd: e.target.checked } }))}
            className="mt-1 w-4 h-4 rounded text-[var(--color-blue-jobz)] focus:ring-[var(--color-blue-jobz)]"
          />
          <span className="text-sm">Concordo com os Termos de Uso e Política de Privacidade (LGPD).</span>
        </label>
        
        <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
          <input 
            type="checkbox" 
            checked={formData.jobDetails.aceitePropostaComercial}
            onChange={(e) => setFormData(prev => ({ ...prev, jobDetails: { ...prev.jobDetails, aceitePropostaComercial: e.target.checked } }))}
            className="mt-1 w-4 h-4 rounded text-[var(--color-blue-jobz)] focus:ring-[var(--color-blue-jobz)]"
          />
          <span className="text-sm">Aceito as condições comerciais (50% na abertura, 3 dias úteis para início).</span>
        </label>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={prevStep}
          disabled={isSubmitting}
          className="bg-white border border-[var(--color-line)] text-gray-700 px-6 rounded-md font-semibold min-h-[44px] hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSubmitting(true);
            setTimeout(() => {
              setIsSubmitting(false);
              setSubmitted(true);
            }, 1500);
          }}
          disabled={!formData.jobDetails.aceiteTermosLgpd || !formData.jobDetails.aceitePropostaComercial || isSubmitting}
          className="bg-[var(--color-blue-jobz)] text-white px-6 rounded-md font-semibold min-h-[44px] hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Finalizar e Enviar'}
        </button>
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="text-center py-12 animate-in zoom-in duration-500">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Solicitação Enviada!</h2>
        <p className="text-[var(--color-text-secondary)]">Nossa equipe entrará em contato em breve.</p>
        <button
          onClick={() => {
            setFormData(createInitialFormState());
            setSubmitted(false);
          }}
          className="mt-6 text-[var(--color-blue-jobz)] font-semibold hover:underline"
        >
          Preencher nova vaga
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-line)] p-6 md:p-8 relative overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-line)]">
        <div 
          className="h-full bg-[var(--color-blue-jobz)] transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
}
