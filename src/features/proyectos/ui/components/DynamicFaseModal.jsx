// src/features/proyectos/ui/components/DynamicFaseModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, Plus, FileText, CheckCircle2, User, Clock, Image as ImageIcon, Camera } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { getTodayDateISO } from '../../domain/utils/proyectoDates.js';

export function DynamicFaseModal({
  isOpen,
  onClose,
  onSave,
  faseToEdit = null, // Si es null, es creación
  faseNumero = 1,
  currentUser = null,
}) {
  const isEditing = Boolean(faseToEdit);

  const [nombre, setNombre] = useState('');
  const [queSeHizo, setQueSeHizo] = useState('');
  const [fechaInicio, setFechaInicio] = useState(getTodayDateISO());
  const [fechaFinEstimada, setFechaFinEstimada] = useState(getTodayDateISO());
  const [estado, setEstado] = useState('PENDIENTE');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (faseToEdit) {
        setNombre(faseToEdit.nombre || '');
        setQueSeHizo(faseToEdit.queSeHizo || faseToEdit.descripcion || '');
        setFechaInicio(faseToEdit.fechaInicio || faseToEdit.fechaInicioPlan || getTodayDateISO());
        setFechaFinEstimada(faseToEdit.fechaFinEstimada || faseToEdit.fechaFinPlan || getTodayDateISO());
        setEstado(faseToEdit.estado || 'PENDIENTE');
      } else {
        // En creación: sugerir por defecto "Producción" si es primera o "Fase X: Producción", pero editable
        setNombre(faseNumero === 1 ? 'Producción' : `Fase ${faseNumero}: Producción`);
        setQueSeHizo('');
        setFechaInicio(getTodayDateISO());
        setFechaFinEstimada(getTodayDateISO());
        setEstado('PENDIENTE');
      }
      setError('');
    }
  }, [isOpen, faseToEdit, faseNumero]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El título de la fase es obligatorio.');
      return;
    }

    const userName = currentUser?.nombre || currentUser?.usuario || 'Usuario';
    const nowISO = new Date().toISOString();

    const dataToSave = {
      id: isEditing ? faseToEdit.id : 'fase-' + Date.now(),
      nombre: nombre.trim(),
      queSeHizo: queSeHizo.trim(),
      descripcion: queSeHizo.trim() || 'Actividades de la fase',
      fechaInicio: fechaInicio || getTodayDateISO(),
      fechaInicioPlan: fechaInicio || getTodayDateISO(),
      fechaFinEstimada: fechaFinEstimada || getTodayDateISO(),
      fechaFinPlan: fechaFinEstimada || getTodayDateISO(),
      estado: estado,
      evidencias: isEditing ? (faseToEdit.evidencias || []) : [],
      // Metadatos de auditoría
      creadoPor: isEditing ? (faseToEdit.creadoPor || userName) : userName,
      creadoEn: isEditing ? (faseToEdit.creadoEn || nowISO) : nowISO,
      ultimaEdicionPor: userName,
      ultimaEdicionEn: nowISO,
    };

    onSave(dataToSave);
    onClose();
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
      >
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                {isEditing ? <Edit3 size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  {isEditing ? 'Editar Fase del Proyecto' : 'Crear Nueva Fase del Proyecto'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEditing ? 'Modifique los campos y detalles de esta fase' : 'Defina el título, actividades y fechas estimadas'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-100">
                {error}
              </div>
            )}

            {/* Nombre de la fase */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Título / Nombre de la Fase *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Producción, Diseño Gráfico, Impresión..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Puedes personalizar el nombre en cualquier momento.
              </p>
            </div>

            {/* ¿Qué se hizo en esa fase? (Input / Textarea) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ¿Qué se hizo en esa fase? (Actividades / Tareas)
              </label>
              <textarea
                className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none min-h-[90px] text-slate-700"
                placeholder="Detalla lo que se realizó o debe realizarse en esta fase..."
                value={queSeHizo}
                onChange={(e) => setQueSeHizo(e.target.value)}
              />
            </div>

            {/* Fechas: Inicio (defecto hoy) y Estimada Finalización */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha Inicio (Por defecto hoy)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha Estimada Finalización
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
                    value={fechaFinEstimada}
                    onChange={(e) => setFechaFinEstimada(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Selector de Estado */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estado Inicial de la Fase
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEstado('PENDIENTE')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border text-center ${
                    estado === 'PENDIENTE'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pendiente
                </button>
                <button
                  type="button"
                  onClick={() => setEstado('EN_PROGRESO')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border text-center ${
                    estado === 'EN_PROGRESO'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-blue-50/50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  En Progreso
                </button>
                <button
                  type="button"
                  onClick={() => setEstado('COMPLETADA')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border text-center ${
                    estado === 'COMPLETADA'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-emerald-50/50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Completada
                </button>
              </div>
            </div>

            {/* Metadatos informativos */}
            {isEditing && (faseToEdit.creadoPor || faseToEdit.ultimaEdicionEn) && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[11px] text-slate-500">
                {faseToEdit.creadoPor && (
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-slate-400" />
                    <span><strong>Creado por:</strong> {faseToEdit.creadoPor}</span>
                  </div>
                )}
                {faseToEdit.ultimaEdicionEn && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span>
                      <strong>Última edición:</strong> {new Date(faseToEdit.ultimaEdicionEn).toLocaleString('es-EC')}
                      {faseToEdit.ultimaEdicionPor ? ` por ${faseToEdit.ultimaEdicionPor}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0b2d64] hover:bg-[#071f45] text-white font-bold text-xs rounded-xl shadow-sm transition-all shadow-blue-950/20 active:scale-[0.99] cursor-pointer"
              >
                {isEditing ? 'Guardar Cambios' : 'Crear Fase'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </ModalPortal>
  );
}
