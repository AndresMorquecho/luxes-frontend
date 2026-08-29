import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { X, ExternalLink, CheckCircle2, Clock, Cake, Sparkles, Package, Wrench, CreditCard, Car, ListTodo } from 'lucide-react';
import { toggleRutinaCompletada } from '../../application/calendarioService';
import { toast } from '../../../../shared/ui/components/Toast';

export const CalendarioEventModal = ({ isOpen, onClose, event, onEventUpdated }) => {
  const navigate = useNavigate();
  const [toggling, setToggling] = useState(false);

  if (!isOpen || !event) return null;

  const isRutina = event.categoria === 'rutina';
  const rutinaId = event.metadata?.rutinaId;

  const handleToggle = async () => {
    if (!rutinaId || !event.fecha) return;
    setToggling(true);
    try {
      const res = await toggleRutinaCompletada(rutinaId, event.fecha);
      toast.success(res.completada ? 'Rutina marcada como completada' : 'Rutina marcada como pendiente');
      if (onEventUpdated) onEventUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar rutina');
    } finally {
      setToggling(false);
    }
  };

  const handleNavigate = () => {
    if (event.url) {
      onClose();
      navigate(event.url);
    }
  };

  return (
    <ModalPortal open={isOpen}>
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div
          className="fixed inset-0 transition-opacity"
          style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative z-[211] animate-slide-up p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: event.color || '#2563eb' }}
              >
                {event.categoria === 'cumpleanos' ? <Cake size={20} /> :
                 event.categoria === 'rutina' ? <Sparkles size={20} /> :
                 event.categoria === 'proyecto' ? <Package size={20} /> :
                 event.categoria === 'instalacion' ? <Wrench size={20} /> :
                 event.categoria === 'cheque' ? <CreditCard size={20} /> :
                 event.categoria === 'mantenimiento' ? <Car size={20} /> : <ListTodo size={20} />}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {event.categoria.replace('_', ' ')}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {event.titulo}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Details */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2.5 mb-5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Fecha:</span>
              <span className="font-bold font-mono text-slate-800">{event.fecha}</span>
            </div>

            {event.hora && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Hora / Notificación:</span>
                <span className="font-bold font-mono text-slate-800">{event.hora}</span>
              </div>
            )}

            {event.subtitulo && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-500 block mb-1">Detalle:</span>
                <p className="text-slate-700 font-medium leading-relaxed">{event.subtitulo}</p>
              </div>
            )}

            {isRutina && event.metadata?.empleados && event.metadata.empleados.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-500 block mb-1.5">Colaboradores en Turno:</span>
                <div className="flex flex-wrap gap-1.5">
                  {event.metadata.empleados.map((emp) => (
                    <span key={emp.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-700">
                      👤 {emp.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5">
            {isRutina && (
              <button
                type="button"
                disabled={toggling}
                onClick={handleToggle}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  event.completado
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                }`}
              >
                <CheckCircle2 size={15} />
                {event.completado ? 'Desmarcar completada' : 'Marcar como completada'}
              </button>
            )}

            {event.url && (
              <button
                type="button"
                onClick={handleNavigate}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#0b2d64] text-white hover:bg-[#071f45] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <ExternalLink size={14} />
                Ver en Módulo
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
