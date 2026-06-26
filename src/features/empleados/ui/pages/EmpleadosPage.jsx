import React, { useEffect, useState } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import {
  getEmpleados,
  deleteEmpleado,
  getEmpleadoById,
  getEmpleadoDocumentos,
  DOCUMENTO_TIPOS
} from '../../application/empleadosService';

const BANCOS = ['Pichincha', 'Guayaquil', 'Bolivariano', 'Pacifico', 'Internacional', 'Produbanco', 'Austro', 'Machala'];

const BANCO_BADGES = {
  Pichincha: { letter: 'p', background: '#ffdd00', color: '#003087' },
  Guayaquil: { letter: 'G', background: '#e31837', color: '#ffffff' },
  Bolivariano: { letter: 'B', background: '#006b3f', color: '#ffffff' },
  Pacifico: { letter: 'P', background: '#003da5', color: '#ffffff' },
  Internacional: { letter: 'I', background: '#f47920', color: '#ffffff' },
  Produbanco: { letter: 'P', background: '#c8102e', color: '#ffffff' },
  Austro: { letter: 'A', background: '#00843d', color: '#ffffff' },
  Machala: { letter: 'M', background: '#0369a1', color: '#ffffff' },
};

const normalizeBancoKey = (banco = '') => {
  const trimmed = String(banco).trim();
  if (!trimmed) return '';

  if (BANCO_BADGES[trimmed]) return trimmed;

  const stripped = trimmed.replace(/^banco\s+(de(l?)\s+)?/i, '');
  if (BANCO_BADGES[stripped]) return stripped;

  const normalized = stripped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return BANCOS.find((name) => {
    const candidate = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized === candidate || normalized.includes(candidate);
  }) || '';
};

const getBankBadge = (banco) => {
  const key = normalizeBancoKey(banco);
  if (!key) {
    if (!banco) return { letter: '?', background: '#e2e8f0', color: '#64748b' };
    return {
      letter: banco.charAt(0).toUpperCase(),
      background: '#e2e8f0',
      color: '#475569',
    };
  }
  return BANCO_BADGES[key];
};

const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#2563eb' },
  { bg: '#d1fae5', text: '#059669' },
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#ffedd5', text: '#ea580c' },
  { bg: '#fce7f3', text: '#db2777' },
];

const DEPTO_STYLES = {
  'Tecnología': { bg: '#dbeafe', text: '#1d4ed8' },
  IT: { bg: '#ede9fe', text: '#6d28d9' },
  Diseño: { bg: '#fce7f3', text: '#be185d' },
  Operaciones: { bg: '#ffedd5', text: '#c2410c' },
  Finanzas: { bg: '#d1fae5', text: '#047857' },
  RRHH: { bg: '#e0e7ff', text: '#4338ca' },
  Marketing: { bg: '#fef3c7', text: '#b45309' },
  Ventas: { bg: '#ccfbf1', text: '#0f766e' },
};

const getAvatarStyle = (seed = '') => {
  const idx = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
};

const getDeptoStyle = (depto = '') => {
  if (DEPTO_STYLES[depto]) return DEPTO_STYLES[depto];
  const idx = [...depto].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[idx];
  return { bg: palette.bg, text: palette.text };
};

const EmpleadoBankCell = ({ banco, cuentaBanco }) => {
  if (!banco && !cuentaBanco) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const badge = getBankBadge(banco);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm"
        style={{ background: badge.background, color: badge.color }}
      >
        {badge.letter}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{banco || 'Sin banco'}</p>
        <p className="text-xs text-slate-500 truncate">{cuentaBanco || 'Sin cuenta'}</p>
      </div>
    </div>
  );
};

