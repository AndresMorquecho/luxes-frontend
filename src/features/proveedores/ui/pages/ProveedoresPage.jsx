import React, { useEffect, useState } from 'react';
import { Truck, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { getProveedores, saveProveedor, deleteProveedor } from '../../application/proveedoresService';
import {
  ComprasPageHeader,
  ComprasHeaderButton,
} from '../../../compras/ui/components/ComprasPageHeader';

const EMPTY_FORM = {
  nombre: '',
  cedulaRuc: '',
  telefono: '',
  email: '',
  direccion: '',
  contacto: '',
  tipo: 'Persona',
  notas: '',
};
const TIPOS = ['Persona', 'Empresa'];

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

const initial = (name) => name?.charAt(0)?.toUpperCase() ?? '?';

export const ProveedoresPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getProveedores();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p });
    setFormOpen(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveProveedor(form);
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      deferClose(() => {
        setFormOpen(false);
        setSaving(false);
        toast.success(
          editing ? 'Proveedor actualizado correctamente' : 'Proveedor registrado correctamente'
        );
      });
    } catch (err) {
      deferClose(() => setSaving(false));
      toast.error(err instanceof Error ? err.message : 'Error al guardar el proveedor');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog(
      '¿Eliminar proveedor?',
      '¿Eliminar este proveedor? Esta acción es irreversible.',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteProveedor(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      deferClose(() => toast.success('Proveedor eliminado correctamente'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el proveedor');
    }
  };

  const q = search.toLowerCase();
  const filteredAll = items.filter(
    (p) =>
      !q ||
      p.nombre.toLowerCase().includes(q) ||
      p.cedulaRuc.includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.contacto?.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totales = {
    total: items.length,
    personas: items.filter((p) => p.tipo === 'Persona').length,
    empresas: items.filter((p) => p.tipo === 'Empresa').length,
  };

  const kpiItems = [
    { label: 'Total', value: totales.total, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Personas', value: totales.personas, border: 'border-t-emerald-500', color: 'text-emerald-600' },
    { label: 'Empresas', value: totales.empresas, border: 'border-t-indigo-500', color: 'text-indigo-600' },
  ];

  const renderTipoBadge = (tipo) => (
    <span
      className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 ${
        tipo === 'Empresa'
          ? 'bg-slate-100 text-slate-700'
          : 'bg-blue-50 text-blue-700'
      }`}
    >
      {tipo}
    </span>
  );

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Truck}
        badge="Compras"
        title="Proveedores"
        subtitle="Registro y gestión de proveedores"
        action={(
          <ComprasHeaderButton onClick={openNew}>
            <Plus size={15} />
            Nuevo proveedor
          </ComprasHeaderButton>
        )}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {kpiItems.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${kpi.border} px-2.5 sm:px-4 py-3 sm:py-4 min-w-0`}
          >
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Lista de proveedores</h2>
            <span className="text-xs font-medium text-gray-400">{filteredAll.length} registros</span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
              placeholder="Buscar por nombre, RUC, email o contacto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto relative">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">RUC / Cédula</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Correo / Teléfono</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                              p.tipo === 'Empresa'
                                ? 'bg-slate-50 text-slate-600 border-slate-200'
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}
                          >
                            {initial(p.nombre)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{p.nombre}</p>
                            {p.notas && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">
                                {p.notas}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-slate-700">
                        {p.cedulaRuc}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">
                        {p.contacto || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">{p.email || '—'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.telefono || '—'}</p>
                      </td>
                      <td className="px-5 py-4">{renderTipoBadge(p.tipo)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                        No se encontraron proveedores
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-3 space-y-3">
              {paginated.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                        p.tipo === 'Empresa'
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}
                    >
                      {initial(p.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {p.nombre}
                      </p>
                      <div className="mt-1.5">{renderTipoBadge(p.tipo)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-medium block">RUC / Cédula</span>
                      <span className="text-slate-700 font-semibold font-mono text-[10px]">
                        {p.cedulaRuc || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Contacto</span>
                      <span className="text-slate-700 font-semibold">{p.contacto || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Teléfono</span>
                      <span className="text-slate-700 font-semibold">{p.telefono || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Email</span>
                      <span className="text-slate-700 font-semibold break-all">
                        {p.email || '—'}
                      </span>
                    </div>
                    {p.direccion ? (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Dirección</span>
                        <span className="text-slate-700 font-semibold">{p.direccion}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-bold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
              {paginated.length === 0 && (
                <div className="text-center py-12 text-sm text-slate-400">
                  No se encontraron proveedores
                </div>
              )}
            </div>
          </>
        )}

        {filteredAll.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
            <span className="text-[11px] font-medium text-gray-400">
              {filteredAll.length} proveedor{filteredAll.length !== 1 ? 'es' : ''}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                      n === safePage ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalPortal open={formOpen}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => deferClose(() => setFormOpen(false))}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                    <Truck size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">
                      {editing ? 'Editar proveedor' : 'Nuevo proveedor'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {editing ? 'Actualiza los datos del proveedor' : 'Completa los datos para registrar el proveedor'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deferClose(() => setFormOpen(false))}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                      Nombre / Razón social
                    </label>
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                      placeholder="Ej. Importadora del Sur S.A."
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                        RUC / Cédula
                      </label>
                      <input
                        name="cedulaRuc"
                        value={form.cedulaRuc}
                        onChange={handleChange}
                        required
                        placeholder="1790034567001"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                        Tipo
                      </label>
                      <select
                        name="tipo"
                        value={form.tipo}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                        Teléfono
                      </label>
                      <input
                        name="telefono"
                        value={form.telefono}
                        onChange={handleChange}
                        placeholder="022345678"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                        Correo electrónico
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="proveedor@ejemplo.com"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                      Dirección
                    </label>
                    <input
                      name="direccion"
                      value={form.direccion}
                      onChange={handleChange}
                      placeholder="Av. Principal y calle secundaria"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                      Persona de contacto
                    </label>
                    <input
                      name="contacto"
                      value={form.contacto}
                      onChange={handleChange}
                      placeholder="Nombre del contacto en la empresa"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                      Notas
                    </label>
                    <textarea
                      name="notas"
                      value={form.notas}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Información adicional…"
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => deferClose(() => setFormOpen(false))}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar proveedor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      </ModalPortal>
    </div>
  );
};
