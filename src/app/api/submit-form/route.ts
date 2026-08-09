import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const formData = await request.json();

    // TO-DO (Fase 5): Implementar a submissão correta dependendo do serviceType
    // (Emprego, Estágio ou Formalização) e disparar o e-mail

    return NextResponse.json({ success: true, message: 'Rota placeholder até a Fase 5' });

  } catch (error: any) {
    console.error('Submit Form Handler Exception:', error.message);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
