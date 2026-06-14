import React, { useState, useEffect } from 'react';
import { CredencialCard } from '../components/CredencialCard';
import { getEmpleados, saveEmpleado } from '../../../empleados/application/empleadosService';

export const CredencialesPage = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEmpleados();
        setEmpleados(data);
      } catch (err) {
        console.error('Error loading employees for credentials', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePrint = (id) => {
    setPrintingId(id);
    setTimeout(() => { window.print(); setPrintingId(null); }, 150);
  };

  const handleFotoUpload = async (emp, file) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const foto = ev.target?.result;
      if (!foto) return;
      try {
        const updated = await saveEmpleado({ ...emp, foto });
        setEmpleados(prev => prev.map(e => e.id === updated.id ? updated : e));
      } catch (err) {
        console.error('Error saving photo', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const filtered = empleados.filter(emp =>
    emp.nombre.toLowerCase().includes(search.toLowerCase()) ||
    emp.cargo?.toLowerCase().includes(search.toLowerCase()) ||
    emp.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 w-full animate-slide-up">

      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
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
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all w-52"
          />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-7 justify-center">
          {filtered.map(emp => (
            <CredencialCard
              key={emp.id}
              emp={emp}
              isPrinting={printingId === emp.id}
              onPrint={handlePrint}
              onFotoUpload={handleFotoUpload}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">{search ? 'No se encontraron colaboradores con ese nombre' : 'No hay colaboradores registrados'}</p>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1cm; }
          body { visibility: hidden !important; background: white !important; }
          .print-target {
            visibility: visible !important;
            position: absolute !important;
            left: 50% !important; top: 0 !important;
            transform: translateX(-50%) !important;
            width: 300px !important; height: auto !important;
            page-break-inside: avoid !important; break-inside: avoid !important;
            margin: 0 !important; box-shadow: none !important;
            border: 1px solid #ddd !important; background: white !important;
          }
          .print-target * { visibility: visible !important; }
          .print-hidden { display: none !important; }
        }
      `}} />
    </div>
  );
};
