import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Search, X, UserPlus } from 'lucide-react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { getClientes, saveCliente, deleteCliente } from '../../application/clientesService';
import { useProyectosContext } from '../../../proyectos/application/context/ProyectosContext.jsx';
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
  tipo: 'Persona',
  notas: '',
};
const TIPOS = ['Persona', 'Empresa'];

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

const initial = (name) => name?.charAt(0)?.toUpperCase() ?? '?';

export const ClientesPage = () => {
  const { reloadProyectos } = useProyectosContext();
  const [clientes, setClientes] = useState([]);
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
      const data = await getClientes();
      setClientes(data);
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

  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...c });
    setFormOpen(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveCliente(form);
      if (editing && reloadProyectos) {
        reloadProyectos();
      }
      setClientes((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
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
          editing ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente'
        );
      });
    } catch (err) {
      deferClose(() => setSaving(false));
      toast.error(err instanceof Error ? err.message : 'Error al guardar el cliente');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog(
      '¿Eliminar cliente?',
      '¿Eliminar este cliente? Esta acción es irreversible.',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      deferClose(() => toast.success('Cliente eliminado correctamente'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el cliente');
    }
  };

  const q = search.toLowerCase();
  const filteredAll = clientes.filter(
    (c) =>
      !q ||
      c.nombre.toLowerCase().includes(q) ||
      c.cedulaRuc.includes(q) ||
      c.email?.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totales = {
    total: clientes.length,
    personas: clientes.filter((c) => c.tipo === 'Persona').length,
    empresas: clientes.filter((c) => c.tipo === 'Empresa').length,
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
        icon={Users}
        badge="Directorio"
        title="Clientes"
        subtitle="Registro y gestión de clientes para envío de proformas"
        action={(
          <ComprasHeaderButton onClick={openNew}>
            <Plus size={15} />
            Nuevo cliente
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
            <h2 className="text-sm font-semibold text-gray-800">Lista de clientes</h2>
            <span className="text-xs font-medium text-gray-400">{filteredAll.length} registros</span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
              placeholder="Buscar por nombre, RUC o email…"
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
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">RUC / Cédula</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dirección</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                              c.tipo === 'Empresa'
                                ? 'bg-slate-50 text-slate-600 border-slate-200'
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}
                          >
                            {initial(c.nombre)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{c.nombre}</p>
                            {c.notas && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">
                                {c.notas}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-slate-700">
                        {c.cedulaRuc}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">{c.email || '—'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.telefono || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 max-w-[200px] truncate">
                        {c.direccion || '—'}
                      </td>
                      <td className="px-5 py-4">{renderTipoBadge(c.tipo)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
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
                        No se encontraron clientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-3 space-y-3">
              {paginated.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                        c.tipo === 'Empresa'
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}
                    >
                      {initial(c.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {c.nombre}
                      </p>
                      <div className="mt-1.5">{renderTipoBadge(c.tipo)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-medium block">RUC / Cédula</span>
                      <span className="text-slate-700 font-semibold font-mono text-[10px]">
                        {c.cedulaRuc || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Teléfono</span>
                      <span className="text-slate-700 font-semibold">{c.telefono || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium block">Email</span>
                      <span className="text-slate-700 font-semibold break-all">
                        {c.email || '—'}
                      </span>
                    </div>
                    {c.direccion ? (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Dirección</span>
                        <span className="text-slate-700 font-semibold">{c.direccion}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-bold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
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
                  No se encontraron clientes
                </div>
              )}
            </div>
          </>
        )}

        {filteredAll.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
            <span className="text-[11px] font-medium text-gray-400">
              {filteredAll.length} cliente{filteredAll.length !== 1 ? 's' : ''}
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
                    {editing ? <Users size={18} strokeWidth={2.5} /> : <UserPlus size={18} strokeWidth={2.5} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">
                      {editing ? 'Editar cliente' : 'Nuevo cliente'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {editing ? 'Actualiza los datos del cliente' : 'Completa los datos para registrar el cliente'}
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
                      placeholder="Ej. Corporación Lojana S.A."
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
                        placeholder="1790012345001"
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
                        placeholder="0991234567"
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
                        placeholder="cliente@ejemplo.com"
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
                      {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar cliente'}
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
