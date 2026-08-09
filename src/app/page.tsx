'use client';

import React from 'react';
import JobzIntakeForm from "@/components/JobzIntakeForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] py-12 relative overflow-hidden">
      <div className="max-w-[800px] mx-auto px-4 relative z-10">
        <div className="mb-8 text-center flex flex-col items-center">
          <img 
            src="/jobz-logo.svg" 
            alt="Jobz Carreira" 
            className="h-10 w-auto mb-4" 
          />
          <h1 className="text-3xl font-extrabold text-[var(--color-black-institutional)] tracking-tight">
            Abertura de Vagas & Serviços
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1.5 text-sm font-medium">
            Preencha os dados abaixo para iniciarmos o atendimento com a Jobz.
          </p>
        </div>
        
        <JobzIntakeForm />
      </div>

      <div className="sinal-em-escala"></div>
    </main>
  );
}
