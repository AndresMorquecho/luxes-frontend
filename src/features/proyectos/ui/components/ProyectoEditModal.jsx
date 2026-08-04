import React, { useState, useEffect, useMemo } from 'react';
import { Edit3, X, Lock } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';

export const ProyectoEditModal = React.memo(function ProyectoEditModal({
  isOpen,
  onClose,
  proyecto,
  empleados = [],
  onSave,
}) {
  const [editForm, setEditForm] = useState({
    nombre: '',
    requiereInstalacion: true,
    fechaEntregaEstimada: '',
    prioridad: 'MEDIA',
    responsable: '',
    etiquetas: [],
    etiquetaInput: '',
    descripcion: '',
    notas: '',
  });

  useEffect(() => {
    if (proyecto && isOpen) {
      setEditForm({
        nombre: proyecto.nombre || '',
        requiereInstalacion: proyecto.requiereInstalacion !== false,
        fechaEntregaEstimada: proyecto.fechaEntregaEstimada || '',
        prioridad: proyecto.prioridad || 'MEDIA',
        responsable: proyecto.responsable || '',
        etiquetas: proyecto.etiquetas || [],
        etiquetaInput: '',
        descripcion: proyecto.descripcion || '',
        notas: proyecto.notas || '',
      });
    }
  }, [proyecto, isOpen]);

  const isInstalacionLocked = useMemo(() => {
    if (!proyecto) return { isLocked: false, reason: '' };

    // 1. Proyecto ya completado o cancelado
    if (proyecto.estado === 'COMPLETADO' || proyecto.estado === 'Cancelado' || proyecto.faseActual === 'COMPLETADO') {
      return {
        isLocked: true,
        reason: 'No se puede modificar el tipo de instalación en proyectos finalizados.',
      };
    }

    // 2. Si actualmente REQUIERE instalación, verificar si ya se inició trabajo o gastos
    if (proyecto.requiereInstalacion !== false) {
      const instalacionDatos = proyecto.fases?.INSTALACION?.datos || {};
      const estadoInst = instalacionDatos.estadoInstalacion;
      const tieneMateriales = Array.isArray(instalacionDatos.materiales) && instalacionDatos.materiales.length > 0;
      const tieneEquipo = Array.isArray(instalacionDatos.instaladores) && instalacionDatos.instaladores.length > 0;
      const tieneGastosInstalacion = Array.isArray(proyecto.gastos) && proyecto.gastos.some(
        g => g.fase === 'INSTALACION' || (g.concepto || '').toLowerCase().includes('instalaci')
      );

      if (estadoInst === 'EN_PROCESO' || estadoInst === 'COMPLETADO' || tieneMateriales || tieneEquipo || tieneGastosInstalacion) {
        return {
          isLocked: true,
          reason: 'No se puede cambiar a Sin Instalación porque el proyecto ya tiene trabajo en proceso, materiales o gastos de instalación registrados.',
        };
      }
    }

    return { isLocked: false, reason: '' };
  }, [proyecto]);

  if (!isOpen || !proyecto) return null;

  const addEtiqueta = () => {
    const tag = editForm.etiquetaInput.trim();
    if (tag && !editForm.etiquetas.includes(tag)) {
      setEditForm((prev) => ({
        ...prev,
        etiquetas: [...prev.etiquetas, tag],
        etiquetaInput: '',
      }));
    }
  };

  const removeEtiqueta = (tagToRemove) => {
    setEditForm((prev) => ({
      ...prev,
      etiquetas: prev.etiquetas.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editForm);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex flex-col sm:items-center sm:justify-center sm:p-4 bg-slate-900/60"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="bg-white w-full flex flex-col overflow-hidden shadow-xl
            h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(90vh,900px)] sm:max-w-3xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="proyecto-editar-titulo"
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <h2
              id="proyecto-editar-titulo"
              className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 min-w-0"
            >
              <Edit3 size={18} className="text-blue-600 shrink-0" />
              <span className="truncate">Editar Información del Proyecto</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
              aria-label="Cerrar edición"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Grid de 2 columnas para campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Nombre del proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>

                {/* Tipo de Proyecto (Instalación) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Tipo de Proyecto
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isInstalacionLocked.isLocked && !editForm.requiereInstalacion}
                      onClick={() => setEditForm((prev) => ({ ...prev, requiereInstalacion: true }))}
                      className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        editForm.requiereInstalacion
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      } ${isInstalacionLocked.isLocked && !editForm.requiereInstalacion ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      Con Instalación
                    </button>
                    <button
                      type="button"
                      disabled={isInstalacionLocked.isLocked && editForm.requiereInstalacion}
                      onClick={() => setEditForm((prev) => ({ ...prev, requiereInstalacion: false }))}
                      className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        !editForm.requiereInstalacion
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      } ${isInstalacionLocked.isLocked && editForm.requiereInstalacion ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      Sin Instalación
                    </button>
                  </div>
                  {isInstalacionLocked.isLocked && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <Lock size={14} className="shrink-0 text-amber-600" />
                      <span>{isInstalacionLocked.reason}</span>
                    </p>
                  )}
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Responsable
                  </label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    value={editForm.responsable}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, responsable: e.target.value }))}
                  >
                    <option value="">Selecciona responsable...</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.nombre}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha de Entrega */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Entrega Estimada
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    value={editForm.fechaEntregaEstimada}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fechaEntregaEstimada: e.target.value }))}
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Prioridad
                  </label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    value={editForm.prioridad}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, prioridad: e.target.value }))}
                  >
                    <option value="BAJA">BAJA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="URGENTE">URGENTE</option>
                  </select>
                </div>
              </div>

              {/* Etiquetas */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Etiquetas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Ej: urgente, acrílico..."
                    className="flex-1 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    value={editForm.etiquetaInput}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, etiquetaInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEtiqueta();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addEtiqueta}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors border border-blue-100 font-semibold text-xs"
                  >
                    Agregar
                  </button>
                </div>
                {editForm.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editForm.etiquetas.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeEtiqueta(tag)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción del Trabajo */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Descripción del Trabajo
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-colors"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              {/* Notas Iniciales */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Notas Iniciales
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-colors"
                  value={editForm.notas}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notas: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
});
