import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { getGastos, saveGasto, deleteGasto, CATEGORIAS } from '../../application/gastosService';
import { MODAL_HEADER_STYLE, MODAL_FORM_STYLES, fmt } from '../shared/gastosUi';

const EMPTY_FORM = {
  concepto: '', categoria: 'oficina',
  fecha: new Date().toISOString().split('T')[0], monto: 0, proveedor: '', notas: '',
};

const CAT_BADGES = {
  oficina: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Oficina' },
  mantenimiento: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Mantenimiento' },
  servicios: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', label: 'Servicios' },
  logistica: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Logística' },
  vehiculos: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Vehículos' },
  redes_y_programas: { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', label: 'Redes y Programas' },
  varios: { bg: 'rgba(236,72,153,0.1)', color: '#ec4899', label: 'Varios' },
};

export const GastosGeneralesTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const load = async () => {
    setLoading(true);
    try { setItems(await getGastos()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, fecha: new Date().toISOString().split('T')[0] });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (g) => { setEditing(g); setForm({ ...g }); setFormError(''); setFormOpen(true); };

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = editing ? { ...form, id: editing.id } : form;
      const saved = await saveGasto(payload);
      setItems((prev) => {
        const idx = prev.findIndex((g) => g.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
      setFormOpen(false);
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (gasto) => {
    const ok = await confirmDialog('¿Eliminar gasto?', `¿Eliminar "${gasto.concepto}"?`, { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' });
    if (!ok) return;
    try {
      await deleteGasto(gasto.id);
      setItems((prev) => prev.filter((g) => g.id !== gasto.id));
    } catch (err) { console.error(err); }
  };

  const q = search.toLowerCase();
  const filteredAll = items.filter((g) =>
    !q || g.concepto.toLowerCase().includes(q) || g.categoria.includes(q) || g.proveedor?.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-slate-500">Registro de egresos operativos de la empresa</p>
        <button onClick={openNew} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nuevo Gasto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <input className="input-field max-w-sm py-2 text-sm" placeholder="Buscar por concepto, categoría o proveedor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Concepto', 'Categoría', 'Fecha', 'Proveedor', 'Monto', ''].map((h) => (
                    <th key={h} className={`px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Monto' ? 'text-right' : h === '' ? 'text-center w-24' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((g) => (
                  <tr key={g.id} className="hover:bg-blue-50/30">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{g.concepto}</div>
                      {g.notas && <div className="text-[11px] text-slate-400 mt-0.5">{g.notas}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ background: CAT_BADGES[g.categoria]?.bg, color: CAT_BADGES[g.categoria]?.color }}>
                        {CAT_BADGES[g.categoria]?.label ?? g.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{g.fecha}</td>
                    <td className="px-5 py-3.5 text-slate-600">{g.proveedor || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{fmt(g.monto)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600" title="Editar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(g)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Eliminar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-slate-400">No hay gastos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            <span>{filteredAll.length} gastos</span>
            <span>{safePage} / {totalPages}</span>
          </div>
        )}
      </div>

      {formOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(720px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">{editing ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
                  <p className="text-xs text-white/60 mt-0.5">{editing ? editing.id : 'Registre el egreso operativo'}</p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Detalle del gasto</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Concepto</label>
                        <input name="concepto" value={form.concepto} onChange={handleChange} required className="input-field" placeholder="Ej. Papelería de oficina" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Categoría</label>
                          <select name="categoria" value={form.categoria} onChange={handleChange} className="input-field">
                            {CATEGORIAS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Fecha</label>
                          <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className="input-field" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Monto ($)</label>
                          <input name="monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleChange} required className="input-field" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Proveedor</label>
                          <input name="proveedor" value={form.proveedor} onChange={handleChange} className="input-field" placeholder="Opcional" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Notas</label>
                        <textarea name="notas" value={form.notas} onChange={handleChange} rows={2} className="input-field resize-none" placeholder="Observaciones…" />
                      </div>
                    </div>
                  </div>
                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
                </div>
                <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button type="button" onClick={() => setFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60">
                    {saving && (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
                    )}
                    {editing ? 'Guardar cambios' : 'Registrar Gasto'}
                  </button>
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
