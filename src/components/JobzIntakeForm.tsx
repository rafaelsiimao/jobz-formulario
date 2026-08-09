'use client';

import React, { useState, useRef } from 'react';
import { checkAblerCompany, lookupCnpjInAgendor, submitForm } from '@/lib/client-api';
import { uploadVagaFile } from '@/lib/supabase-client';
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

export default function JobzIntakeForm() {
  const [formData, setFormData] = useState<JobzFormData>(createInitialFormState());
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = formData.currentStep || 0;
  const totalSteps = 5; // Step 0 (Identificação) -> Step 1 (Serviço) -> Steps 2, 3, 4 (Vaga) -> Step 5 (Revisão)

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

      // Como a empresa já está identificada, vai DIRETO para a escolha do serviço (Step 1)
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
        <h2 className="text-2xl font-bold mb-2">Identificação da Empresa</h2>
        <p className="text-[var(--color-text-secondary)]">Informe o CNPJ ou CPF para iniciarmos a abertura da vaga.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">CNPJ ou CPF</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={formData.cnpjOuCpfBusca} 
              onChange={handleCnpjCpfChange} 
              onKeyDown={(e) => e.key === 'Enter' && verifyCompany()} 
              placeholder="00.000.000/0000-00" 
              className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none focus:border-[var(--color-blue-jobz)]" 
            />
            <button 
              onClick={verifyCompany} 
              disabled={isChecking || !formData.cnpjOuCpfBusca} 
              className="bg-[var(--color-blue-jobz)] text-white px-6 rounded-md font-semibold disabled:opacity-50"
            >
              {isChecking ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-sm mt-2">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );

  // STEP 1: Escolha do Serviço
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-2">Escolha o Serviço</h2>
        <p className="text-[var(--color-text-secondary)]">
          Empresa identificada: <strong className="text-black">{formData.agendorData?.name || formData.cnpjOuCpfBusca}</strong>. Qual solicitação deseja fazer hoje?
        </p>
      </div>
      <div className="space-y-4">
        {(Object.entries(SERVICE_DESCRIPTIONS) as [ServiceType, {title: string, description: string}][]).map(([key, service]) => (
          <div 
            key={String(key)} 
            onClick={() => setFormData(prev => ({ ...prev, serviceType: key }))} 
            className={`cursor-pointer p-4 rounded-lg border-2 ${formData.serviceType === key ? 'border-[var(--color-blue-jobz)] bg-blue-50' : 'border-[var(--color-line)]'}`}
          >
            <h3 className="font-bold text-lg">{service.title}</h3>
            <p className="text-[var(--color-text-secondary)] text-sm">{service.description}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-6 border-t">
        <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 0 }))} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
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
          className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50"
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

  const renderStep2Emprego = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Perfil da Vaga</h2></div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={emp.vagaSigilosa} onChange={e => setEmp({ vagaSigilosa: e.target.checked })} /> A vaga é sigilosa?</label>
        </div>
        {emp.vagaSigilosa && (
          <div className="p-4 bg-gray-50 border rounded-md space-y-3">
            <input type="text" placeholder="Nome do profissional que será desligado" value={emp.nomeDesligado || ''} onChange={e => setEmp({ nomeDesligado: e.target.value })} className="w-full border p-2 rounded outline-none" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emp.treinamentoPla} onChange={e => setEmp({ treinamentoPla: e.target.checked })} /> Realizaremos Treinamento de Liderança PLA ou Consultoria nesta empresa?</label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Título do Cargo</label>
            <input type="text" placeholder="Ex: Analista Financeiro" value={emp.tituloCargo} onChange={e => setEmp({ tituloCargo: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Modelo de Contrato</label>
            <select value={emp.modeloContrato} onChange={e => setEmp({ modeloContrato: e.target.value as ContractType })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
              <option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Freelancer">Freelancer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nível Hierárquico</label>
            <select value={emp.nivel} onChange={e => setEmp({ nivel: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
              <option value="">Selecione...</option>
              <option value="Operacional">Operacional</option><option value="Assistente">Assistente</option><option value="Analista">Analista</option>
              <option value="Especialista">Especialista</option><option value="Liderança">Liderança / Gestão</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Qtd de Vagas</label>
            <input type="number" min={1} value={emp.quantidadeVagas} onChange={e => setEmp({ quantidadeVagas: parseInt(e.target.value)||1 })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" />
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!emp.tituloCargo || !emp.nivel} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
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
        setUploadError('Erro ao fazer upload do PDF. Tente novamente.');
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Descrição e Requisitos da Vaga</h2></div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input type="radio" name="descType" checked={emp.temDescricaoPronta} onChange={() => setEmp({ temDescricaoPronta: true })} /> 
            Tenho a descrição pronta (Anexar PDF/Doc)
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input type="radio" name="descType" checked={!emp.temDescricaoPronta} onChange={() => setEmp({ temDescricaoPronta: false })} /> 
            Preencher manualmente
          </label>
        </div>

        {emp.temDescricaoPronta ? (
          <div className="border-2 border-dashed p-8 text-center rounded-md bg-gray-50">
            {emp.anexoDescricaoUrl ? (
              <div className="text-green-600 font-semibold">✅ Arquivo da vaga anexado com sucesso!</div>
            ) : (
              <>
                <p className="mb-4 text-gray-600">Selecione o PDF ou documento com o perfil completo da vaga</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-white border px-4 py-2 rounded font-semibold hover:bg-gray-100 shadow-sm">
                  {isUploading ? 'Enviando...' : 'Procurar arquivo'}
                </button>
                {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div><label className="block text-sm font-semibold mb-1">Qual será a função do contratado?</label><textarea rows={3} placeholder="Descreva as atribuições principais..." value={emp.descricaoCargo || ''} onChange={e => setEmp({ descricaoCargo: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Principais responsabilidades</label><textarea rows={3} placeholder="Ex: Emitir relatórios, gerenciar equipe..." value={emp.responsabilidades || ''} onChange={e => setEmp({ responsabilidades: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Hard Skills (Requisitos técnicos)</label><textarea rows={2} placeholder="Ex: Excel avançado, CRM, Inglês..." value={emp.hardSkills || ''} onChange={e => setEmp({ hardSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Soft Skills (Comportamentais)</label><textarea rows={2} placeholder="Ex: Proatividade, Comunicação..." value={emp.softSkills || ''} onChange={e => setEmp({ softSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={emp.temDescricaoPronta ? !emp.anexoDescricaoUrl : (!emp.descricaoCargo || !emp.responsabilidades)} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Emprego = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Trabalho e Remuneração</h2></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Modelo de Trabalho</label>
            <select value={emp.modeloTrabalho} onChange={e => setEmp({ modeloTrabalho: e.target.value as WorkModel })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
              <option value="Presencial">Presencial</option><option value="Híbrido">Híbrido</option><option value="Remoto">Remoto (Home Office)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Salário Bruto Mensal</label>
            <input type="text" placeholder="Ex: R$ 3.500,00" value={emp.salarioBruto} onChange={e => setEmp({ salarioBruto: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Benefícios Oferecidos</label>
          <textarea rows={3} placeholder="Descreva Vale Transporte, Plano de Saúde, VA/VR..." value={emp.descricaoBeneficios} onChange={e => setEmp({ descricaoBeneficios: e.target.value })} className="w-full border rounded-md p-2 outline-none" />
        </div>

        <div className="p-4 bg-yellow-50 text-yellow-900 rounded-md border border-yellow-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emp.aceiteAviso24h} onChange={e => setEmp({ aceiteAviso24h: e.target.checked })} className="mt-1" />
            <span className="text-sm font-medium">Estou ciente que após o alinhamento da vaga, o processo seletivo inicia de 24h a 48h.</span>
          </label>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!emp.salarioBruto || !emp.aceiteAviso24h} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  const renderStep5EmpregoReview = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2 text-green-700">Tudo pronto!</h2><p className="text-[var(--color-text-secondary)]">Revise os dados da vaga antes de enviar.</p></div>
        
        <div className="bg-[var(--color-surface)] border p-4 rounded-md space-y-2 text-sm">
          <p><strong>Empresa:</strong> {formData.agendorData?.name || formData.cnpjOuCpfBusca}</p>
          <p><strong>CNPJ:</strong> {formData.cnpjOuCpfBusca}</p>
          <p><strong>Cargo:</strong> {formData.empregoFields?.tituloCargo} ({formData.empregoFields?.modeloContrato})</p>
          <p><strong>Nível:</strong> {formData.empregoFields?.nivel} - {formData.empregoFields?.quantidadeVagas} vaga(s)</p>
          <p><strong>Salário:</strong> {formData.empregoFields?.salarioBruto}</p>
          {formData.empregoFields?.anexoDescricaoUrl && <p className="text-blue-600 font-semibold">Anexo da Vaga incluído</p>}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar e Editar</button>
          <button 
            onClick={() => alert('Fase 5 - Submissão da vaga será ativada!')}
            className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600"
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
        <div><h2 className="text-2xl font-bold mb-2">Modalidade do Estágio</h2></div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Modelo de Trabalho</label>
              <select value={est.modeloTrabalho} onChange={e => setEst({ modeloTrabalho: e.target.value as WorkModel })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
                <option value="Presencial">Presencial</option><option value="Híbrido">Híbrido</option><option value="Remoto">Remoto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Qtd de Vagas</label>
              <input type="number" min={1} value={est.quantidadeVagas} onChange={e => setEst({ quantidadeVagas: parseInt(e.target.value)||1 })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Tipo de Contratação</label>
            <select value={est.tipoContrato} onChange={e => setEst({ tipoContrato: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
              <option value="R&S com Formalização">R&S com Formalização (Jobz cuida do contrato)</option>
              <option value="Apenas R&S">Apenas R&S (Cliente cuida do contrato)</option>
            </select>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold mb-3">Dados do Entrevistador na Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1">Nome do Entrevistador</label><input type="text" value={est.entrevistador.nome} onChange={e => setEst({ entrevistador: { ...est.entrevistador, nome: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
              <div><label className="block text-sm mb-1">Celular de Contato</label><input type="text" value={est.entrevistador.celular} onChange={e => setEst({ entrevistador: { ...est.entrevistador, celular: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.entrevistador.nome || !est.entrevistador.celular} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep3Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Perfil do Estagiário</h2></div>
        
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold mb-1">Título da Vaga</label><input type="text" placeholder="Ex: Estagiário de Comunicação" value={est.tituloCargo} onChange={e => setEst({ tituloCargo: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Cursos Sugeridos</label><input type="text" placeholder="Ex: Jornalismo, Publicidade, Marketing" value={est.sugestaoCurso} onChange={e => setEst({ sugestaoCurso: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Atividades do Estágio</label><textarea rows={3} value={est.atividades} onChange={e => setEst({ atividades: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Hard Skills (Conhecimentos Técnicos)</label><textarea rows={2} value={est.hardSkills} onChange={e => setEst({ hardSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Soft Skills (Comportamento)</label><textarea rows={2} value={est.softSkills} onChange={e => setEst({ softSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.tituloCargo || !est.sugestaoCurso || !est.atividades} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Jornada e Remuneração</h2></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1">Bolsa Auxílio Mensal</label><input type="text" placeholder="R$" value={est.valorBolsa} onChange={e => setEst({ valorBolsa: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Auxílio Transporte</label><input type="text" placeholder="R$" value={est.valorTransporte} onChange={e => setEst({ valorTransporte: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1">Horário de Entrada</label><input type="time" value={est.horarioEntrada} onChange={e => setEst({ horarioEntrada: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Horário de Saída</label><input type="time" value={est.horarioSaida} onChange={e => setEst({ horarioSaida: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.valorBolsa || !est.horarioEntrada} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  const renderStep5EstagioReview = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2 text-green-700">Tudo pronto!</h2><p className="text-[var(--color-text-secondary)]">Revise a solicitação de estágio.</p></div>
        
        <div className="bg-[var(--color-surface)] border p-4 rounded-md space-y-2 text-sm">
          <p><strong>Empresa:</strong> {formData.agendorData?.name || formData.cnpjOuCpfBusca}</p>
          <p><strong>Vaga:</strong> {formData.estagioFields?.tituloCargo} ({formData.estagioFields?.tipoContrato})</p>
          <p><strong>Cursos:</strong> {formData.estagioFields?.sugestaoCurso}</p>
          <p><strong>Bolsa:</strong> {formData.estagioFields?.valorBolsa} + Transporte: {formData.estagioFields?.valorTransporte}</p>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar e Editar</button>
          <button onClick={() => alert('Fase 5 - Submissão do estágio será ativada!')} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600">
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
        <div><h2 className="text-2xl font-bold mb-2">Dados do Supervisor do Estágio</h2></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm mb-1 font-semibold">Nome Completo do Supervisor</label><input type="text" value={form.supervisor.nome} onChange={e => setForm({ supervisor: { ...form.supervisor, nome: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm mb-1 font-semibold">Cargo</label><input type="text" value={form.supervisor.cargo} onChange={e => setForm({ supervisor: { ...form.supervisor, cargo: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm mb-1 font-semibold">E-mail</label><input type="email" value={form.supervisor.email} onChange={e => setForm({ supervisor: { ...form.supervisor, email: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm mb-1 font-semibold">Celular</label><input type="text" value={form.supervisor.celular} onChange={e => setForm({ supervisor: { ...form.supervisor, celular: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm mb-1 font-semibold">Curso de Formação</label><input type="text" value={form.supervisor.cursoFormacao} onChange={e => setForm({ supervisor: { ...form.supervisor, cursoFormacao: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={() => setFormData(prev => ({ ...prev, currentStep: 1 }))} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!form.supervisor.nome || !form.supervisor.cursoFormacao} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep3Formalizacao = () => {
    const form = getForm();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Dados do Estudante</h2></div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Nome do Estudante</label><input type="text" value={form.estagiario.nome} onChange={e => setForm({ estagiario: { ...form.estagiario, nome: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">CPF</label><input type="text" value={form.estagiario.cpf} onChange={e => setForm({ estagiario: { ...form.estagiario, cpf: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Telefone do Estudante</label><input type="text" value={form.estagiario.telefone} onChange={e => setForm({ estagiario: { ...form.estagiario, telefone: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          </div>
          
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Instituição de Ensino</label><input type="text" value={form.instituicaoEnsino} onChange={e => setForm({ instituicaoEnsino: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Nome do Curso</label><input type="text" value={form.nomeCurso} onChange={e => setForm({ nomeCurso: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Semestre Atual</label><input type="text" value={form.periodoSemestre} onChange={e => setForm({ periodoSemestre: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!form.estagiario.nome || !form.estagiario.cpf || !form.instituicaoEnsino} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Formalizacao = () => {
    const form = getForm();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Funções e Bolsa</h2></div>
        
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold mb-1">Título da Função (estágio em...)</label><input type="text" value={form.tituloFuncao} onChange={e => setForm({ tituloFuncao: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Descrição das Atividades</label><textarea rows={3} value={form.descricaoAtividades} onChange={e => setForm({ descricaoAtividades: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Data Início</label><input type="date" value={form.dataInicio} onChange={e => setForm({ dataInicio: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Data Término</label><input type="date" value={form.dataTermino} onChange={e => setForm({ dataTermino: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div><label className="block text-sm font-semibold mb-1">Bolsa Auxílio</label><input type="text" placeholder="R$" value={form.valorBolsa} onChange={e => setForm({ valorBolsa: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Auxílio Transporte</label><input type="text" placeholder="R$" value={form.valorTransporte} onChange={e => setForm({ valorTransporte: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!form.tituloFuncao || !form.valorBolsa} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Revisar Formalização</button>
        </div>
      </div>
    );
  };

  const renderStep5FormalizacaoReview = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2 text-green-700">Pronto para emitir o TCE!</h2><p className="text-[var(--color-text-secondary)]">Revise os dados do estudante.</p></div>
        
        <div className="bg-[var(--color-surface)] border p-4 rounded-md space-y-2 text-sm">
          <p><strong>Empresa:</strong> {formData.agendorData?.name || formData.cnpjOuCpfBusca}</p>
          <p><strong>Estudante:</strong> {formData.formalizacaoFields?.estagiario.nome}</p>
          <p><strong>Curso:</strong> {formData.formalizacaoFields?.nomeCurso} - {formData.formalizacaoFields?.instituicaoEnsino}</p>
          <p><strong>Bolsa:</strong> {formData.formalizacaoFields?.valorBolsa}</p>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar e Editar</button>
          <button onClick={() => alert('Fase 5 - Submissão de Formalização será ativada!')} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600">
            Finalizar Formalização
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-line)] p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-line)]">
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
