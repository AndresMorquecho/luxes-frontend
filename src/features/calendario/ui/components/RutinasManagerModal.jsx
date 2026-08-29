import React, { useState, useEffect } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { X, Plus, Trash2, Edit2, Sparkles, User, Copy, RotateCcw } from 'lucide-react';
import { getRutinas, createRutina, updateRutina, deleteRutina } from '../../application/calendarioService';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { toast } from '../../../../shared/ui/components/Toast';

const WEEKDAYS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
];

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatShortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return parts.map(capitalize).join(' ');
  }
  const firstName = capitalize(parts[0]);
  const firstSurname = capitalize(parts.length === 4 ? parts[2] : parts[parts.length - 1]);
  return `${firstName} ${firstSurname}`;
}

export const RutinasManagerModal = ({ isOpen, onClose, onUpdated }) => {
  const [rutinas, setRutinas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    horaNotificacion: '08:30',
    turnosPorDia: {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      '6': [],
    },
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ruts, emps] = await Promise.all([
        getRutinas().catch(() => []),
        getEmpleados().catch(() => []),
      ]);
      setRutinas(ruts || []);
      setEmpleados(emps || []);
    } catch (e) {
      toast.error('Error al cargar rutinas y colaboradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsFormOpen(false);
      setEditingId(null);
    }
  }, [isOpen]);

  const handleStartCreate = () => {
    setEditingId(null);
    setForm({
      titulo: '',
      descripcion: '',
      horaNotificacion: '08:30',
      turnosPorDia: {
        '1': [],
        '2': [],
        '3': [],
        '4': [],
        '5': [],
        '6': [],
      },
    });
    setIsFormOpen(true);
  };

  const handleStartEdit = (rutina) => {
    setEditingId(rutina.id);
    const existingTurnos = rutina.turnosPorDia || {};
    const normalizedTurnos = {
      '1': existingTurnos['1'] || [],
      '2': existingTurnos['2'] || [],
      '3': existingTurnos['3'] || [],
      '4': existingTurnos['4'] || [],
      '5': existingTurnos['5'] || [],
      '6': existingTurnos['6'] || [],
    };

    setForm({
      titulo: rutina.titulo || '',
      descripcion: rutina.descripcion || '',
      horaNotificacion: rutina.horaNotificacion || '08:30',
      turnosPorDia: normalizedTurnos,
    });
    setIsFormOpen(true);
  };

  const addEmployeeToDay = (dayId, empId) => {
    if (!empId) return;
    setForm((prev) => {
      const dayKey = String(dayId);
      const currentList = prev.turnosPorDia[dayKey] || [];
      if (currentList.includes(empId)) return prev;

      return {
        ...prev,
        turnosPorDia: {
          ...prev.turnosPorDia,
          [dayKey]: [...currentList, empId],
        },
      };
    });
  };

  const removeEmployeeFromDay = (dayId, empId) => {
    setForm((prev) => {
      const dayKey = String(dayId);
      const currentList = prev.turnosPorDia[dayKey] || [];
      return {
        ...prev,
        turnosPorDia: {
          ...prev.turnosPorDia,
          [dayKey]: currentList.filter((id) => id !== empId),
        },
      };
    });
  };

  const copyDayTurnosToAll = (sourceDayId) => {
    const sourceKey = String(sourceDayId);
    const sourceList = form.turnosPorDia[sourceKey] || [];
    if (sourceList.length === 0) {
      toast.error('Este día no tiene colaboradores asignados para copiar');
      return;
    }

    setForm((prev) => {
      const updated = { ...prev.turnosPorDia };
      WEEKDAYS.forEach((wd) => {
        updated[String(wd.id)] = [...sourceList];
      });
      return { ...prev, turnosPorDia: updated };
    });
    toast.success('Turnos copiados a todos los días');
  };

  const clearDay = (dayId) => {
    setForm((prev) => ({
      ...prev,
      turnosPorDia: {
        ...prev.turnosPorDia,
        [String(dayId)]: [],
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast.error('El título de la rutina es obligatorio');
      return;
    }

    const totalAssigned = Object.values(form.turnosPorDia).reduce((acc, list) => acc + (list?.length || 0), 0);
    if (totalAssigned === 0) {
      toast.error('Debes asignar al menos un colaborador en algún día de la semana');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateRutina(editingId, {
          titulo: form.titulo,
          descripcion: form.descripcion,
          horaNotificacion: form.horaNotificacion,
          turnosPorDia: form.turnosPorDia,
        });
        toast.success('Rutina y turnos actualizados');
      } else {
        await createRutina({
          titulo: form.titulo,
          descripcion: form.descripcion,
          horaNotificacion: form.horaNotificacion,
          turnosPorDia: form.turnosPorDia,
        });
        toast.success('Rutina y turnos creados');
      }
      setIsFormOpen(false);
      setEditingId(null);
      loadData();
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error(err.message || 'Error al guardar rutina');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta rutina?')) return;
    try {
      await deleteRutina(id);
      toast.success('Rutina eliminada');
      loadData();
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar rutina');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal open={isOpen}>
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div
          className="fixed inset-0 transition-opacity"
          style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative z-[211] animate-slide-up">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0b2d64]/10 text-[#0b2d64] flex items-center justify-center font-bold">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Configuración de Rutinas & Turnos Semanales
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Define tareas recurrentes y asigna colaboradores a cada día (Lunes a Sábado)
                </p>
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

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {isFormOpen ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    {editingId ? 'Editar Rutina y Turnos' : 'Nueva Rutina y Turnos'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ← Volver a la lista
                  </button>
                </div>

                {/* Top Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Rutina *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Limpieza de Baños, Aseo de Taller, Mantenimiento de Máquinas"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      className="w-full h-9.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-[#2b41b8] focus:ring-2 focus:ring-blue-900/10 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hora Notificación Push</label>
                    <input
                      type="time"
                      value={form.horaNotificacion}
                      onChange={(e) => setForm({ ...form, horaNotificacion: e.target.value })}
                      className="w-full h-9.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instrucciones / Checklist (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Instrucciones o puntos clave a revisar..."
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-[#2b41b8] focus:ring-2 focus:ring-blue-900/10 outline-none"
                  />
                </div>

                {/* Compact 6-Day Grid Matrix (3 cols x 2 rows) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Turnos Semanales por Día (Lunes a Sábado)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Selecciona colaboradores en el menú desplegable de cada día
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {WEEKDAYS.map((wd) => {
                      const dayKey = String(wd.id);
                      const assignedIds = form.turnosPorDia[dayKey] || [];
                      const unassignedEmps = empleados.filter((emp) => !assignedIds.includes(emp.id));

                      return (
                        <div
                          key={wd.id}
                          className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[140px]"
                        >
                          {/* Day Card Header */}
                          <div>
                            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${assignedIds.length > 0 ? 'bg-[#2b41b8]' : 'bg-slate-300'}`} />
                                {wd.label}
                              </span>

                              <div className="flex items-center gap-1">
                                {assignedIds.length > 0 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => copyDayTurnosToAll(wd.id)}
                                      className="p-1 rounded text-slate-400 hover:text-[#2b41b8] hover:bg-blue-50 transition-colors"
                                      title="Copiar este turno a todos los días"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => clearDay(wd.id)}
                                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                      title="Limpiar día"
                                    >
                                      <RotateCcw size={12} />
                                    </button>
                                  </>
                                )}
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  {assignedIds.length}
                                </span>
                              </div>
                            </div>

                            {/* Assigned Employee Tags */}
                            <div className="flex flex-wrap gap-1.5 min-h-[44px] content-start">
                              {assignedIds.length === 0 ? (
                                <span className="text-[11px] text-slate-400 italic py-1">
                                  Sin colaboradores asignados
                                </span>
                              ) : (
                                assignedIds.map((empId) => {
                                  const emp = empleados.find((e) => e.id === empId);
                                  const displayName = emp ? formatShortName(emp.nombre) : 'Colaborador';

                                  return (
                                    <span
                                      key={empId}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-md text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-2xs"
                                    >
                                      <User size={11} className="text-[#2b41b8]" />
                                      <span>{displayName}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeEmployeeFromDay(wd.id, empId)}
                                        className="text-slate-400 hover:text-red-600 p-0.5 -mr-0.5 rounded cursor-pointer"
                                        title="Quitar"
                                      >
                                        <X size={11} />
                                      </button>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Add Employee Dropdown */}
                          <div className="pt-2 mt-2 border-t border-slate-200/60">
                            <select
                              value=""
                              onChange={(e) => {
                                addEmployeeToDay(wd.id, e.target.value);
                                e.target.value = '';
                              }}
                              className="w-full h-7 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none cursor-pointer focus:border-[#2b41b8]"
                            >
                              <option value="" disabled>
                                + Asignar colaborador...
                              </option>
                              {unassignedEmps.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {formatShortName(emp.nombre)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#2b41b8] hover:bg-[#203299] shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : editingId ? 'Actualizar Rutina' : 'Crear Rutina'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500">{rutinas.length} rutinas activas</span>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2b41b8] hover:bg-[#203299] text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                  >
                    <Plus size={14} /> Nueva Rutina
                  </button>
                </div>

                {rutinas.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-400 text-xs font-medium">No hay rutinas creadas todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rutinas.map((r) => {
                      const turnos = r.turnosPorDia || {};

                      return (
                        <div
                          key={r.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2 pb-2 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-slate-800">{r.titulo}</h5>
                                <span className="text-[10px] font-bold text-[#2b41b8] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full font-mono">
                                  🔔 {r.horaNotificacion || '08:30'}
                                </span>
                              </div>
                              {r.descripcion && (
                                <p className="text-xs text-slate-500 mt-0.5">{r.descripcion}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(r)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(r.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Day-by-Day Turnos Summary */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 pt-1">
                            {WEEKDAYS.map((wd) => {
                              const empIds = turnos[String(wd.id)] || [];
                              const assignedNames = empIds
                                .map((id) => {
                                  const e = empleados.find((emp) => emp.id === id);
                                  return e ? formatShortName(e.nombre) : null;
                                })
                                .filter(Boolean);

                              return (
                                <div
                                  key={wd.id}
                                  className={`rounded-lg p-2 text-xs border ${
                                    assignedNames.length > 0
                                      ? 'bg-blue-50/50 border-blue-200/60 text-slate-800'
                                      : 'bg-slate-50/50 border-slate-200/50 text-slate-400'
                                  }`}
                                >
                                  <span className="font-bold text-[#0b2d64] block text-[11px] mb-0.5">
                                    {wd.label}:
                                  </span>
                                  <span className="text-[10.5px] leading-tight block truncate">
                                    {assignedNames.length > 0 ? assignedNames.join(', ') : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
