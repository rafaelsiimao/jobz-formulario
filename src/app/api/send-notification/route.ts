import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!SMTP_USER || !SMTP_PASS) {
      console.error('Credenciais SMTP não configuradas.');
      return NextResponse.json({ sent: false, error: 'Credenciais de e-mail não configuradas.' }, { status: 500 });
    }

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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #0039CB 0%, #1565C0 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">📋 Nova Solicitação de Vaga</h1>
        </div>
        <div style="background: #f8f9fa; padding: 24px 32px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #333; width: 40%;">Empresa</td>
              <td style="padding: 8px 0; color: #555;">${data.empresa || '—'}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px 0; font-weight: 600; color: #333;">CNPJ</td>
              <td style="padding: 8px 0; color: #555;">${data.cnpj || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #333;">Serviço</td>
              <td style="padding: 8px 0; color: #555;">${data.servico || '—'}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px 0; font-weight: 600; color: #333;">Contrato</td>
              <td style="padding: 8px 0; color: #555;">${data.contrato || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #333;">Nível</td>
              <td style="padding: 8px 0; color: #555;">${data.nivel || '—'}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px 0; font-weight: 600; color: #333;">Qtd. Vagas</td>
              <td style="padding: 8px 0; color: #555;">${data.qtdVagas || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #333;">Faixa Salarial</td>
              <td style="padding: 8px 0; color: #555;">${data.faixaSalarial || '—'}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px 0; font-weight: 600; color: #333;">ID Vaga Abler</td>
              <td style="padding: 8px 0; color: #555;">${data.vacancyId || '—'}</td>
            </tr>
          </table>
          ${data.responsabilidades ? `
            <div style="margin-top: 16px; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
              <strong style="color: #333;">Responsabilidades:</strong>
              <p style="color: #555; margin: 8px 0 0; white-space: pre-wrap;">${data.responsabilidades}</p>
            </div>
          ` : ''}
          <p style="margin-top: 24px; font-size: 12px; color: #999; text-align: center;">
            Enviado automaticamente pelo Formulário Jobz Carreira
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: SMTP_USER, // Envia para o próprio e-mail configurado
      subject: `🔔 Nova Vaga: ${data.empresa || 'Empresa'} — ${data.contrato || 'CLT'}`,
      html: htmlBody,
    });

    return NextResponse.json({ sent: true });
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error?.message);
    return NextResponse.json({ sent: false, error: 'Falha ao enviar notificação.' }, { status: 500 });
  }
}
