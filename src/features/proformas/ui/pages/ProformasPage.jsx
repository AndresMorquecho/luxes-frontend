import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { getProformas, deleteProforma, updateProformaEstado } from '../../application/proformasService';
import { ProformaPDF } from '../components/ProformaPDF';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { confirmDialog, alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { Search, Trash2, Download, Eye } from 'lucide-react';

const SearchableSelect = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    (opt || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 focus:outline-none cursor-pointer flex justify-between items-center min-h-[42px]"
      >
        <span className={value ? "text-slate-700 font-medium" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </div>
      {isOpen && (
        <div className="co-search-dropdown p-2">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 mb-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={e => e.stopPropagation()}
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto">
            <div 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-50 rounded cursor-pointer italic"
            >
              {placeholder}
            </div>
            {filteredOptions.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`co-search-item rounded ${value === opt ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
              >
                {opt}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-slate-400 text-center">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProformasPage = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.rol || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';
  const isVentasODisenador = ['VENTAS', 'DISEÑADOR', 'DISENADOR'].includes(userRole);
  
  // Core lists & stats
  const [proformas, setProformas] = useState([]);
  const [allProformas, setAllProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [configuracion, setConfiguracion] = useState(null);
  
  // KPIs & Dynamic Filter Options
  const [stats, setStats] = useState({ total: 0, totalEsteMes: 0, pendientes: 0, aprobadas: 0, montoTotal: 0 });
  const [ejecutivos, setEjecutivos] = useState([]);
  const [clientesList, setClientesList] = useState([]);

  // Métodos de Pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [paymentMethodModal, setPaymentMethodModal] = useState(null);
  const [selectedMetodoId, setSelectedMetodoId] = useState('');
  
  // Filter query states (se aplican automáticamente)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [usuarioFilter, setUsuarioFilter] = useState('');
  const [estado, setEstado] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const calcularTotal = (items, iva) => {
    const sub = (items || []).reduce((s, i) => s + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
    return sub + sub * Number(iva || 0);
  };

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  // Fetch unique payment methods
  useEffect(() => {
    getMetodosPago()
      .then(data => {
        setMetodosPago(data || []);
        if (data && data.length > 0) {
          setSelectedMetodoId(data[0].id);
        }
      })
      .catch(err => console.error('Error cargando métodos de pago:', err));
  }, []);

  // Fetch un-paginated full list to calculate stats and populate executive & client dropdowns
  const loadAllForStats = useCallback(async () => {
    try {
      const response = await getProformas({ page: 1, limit: 1000 });
      const list = response.data || [];
      setAllProformas(list);
      
      const total = list.length;
      const now = new Date();
      const totalEsteMes = list.filter(p => {
        if (!p.fecha) return false;
        const d = new Date(p.fecha);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      
      const pendientes = list.filter(p => p.estado === 'Pendiente').length;
      const aprobadas = list.filter(p => p.estado === 'Aprobada' || p.estado === 'Pagada').length;
      const montoTotal = list.reduce((sum, p) => sum + calcularTotal(p.items, p.iva), 0);
      setStats({ total, totalEsteMes, pendientes, aprobadas, montoTotal });

      // Unique executives
      const uniqueEjecutivos = Array.from(new Set(list.map(p => p.atiende).filter(Boolean))).sort();
      setEjecutivos(uniqueEjecutivos);

      // Unique clients
      const uniqueClientes = Array.from(new Set(list.map(p => p.cliente).filter(Boolean))).sort();
      setClientesList(uniqueClientes);
    } catch (e) {
      console.error('Error loading full stats/options list:', e);
    }
  }, []);

  // Initial load of stats
  useEffect(() => {
    loadAllForStats();
  }, [loadAllForStats]);

  // Main paginated query loader
  const load = useCallback(async () => {
    setLoading(true);
    try {
      let activeClienteId = '';
      if (clienteFilter) {
        const found = allProformas.find(p => p.cliente === clienteFilter);
        if (found) {
          activeClienteId = found.clienteId || '';
        }
      }

      const filters = {
        page,
        limit,
        search: search.trim(),
        estado: estado,
        usuario: usuarioFilter.trim(),
        fechaDesde: dateRange.start,
        fechaHasta: dateRange.end,
        clienteId: activeClienteId,
      };

      const [response, config] = await Promise.all([
        getProformas(filters),
        getConfiguracion().catch(() => null)
      ]);
      
      setProformas(response.data || []);
      setPagination(response.pagination || { total: 0, totalPages: 1 });
      setConfiguracion(config);
    } catch (e) {
      console.error(e);
      setProformas([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, clienteFilter, usuarioFilter, estado, dateRange, allProformas]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce de búsqueda general
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when page-size limit or filter states change
  useEffect(() => {
    setPage(1);
  }, [limit, search, clienteFilter, usuarioFilter, estado, dateRange]);

  const openNew = () => {
    navigate('/proformas/nueva');
  };

  const openEdit = (p) => {
    navigate(`/proformas/editar/${p.id}`);
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDialog(
      'Eliminar proforma',
      '¿Estás seguro de eliminar esta proforma? Esta acción no se puede deshacer.',
      { confirmLabel: 'Eliminar', type: 'danger' }
    );
    if (!isConfirmed) return;
    try {
      await deleteProforma(id);
      loadAllForStats();
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEstado = async (id, nuevoEstado) => {
    if (nuevoEstado === 'Aprobada' || nuevoEstado === 'Pagada') {
      setPaymentMethodModal({ id, nuevoEstado });
      if (metodosPago.length > 0) {
        setSelectedMetodoId(metodosPago[0].id);
      }
    } else {
      try {
        await updateProformaEstado(id, nuevoEstado);
        loadAllForStats();
        load();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const confirmEstadoWithMethod = async (e) => {
    e.preventDefault();
    if (!paymentMethodModal) return;
    try {
      await updateProformaEstado(paymentMethodModal.id, paymentMethodModal.nuevoEstado, selectedMetodoId);
      setPaymentMethodModal(null);
      loadAllForStats();
      load();
    } catch (err) {
      console.error(err);
      await alertDialog('Error', 'Error al actualizar el estado: ' + err.message, { type: 'warning' });
    }
  };

  const badgeStyle = (est) => {
    switch (est) {
      case 'Aprobada':
      case 'Pagada':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          dot: 'bg-emerald-500'
        };
      case 'Rechazada':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-100',
          dot: 'bg-rose-500'
        };
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-100',
          dot: 'bg-amber-500'
        };
    }
  };

  const getMockLongId = (id) => {
    const num = parseInt(id.replace(/\D/g, '')) || 0;
    return `123123${(210 + num).toString().padStart(3, '0')}`;
  };

  const getFechaHora = (p) => {
    // Format fecha to DD/MM/YYYY
    let fechaFmt = '—';
    if (p.fecha) {
      const parts = p.fecha.split('-');
      if (parts.length === 3) fechaFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
      else fechaFmt = p.fecha;
    }
    
    let horaFmt = '09:00';
    if (p.createdAt) {
      try {
        horaFmt = new Date(p.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch (e) {}
    }
    return { fecha: fechaFmt, hora: horaFmt };
  };

  const getVencimientoWarning = (vencimientoStr, est) => {
    if (!vencimientoStr || est === 'Aprobada' || est === 'Pagada') return null;
    const now = new Date();
    now.setHours(0,0,0,0);
    const venc = new Date(vencimientoStr);
    venc.setHours(0,0,0,0);
    const diffTime = venc.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Vencido hace ${Math.abs(diffDays)} días`, color: '#e11d48' };
    } else if (diffDays === 0) {
      return { text: 'Vence hoy', color: '#e11d48' };
    } else if (diffDays === 1) {
      return { text: 'Vence mañana', color: '#ea580c' };
    } else if (diffDays <= 3) {
      return { text: `Vence en ${diffDays} días`, color: '#ea580c' };
    } else {
      return { text: `Vence en ${diffDays} días`, color: '#64748b' };
    }
  };

  const formatVencimiento = (vStr) => {
    if (!vStr) return '—';
    const parts = vStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return vStr;
  };

  const getPageNumbers = () => {
    const totalPages = pagination.totalPages;
    const current = page;
    const pages = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (current >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const exportToCSV = () => {
    if (allProformas.length === 0) return;
    const headers = ['N. Proforma', 'ID', 'Fecha', 'Cliente', 'Usuario', 'Total', 'Estado', 'Vencimiento'];
    const rows = allProformas.map(p => [
      p.id,
      getMockLongId(p.id),
      p.fecha,
      p.cliente,
      p.atiende,
      calcularTotal(p.items, p.iva).toFixed(2),
      p.estado,
      p.vencimiento || '—'
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(rowArray => {
      let row = rowArray.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `proformas_luxes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hayFiltrosActivos = !!(
    search.trim() ||
    clienteFilter ||
    usuarioFilter ||
    estado ||
    dateRange.start ||
    dateRange.end
  );

  const setEstadoTab = (nextEstado) => {
    setEstado(nextEstado);
    setPage(1);
  };

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up proformas-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .proformas-page, .proformas-page * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .co-desktop-only { display: block; }
        .co-mobile-only { display: none; }
        @media (max-width: 768px) {
          .co-desktop-only { display: none !important; }
          .co-mobile-only { display: block !important; }
        }
        .co-search-dropdown {
          position: absolute;
          left: 0;
          right: 0;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 100;
        }
        .co-search-item {
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s ease;
          text-align: left;
          color: #334155;
        }
        .co-search-item:hover { background-color: #f8fafc; }
        .co-search-item:last-child { border-bottom: none; }
      `}</style>

      {/* Header — mismo lenguaje visual que Empleados */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Proformas</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Lista
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestión y seguimiento de cotizaciones a clientes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm whitespace-nowrap transition-opacity hover:opacity-90 shadow-sm w-full sm:w-auto bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva proforma
          </button>
        </div>
      </div>

      {/* KPI Cards — una fila en web; 2×2 solo en móvil */}
      <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-blue-600 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total proformas</p>
          <p className="text-base sm:text-lg font-bold text-blue-600 mt-1 tabular-nums">{stats.total}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Este mes <span className="text-blue-600 font-semibold">{stats.totalEsteMes}</span></p>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-amber-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
          <p className="text-base sm:text-lg font-bold text-amber-600 mt-1 tabular-nums">{stats.pendientes}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            <span className="text-amber-600 font-semibold">{stats.total > 0 ? ((stats.pendientes / stats.total) * 100).toFixed(1) : 0}%</span> del total
          </p>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aprobadas</p>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums">{stats.aprobadas}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            <span className="text-emerald-600 font-semibold">{stats.total > 0 ? ((stats.aprobadas / stats.total) * 100).toFixed(1) : 0}%</span> del total
          </p>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-indigo-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto total</p>
          <p className="text-base sm:text-lg font-bold text-indigo-600 mt-1 tabular-nums truncate" title={formatUSD(stats.montoTotal)}>
            {formatUSD(stats.montoTotal)}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">De todas las proformas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Búsqueda general</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="N.° proforma o cliente..."
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Vaciar búsqueda"
                  aria-label="Vaciar búsqueda"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <SearchableSelect
            label="Cliente"
            value={clienteFilter}
            onChange={setClienteFilter}
            options={clientesList}
            placeholder="Seleccionar cliente"
          />

          <SearchableSelect
            label="Usuario"
            value={usuarioFilter}
            onChange={setUsuarioFilter}
            options={ejecutivos}
            placeholder="Seleccionar usuario"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Rango de fechas</label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Seleccionar rango"
            />
          </div>
        </div>
      </div>

      {/* Filtros de estado — encima de Lista de Proformas */}
      <div className="flex items-center justify-start sm:justify-end gap-1.5 overflow-x-auto no-scrollbar w-full min-w-0">
        {[
          { key: '', label: 'Todas' },
          { key: 'Pendiente', label: 'Pendientes' },
          { key: 'Aprobada', label: 'Aprobadas' },
          { key: 'Rechazada', label: 'Rechazadas' },
        ].map((tab) => (
          <button
            key={tab.key || 'all'}
            type="button"
            onClick={() => setEstadoTab(tab.key)}
            className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              estado === tab.key
                ? 'bg-blue-900 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Lista de Proformas</h2>
            <span className="text-xs font-medium text-gray-400">{pagination.total} registros</span>
          </div>
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors self-start sm:self-auto"
          >
            <Download size={14} /> Exportar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
          </div>
        ) : (
          <>
            <div className="co-desktop-only">
              <div className="overflow-x-auto relative">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">N.° Proforma</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                      <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vencimiento</th>
                      <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proformas.map(p => {
                      const { fecha, hora } = getFechaHora(p);
                      const warning = getVencimientoWarning(p.vencimiento, p.estado);
                      const estStyle = badgeStyle(p.estado);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                              className="text-left bg-transparent border-0 p-0 cursor-pointer"
                            >
                              <span className="text-sm font-semibold text-blue-600 hover:text-blue-800 block">{p.id}</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">ID: {getMockLongId(p.id)}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-slate-800 block">{fecha}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">{hora}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-slate-900 block normal-case">{p.cliente}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              {p.clienteCedula ? `RUC: ${p.clienteCedula}` : p.telefono ? `Tel: ${p.telefono}` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">
                            {p.atiende || '—'}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                            {formatUSD(calcularTotal(p.items, p.iva))}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${estStyle.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${estStyle.dot}`} />
                              {p.estado === 'Pagada' ? 'Aprobada' : p.estado}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-slate-700 block">{formatVencimiento(p.vencimiento)}</span>
                            {warning && (
                              <span className="text-[10px] font-semibold block mt-0.5" style={{ color: warning.color }}>
                                {warning.text}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                                className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                title="Ver detalle"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreview(p)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                title="Ver / Imprimir PDF"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={!(isAdmin || (isVentasODisenador && p.estado === 'Rechazada'))}
                                onClick={() => openEdit(p)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                title="Editar proforma"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                disabled={!isAdmin}
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                title="Eliminar proforma"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {proformas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                          {hayFiltrosActivos ? 'No se encontraron proformas con los filtros aplicados' : 'No hay proformas registradas'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="co-mobile-only p-3 sm:p-4 space-y-3">
              {proformas.map(p => {
                const { fecha, hora } = getFechaHora(p);
                const warning = getVencimientoWarning(p.vencimiento, p.estado);
                const estStyle = badgeStyle(p.estado);
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                          className="text-left bg-transparent border-0 p-0 cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-blue-600">{p.id}</span>
                        </button>
                        <p className="text-[11px] text-slate-400 mt-0.5">ID: {getMockLongId(p.id)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${estStyle.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${estStyle.dot}`} />
                        {p.estado === 'Pagada' ? 'Aprobada' : p.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Cliente</span>
                        <span className="text-slate-800 font-semibold normal-case">{p.cliente}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Fecha</span>
                        <span className="text-slate-700 font-semibold">{fecha}</span>
                        <span className="text-slate-400 block">{hora}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Usuario</span>
                        <span className="text-slate-700 font-semibold">{p.atiende || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Total</span>
                        <span className="text-slate-900 font-bold">{formatUSD(calcularTotal(p.items, p.iva))}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Vencimiento</span>
                        <span className="text-slate-700 font-semibold">{formatVencimiento(p.vencimiento)}</span>
                        {warning && (
                          <span className="block text-[10px] font-semibold mt-0.5" style={{ color: warning.color }}>{warning.text}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                        className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-bold"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreview(p)}
                        className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100"
                        title="PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={!(isAdmin || (isVentasODisenador && p.estado === 'Rechazada'))}
                        onClick={() => openEdit(p)}
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 disabled:opacity-40"
                        title="Editar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 disabled:opacity-40"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {proformas.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-400">
                  {hayFiltrosActivos ? 'No se encontraron proformas con los filtros aplicados' : 'No hay proformas registradas'}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-400">Mostrar:</span>
                <select
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  className="px-2 py-1 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded-lg outline-none bg-white focus:border-blue-300 transition-colors cursor-pointer"
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>
              {pagination.total > 0 && (
                <span className="text-[11px] font-medium text-gray-400">
                  Página {page} de {Math.max(1, pagination.totalPages)} · {pagination.total} resultados
                </span>
              )}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Anterior
                </button>
                {getPageNumbers().map((pNum, idx) => (
                  <button
                    key={`${pNum}-${idx}`}
                    type="button"
                    disabled={pNum === '...'}
                    onClick={() => typeof pNum === 'number' && setPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                      pNum === page
                        ? 'bg-blue-600 text-white'
                        : pNum === '...'
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {preview && (
        <ProformaPDF
          proforma={preview}
          configuracion={configuracion}
          onClose={() => setPreview(null)}
        />
      )}

      {paymentMethodModal && (
        <ModalPortal>
          <>
            <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
              onClick={() => deferClose(() => setPaymentMethodModal(null))} />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-slide-up">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-base">Registrar Transacción</h3>
                  <button type="button" onClick={() => setPaymentMethodModal(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm bg-transparent border-0 cursor-pointer">✕</button>
                </div>
                <form onSubmit={confirmEstadoWithMethod} className="p-5 space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Para cambiar el estado de la proforma a <strong className="text-slate-700">{paymentMethodModal.nuevoEstado}</strong>, debes seleccionar el método de pago por el cual ingresa el dinero.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Método de Pago</label>
                    <select
                      value={selectedMetodoId}
                      onChange={e => setSelectedMetodoId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Seleccione un método...</option>
                      {metodosPago.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setPaymentMethodModal(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm">
                      Confirmar Cambio
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        </ModalPortal>
      )}
    </div>
  );
};
