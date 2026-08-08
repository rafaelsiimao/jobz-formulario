'use client';

import React from 'react';
import JobzIntakeForm from "@/components/JobzIntakeForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] py-12 relative overflow-hidden">
      <div className="max-w-[800px] mx-auto px-4 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-[var(--color-black-institutional)] tracking-tight">
            Abertura de Vaga
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-2">
            Preencha os detalhes para iniciarmos o processo.
          </p>
        </div>
        
        <JobzIntakeForm />
      </div>

      <div className="sinal-em-escala"></div>
    </main>
  );
}
