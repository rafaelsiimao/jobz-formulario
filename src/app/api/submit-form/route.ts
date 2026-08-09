import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const ABLER_BASE_URL = process.env.ABLER_API_URL || 'https://hulk-smash.abler.com.br';
const ABLER_API_TOKEN = process.env.ABLER_API_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJjb21wYW55X2lkIjo1ODIsInRpbWVzdGFtcCI6MTc4NTU0MzMyNiwiY29tcGFueV91c2VyX2lkIjoxNDQyfQ.yPAeDlvUJ-20I-4Y1S3ehx5hdvMlVGVQsdg6Iq_SBro';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'rafael.simao@jobz.com.br';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    const { cnpjOuCpfBusca, agendorData, ablerCustomerId, empregoFields } = formData;

    const cleanDoc = (cnpjOuCpfBusca || '').replace(/\D/g, '');
    const isCnpj = cleanDoc.length === 14;
    const companyName = agendorData?.name || agendorData?.legalName || cnpjOuCpfBusca || 'Empresa Cliente';
    const emailContato = empregoFields?.emailContatoConfirmado || agendorData?.email || 'rafael.simao@jobz.com.br';
    const celularContato = empregoFields?.celularContatoConfirmado || agendorData?.phone || '—';

    let targetCustomerId: number | null = ablerCustomerId ? parseInt(String(ablerCustomerId), 10) : null;
    let autoRegisteredNewCompany = false;

    // 1. Se não temos customerId, consultar a Abler pelo CNPJ/CPF
    if (!targetCustomerId && cleanDoc) {
      try {
        const queryParam = isCnpj ? `cnpj=${cleanDoc}` : `cpf=${cleanDoc}`;
        const checkRes = await fetch(`${ABLER_BASE_URL}/api/company/v1/customers?${queryParam}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-API-INT-TOKEN': ABLER_API_TOKEN,
          },
          cache: 'no-cache'
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (Array.isArray(checkData?.data) && checkData.data.length > 0) {
            targetCustomerId = checkData.data[0].id;
          }
        }
      } catch (err) {
        console.error('Erro ao verificar empresa na Abler:', err);
      }
    }

    // 2. Se a empresa NÃO existe na Abler, faz o cadastro automático com dados do Agendor
    if (!targetCustomerId && cleanDoc) {
      try {
        const registerPayload = {
          customer: {
            corporate_name: companyName,
            trading_name: companyName,
            cnpj: isCnpj ? cleanDoc : null,
            cpf: isCnpj ? null : cleanDoc,
            active: true,
            allow_access: false,
            additional_info: `Cadastro Automático via Formulário Jobz. Contato: ${emailContato}`,
            customer_contacts_attributes: [
              {
                name: companyName,
                email: emailContato,
                phone: celularContato.replace(/\D/g, ''),
                allow_access: false
              }
            ]
          }
        };

        const regRes = await fetch(`${ABLER_BASE_URL}/api/company/v1/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-INT-TOKEN': ABLER_API_TOKEN,
          },
          body: JSON.stringify(registerPayload)
        });

        if (regRes.ok) {
          const regData = await regRes.json();
          targetCustomerId = regData?.data?.id || regData?.id || null;
          autoRegisteredNewCompany = true;
        } else {
          console.error(`Erro ao cadastrar empresa na Abler [${regRes.status}]:`, await regRes.text());
        }
      } catch (err) {
        console.error('Exceção ao cadastrar empresa na Abler:', err);
      }
    }

    // Fallback final: se não achou e não cadastrou, usa a conta principal Jobz (582)
    if (!targetCustomerId) {
      targetCustomerId = 582;
    }

    // 3. Criar rascunho de vaga na API da Abler (POST /api/company/v1/vacancies)
    let ablerVacancyId: string | number | null = null;
    let ablerErrorMsg: string | null = null;

    if (empregoFields?.tituloCargo) {
      try {
        let workType = 'presential';
        const rawWork = (empregoFields.modeloTrabalho || '').toLowerCase();
        if (rawWork.includes('remoto') || rawWork.includes('home')) workType = 'remote';
        if (rawWork.includes('híbrido') || rawWork.includes('hibrido')) workType = 'hybrid';

        let regime = 'clt';
        const rawRegime = (empregoFields.modeloContrato || '').toLowerCase();
        if (rawRegime.includes('pj')) regime = 'pj';
        else if (rawRegime.includes('freelancer')) regime = 'freelancer';
        else if (rawRegime.includes('temporário') || rawRegime.includes('temporario')) regime = 'temporary';

        let seniority = 'pleno';
        const rawNivel = (empregoFields.nivel || '').toLowerCase();
        if (rawNivel.includes('operacional')) seniority = 'operacional';
        else if (rawNivel.includes('assistente')) seniority = 'assistente';
        else if (rawNivel.includes('analista')) seniority = 'pleno';
        else if (rawNivel.includes('especialista')) seniority = 'especialista';
        else if (rawNivel.includes('liderança') || rawNivel.includes('gestão')) seniority = 'lideranca';

        const rawSalary = (empregoFields.salarioBruto || '').replace(/\D/g, '');
        const salaryValue = rawSalary ? (parseFloat(rawSalary) / 100).toFixed(2) : null;

        const baseVacancyObj = {
          customer_id: targetCustomerId,
          title: empregoFields.tituloCargo,
          contracting_regime: regime,
          work_type: workType,
          quantity: empregoFields.quantidadeVagas || 1,
          seniority_level: seniority,
          is_confidential: Boolean(empregoFields.vagaSigilosa),
          status: 'draft',
          salary_value: salaryValue,
          mandatory_requirements: empregoFields.hardSkills || empregoFields.descricaoCargo || 'Ver ficha da vaga',
          desirable_requirements: empregoFields.softSkills || '',
          working_journey: `Segunda a Sexta (${empregoFields.horarioInicio || '08:00'} às ${empregoFields.horarioFim || '18:00'}) - Intervalo: ${empregoFields.tempoIntervalo || '01:00'}`,
          search_cities_term: [],
          vacancies_benefits: [],
          job_benefits: []
        };

        const attemptPayloads = [
          // Tentativa A: com wrapper vacancy e coleções inicializadas
          { vacancy: baseVacancyObj },
          // Tentativa B: no nível raiz com coleções inicializadas
          baseVacancyObj
        ];

        for (const payload of attemptPayloads) {
          const ablerRes = await fetch(`${ABLER_BASE_URL}/api/company/v1/vacancies`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-API-INT-TOKEN': ABLER_API_TOKEN,
            },
            body: JSON.stringify(payload)
          });

          if (ablerRes.ok) {
            const ablerData = await ablerRes.json();
            ablerVacancyId = ablerData?.data?.id || ablerData?.id || null;
            ablerErrorMsg = null;
            break; // Sucesso!
          } else {
            const errText = await ablerRes.text();
            console.error(`Tentativa Abler falhou [${ablerRes.status}]:`, errText);
            ablerErrorMsg = `Erro ${ablerRes.status}: ${errText.slice(0, 150)}`;
          }
        }
      } catch (err: any) {
        console.error('Exceção Abler:', err.message);
        ablerErrorMsg = err.message;
      }
    }

    // 4. Formatar lista de benefícios com valores e frequência
    const beneficiosListHtml = (empregoFields?.beneficios || []).map((bName: string) => {
      const valObj = (empregoFields?.valoresBeneficios || {})[bName];
      if (valObj && valObj.valor) {
        return `<li><strong>${bName}:</strong> ${valObj.valor} / ${valObj.frequencia === 'dia' ? 'dia' : 'mês'}</li>`;
      }
      return `<li>${bName}</li>`;
    }).join('') || '<li>Nenhum informado</li>';

    // 5. Disparar e-mail de notificação para rafael.simao@jobz.com.br
    let emailSent = false;
    try {
      if (SMTP_USER && SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });

        const htmlBody = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; color: #111827;">
            <div style="background: #1e81fe; padding: 28px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">✨ Nova Abertura de Vaga Jobz</h1>
              <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 14px;">Solicitação enviada via formulário web</p>
            </div>

            <div style="background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 4px solid #1e81fe; margin-bottom: 20px;">
                <h2 style="margin: 0 0 4px; font-size: 18px; color: #0f172a;">${empregoFields?.tituloCargo || 'Vaga de Emprego'}</h2>
                <p style="margin: 0; color: #475569; font-size: 14px;">Empresa: <strong>${companyName}</strong> (CNPJ/CPF: ${cnpjOuCpfBusca})</p>
                ${autoRegisteredNewCompany ? '<p style="margin: 4px 0 0; color: #16a34a; font-size: 12px; font-weight: bold;">✨ Cadastro automático de nova empresa realizado na Abler!</p>' : ''}
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">ID Cliente na Abler:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${targetCustomerId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Responsável Contato:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${emailContato} • ${celularContato}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Modelo de Contrato:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${empregoFields?.modeloContrato || 'CLT'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Nível & Quantidade:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${empregoFields?.nivel || '—'} (${empregoFields?.quantidadeVagas || 1} vaga)</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Salário Bruto:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #16a34a;">${empregoFields?.salarioBruto || 'A combinar'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Status na Abler:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: ${ablerVacancyId ? '#16a34a' : '#dc2626'};">
                    ${ablerVacancyId ? `✅ Vaga Rascunho Criada (ID: ${ablerVacancyId})` : (ablerErrorMsg || 'Aguardando vinculação manual')}
                  </td>
                </tr>
              </table>

              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px;">Benefícios Oferecidos:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
                  ${beneficiosListHtml}
                </ul>
              </div>

              ${empregoFields?.descricaoCargo ? `
                <div style="background: #f8fafc; padding: 14px; border-radius: 10px; margin-bottom: 16px;">
                  <strong style="font-size: 13px; color: #334155;">Descrição da Função:</strong>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">${empregoFields.descricaoCargo}</p>
                </div>
              ` : ''}

              ${empregoFields?.anexoDescricaoUrl ? `
                <div style="background: #eff6ff; padding: 12px; border-radius: 10px; border: 1px solid #bfdbfe; margin-bottom: 16px;">
                  <strong style="font-size: 13px; color: #1e40af;">📎 Arquivo Anexo da Vaga:</strong>
                  <a href="${empregoFields.anexoDescricaoUrl}" target="_blank" style="display: block; color: #2563eb; font-size: 13px; font-weight: 600; margin-top: 4px;">Acessar PDF/Word da Vaga</a>
                </div>
              ` : ''}

              <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                Enviado automaticamente pelo Formulário Jobz Carreira para <strong>rafael.simao@jobz.com.br</strong>
              </div>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: SMTP_FROM,
          to: 'rafael.simao@jobz.com.br',
          subject: `🚀 Nova Vaga Aberta: ${companyName} — ${empregoFields?.tituloCargo || 'Vaga'}`,
          html: htmlBody,
        });
        emailSent = true;
      }
    } catch (err: any) {
      console.error('Erro ao enviar e-mail de notificação:', err.message);
    }

    return NextResponse.json({
      success: true,
      ablerVacancyId,
      targetCustomerId,
      autoRegisteredNewCompany,
      emailSent,
      message: 'Vaga registrada com sucesso!'
    });

  } catch (error: any) {
    console.error('Exceção no submit-form:', error.message);
    return NextResponse.json({ error: 'Erro interno ao processar submissão.' }, { status: 500 });
  }
}
