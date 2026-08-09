'use client';

import React, { useState, useRef } from 'react';
import { checkAblerCompany, lookupCnpjInAgendor, submitForm } from '@/lib/client-api';
import { uploadVagaFile } from '@/lib/supabase-client';
import {
  createInitialFormState,
  JobzFormData,
  SERVICE_DESCRIPTIONS,
  ServiceType,
  CadastroFields,
  EmpregoFields,
  EstagioFields,
  ContractType,
  WorkModel,
  GenderPreference
} from '@/types/jobz-form';

export default function JobzIntakeForm() {
  const [formData, setFormData] = useState<JobzFormData>(createInitialFormState());
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = formData.currentStep || 0;
  const totalSteps = formData.serviceType === 'EMPREGO_CLT_PJ' ? 7 : formData.serviceType === 'RS_ESTAGIO' ? 7 : 3;

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
        cadastroFields: !ablerResult.exists ? {
          origem: '', contatoComercial: '', tipoContratacao: rawDoc.length === 14 ? 'CNPJ' : 'CPF',
          cnpjCpf: prev.cnpjOuCpfBusca, razaoSocial: agendorResult?.name || '', nomeFantasia: '',
          celularPrincipal: '', enderecoSede: { ruaNumeroComplemento: '', bairro: '', cidade: '', estado: '', cep: '' },
          representanteLegal: { nome: '', cargo: '', email: '', celular: '' },
          contatoVagas: 'Representante', contatoFinanceiro: 'Representante', aceiteGdpr: false, aceiteInformativos: false,
        } : undefined
      }));

      setFormData(prev => ({ ...prev, currentStep: ablerResult.exists ? 2 : 1 }));
    } catch (err) {
      setErrorMsg('Erro ao consultar as integrações.');
    } finally {
      setIsChecking(false);
    }
  };

  // STEP 0: Identificação
  const renderStep0 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div><h2 className="text-2xl font-bold mb-2">Identificação</h2><p className="text-[var(--color-text-secondary)]">Informe o CNPJ ou CPF para iniciarmos.</p></div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">CNPJ ou CPF</label>
          <div className="flex gap-2">
            <input type="text" value={formData.cnpjOuCpfBusca} onChange={handleCnpjCpfChange} onKeyDown={(e) => e.key === 'Enter' && verifyCompany()} placeholder="00.000.000/0000-00" className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none focus:border-[var(--color-blue-jobz)]" />
            <button onClick={verifyCompany} disabled={isChecking || !formData.cnpjOuCpfBusca} className="bg-[var(--color-blue-jobz)] text-white px-6 rounded-md font-semibold disabled:opacity-50">
              {isChecking ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-sm mt-2">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );

  // STEP 1: Cadastro
  const renderStep1 = () => {
    if (!formData.cadastroFields) return null;
    const cad = formData.cadastroFields;
    const setCad = (updates: Partial<CadastroFields>) => setFormData(prev => ({ ...prev, cadastroFields: { ...prev.cadastroFields!, ...updates } }));

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2 text-green-700">💚 Conecte sua empresa à Jobz</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1">Razão Social</label><input type="text" value={cad.razaoSocial} onChange={(e) => setCad({ razaoSocial: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Nome Fantasia</label><input type="text" value={cad.nomeFantasia} onChange={(e) => setCad({ nomeFantasia: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Contato Comercial Jobz</label>
          <select value={cad.contatoComercial} onChange={(e) => setCad({ contatoComercial: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
            <option value="">Selecione...</option><option value="Kleber Alves">Kleber Alves</option><option value="Luciana Roberty">Luciana Roberty</option><option value="Téia Aguiar">Téia Aguiar</option><option value="Elivelton Cardoso">Elivelton Cardoso</option>
          </select>
        </div>
        <div className="flex justify-between pt-6 border-t">
          <button onClick={() => setFormData(prev => ({...prev, currentStep: 0}))} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!cad.razaoSocial || !cad.contatoComercial} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  // STEP 2: Serviço
  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div><h2 className="text-2xl font-bold mb-2">Serviço</h2><p className="text-[var(--color-text-secondary)]">Qual serviço você precisa?</p></div>
      <div className="space-y-4">
        {(Object.entries(SERVICE_DESCRIPTIONS) as [ServiceType, {title: string, description: string}][]).map(([key, service]) => (
          <div key={String(key)} onClick={() => setFormData(prev => ({ ...prev, serviceType: key }))} className={`cursor-pointer p-4 rounded-lg border-2 ${formData.serviceType === key ? 'border-[var(--color-blue-jobz)] bg-blue-50' : 'border-[var(--color-line)]'}`}>
            <h3 className="font-bold text-lg">{service.title}</h3><p className="text-[var(--color-text-secondary)] text-sm">{service.description}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-6">
        <button onClick={() => setFormData(prev => ({ ...prev, currentStep: formData.isNewCompany ? 1 : 0 }))} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
        <button
          onClick={() => {
            if (formData.serviceType === 'EMPREGO_CLT_PJ') {
              setFormData(prev => ({
                ...prev, currentStep: 3,
                empregoFields: prev.empregoFields || {
                  origemVaga: '', aceitePagamento: false, aceiteProposta: false, aceitePrazo: false,
                  vagaSigilosa: false, tituloCargo: '', modeloContrato: 'CLT', nivel: '', quantidadeVagas: 1,
                  escolaridade: [], genero: 'Indiferente', restricaoIdade: false, temDescricaoPronta: false,
                  modeloTrabalho: 'Presencial', mesmoLocalSede: true, jornadaDias: [], horarioInicio: '',
                  tempoIntervalo: '', horarioFim: '', salarioBruto: '', beneficios: [], descricaoBeneficios: '', aceiteAviso24h: false
                }
              }));
            } else if (formData.serviceType === 'RS_ESTAGIO') {
              setFormData(prev => ({
                ...prev, currentStep: 3,
                estagioFields: prev.estagioFields || {
                  jaAbriuVaga: false, modeloTrabalho: 'Presencial', mesmoLocalSede: true,
                  tipoContrato: 'R&S com Formalização', quantidadeVagas: 1, aceiteGdprPrazo: false,
                  entrevistador: { nome: '', cargo: '', email: '', celular: '' },
                  supervisorMesmoEntrevistador: true,
                  tituloCargo: '', hardSkills: '', softSkills: '', atividades: '', comentariosGerais: '',
                  nivelEstudante: [], genero: 'Indiferente', sugestaoCurso: '',
                  periodoEstagio: [], jornadaDias: [], horarioEntrada: '', horarioSaida: '',
                  valorBolsa: '', valorTransporte: '', contemplaBonificacao: false, contemplaOutroBeneficio: false,
                  aceiteGdprTermos: false
                }
              }));
            } else {
              alert('Fase 4 (Formalização) será implementada em breve.');
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
  // FASE 2: EMPREGO CLT/PJ - STEPS 3 a 7
  // ---------------------------------------------------------------------------
  
  const getEmp = (): EmpregoFields => formData.empregoFields!;
  const setEmp = (updates: Partial<EmpregoFields>) => {
    setFormData(prev => ({ ...prev, empregoFields: { ...prev.empregoFields!, ...updates } }));
  };

  const renderStep3Emprego = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Origem e Aceites (Emprego)</h2></div>
        
        <div>
          <label className="block text-sm font-semibold mb-1">Como essa vaga chegou até nós?</label>
          <select value={emp.origemVaga} onChange={e => setEmp({ origemVaga: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none">
            <option value="">Selecione...</option><option value="E-mail">E-mail</option><option value="WhatsApp">WhatsApp</option>
            <option value="Linkedin">Linkedin</option><option value="Indicação">Indicação</option><option value="Outro">Outro</option>
          </select>
          {emp.origemVaga === 'Outro' && (
            <input type="text" placeholder="Qual?" value={emp.origemVagaOutro || ''} onChange={e => setEmp({ origemVagaOutro: e.target.value })} className="w-full mt-2 min-h-[44px] border rounded-md px-3 py-2 outline-none" />
          )}
        </div>

        <div className="space-y-3 bg-[var(--color-surface)] p-4 rounded-md border">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emp.aceitePagamento} onChange={e => setEmp({ aceitePagamento: e.target.checked })} className="mt-1" />
            <span className="text-sm">Confirmo que o cliente está ciente da condição comercial (Sinal de 50% de entrada + 50% após o fechamento).</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emp.aceiteProposta} onChange={e => setEmp({ aceiteProposta: e.target.checked })} className="mt-1" />
            <span className="text-sm">Confirmo que a proposta comercial assinada foi enviada ao financeiro.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emp.aceitePrazo} onChange={e => setEmp({ aceitePrazo: e.target.checked })} className="mt-1" />
            <span className="text-sm">Estou ciente do prazo padrão da entrega (15 dias úteis a partir do start do R&S).</span>
          </label>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!emp.origemVaga || !emp.aceitePagamento || !emp.aceiteProposta || !emp.aceitePrazo} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Emprego = () => {
    const emp = getEmp();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Perfil da Vaga</h2></div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={emp.vagaSigilosa} onChange={e => setEmp({ vagaSigilosa: e.target.checked })} /> A vaga é sigilosa?</label>
        </div>
        {emp.vagaSigilosa && (
          <div className="p-4 bg-gray-50 border rounded-md space-y-3">
            <input type="text" placeholder="Nome do profissional que será desligado" value={emp.nomeDesligado || ''} onChange={e => setEmp({ nomeDesligado: e.target.value })} className="w-full border p-2 rounded" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emp.treinamentoPla} onChange={e => setEmp({ treinamentoPla: e.target.checked })} /> Realizaremos Treinamento de PLA ou Consultoria nesta empresa?</label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Título do Cargo</label>
            <input type="text" value={emp.tituloCargo} onChange={e => setEmp({ tituloCargo: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" />
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
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!emp.tituloCargo || !emp.nivel} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep5Emprego = () => {
    const emp = getEmp();
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      setUploadError(null);
      
      try {
        const url = await uploadVagaFile(file, formData.cadastroFields?.razaoSocial || formData.agendorData?.name || 'empresa_desconhecida');
        setEmp({ anexoDescricaoUrl: url });
      } catch (err) {
        setUploadError('Erro ao fazer upload. Tente novamente.');
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Descrição e Requisitos</h2></div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="descType" checked={emp.temDescricaoPronta} onChange={() => setEmp({ temDescricaoPronta: true })} /> 
            Tenho a descrição pronta (PDF/Doc)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="descType" checked={!emp.temDescricaoPronta} onChange={() => setEmp({ temDescricaoPronta: false })} /> 
            Preencher manualmente
          </label>
        </div>

        {emp.temDescricaoPronta ? (
          <div className="border-2 border-dashed p-8 text-center rounded-md">
            {emp.anexoDescricaoUrl ? (
              <div className="text-green-600 font-semibold">✅ Arquivo anexado com sucesso!</div>
            ) : (
              <>
                <p className="mb-4 text-gray-600">Selecione o arquivo com o perfil da vaga</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-gray-200 px-4 py-2 rounded text-gray-800 font-semibold hover:bg-gray-300">
                  {isUploading ? 'Enviando...' : 'Procurar arquivo'}
                </button>
                {uploadError && <p className="text-red-500 mt-2">{uploadError}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div><label className="block text-sm font-semibold mb-1">Qual será a função do contratado?</label><textarea rows={3} value={emp.descricaoCargo || ''} onChange={e => setEmp({ descricaoCargo: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Principais responsabilidades</label><textarea rows={3} value={emp.responsabilidades || ''} onChange={e => setEmp({ responsabilidades: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Hard Skills (Requisitos técnicos)</label><textarea rows={2} value={emp.hardSkills || ''} onChange={e => setEmp({ hardSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-1">Soft Skills (Comportamentais)</label><textarea rows={2} value={emp.softSkills || ''} onChange={e => setEmp({ softSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={emp.temDescricaoPronta ? !emp.anexoDescricaoUrl : (!emp.descricaoCargo || !emp.responsabilidades)} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep6Emprego = () => {
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

        <div className="space-y-2">
          <label className="block text-sm font-semibold mb-1">Benefícios</label>
          <textarea rows={3} placeholder="Descreva Vale Transporte, Plano de Saúde, VA/VR..." value={emp.descricaoBeneficios} onChange={e => setEmp({ descricaoBeneficios: e.target.value })} className="w-full border rounded-md p-2 outline-none" />
        </div>

        <div className="p-4 bg-yellow-50 text-yellow-900 rounded-md border border-yellow-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emp.aceiteAviso24h} onChange={e => setEmp({ aceiteAviso24h: e.target.checked })} className="mt-1" />
            <span className="text-sm font-medium">Estou ciente que após o alinhamento da vaga as divulgações sobem no sistema em 24h a 48h.</span>
          </label>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!emp.salarioBruto || !emp.aceiteAviso24h} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  const renderStep7Review = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2 text-green-700">Tudo pronto!</h2><p className="text-[var(--color-text-secondary)]">Revise os dados abaixo antes de abrir a vaga na Abler.</p></div>
        
        <div className="bg-[var(--color-surface)] border p-4 rounded-md space-y-2 text-sm">
          <p><strong>Empresa:</strong> {formData.cadastroFields?.razaoSocial || formData.agendorData?.name}</p>
          <p><strong>CNPJ:</strong> {formData.cnpjOuCpfBusca}</p>
          <p><strong>Vaga:</strong> {formData.empregoFields?.tituloCargo} ({formData.empregoFields?.modeloContrato})</p>
          <p><strong>Qtd:</strong> {formData.empregoFields?.quantidadeVagas} vaga(s)</p>
          <p><strong>Salário:</strong> {formData.empregoFields?.salarioBruto}</p>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar e Editar</button>
          <button 
            onClick={() => alert('Fase 5 - Submissão na Abler será implementada em breve!')}
            className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600"
          >
            Confirmar e Abrir Vaga
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // FASE 3: ESTÁGIO - STEPS 3 a 7
  // ---------------------------------------------------------------------------
  
  const getEst = (): EstagioFields => formData.estagioFields!;
  const setEst = (updates: Partial<EstagioFields>) => {
    setFormData(prev => ({ ...prev, estagioFields: { ...prev.estagioFields!, ...updates } }));
  };

  const renderStep3Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Modalidade da Vaga</h2></div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={est.jaAbriuVaga} onChange={e => setEst({ jaAbriuVaga: e.target.checked })} />
            Esta é a primeira vez que abrem vaga de estágio?
          </label>
          
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
              <option value="R&S com Formalização">R&S com Formalização (Jobz faz o contrato)</option>
              <option value="Apenas R&S">Apenas R&S (Cliente faz o contrato)</option>
            </select>
          </div>
          
          <div className="p-4 bg-[var(--color-surface)] border rounded-md">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={est.aceiteGdprPrazo} onChange={e => setEst({ aceiteGdprPrazo: e.target.checked })} className="mt-1" />
              <span className="text-sm">Estou ciente do prazo de 15 dias úteis e condições comerciais.</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.aceiteGdprPrazo} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep4Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Entrevistador / Supervisor</h2><p className="text-[var(--color-text-secondary)]">Quem irá entrevistar e supervisionar o estagiário?</p></div>
        
        <div className="border-t pt-4">
          <h3 className="font-bold mb-3">Dados do Entrevistador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm mb-1">Nome Completo</label><input type="text" value={est.entrevistador.nome} onChange={e => setEst({ entrevistador: { ...est.entrevistador, nome: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm mb-1">E-mail</label><input type="email" value={est.entrevistador.email} onChange={e => setEst({ entrevistador: { ...est.entrevistador, email: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            <div><label className="block text-sm mb-1">Telefone/Celular</label><input type="text" value={est.entrevistador.celular} onChange={e => setEst({ entrevistador: { ...est.entrevistador, celular: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          </div>
        </div>

        <div className="pt-4">
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input type="checkbox" checked={est.supervisorMesmoEntrevistador} onChange={e => setEst({ supervisorMesmoEntrevistador: e.target.checked })} />
            O supervisor será a mesma pessoa que o entrevistador?
          </label>
        </div>

        {!est.supervisorMesmoEntrevistador && (
          <div className="border-t pt-4 bg-gray-50 p-4 rounded-md">
            <h3 className="font-bold mb-3">Dados do Supervisor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1">Nome Completo</label><input type="text" value={est.supervisor?.nome || ''} onChange={e => setEst({ supervisor: { ...(est.supervisor||{cargo:'',email:'',celular:'',nome:''}), nome: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
              <div><label className="block text-sm mb-1">E-mail</label><input type="email" value={est.supervisor?.email || ''} onChange={e => setEst({ supervisor: { ...(est.supervisor||{cargo:'',email:'',celular:'',nome:''}), email: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
              <div><label className="block text-sm mb-1">Telefone/Celular</label><input type="text" value={est.supervisor?.celular || ''} onChange={e => setEst({ supervisor: { ...(est.supervisor||{cargo:'',email:'',celular:'',nome:''}), celular: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
              <div><label className="block text-sm mb-1">Cargo/Formação</label><input type="text" value={est.supervisor?.cargo || ''} onChange={e => setEst({ supervisor: { ...(est.supervisor||{cargo:'',email:'',celular:'',nome:''}), cargo: e.target.value }})} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.entrevistador.nome || !est.entrevistador.celular} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep5Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Perfil do Estagiário</h2></div>
        
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold mb-1">Título da Vaga</label><input type="text" placeholder="Ex: Estagiário de Marketing" value={est.tituloCargo} onChange={e => setEst({ tituloCargo: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Cursos Sugeridos (Ex: Administração, Marketing)</label><input type="text" value={est.sugestaoCurso} onChange={e => setEst({ sugestaoCurso: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Atividades e Responsabilidades</label><textarea rows={3} value={est.atividades} onChange={e => setEst({ atividades: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Hard Skills (Conhecimentos Técnicos Básicos)</label><textarea rows={2} value={est.hardSkills} onChange={e => setEst({ hardSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Soft Skills (Perfil Comportamental)</label><textarea rows={2} value={est.softSkills} onChange={e => setEst({ softSkills: e.target.value })} className="w-full border rounded-md p-2 outline-none" /></div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.tituloCargo || !est.sugestaoCurso || !est.atividades} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Avançar</button>
        </div>
      </div>
    );
  };

  const renderStep6Estagio = () => {
    const est = getEst();
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2">Jornada e Remuneração</h2></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1">Valor da Bolsa Auxílio</label><input type="text" placeholder="R$" value={est.valorBolsa} onChange={e => setEst({ valorBolsa: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Auxílio Transporte</label><input type="text" placeholder="R$" value={est.valorTransporte} onChange={e => setEst({ valorTransporte: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1">Horário de Entrada</label><input type="time" value={est.horarioEntrada} onChange={e => setEst({ horarioEntrada: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
          <div><label className="block text-sm font-semibold mb-1">Horário de Saída</label><input type="time" value={est.horarioSaida} onChange={e => setEst({ horarioSaida: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" /></div>
        </div>

        <div className="p-4 bg-[var(--color-surface)] border rounded-md space-y-3 mt-4">
          <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={est.contemplaBonificacao} onChange={e => setEst({ contemplaBonificacao: e.target.checked })} /> A vaga possui alguma bonificação?</label>
          {est.contemplaBonificacao && <input type="text" placeholder="Descreva a bonificação" value={est.descricaoBonificacao || ''} onChange={e => setEst({ descricaoBonificacao: e.target.value })} className="w-full min-h-[44px] border rounded-md px-3 py-2 outline-none" />}
        </div>
        
        <div className="p-4 bg-[var(--color-surface)] border rounded-md">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={est.aceiteGdprTermos} onChange={e => setEst({ aceiteGdprTermos: e.target.checked })} className="mt-1" />
            <span className="text-sm font-medium">Aceito as políticas de privacidade e termos da plataforma.</span>
          </label>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar</button>
          <button onClick={nextStep} disabled={!est.valorBolsa || !est.horarioEntrada || !est.aceiteGdprTermos} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50">Revisar Vaga</button>
        </div>
      </div>
    );
  };

  const renderStep7EstagioReview = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div><h2 className="text-2xl font-bold mb-2 text-green-700">Tudo pronto!</h2><p className="text-[var(--color-text-secondary)]">Revise os dados antes de iniciar a captação de estagiários.</p></div>
        
        <div className="bg-[var(--color-surface)] border p-4 rounded-md space-y-2 text-sm">
          <p><strong>Empresa:</strong> {formData.cadastroFields?.razaoSocial || formData.agendorData?.name}</p>
          <p><strong>Vaga:</strong> {formData.estagioFields?.tituloCargo} ({formData.estagioFields?.tipoContrato})</p>
          <p><strong>Cursos:</strong> {formData.estagioFields?.sugestaoCurso}</p>
          <p><strong>Qtd:</strong> {formData.estagioFields?.quantidadeVagas} vaga(s)</p>
          <p><strong>Bolsa:</strong> {formData.estagioFields?.valorBolsa} + Transporte: {formData.estagioFields?.valorTransporte}</p>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep} className="bg-white border px-6 py-2 rounded-md font-semibold">Voltar e Editar</button>
          <button onClick={() => alert('Fase 5 - Submissão na Abler será implementada em breve!')} className="bg-[var(--color-blue-jobz)] text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-600">
            Confirmar e Abrir Vaga
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-line)] p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-line)]">
        <div className="h-full bg-[var(--color-blue-jobz)] transition-all duration-500 ease-out" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
      </div>
      
      {currentStep === 0 && renderStep0()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      
      {formData.serviceType === 'EMPREGO_CLT_PJ' && (
        <>
          {currentStep === 3 && renderStep3Emprego()}
          {currentStep === 4 && renderStep4Emprego()}
          {currentStep === 5 && renderStep5Emprego()}
          {currentStep === 6 && renderStep6Emprego()}
          {currentStep === 7 && renderStep7Review()}
        </>
      )}
      
      {formData.serviceType === 'RS_ESTAGIO' && (
        <>
          {currentStep === 3 && renderStep3Estagio()}
          {currentStep === 4 && renderStep4Estagio()}
          {currentStep === 5 && renderStep5Estagio()}
          {currentStep === 6 && renderStep6Estagio()}
          {currentStep === 7 && renderStep7EstagioReview()}
        </>
      )}
    </div>
  );
}
