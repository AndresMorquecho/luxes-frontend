// src/features/proyectos/ui/pages/EditarFasePage.jsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';
import { FaseBadge } from '../components/FaseBadge.jsx';
import { InstalacionPanel } from '../components/InstalacionPanel.jsx';
import { useProyecto, enrichValidacionConImpresion } from '../../application/hooks/useProyecto.js';
import { usePrintQueueStable } from '../../../colas-impresion/context/PrintQueueContext.jsx';

export default function EditarFasePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmAvanzar, setConfirmAvanzar] = useState(false);

  const { proyecto, avanzar, validacionFaseActual: validacionBase } = useProyecto(id);
  const { getJobsByProyectoId } = usePrintQueueStable();
  const [printQueueTick, setPrintQueueTick] = React.useState(0);

  React.useEffect(() => {
    const handlePrintQueueChange = () => setPrintQueueTick((t) => t + 1);
    window.addEventListener('print-queue-updated', handlePrintQueueChange);
    return () => window.removeEventListener('print-queue-updated', handlePrintQueueChange);
  }, []);

  const validacionFaseActual = React.useMemo(() => {
    return proyecto?.faseActual === 'PRODUCCION'
      ? enrichValidacionConImpresion(validacionBase, getJobsByProyectoId(id))
      : validacionBase;
  }, [proyecto?.faseActual, validacionBase, getJobsByProyectoId, id, printQueueTick]);
  const faseConfig = proyecto ? getFaseConfig(proyecto.faseActual) : null;

  function handleVolver() {
    navigate('/proyectos');
  }

  function handleAvanzar() {
    if (!confirmAvanzar) {
      setConfirmAvanzar(true);
      return;
    }
    avanzar();
    handleVolver();
  }

  if (!proyecto) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Proyecto no encontrado</p>
        <button onClick={handleVolver} className="text-blue-600 underline text-sm">
          Volver a proyectos
        </button>
      </div>
    );
  }

  return (
    <div className="pb-10 w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handleVolver}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar fase actual</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-slate-600">{proyecto.nombre}</span>
            <FaseBadge faseId={proyecto.faseActual} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative">
        {/* Header Decorativo */}
        <div
          className="h-2 w-full rounded-t-2xl"
          style={{ backgroundColor: faseConfig?.color }}
        />
        
        <div className="p-6 md:p-8">
          {/* Panel de instalación si aplica */}
          {proyecto.faseActual === 'INSTALACION' ? (
            <InstalacionPanel proyectoId={proyecto.id} />
          ) : (
            <div className="space-y-6">
              <div
                className="rounded-xl p-5 border"
                style={{ backgroundColor: faseConfig?.bgColor, borderColor: faseConfig?.color + '40' }}
              >
                <h3 className="font-bold mb-2" style={{ color: faseConfig?.color }}>
                  {faseConfig?.label}
                </h3>
                <p className="text-sm" style={{ color: faseConfig?.color }}>
                  {faseConfig?.descripcion}
                </p>
              </div>

              {faseConfig?.camposRequeridos?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                    Campos requeridos para avanzar:
                  </p>
                  <ul className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {faseConfig.camposRequeridos.map((campo) => (
                      <li key={campo} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block shrink-0" />
                        <span className="font-medium">{campo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Validación */}
          {!validacionFaseActual.valido && validacionFaseActual.faltantes.length > 0 && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <p className="text-sm font-bold text-amber-700">Faltan campos para avanzar:</p>
              </div>
              <ul className="space-y-1">
                {validacionFaseActual.faltantes.map((f) => (
                  <li key={f} className="text-sm text-amber-600 pl-6 list-disc ml-2">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button
            type="button"
            onClick={handleVolver}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors font-semibold"
          >
            Cancelar
          </button>

          {/* Avanzar fase */}
          {!confirmAvanzar ? (
            <button
              type="button"
              onClick={handleAvanzar}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-colors shadow-sm"
              style={{ backgroundColor: faseConfig?.color }}
            >
              Avanzar a siguiente fase
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-600 font-medium hidden sm:block">
                ¿Confirmas avanzar?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAvanzar(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors font-semibold"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleAvanzar}
                  className="px-6 py-2.5 rounded-xl text-sm text-white font-bold transition-colors shadow-sm"
                  style={{ backgroundColor: faseConfig?.color }}
                >
                  Sí, confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
