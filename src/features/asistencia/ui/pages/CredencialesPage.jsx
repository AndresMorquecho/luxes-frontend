import React from 'react';
import { CredencialesPanel } from '../../../empleados/ui/components/CredencialesPanel';

export const CredencialesPage = () => (
  <div className="p-6 md:p-8 w-full animate-slide-up">
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-800">Credenciales</h1>
        <p className="text-sm text-slate-500">Carnets de colaboradores con código QR para imprimir.</p>
      </div>
    </div>
    <CredencialesPanel />
  </div>
);
