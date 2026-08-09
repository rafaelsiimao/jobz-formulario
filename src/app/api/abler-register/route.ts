import { NextRequest, NextResponse } from 'next/server';
import { CadastroFields } from '@/types/jobz-form';

const ABLER_API_URL = process.env.ABLER_API_URL || 'https://api.abler.com.br';
const ABLER_API_TOKEN = process.env.ABLER_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (!ABLER_API_TOKEN) {
      console.error('ABLER_API_TOKEN não configurado no servidor.');
      return NextResponse.json({ error: 'Erro de configuração interna do servidor.' }, { status: 500 });
    }

    const { cadastro, agendorData } = await request.json() as { cadastro: CadastroFields, agendorData: any };

    if (!cadastro) {
      return NextResponse.json({ error: 'O payload de cadastro é obrigatório.' }, { status: 400 });
    }

    // Preparar os contatos da empresa
    const contatos = [];
    
    // Contato principal (Representante Legal)
    contatos.push({
      name: cadastro.representanteLegal.nome,
      email: cadastro.representanteLegal.email,
      role: cadastro.representanteLegal.cargo,
      phone: cadastro.representanteLegal.celular.replace(/\D/g, ''),
      allow_access: false
    });

    // Se o contato de vagas/RH for diferente, adiciona
    if (cadastro.contatoVagas === 'Outra Pessoa' && cadastro.responsavelRh) {
      contatos.push({
        name: cadastro.responsavelRh.nome,
        email: cadastro.responsavelRh.email,
        role: cadastro.responsavelRh.cargo || 'Responsável RH/Vagas',
        phone: cadastro.responsavelRh.celular.replace(/\D/g, ''),
        allow_access: false
      });
    }

    // Se o contato financeiro for diferente, adiciona
    if (cadastro.contatoFinanceiro === 'Outra Pessoa' && cadastro.responsavelFinanceiro) {
      contatos.push({
        name: cadastro.responsavelFinanceiro.nome,
        email: cadastro.responsavelFinanceiro.email,
        role: cadastro.responsavelFinanceiro.cargo || 'Responsável Financeiro',
        phone: cadastro.responsavelFinanceiro.celular.replace(/\D/g, ''),
        allow_access: false
      });
    }

    const cleanCnpjCpf = cadastro.cnpjCpf.replace(/\D/g, '');
    const isCnpj = cadastro.tipoContratacao === 'CNPJ';

    // Construção do Payload para a Abler
    const ablerPayload = {
      customer: {
        corporate_name: cadastro.razaoSocial,
        trading_name: cadastro.nomeFantasia || cadastro.razaoSocial,
        cnpj: isCnpj ? cleanCnpjCpf : null,
        cpf: isCnpj ? null : cleanCnpjCpf,
        active: true,
        additional_info: `Cadastro Automático - Vagas Jobz. Origem: ${cadastro.origem}${cadastro.origemParceiro ? ` (${cadastro.origemParceiro})` : ''}. Contato comercial interno: ${cadastro.contatoComercial}`,
        allow_access: false,
        address_attributes: {
          cep: cadastro.enderecoSede.cep.replace(/\D/g, ''),
          street: cadastro.enderecoSede.ruaNumeroComplemento,
          neighborhood: cadastro.enderecoSede.bairro,
          country: 'Brasil'
        },
        customer_contacts_attributes: contatos,
        customer_cost_centers_attributes: [
          { name: 'Geral' }
        ]
      }
    };

    const response = await fetch(`${ABLER_API_URL}/api/company/v1/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-INT-TOKEN': ABLER_API_TOKEN,
      },
      body: JSON.stringify(ablerPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao cadastrar empresa na Abler [${response.status}]:`, errorText);
      return NextResponse.json({ error: 'Erro ao cadastrar a empresa na base da Abler.' }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      customerId: data.data?.id 
    });

  } catch (error: any) {
    console.error('Exceção ao cadastrar empresa na Abler:', error.message);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
