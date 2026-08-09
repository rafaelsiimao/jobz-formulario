export interface ViaCepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string;        // Estado
  erro?: boolean;
}

export async function lookupCep(cep: string): Promise<ViaCepAddress | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;
    const data: ViaCepAddress = await res.json();
    if (data.erro) return null;
    return data;
  } catch (err) {
    console.error('Erro na consulta ViaCEP:', err);
    return null;
  }
}