export const EmpleadosPage = () => {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [viewingEmpleado, setViewingEmpleado] = useState(null);
  const [viewingDocs, setViewingDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getEmpleados();
      setEmpleados(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    navigate('/nomina/empleados/nuevo');
  };

  const openEdit = (emp) => {
    navigate(`/nomina/empleados/editar/${emp.id}`);
  };

  const handleView = async (emp) => {
    setViewingEmpleado(emp);
    setLoadingDocs(true);
    try {
      const docs = await getEmpleadoDocumentos(emp.id);
      setViewingDocs(docs);
      
      const fullEmp = await getEmpleadoById(emp.id);
      setViewingEmpleado(fullEmp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handlePreview = (doc, label) => {
    setPreviewDoc({
      ...doc,
      label,
      isPdf: doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.archivoUrl || doc.nombre || ''),
      isImage: doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(doc.archivoUrl || doc.nombre || ''),
    });
  };

  const q = search.toLowerCase();
  const filteredAll = empleados.filter(e =>
    e.nombre.toLowerCase().includes(q) ||
    e.id.toLowerCase().includes(q) ||
    e.cedula.includes(q) ||
    e.cargo.toLowerCase().includes(q) ||
    e.departamento.toLowerCase().includes(q) ||
    e.cuentaBanco.includes(q) ||
    e.banco.toLowerCase().includes(q)
  );

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = page > totalPages ? 1 : page;
  
  // Evitar bucle de renderizado si la página cambia
  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [safePage, page]);

  const filtered = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  const handleDelete = async (emp) => {
    const confirmed = await confirmDialog(
      '¿Eliminar colaborador?',
      `¿Eliminar permanentemente a ${emp.nombre}? Se borrarán también sus documentos y registros asociados.`,
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteEmpleado(emp.id);
      setEmpleados(prev => prev.filter(e => e.id !== emp.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up empleados-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .empleados-page, .empleados-page * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .btn-primary { background: #2563eb; transition: all 0.15s ease; }
        .btn-primary:hover { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .btn-ghost { transition: all 0.15s ease; }
        .btn-ghost:hover { background: #f1f5f9; }
        .input-field { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; font-weight: 500; color: #1e293b; outline: none; transition: all 0.15s ease; background: white; width: 100%; }
        .input-field:focus { border-color: #93c5fd; ring: 2px; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .input-field::placeholder { color: #94a3b8; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-in {
          from { transform: scale(0.96) translateY(12px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-modal-in { animation: modal-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Colaboradores</h1>
            <p className="text-sm text-slate-500">Registro y gestión de colaboradores</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm shrink-0"
          style={{ backgroundColor: '#1d4ed8' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Colaborador
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Lista de Colaboradores</h2>
            <span className="text-xs font-medium text-gray-400">{filteredAll.length} registros</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-80 min-w-[280px] transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm empleados-table">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cédula</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Depto.</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cuenta Bancaria</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(emp => {
                  const avatar = getAvatarStyle(emp.id || emp.nombre);
                  const depto = getDeptoStyle(emp.departamento);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                            style={{ backgroundColor: avatar.bg, color: avatar.text }}
                          >
                            {emp.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight">{emp.nombre}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{emp.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{emp.cedula}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{emp.cargo || '—'}</td>
                      <td className="px-5 py-4">
                        {emp.departamento ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: depto.bg, color: depto.text }}
                          >
                            {emp.departamento}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <EmpleadoBankCell banco={emp.banco} cuentaBanco={emp.cuentaBanco} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleView(emp)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Ver detalle del colaborador"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Editar colaborador"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                            title="Eliminar colaborador"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                      {search ? 'No se encontraron colaboradores' : 'No hay colaboradores registrados'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filteredAll.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-medium text-gray-400">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-400">Mostrar:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded-lg outline-none bg-white focus:border-blue-300 transition-colors cursor-pointer"
                >
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${n === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle de Colaborador */}
      {viewingEmpleado && (
        <ModalPortal>
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md z-[10000] flex items-center justify-center p-6 md:p-12 animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[82vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-modal-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
                <h2 className="text-base font-bold text-slate-800">Expediente del Colaborador</h2>
              </div>
              <button
                onClick={() => setViewingEmpleado(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
                
                {/* Left Panel: Profile Summary */}
                <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center shrink-0">
                    {viewingEmpleado.foto ? (
                      <img src={viewingEmpleado.foto} alt={viewingEmpleado.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl font-bold uppercase"
                        style={{
                          backgroundColor: getAvatarStyle(viewingEmpleado.id || viewingEmpleado.nombre).bg,
                          color: getAvatarStyle(viewingEmpleado.id || viewingEmpleado.nombre).text,
                        }}
                      >
                        {viewingEmpleado.nombre.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 text-center mt-4 leading-tight">{viewingEmpleado.nombre}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">{viewingEmpleado.id}</p>
                  
                  {viewingEmpleado.departamento && (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-3"
                      style={{
                        backgroundColor: getDeptoStyle(viewingEmpleado.departamento).bg,
                        color: getDeptoStyle(viewingEmpleado.departamento).text,
                      }}
                    >
                      {viewingEmpleado.departamento}
                    </span>
                  )}

                  {/* Acceso Box */}
                  <div className="w-full mt-6 bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Acceso al Sistema</p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Usuario:</span>
                        <span className="font-semibold text-slate-700">@{viewingEmpleado.username || '—'}</span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-slate-400">Correo:</span>
                        <span className="font-medium text-slate-700 truncate w-full" title={viewingEmpleado.correo}>{viewingEmpleado.correo || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contacto Box */}
                  <div className="w-full mt-4 space-y-2 text-left text-xs text-slate-600">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contacto</p>
                    <div className="flex items-start gap-2">
                      <svg className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                      <span className="font-medium">{viewingEmpleado.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      <span className="font-medium leading-tight">{viewingEmpleado.direccion || 'Sin dirección registrada'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Detailed Tabs info */}
                <div className="space-y-6">
                  {/* Contratación & Finanzas */}
                  <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-left">
                      <span className="w-1.5 h-3.5 bg-blue-500 rounded-full" />
                      Información Contratación y Banco
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs text-left">
                      <div>
                        <p className="text-slate-400 font-medium">Cargo</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{viewingEmpleado.cargo || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Contratación</p>
                        <div className="mt-1">
                          {viewingEmpleado.tieneContrato !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[9px] uppercase tracking-wide border border-emerald-100">
                              Bajo Relación
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[9px] uppercase tracking-wide border border-amber-100">
                              Por Asistencia
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Tipo de contrato</p>
                        <p className="text-slate-800 font-semibold mt-0.5">
                          {viewingEmpleado.tieneContrato !== false 
                            ? (viewingEmpleado.tipoContrato || 'Fijo') 
                            : 'Sin contrato'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Sueldo Diario</p>
                        <p className="text-slate-800 font-semibold mt-0.5">${(viewingEmpleado.sueldoDiario ?? 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Detalle de Cuenta</p>
                        {viewingEmpleado.cuentaBanco ? (
                          <div className="mt-0.5 leading-snug">
                            <span className="font-bold text-[#003087] block text-[10px] uppercase tracking-wider">{viewingEmpleado.banco}</span>
                            <span className="font-mono font-semibold text-slate-700">{viewingEmpleado.cuentaBanco}</span>
                          </div>
                        ) : (
                          <p className="text-slate-400 mt-0.5">Sin cuenta bancaria</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expediente Digital / Documentos */}
                  <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-left">
                      <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full" />
                      Expediente Digital (Clic en documento para ver)
                    </h4>
                    {loadingDocs ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-slate-500 mb-2" />
                        <p className="text-[11px] font-medium text-slate-400">Cargando expediente digital...</p>
                      </div>
                    ) : viewingDocs.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 italic text-xs flex flex-col items-center justify-center gap-2">
                        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span>No hay documentos cargados en el expediente de este colaborador.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {viewingDocs.map((doc) => {
                          const isPdf = doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.archivoUrl || doc.nombre || '');
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40 cursor-pointer hover:scale-[1.01] hover:shadow-sm transition-all"
                              onClick={() => handlePreview(doc, doc.nombre)}
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                {isPdf ? (
                                  <span className="text-[9px] font-black uppercase text-center block w-full text-emerald-800">PDF</span>
                                ) : (
                                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-xs font-bold text-slate-700 leading-tight truncate">{doc.nombre}</p>
                                <p className="text-[10px] font-medium text-slate-400 leading-normal truncate mt-0.5">
                                  {doc.archivoUrl.split('/').pop()}
                                </p>
                              </div>
                              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setViewingEmpleado(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal de Vista Previa de Documento */}
      {previewDoc && (
        <ModalPortal>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[10050] flex items-center justify-center p-6 md:p-12 animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[80vh] h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-modal-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <div className="text-left min-w-0">
                  <h2 className="text-sm font-bold text-slate-800 truncate">{previewDoc.label}</h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-lg">{previewDoc.nombre}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {/* Botón Descargar */}
                <a
                  href={previewDoc.archivoUrl}
                  download={previewDoc.nombre}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Descargar
                </a>
                
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 bg-slate-900/5 overflow-hidden relative">
              {previewDoc.isPdf ? (
                <iframe
                  src={`${previewDoc.archivoUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-none bg-white"
                  title={previewDoc.nombre}
                />
              ) : previewDoc.isImage ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-6 bg-slate-900/[0.02]">
                  <img
                    src={previewDoc.archivoUrl}
                    alt={previewDoc.nombre}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-slate-200 bg-white"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">No hay vista previa disponible</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">Este formato de archivo no se puede previsualizar directamente en el navegador. Puedes descargarlo para visualizarlo localmente.</p>
                  </div>
                  <a
                    href={previewDoc.archivoUrl}
                    download={previewDoc.nombre}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    Descargar archivo
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};
