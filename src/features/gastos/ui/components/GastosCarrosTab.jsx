import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Car, Wrench } from 'lucide-react';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import {
  getVehiculos, saveVehiculo, deleteVehiculo, saveMantenimiento, deleteMantenimiento,
  TIPOS_MANTENIMIENTO, labelTipoMantenimiento, estadoMantenimiento,
} from '../../application/gastosService';
import { MODAL_HEADER_STYLE, MODAL_FORM_STYLES, fmt } from '../shared/gastosUi';

const EMPTY_VEHICULO = { placa: '', marca: '', modelo: '', anio: '', color: '', kilometraje: 0, responsable: '', notas: '', estado: 'activo' };
const EMPTY_MANT = {
  tipo: 'cambio_aceite', descripcion: '', fechaRealizado: new Date().toISOString().split('T')[0],
  fechaProxima: '', kilometraje: '', kmProximo: '', monto: 0, proveedor: '', notas: '',
};

const ESTADO_BADGE = {
  vencido: { label: 'Vencido', bg: 'bg-red-50 text-red-700 border-red-200' },
  proximo: { label: 'Próximo', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ok: { label: 'Al día', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const GastosCarrosTab = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [vehFormOpen, setVehFormOpen] = useState(false);
  const [mantFormOpen, setMantFormOpen] = useState(false);
  const [editingVeh, setEditingVeh] = useState(null);
  const [editingMant, setEditingMant] = useState(null);
  const [vehForm, setVehForm] = useState(EMPTY_VEHICULO);
  const [mantForm, setMantForm] = useState(EMPTY_MANT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getVehiculos();
      setVehiculos(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selected = vehiculos.find((v) => v.id === selectedId) ?? null;
  const mantenimientos = selected?.mantenimientos ?? [];

  const alertas = useMemo(() => {
    let vencidos = 0;
    let proximos = 0;
    vehiculos.forEach((v) => {
      (v.mantenimientos ?? []).forEach((m) => {
        const est = estadoMantenimiento(m, v.kilometraje);
        if (est === 'vencido') vencidos++;
        if (est === 'proximo') proximos++;
      });
    });
    return { vencidos, proximos };
  }, [vehiculos]);

  const openNewVeh = () => {
    setEditingVeh(null);
    setVehForm(EMPTY_VEHICULO);
    setFormError('');
    setVehFormOpen(true);
  };

  const openEditVeh = (v) => {
    setEditingVeh(v);
    setVehForm({ ...v, anio: v.anio ?? '' });
    setFormError('');
    setVehFormOpen(true);
  };

  const openNewMant = () => {
    if (!selected) return;
    setEditingMant(null);
    setMantForm({
      ...EMPTY_MANT,
      fechaRealizado: new Date().toISOString().split('T')[0],
      kilometraje: selected.kilometraje,
    });
    setFormError('');
    setMantFormOpen(true);
  };

  const openEditMant = (m) => {
    setEditingMant(m);
    setMantForm({
      ...m,
      kilometraje: m.kilometraje ?? '',
      kmProximo: m.kmProximo ?? '',
      fechaProxima: m.fechaProxima ?? '',
    });
    setFormError('');
    setMantFormOpen(true);
  };

  const handleVehChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) || 0 : e.target.value;
    setVehForm((p) => ({ ...p, [e.target.name]: val }));
  };

  const handleMantChange = (e) => {
    const val = e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    setMantForm((p) => ({ ...p, [e.target.name]: val }));
  };

  const handleSaveVeh = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = editingVeh ? { ...vehForm, id: editingVeh.id } : vehForm;
      const saved = await saveVehiculo(payload);
      setVehiculos((prev) => {
        const idx = prev.findIndex((v) => v.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
      setSelectedId(saved.id);
      setVehFormOpen(false);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleSaveMant = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = editingMant ? { ...mantForm, id: editingMant.id } : mantForm;
      const saved = await saveMantenimiento(selected.id, payload);
      setVehiculos((prev) => prev.map((v) => {
        if (v.id !== selected.id) return v;
        const mants = v.mantenimientos ?? [];
        const idx = mants.findIndex((m) => m.id === saved.id);
        const nextMants = idx >= 0 ? mants.map((m, i) => (i === idx ? saved : m)) : [saved, ...mants];
        return { ...v, mantenimientos: nextMants, kilometraje: Math.max(v.kilometraje, saved.kilometraje ?? v.kilometraje) };
      }));
      setMantFormOpen(false);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleDeleteVeh = async (v) => {
    const ok = await confirmDialog('¿Eliminar vehículo?', `Se eliminará ${v.placa} y todo su historial de mantenimiento.`, { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' });
    if (!ok) return;
    await deleteVehiculo(v.id);
    setVehiculos((prev) => prev.filter((x) => x.id !== v.id));
    if (selectedId === v.id) setSelectedId(null);
  };

  const handleDeleteMant = async (m) => {
    const ok = await confirmDialog('¿Eliminar registro?', `Eliminar ${labelTipoMantenimiento(m.tipo)} del ${selected?.placa}.`, { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' });
    if (!ok) return;
    await deleteMantenimiento(m.id);
    setVehiculos((prev) => prev.map((v) =>
      v.id === selected.id ? { ...v, mantenimientos: (v.mantenimientos ?? []).filter((x) => x.id !== m.id) } : v
    ));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" /></div>;
  }

  return (
    <>
      {(alertas.vencidos > 0 || alertas.proximos > 0) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 ${alertas.vencidos > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <Wrench className={`w-5 h-5 shrink-0 ${alertas.vencidos > 0 ? 'text-red-600' : 'text-amber-600'}`} />
          <p className={`text-sm font-medium ${alertas.vencidos > 0 ? 'text-red-800' : 'text-amber-800'}`}>
            {alertas.vencidos > 0 && <span>{alertas.vencidos} mantenimiento{alertas.vencidos !== 1 ? 's' : ''} vencido{alertas.vencidos !== 1 ? 's' : ''}</span>}
            {alertas.vencidos > 0 && alertas.proximos > 0 && ' · '}
            {alertas.proximos > 0 && <span>{alertas.proximos} próximo{alertas.proximos !== 1 ? 's' : ''} en 30 días</span>}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-slate-500">Control de vehículos, cambios de aceite, SOAT y mantenimientos programados</p>
        <button onClick={openNewVeh} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2">
          <Car size={16} /> Nuevo Vehículo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {vehiculos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === v.id ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 tracking-wide">{v.placa}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400">{v.estado}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{v.marca} {v.modelo} {v.anio ? `· ${v.anio}` : ''}</p>
              <p className="text-[11px] text-slate-400 mt-1">{v.kilometraje.toLocaleString()} km · {v.responsable || 'Sin responsable'}</p>
            </button>
          ))}
          {vehiculos.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">Sin vehículos registrados</div>
          )}
        </div>

        {selected ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-800">{selected.placa} — {selected.marca} {selected.modelo}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selected.kilometraje.toLocaleString()} km · {selected.responsable}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditVeh(selected)} className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600">Editar</button>
                <button onClick={openNewMant} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1">
                  <Wrench size={14} /> Registrar mantenimiento
                </button>
                <button onClick={() => handleDeleteVeh(selected)} className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600">Eliminar</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Tipo', 'Realizado', 'Próximo', 'Km actual / próximo', 'Monto', 'Estado', ''].map((h) => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase ${h === 'Monto' ? 'text-right' : h === '' ? 'text-center w-20' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mantenimientos.map((m) => {
                    const est = estadoMantenimiento(m, selected.kilometraje);
                    const badge = ESTADO_BADGE[est];
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{labelTipoMantenimiento(m.tipo)}</p>
                          {m.descripcion && <p className="text-[11px] text-slate-400">{m.descripcion}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.fechaRealizado}</td>
                        <td className="px-4 py-3 text-slate-600">{m.fechaProxima || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {m.kilometraje != null ? `${m.kilometraje.toLocaleString()} km` : '—'}
                          {m.kmProximo != null && <span className="text-slate-400"> → {m.kmProximo.toLocaleString()} km</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{m.monto ? fmt(m.monto) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => openEditMant(m)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600" title="Editar">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteMant(m)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500" title="Eliminar">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {mantenimientos.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Sin mantenimientos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 flex items-center justify-center py-24 text-slate-400 text-sm">
            Selecciona o registra un vehículo
          </div>
        )}
      </div>

      {/* Modal Vehículo */}
      {vehFormOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setVehFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(720px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">{editingVeh ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
                  <p className="text-xs text-white/60 mt-0.5">Datos del vehículo de la flota</p>
                </div>
                <button type="button" onClick={() => setVehFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveVeh} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Placa</label><input name="placa" value={vehForm.placa} onChange={handleVehChange} required className="input-field uppercase" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Kilometraje</label><input name="kilometraje" type="number" value={vehForm.kilometraje} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Marca</label><input name="marca" value={vehForm.marca} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Modelo</label><input name="modelo" value={vehForm.modelo} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Año</label><input name="anio" type="number" value={vehForm.anio} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Color</label><input name="color" value={vehForm.color} onChange={handleVehChange} className="input-field" /></div>
                    <div className="col-span-2"><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Responsable</label><input name="responsable" value={vehForm.responsable} onChange={handleVehChange} className="input-field" /></div>
                    <div className="col-span-2"><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Notas</label><textarea name="notas" value={vehForm.notas} onChange={handleVehChange} rows={2} className="input-field resize-none" /></div>
                  </div>
                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
                </div>
                <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button type="button" onClick={() => setVehFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60">{editingVeh ? 'Guardar' : 'Registrar'}</button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Mantenimiento */}
      {mantFormOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setMantFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(780px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">{editingMant ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'}</h2>
                  <p className="text-xs text-white/60 mt-0.5">{selected?.placa} — programar próxima fecha o km</p>
                </div>
                <button type="button" onClick={() => setMantFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveMant} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Tipo de servicio</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Tipo</label>
                        <select name="tipo" value={mantForm.tipo} onChange={handleMantChange} className="input-field">
                          {TIPOS_MANTENIMIENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Descripción</label>
                        <input name="descripcion" value={mantForm.descripcion} onChange={handleMantChange} className="input-field" placeholder="Ej. Aceite 5W-30 sintético + filtro" />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Fechas y kilometraje</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Fecha realizado</label><input name="fechaRealizado" type="date" value={mantForm.fechaRealizado} onChange={handleMantChange} required className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Próximo mantenimiento</label><input name="fechaProxima" type="date" value={mantForm.fechaProxima} onChange={handleMantChange} className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Km al realizar</label><input name="kilometraje" type="number" value={mantForm.kilometraje} onChange={handleMantChange} className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Km próximo servicio</label><input name="kmProximo" type="number" value={mantForm.kmProximo} onChange={handleMantChange} className="input-field" placeholder="Ej. 52000" /></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Costo</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Monto ($)</label><input name="monto" type="number" step="0.01" value={mantForm.monto} onChange={handleMantChange} className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Proveedor / taller</label><input name="proveedor" value={mantForm.proveedor} onChange={handleMantChange} className="input-field" /></div>
                      <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Notas</label><textarea name="notas" value={mantForm.notas} onChange={handleMantChange} rows={2} className="input-field resize-none" /></div>
                    </div>
                  </div>
                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
                </div>
                <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button type="button" onClick={() => setMantFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60">{editingMant ? 'Guardar' : 'Registrar'}</button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};
