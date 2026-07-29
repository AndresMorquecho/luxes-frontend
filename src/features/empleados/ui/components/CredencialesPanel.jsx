import React, { useState, useEffect } from 'react';
import { CredencialCard } from '../../../asistencia/ui/components/CredencialCard';
import { getEmpleados, saveEmpleado } from '../../application/empleadosService';

export const CredencialesPanel = () => {
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
    const compressImage = (imageFile) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scale = Math.min(1, MAX_WIDTH / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
      });
    };

    try {
      const foto = await compressImage(file);
      const updated = await saveEmpleado({ ...emp, foto });
      const updatedWithCacheBust = {
        ...updated,
        foto: `/api/empleados/${emp.id}/foto?t=${Date.now()}`,
      };
      setEmpleados((prev) => prev.map((e) => (e.id === updated.id ? updatedWithCacheBust : e)));
    } catch (err) {
      console.error('Error saving photo', err);
    }
  };

  const filtered = empleados.filter((emp) =>
    emp.nombre.toLowerCase().includes(search.toLowerCase())
    || emp.cargo?.toLowerCase().includes(search.toLowerCase())
    || emp.id?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <p className="text-sm text-slate-500">
          Imprime carnets con código QR para control de asistencia. Haz clic en la foto para actualizarla.
        </p>
        <div className="relative w-full sm:w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all w-full bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-7 justify-center py-2">
          {filtered.map((emp) => (
            <CredencialCard
              key={emp.id}
              emp={emp}
              isPrinting={printingId === emp.id}
              onPrint={handlePrint}
              onFotoUpload={handleFotoUpload}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12 w-full">
              {search ? 'No se encontraron colaboradores con ese nombre' : 'No hay colaboradores registrados'}
            </p>
          )}
        </div>
      )}

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
