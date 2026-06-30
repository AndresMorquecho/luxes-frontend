import React, { useEffect, useState } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { getClientes, saveCliente, deleteCliente } from '../../application/clientesService';
import { useProyectosContext } from '../../../proyectos/application/context/ProyectosContext.jsx';

const EMPTY_FORM = { nombre: '', cedulaRuc: '', telefono: '', email: '', direccion: '', tipo: 'Persona', notas: '' };
const TIPOS = ['Persona', 'Empresa'];

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

  useEffect(() => { load(); }, []);

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
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveCliente(form);
      if (editing && reloadProyectos) {
        reloadProyectos();
      }
      setClientes(prev => {
        const idx = prev.findIndex(c => c.id === saved.id);
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
        toast.success(editing ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente');
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
      setClientes(prev => prev.filter(c => c.id !== id));
      deferClose(() => toast.success('Cliente eliminado correctamente'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el cliente');
    }
  };

  const q = search.toLowerCase();
  const filteredAll = clientes.filter(c =>
    !q || c.nombre.toLowerCase().includes(q) ||
    c.cedulaRuc.includes(q) || c.email?.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { setPage(1); }, [search]);

  const totales = {
    total: clientes.length,
    personas: clientes.filter(c => c.tipo === 'Persona').length,
    empresas: clientes.filter(c => c.tipo === 'Empresa').length,
  };

  return (
    <div className="p-4 sm:p-6 xl:p-8 pb-24 md:pb-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .cl-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }

        .cl-card {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(37,99,235,0.06), 0 1px 2px rgba(0,0,0,0.03);
          overflow: hidden;
        }

        .cl-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(37,99,235,0.3);
          letter-spacing: 0.01em;
        }
        .cl-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.42); }
        .cl-btn-primary:active { transform: translateY(0); }
        .cl-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .cl-btn-ghost {
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cl-btn-ghost:hover { background: rgba(241,245,249,0.8); color: #475569; }

        .cl-input {
          width: 100%;
          border: 1.5px solid rgba(226,232,240,0.8);
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          outline: none;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
        }
        .cl-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); background: #fff; }
        .cl-input::placeholder { color: #94a3b8; }

        .cl-tr { transition: background 0.15s ease; }
        .cl-tr:hover td { background: rgba(59,130,246,0.03); }

        @keyframes modal-in {
          from { transform: scale(0.95) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="cl-card px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Clientes</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">Registro y gestión de clientes para envío de proformas</p>
        </div>
        <button onClick={openNew} className="cl-btn-primary w-full sm:w-auto justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="cl-card px-3 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
            </svg>
          </div>
          <div>
            <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 mt-0.5">{totales.total}</div>
          </div>
        </div>
        <div className="cl-card px-3 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Personas</div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 mt-0.5">{totales.personas}</div>
          </div>
        </div>
        <div className="cl-card px-3 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#6366f1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div>
            <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Empresas</div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 mt-0.5">{totales.empresas}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cl-card">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100/60 flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="cl-input w-full sm:max-w-xs !border-0 !bg-transparent !p-0 !shadow-none !text-sm !font-medium placeholder:!text-slate-400 focus:!ring-0"
            placeholder="Buscar por nombre, RUC o email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100/60">
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">RUC / Cédula</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dirección</th>
                    <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/40">
                  {paginated.map((c) => (
                    <tr key={c.id} className="cl-tr">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: c.tipo === 'Empresa' ? 'rgba(99,102,241,0.12)' : 'rgba(59,130,246,0.1)', color: c.tipo === 'Empresa' ? '#6366f1' : '#3b82f6' }}>
                            {initial(c.nombre)}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-800">{c.nombre}</div>
                            {c.notas && <div className="text-[11px] text-slate-400 mt-0.5">{c.notas}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500 text-[12px]">{c.cedulaRuc}</td>
                      <td className="px-5 py-4">
                        <div className="text-slate-700 font-medium">{c.email}</div>
                        <div className="text-[12px] text-slate-400 mt-0.5">{c.telefono}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-[12px] max-w-[200px] truncate">{c.direccion}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: c.tipo === 'Empresa' ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.08)',
                            color: c.tipo === 'Empresa' ? '#6366f1' : '#3b82f6',
                          }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.tipo === 'Empresa' ? '#6366f1' : '#3b82f6' }} />
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(c.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm font-medium">No se encontraron clientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {paginated.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: c.tipo === 'Empresa' ? 'rgba(99,102,241,0.12)' : 'rgba(59,130,246,0.1)', color: c.tipo === 'Empresa' ? '#6366f1' : '#3b82f6' }}>
                      {initial(c.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-snug normal-case">{c.nombre}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1.5"
                        style={{
                          background: c.tipo === 'Empresa' ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.08)',
                          color: c.tipo === 'Empresa' ? '#6366f1' : '#3b82f6',
                        }}>
                        {c.tipo}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-medium block">RUC / Cédula</span>
                      <span className="text-slate-700 font-semibold font-mono text-[10px]">{c.cedulaRuc || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Teléfono</span>
                      <span className="text-slate-700 font-semibold">{c.telefono || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium block">Email</span>
                      <span className="text-slate-700 font-semibold break-all">{c.email || '—'}</span>
                    </div>
                    {c.direccion ? (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Dirección</span>
                        <span className="text-slate-700 font-semibold">{c.direccion}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => openEdit(c)}
                      className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-bold">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(c.id)}
                      className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100" title="Eliminar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {paginated.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">No se encontraron clientes</div>
              )}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100/60 bg-slate-50/30">
            <span className="text-[12px] font-medium text-slate-400">{filteredAll.length} cliente{filteredAll.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white hover:border-slate-300 transition-all text-xs font-bold">‹</button>
              <span className="text-[12px] font-semibold text-slate-500 px-2">{safePage} / {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white hover:border-slate-300 transition-all text-xs font-bold">›</button>
            </div>
          </div>
        )}
      </div>

      <ModalPortal open={formOpen}>
        <div className="cl-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(14px) saturate(130%)', WebkitBackdropFilter: 'blur(14px) saturate(130%)', animation: 'overlay-in 0.2s ease' }}
            onClick={() => deferClose(() => setFormOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-modal-in max-h-[90vh] flex flex-col border border-slate-100"
              style={{ boxShadow: '0 25px 60px rgba(15,23,42,0.15), 0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                <button type="button" onClick={() => deferClose(() => setFormOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nombre / Razón Social</label>
                    <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej. Corporación Lojana S.A." className="cl-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">RUC / Cédula</label>
                      <input name="cedulaRuc" value={form.cedulaRuc} onChange={handleChange} required placeholder="1790012345001" className="cl-input font-mono" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
                      <select name="tipo" value={form.tipo} onChange={handleChange} className="cl-input">
                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Teléfono</label>
                      <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="0991234567" className="cl-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Correo electrónico</label>
                      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="cliente@ejemplo.com" className="cl-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Dirección</label>
                    <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Principal y calle secundaria" className="cl-input" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notas</label>
                    <textarea name="notas" value={form.notas} onChange={handleChange} rows={2} placeholder="Información adicional…" className="cl-input resize-none" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => deferClose(() => setFormOpen(false))} className="cl-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={saving} className="cl-btn-primary">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1.5 ${saving ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!saving}
                      />
                      {editing ? 'Guardar cambios' : 'Registrar Cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
