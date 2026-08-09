import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Faz upload de um arquivo para o bucket 'vagas'
 * Retorna a URL pública do arquivo
 */
export async function uploadVagaFile(file: File, companyName: string): Promise<string> {
  // Cria um nome de arquivo único e seguro
  const cleanCompanyName = companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().getTime();
  const extension = file.name.split('.').pop();
  
  const fileName = `${cleanCompanyName}_${timestamp}.${extension}`;
  
  const { data, error } = await supabase.storage
    .from('vagas')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Erro no upload Supabase:', error);
    throw new Error('Falha ao enviar o arquivo.');
  }

  // Pegar URL pública
  const { data: publicData } = supabase.storage
    .from('vagas')
    .getPublicUrl(fileName);

  return publicData.publicUrl;
}
