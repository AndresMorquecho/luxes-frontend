import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { getProformas, deleteProforma, updateProformaEstado } from '../../application/proformasService';
import { ProformaPDF } from '../components/ProformaPDF';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { FileText, Clock, CheckCircle2, DollarSign, Search, Trash2, Download, Eye, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';

const ESTADOS = ['Pendiente', 'Aprobada', 'Rechazada'];

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
      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">{label}</label>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer flex justify-between items-center min-h-[38px]"
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
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  
  // KPIs & Dynamic Filter Options
  const [stats, setStats] = useState({ total: 0, totalEsteMes: 0, pendientes: 0, aprobadas: 0, montoTotal: 0 });
  const [ejecutivos, setEjecutivos] = useState([]);
  const [clientesList, setClientesList] = useState([]);

  // Métodos de Pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [paymentMethodModal, setPaymentMethodModal] = useState(null);
  const [selectedMetodoId, setSelectedMetodoId] = useState('');
  
  // Committed Filter query states
  const [search, setSearch] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [usuarioFilter, setUsuarioFilter] = useState('');
  const [estado, setEstado] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Input control states (for explicit Apply/Clear buttons)
  const [localSearch, setLocalSearch] = useState('');
  const [localCliente, setLocalCliente] = useState('');
  const [localExecutive, setLocalExecutive] = useState('');
  const [localEstado, setLocalEstado] = useState('');
  const [localDateRange, setLocalDateRange] = useState({ start: '', end: '' });
  
  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const calcularTotal = (items, iva) => {
    const sub = (items || []).reduce((s, i) => s + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
    return sub + sub * Number(iva || 0);
  };

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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
      alert('Error al actualizar el estado: ' + err.message);
    }
  };

  const aplicarFiltros = () => {
    setSearch(localSearch);
    setClienteFilter(localCliente);
    setUsuarioFilter(localExecutive);
    setEstado(localEstado);
    setDateRange(localDateRange);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setLocalSearch('');
    setLocalCliente('');
    setLocalExecutive('');
    setLocalEstado('');
    setLocalDateRange({ start: '', end: '' });

    setSearch('');
    setClienteFilter('');
    setUsuarioFilter('');
    setEstado('');
    setDateRange({ start: '', end: '' });
    setPage(1);
  };

  // UI Helper functions
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

  return (
    <div className="pb-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Proformas</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona y da seguimiento a todas las proformas de tus clientes.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm shadow-blue-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Proforma
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {/* Total Proformas */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <FileText size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Total proformas</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1 leading-none">{stats.total}</span>
            <span className="block text-xs text-slate-500 mt-1.5 font-medium">
              Este mes <span className="text-blue-600 font-bold ml-1">{stats.totalEsteMes}</span>
            </span>
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1 leading-none">{stats.pendientes}</span>
            <span className="block text-xs text-slate-500 mt-1.5 font-medium">
              <span className="text-orange-600 font-bold mr-1">
                {stats.total > 0 ? ((stats.pendientes / stats.total) * 100).toFixed(1) : 0}%
              </span> del total
            </span>
          </div>
        </div>

        {/* Aprobadas */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Aprobadas</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1 leading-none">{stats.aprobadas}</span>
            <span className="block text-xs text-slate-500 mt-1.5 font-medium">
              <span className="text-emerald-600 font-bold mr-1">
                {stats.total > 0 ? ((stats.aprobadas / stats.total) * 100).toFixed(1) : 0}%
              </span> del total
            </span>
          </div>
        </div>

        {/* Monto Total */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Monto total</span>
            <span className="block text-xl font-bold text-slate-800 mt-1 leading-none truncate" title={formatUSD(stats.montoTotal)}>
              {formatUSD(stats.montoTotal)}
            </span>
            <span className="block text-xs text-slate-400 mt-1.5 font-medium">De todas las proformas</span>
          </div>
        </div>
      </div>

      {/* Filters Container */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 flex-1">
            {/* Búsqueda general */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Búsqueda general</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={localSearch} 
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="Buscar por N.° proforma o cliente..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all min-h-[38px]" 
                />
              </div>
            </div>

            {/* Cliente */}
            <SearchableSelect
              label="Cliente"
              value={localCliente}
              onChange={setLocalCliente}
              options={clientesList}
              placeholder="Seleccionar cliente"
            />

            {/* Usuario */}
            <SearchableSelect
              label="Usuario"
              value={localExecutive}
              onChange={setLocalExecutive}
              options={ejecutivos}
              placeholder="Seleccionar usuario"
            />

            {/* Estado */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Estado</label>
              <select 
                value={localEstado} 
                onChange={e => setLocalEstado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all min-h-[38px]"
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Rango de fechas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Rango de fechas</label>
              <DateRangePicker
                value={localDateRange}
                onChange={setLocalDateRange}
                placeholder="Seleccionar rango"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto justify-end xl:mb-0.5">
            <button 
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-2 px-5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors w-full sm:w-auto min-h-[38px]"
            >
              Limpiar filtros
            </button>
            <button 
              onClick={aplicarFiltros}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm shadow-blue-100 w-full sm:w-auto min-h-[38px]"
            >
              <Search size={15} /> Aplicar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Table Section Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4 px-1">
        <span className="text-sm font-semibold text-slate-500">
          {pagination.total} proforma{pagination.total !== 1 ? 's' : ''} encontrada{pagination.total !== 1 ? 's' : ''}
        </span>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download size={14} /> Exportar
          </button>
          
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Mostrar</span>
            <select 
              value={limit} 
              onChange={e => setLimit(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>por página</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <>
            <div className="co-desktop-only">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/70">
                      <th className="text-left px-6 py-4">N.° Proforma</th>
                      <th className="text-left px-6 py-4">Fecha</th>
                      <th className="text-left px-6 py-4">Cliente</th>
                      <th className="text-left px-6 py-4">Usuario</th>
                      <th className="text-right px-6 py-4">Total</th>
                      <th className="text-center px-6 py-4">Estado</th>
                      <th className="text-left px-6 py-4">Vencimiento</th>
                      <th className="text-right px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proformas.map(p => {
                      const { fecha, hora } = getFechaHora(p);
                      const warning = getVencimientoWarning(p.vencimiento, p.estado);
                      const estStyle = badgeStyle(p.estado);
                      return (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          {/* N. PROFORMA */}
                          <td className="px-6 py-4.5">
                            <span 
                              onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                              className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer block text-sm"
                            >
                              {p.id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">ID: {getMockLongId(p.id)}</span>
                          </td>

                          {/* FECHA */}
                          <td className="px-6 py-4.5">
                            <span className="font-semibold text-slate-800 block text-sm">{fecha}</span>
                            <span className="text-xs text-slate-400 block mt-1 font-medium">{hora}</span>
                          </td>

                          {/* CLIENTE */}
                          <td className="px-6 py-4.5">
                            <span className="font-semibold text-slate-800 block text-sm">{p.cliente}</span>
                            <span className="text-xs text-slate-400 block mt-1 font-medium">
                              {p.clienteCedula ? `RUC: ${p.clienteCedula}` : p.telefono ? `Tel: ${p.telefono}` : '—'}
                            </span>
                          </td>

                          {/* EJECUTIVO */}
                          <td className="px-6 py-4.5 text-slate-600 font-medium text-sm">
                            {p.atiende || '—'}
                          </td>

                          {/* TOTAL */}
                          <td className="px-6 py-4.5 text-right font-bold text-slate-800 text-base">
                            {formatUSD(calcularTotal(p.items, p.iva))}
                          </td>

                          {/* ESTADO */}
                          <td className="px-6 py-4.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${estStyle.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${estStyle.dot}`} />
                              {p.estado === 'Pagada' ? 'Aprobada' : p.estado}
                            </span>
                          </td>

                          {/* VENCIMIENTO */}
                          <td className="px-6 py-4.5">
                            <span className="font-semibold text-slate-700 block text-sm">{formatVencimiento(p.vencimiento)}</span>
                            {warning && (
                              <span className="text-[10px] font-bold block mt-1" style={{ color: warning.color }}>
                                {warning.text}
                              </span>
                            )}
                          </td>

                          {/* ACCIONES */}
                          <td className="px-6 py-4.5 relative">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors hover:border-slate-300"
                                title="Ver Detalle / Aprobar"
                              >
                                <Eye size={12} className="text-blue-500" /> Ver detalle
                              </button>
                              
                              <button 
                                onClick={() => setPreview(p)}
                                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                title="Ver / Imprimir PDF"
                              >
                                <Download size={14} />
                              </button>
                              
                              <button 
                                disabled={!(isAdmin || (isVentasODisenador && p.estado === 'Rechazada'))}
                                onClick={() => openEdit(p)}
                                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                                title="Editar proforma"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                              </button>

                              <button 
                                disabled={!isAdmin}
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
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
                        <td colSpan={8} className="text-center py-20 text-slate-400">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm font-medium">
                            {hayFiltrosActivos ? 'No se encontraron proformas con los filtros aplicados' : 'No hay proformas registradas'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards for Proformas */}
            <div className="co-mobile-only p-4">
              <div className="flex flex-col gap-4">
                {proformas.map(p => {
                  const { fecha, hora } = getFechaHora(p);
                  const warning = getVencimientoWarning(p.vencimiento, p.estado);
                  const estStyle = badgeStyle(p.estado);
                  return (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div>
                          <span 
                            onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                            className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer text-sm"
                          >
                            {p.id}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">ID: {getMockLongId(p.id)}</span>
                        </div>
                        <span className="text-slate-400 text-xs font-semibold">{fecha}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cliente</span>
                          <span className="font-bold text-slate-800 text-sm">{p.cliente}</span>
                          {p.clienteCedula && <span className="text-xs text-slate-500 font-mono block mt-0.5">RUC/CC: {p.clienteCedula}</span>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Usuario</span>
                            <span className="text-xs text-slate-600 font-semibold">{p.atiende || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hora</span>
                            <span className="text-xs text-slate-600 font-semibold">{hora}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                          <span className="text-base font-extrabold text-slate-800">{formatUSD(calcularTotal(p.items, p.iva))}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${estStyle.bg}`}>
                            <span className={`w-1 h-1 rounded-full ${estStyle.dot}`} />
                            {p.estado === 'Pagada' ? 'Aprobada' : p.estado}
                          </span>
                          {warning && (
                            <span className="text-[9px] font-bold" style={{ color: warning.color }}>
                              {warning.text}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button 
                          onClick={() => navigate(`/proformas/detalle/${p.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Eye size={12} className="text-blue-500" /> Ver detalle
                        </button>
                        
                        <button 
                          onClick={() => setPreview(p)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                          title="Ver / Imprimir PDF"
                        >
                          <Download size={14} />
                        </button>
                        
                        <button 
                          disabled={!(isAdmin || (isVentasODisenador && p.estado === 'Rechazada'))}
                          onClick={() => openEdit(p)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          title="Editar proforma"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>

                        <button 
                          disabled={!isAdmin}
                          onClick={() => handleDelete(p.id)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          title="Eliminar proforma"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer Pagination */}
        {pagination.totalPages > 1 && !loading && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between flex-wrap gap-4">
            <span className="text-xs font-bold text-slate-400">
              Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, pagination.total)} de {pagination.total} resultados
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white transition-colors disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              
              {getPageNumbers().map((pNum, idx) => (
                <button
                  key={idx}
                  disabled={pNum === '...'}
                  onClick={() => setPage(pNum)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    pNum === page 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-100' 
                      : pNum === '...' 
                        ? 'text-slate-400 cursor-default' 
                        : 'border border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button 
                disabled={page >= pagination.totalPages} 
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white transition-colors disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
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
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base">Registrar Transacción</h3>
                <button type="button" onClick={() => setPaymentMethodModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>
              <form onSubmit={confirmEstadoWithMethod} className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para cambiar el estado de la proforma a <strong className="text-slate-700">{paymentMethodModal.nuevoEstado}</strong>, debes seleccionar el método de pago por el cual ingresa el dinero.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Método de Pago</label>
                  <select 
                    value={selectedMetodoId} 
                    onChange={e => setSelectedMetodoId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione un método...</option>
                    {metodosPago.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setPaymentMethodModal(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-blue-200">
                    Confirmar Cambio
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
        </ModalPortal>
      )}

      <style>{`
        .co-desktop-only { display: block; }
        .co-mobile-only { display: none; }
        @media (max-width: 768px) {
          .co-desktop-only { display: none !important; }
          .co-mobile-only { display: block !important; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
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
        .co-search-item:hover {
          background-color: #f8fafc;
        }
        .co-search-item:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};
