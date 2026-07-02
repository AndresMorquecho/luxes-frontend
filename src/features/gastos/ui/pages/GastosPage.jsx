import React, { useEffect, useState } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { 
  getGastos, saveGasto, deleteGasto, CATEGORIAS,
  getMetodosPago, getCierrePreview, saveCierre, getCierres, getFinancialDashboard,
  getVehiculos, getVehiculoDetails, saveVehiculo, deleteVehiculo,
  addMantenimiento, updateMantenimiento, deleteMantenimiento 
} from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { 
  Car, Wrench, Calendar, DollarSign, Trash2, Edit, Plus, 
  ArrowLeft, AlertTriangle, CheckCircle, Clock, User, 
  Settings, Key, AlertCircle, Info, RefreshCw, FileText,
  ClipboardCheck, BarChart3, TrendingUp, Percent, PieChart
} from 'lucide-react';

const EMPTY_FORM = { concepto: '', categoria: 'oficina', fecha: new Date().toISOString().split('T')[0], monto: 0, proveedor: '', notas: '', metodoPagoId: '' };

const EMPTY_VEHICULO_FORM = { placa: '', marca: '', modelo: '', anio: '', color: '', kilometraje: '', responsable: '', notas: '', estado: 'activo' };

const EMPTY_MAINT_FORM = { tipo: 'Cambio de Aceite', descripcion: '', fechaRealizado: new Date().toISOString().split('T')[0], fechaProxima: '', kilometraje: '', kmProximo: '', monto: 0, proveedor: '', notas: '', metodoPagoId: '' };

const CAT_BADGES = {
  oficina: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Oficina' },
  mantenimiento: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Mantenimiento' },
  servicios: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', label: 'Servicios' },
  logistica: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Logística' },
  vehiculos: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Vehículos' },
  varios: { bg: 'rgba(236,72,153,0.1)', color: '#ec4899', label: 'Varios' },
};

const fmt = (n) => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const PAGE_META = {
  gastos: {
    title: 'Control de Gastos',
    subtitle: 'Control de egresos, compras y mantenimiento central de la empresa',
  },
  vehiculos: {
    title: 'Gestión de Flota',
    subtitle: 'Supervisión de vehículos corporativos, kilometrajes y alertas preventivas',
  },
  cierre: {
    title: 'Cierre de Caja',
    subtitle: 'Arqueo de caja, ingresos, egresos y cierres históricos',
  },
  reportes: {
    title: 'Reportes Financieros',
    subtitle: 'Análisis de rentabilidad, margen y flujos monetarios',
  },
};

// Helpers para alertas de mantenimiento
const getAlertStatus = (maint, currentKm, kmLimit, monthsLimit) => {
  if (!maint) {
    return { status: 'warning', message: 'Sin registros. Se recomienda programar mantenimiento.', lastInfo: 'Nunca' };
  }
  
  const kmSince = currentKm - (maint.kilometraje || 0);
  const dateRealizado = new Date(maint.fechaRealizado);
  const diffTime = Math.abs(new Date() - dateRealizado);
  const monthsSince = diffTime / (1000 * 60 * 60 * 24 * 30.4375);

  const lastInfo = `${maint.fechaRealizado.split('T')[0]} (${maint.kilometraje || 0} km)`;

  // Validaciones críticas explícitas
  if (maint.kmProximo && currentKm >= maint.kmProximo) {
    return { status: 'critical', message: `Superado kilometraje recomendado (${maint.kmProximo} km).`, lastInfo };
  }
  if (maint.fechaProxima && new Date() >= new Date(maint.fechaProxima)) {
    return { status: 'critical', message: `Fecha recomendada vencida (${maint.fechaProxima.split('T')[0]}).`, lastInfo };
  }

  // Límites genéricos
  if (kmSince >= kmLimit) {
    return { status: 'warning', message: `Recomendado. ${kmSince.toLocaleString()} km acumulados (Límite: ${kmLimit} km).`, lastInfo };
  }

  if (monthsSince >= monthsLimit) {
    return { status: 'warning', message: `Recomendado. ${Math.round(monthsSince)} meses transcurridos (Límite: ${monthsLimit} meses).`, lastInfo };
  }

  return { status: 'ok', message: 'Al día.', lastInfo };
};

const computeVehicleAlerts = (vehiculo) => {
  const list = vehiculo.mantenimientos || [];
  
  const oilMaint = list
    .filter(m => m.tipo === 'Cambio de Aceite' || m.tipo.toLowerCase().includes('aceite'))
    .sort((a, b) => new Date(b.fechaRealizado) - new Date(a.fechaRealizado))[0];
  
  const tiresMaint = list
    .filter(m => m.tipo === 'Cambio de Llantas' || m.tipo.toLowerCase().includes('llanta'))
    .sort((a, b) => new Date(b.fechaRealizado) - new Date(a.fechaRealizado))[0];
    
  const brakesMaint = list
    .filter(m => m.tipo === 'Frenos' || m.tipo.toLowerCase().includes('freno'))
    .sort((a, b) => new Date(b.fechaRealizado) - new Date(a.fechaRealizado))[0];

  const currentKm = vehiculo.kilometraje || 0;

  const oilAlert = getAlertStatus(oilMaint, currentKm, 5000, 6);
  const tiresAlert = getAlertStatus(tiresMaint, currentKm, 40000, 24);
  const brakesAlert = getAlertStatus(brakesMaint, currentKm, 20000, 12);

  const hasWarning = oilAlert.status !== 'ok' || tiresAlert.status !== 'ok' || brakesAlert.status !== 'ok';

  return { oilAlert, tiresAlert, brakesAlert, hasWarning };
};

const RenderEvolucionChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-xs text-slate-400 italic py-6 text-center">Sin datos históricos suficientes.</div>;
  const height = 180;
  const width = 600;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  
  const maxVal = Math.max(...data.map(d => Math.max(d.ingresos, d.egresos)), 1000);
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;
  
  const colCount = data.length;
  const colGroupWidth = chartWidth / colCount;
  const barWidth = colGroupWidth * 0.35;
  const gap = colGroupWidth * 0.08;
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible select-none">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = paddingTop + chartHeight * (1 - p);
        const valLabel = '$' + Number(maxVal * p).toLocaleString(undefined, { maximumFractionDigits: 0 });
        return (
          <g key={i}>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4 4" />
            <text x={paddingLeft - 8} y={y} textAnchor="end" dominantBaseline="central" fontSize={9} fontWeight={600} fill="#94a3b8">{valLabel}</text>
          </g>
        );
      })}
      
      {data.map((d, i) => {
        const groupX = paddingLeft + i * colGroupWidth;
        const ingBarHeight = (d.ingresos / maxVal) * chartHeight;
        const egrBarHeight = (d.egresos / maxVal) * chartHeight;
        
        const ingY = paddingTop + chartHeight - ingBarHeight;
        const egrY = paddingTop + chartHeight - egrBarHeight;
        
        const ingX = groupX + gap;
        const egrX = groupX + gap + barWidth;
        
        return (
          <g key={i}>
            <rect 
              x={ingX} 
              y={ingY} 
              width={barWidth} 
              height={Math.max(2, ingBarHeight)} 
              rx={3} 
              fill="#10b981" 
              className="transition-all duration-300 hover:opacity-80 cursor-pointer" 
            />
            <rect 
              x={egrX} 
              y={egrY} 
              width={barWidth} 
              height={Math.max(2, egrBarHeight)} 
              rx={3} 
              fill="#ef4444" 
              className="transition-all duration-300 hover:opacity-80 cursor-pointer" 
            />
            <text 
              x={groupX + colGroupWidth / 2} 
              y={height - 10} 
              textAnchor="middle" 
              fontSize={10} 
              fontWeight={700} 
              fill="#64748b"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      
      <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#e2e8f0" strokeWidth={1.5} />
    </svg>
  );
};

const RenderCategoriasChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-xs text-slate-400 italic py-6 text-center">Sin gastos registrados en el periodo.</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.max(3, (d.value / max) * 100);
        const catConfig = CAT_BADGES[d.label] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: d.label.charAt(0).toUpperCase() + d.label.slice(1) };
        return (
          <div key={d.label} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catConfig.color }} />
                {catConfig.label}
              </span>
              <span className="text-slate-800 font-bold">{fmt(d.value)}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ width: `${pct}%`, backgroundColor: catConfig.color }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const GastosPage = ({ defaultTab = 'gastos' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'gastos' | 'vehiculos' | 'cierre' | 'reportes'

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // --- MÉTODOS DE PAGO ---
  const [metodosPago, setMetodosPago] = useState([]);

  // --- ESTADOS GASTOS ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;

  // --- ESTADOS VEHÍCULOS ---
  const [vehiculos, setVehiculos] = useState([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);
  const [vehiculoFormOpen, setVehiculoFormOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState(null);
  const [vehiculoForm, setVehiculoForm] = useState(EMPTY_VEHICULO_FORM);
  const [savingVehiculo, setSavingVehiculo] = useState(false);

  // --- ESTADOS MANTENIMIENTOS ---
  const [maintFormOpen, setMaintFormOpen] = useState(false);
  const [editingMaint, setEditingMaint] = useState(null);
  const [maintForm, setMaintForm] = useState(EMPTY_MAINT_FORM);
  const [savingMaint, setSavingMaint] = useState(false);

  // --- ESTADOS CIERRE DE CAJA ---
  const [cierreHistory, setCierreHistory] = useState([]);
  const [loadingCierreHistory, setLoadingCierreHistory] = useState(false);
  const [cierrePreview, setCierrePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cierreDates, setCierreDates] = useState({
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0]
  });
  const [cierreObservaciones, setCierreObservaciones] = useState('');
  const [savingCierre, setSavingCierre] = useState(false);

  // --- ESTADOS REPORTES ---
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [metodosReport, setMetodosReport] = useState([]);
  const [loadingMetodosReport, setLoadingMetodosReport] = useState(false);
  const [reportDates, setReportDates] = useState({
    desde: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })(),
    hasta: new Date().toISOString().split('T')[0]
  });

  // --- CARGA DE DATOS ---
  const loadGastosData = async () => {
    setLoading(true);
    try {
      const data = await getGastos();
      setItems(data);
    } catch (err) {
      toast.error('Error al cargar gastos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVehiculosData = async () => {
    setLoadingVehiculos(true);
    try {
      const data = await getVehiculos();
      setVehiculos(data);
    } catch (err) {
      toast.error('Error al cargar vehículos: ' + err.message);
    } finally {
      setLoadingVehiculos(false);
    }
  };

  const loadCierreHistory = async () => {
    setLoadingCierreHistory(true);
    try {
      const data = await getCierres();
      setCierreHistory(data || []);
    } catch (err) {
      toast.error('Error al cargar historial de cierres: ' + err.message);
    } finally {
      setLoadingCierreHistory(false);
    }
  };

  const loadFinancialReport = async () => {
    setLoadingReport(true);
    setLoadingMetodosReport(true);
    try {
      const [data, metodos] = await Promise.all([
        getFinancialDashboard(reportDates.desde, reportDates.hasta),
        getMetodosPago(reportDates.desde, reportDates.hasta)
      ]);
      setReportData(data);
      setMetodosReport(metodos || []);
    } catch (err) {
      toast.error('Error al cargar reportes financieros: ' + err.message);
    } finally {
      setLoadingReport(false);
      setLoadingMetodosReport(false);
    }
  };

  const handlePreviewCierre = async () => {
    setLoadingPreview(true);
    try {
      const data = await getCierrePreview(cierreDates.desde, cierreDates.hasta);
      setCierrePreview(data);
    } catch (err) {
      toast.error('Error al generar previsualización de cierre: ' + err.message);
      setCierrePreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveCierre = async () => {
    if (!cierrePreview) return;
    if (!window.confirm('¿Confirmar registro de cierre de caja para el rango seleccionado?')) return;
    setSavingCierre(true);
    try {
      await saveCierre({
        fechaInicio: cierrePreview.fechaInicio,
        fechaFin: cierrePreview.fechaFin,
        totalIngresos: cierrePreview.totalIngresos,
        totalEgresos: cierrePreview.totalEgresos,
        metodosDetalle: cierrePreview.metodosDetalle,
        observaciones: cierreObservaciones,
      });
      toast.success('Cierre de caja guardado con éxito');
      setCierreObservaciones('');
      setCierrePreview(null);
      loadCierreHistory();
    } catch (err) {
      toast.error('Error al registrar cierre de caja: ' + err.message);
    } finally {
      setSavingCierre(false);
    }
  };

  // Carga inicial de métodos de pago
  useEffect(() => {
    getMetodosPago()
      .then(data => {
        setMetodosPago(data || []);
      })
      .catch(err => {
        console.error('Error al cargar métodos de pago:', err);
      });
  }, []);

  // Recarga al cambiar de tab
  useEffect(() => {
    if (activeTab === 'gastos') {
      loadGastosData();
    } else if (activeTab === 'vehiculos') {
      loadVehiculosData();
    } else if (activeTab === 'cierre') {
      loadCierreHistory();
    }
  }, [activeTab]);

  // Recarga de previsualización al cambiar fechas
  useEffect(() => {
    if (activeTab === 'cierre' && cierreDates.desde && cierreDates.hasta) {
      handlePreviewCierre();
    }
  }, [cierreDates, activeTab]);

  // Recarga de reportes al cambiar fechas
  useEffect(() => {
    if (activeTab === 'reportes' && reportDates.desde && reportDates.hasta) {
      loadFinancialReport();
    }
  }, [reportDates, activeTab]);

  // Si hay un vehículo seleccionado, recargar sus detalles cuando se requiera
  const refreshSelectedVehiculo = async (id) => {
    try {
      const details = await getVehiculoDetails(id);
      setSelectedVehiculo(details);
    } catch (err) {
      toast.error('Error al actualizar datos del vehículo: ' + err.message);
    }
  };

  // --- MANEJADORES GASTOS ---
  const openNewGasto = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
    });
    setFormOpen(true);
  };

  const openEditGasto = (g) => {
    setEditing(g);
    setForm({
      ...g,
      fecha: g.fecha ? g.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      monto: Number(g.monto),
      metodoPagoId: g.metodoPagoId || (metodosPago.length > 0 ? metodosPago[0].id : ''),
    });
    setFormOpen(true);
  };

  const handleGastoChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleSaveGasto = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveGasto(form);
      toast.success(editing ? 'Gasto actualizado correctamente' : 'Gasto registrado con éxito');
      deferClose(() => {
        setFormOpen(false);
        setSaving(false);
      });
      loadGastosData();
    } catch (err) {
      toast.error('No se pudo guardar el gasto: ' + err.message);
      setSaving(false);
    }
  };

  const handleDeleteGasto = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto? Si está asociado a un mantenimiento, se eliminará el registro de mantenimiento correspondiente.')) return;
    try {
      await deleteGasto(id);
      toast.success('Gasto eliminado');
      loadGastosData();
      if (selectedVehiculo) {
        refreshSelectedVehiculo(selectedVehiculo.id);
      }
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  // --- MANEJADORES VEHÍCULOS ---
  const openNewVehiculo = () => {
    setEditingVehiculo(null);
    setVehiculoForm(EMPTY_VEHICULO_FORM);
    setVehiculoFormOpen(true);
  };

  const openEditVehiculo = (v) => {
    setEditingVehiculo(v);
    setVehiculoForm({
      id: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio != null && v.anio !== '' ? String(v.anio) : '',
      color: v.color || '',
      kilometraje: v.kilometraje != null && v.kilometraje !== '' ? String(v.kilometraje) : '',
      responsable: v.responsable || '',
      notas: v.notas || '',
      estado: v.estado || 'activo',
    });
    setVehiculoFormOpen(true);
  };

  const handleVehiculoChange = (e) => {
    const { name, value } = e.target;
    setVehiculoForm(prev => ({ ...prev, [name]: value }));
  };

  const buildVehiculoPayload = (form) => ({
    ...form,
    anio: form.anio === '' ? '' : parseInt(String(form.anio), 10) || '',
    kilometraje: form.kilometraje === '' ? 0 : parseInt(String(form.kilometraje), 10) || 0,
  });

  const handleSaveVehiculo = async (e) => {
    e.preventDefault();
    setSavingVehiculo(true);
    try {
      await saveVehiculo(buildVehiculoPayload(vehiculoForm));
      toast.success(editingVehiculo ? 'Vehículo actualizado correctamente' : 'Vehículo registrado con éxito');
      deferClose(() => {
        setVehiculoFormOpen(false);
        setSavingVehiculo(false);
      });
      loadVehiculosData();
      if (selectedVehiculo && selectedVehiculo.id === vehiculoForm.id) {
        refreshSelectedVehiculo(selectedVehiculo.id);
      }
    } catch (err) {
      toast.error('Error al guardar vehículo: ' + err.message);
      setSavingVehiculo(false);
    }
  };

  const handleDeleteVehiculo = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este vehículo? Esto eliminará todos sus mantenimientos y sus gastos asociados en la contabilidad.')) return;
    try {
      await deleteVehiculo(id);
      toast.success('Vehículo eliminado con éxito');
      setSelectedVehiculo(null);
      loadVehiculosData();
    } catch (err) {
      toast.error('Error al eliminar vehículo: ' + err.message);
    }
  };

  // --- MANEJADORES MANTENIMIENTOS ---
  const openNewMaint = () => {
    setEditingMaint(null);
    setMaintForm({
      ...EMPTY_MAINT_FORM,
      kilometraje: selectedVehiculo.kilometraje || '',
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
    });
    setMaintFormOpen(true);
  };

  const openEditMaint = (m) => {
    setEditingMaint(m);
    setMaintForm({
      id: m.id,
      tipo: m.tipo,
      descripcion: m.descripcion || '',
      fechaRealizado: m.fechaRealizado ? m.fechaRealizado.split('T')[0] : new Date().toISOString().split('T')[0],
      fechaProxima: m.fechaProxima ? m.fechaProxima.split('T')[0] : '',
      kilometraje: m.kilometraje || '',
      kmProximo: m.kmProximo || '',
      monto: Number(m.monto),
      proveedor: m.proveedor || '',
      notas: m.notas || '',
      metodoPagoId: m.metodoPagoId || (metodosPago.length > 0 ? metodosPago[0].id : ''),
    });
    setMaintFormOpen(true);
  };

  const handleMaintChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setMaintForm(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleSaveMaint = async (e) => {
    e.preventDefault();
    setSavingMaint(true);
    try {
      if (editingMaint) {
        await updateMantenimiento(editingMaint.id, maintForm);
        toast.success('Mantenimiento actualizado');
      } else {
        await addMantenimiento(selectedVehiculo.id, maintForm);
        toast.success('Mantenimiento registrado y guardado como gasto');
      }
      deferClose(() => {
        setMaintFormOpen(false);
        setSavingMaint(false);
      });
      refreshSelectedVehiculo(selectedVehiculo.id);
    } catch (err) {
      toast.error('Error al guardar mantenimiento: ' + err.message);
      setSavingMaint(false);
    }
  };

  const handleDeleteMaint = async (maintId) => {
    if (!window.confirm('¿Eliminar este mantenimiento? Esto también eliminará su entrada asociada en la lista de gastos generales.')) return;
    try {
      await deleteMantenimiento(maintId);
      toast.success('Registro de mantenimiento eliminado');
      refreshSelectedVehiculo(selectedVehiculo.id);
    } catch (err) {
      toast.error('Error al eliminar mantenimiento: ' + err.message);
    }
  };

  // --- FILTRADOS Y PAGINACIÓN DE GASTOS ---
  const q = search.toLowerCase();
  const filteredAll = items.filter(g =>
    !q || g.concepto.toLowerCase().includes(q) ||
    g.categoria.includes(q) || g.proveedor?.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { setPage(1); }, [search]);

  // --- TOTALES KPI GASTOS ---
  const totalMes = items.filter(g => {
    const d = new Date(g.fecha);
    const ahora = new Date();
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  }).reduce((s, g) => s + Number(g.monto), 0);

  const totales = {
    total: items.length,
    totalMonto: items.reduce((s, g) => s + Number(g.monto), 0),
    promedio: items.length ? (items.reduce((s, g) => s + Number(g.monto), 0) / items.length) : 0,
    totalMes,
  };

  // --- TOTALES KPI VEHÍCULOS ---
  const vehiculosConAlertas = vehiculos.filter(v => computeVehicleAlerts(v).hasWarning).length;
  const totalGastosVehiculos = vehiculos.reduce((sum, v) => 
    sum + (v.mantenimientos || []).reduce((s, m) => s + Number(m.monto), 0)
  , 0);

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .ga-card {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(37,99,235,0.04), 0 1px 2px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .ga-tab-bar {
          display: flex;
          gap: 4px;
          background: rgba(241,245,249,0.7);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(226,232,240,0.8);
          width: max-content;
          margin-bottom: 24px;
        }

        .ga-tab-btn {
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ga-tab-btn.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }

        .ga-btn-primary {
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
          box-shadow: 0 4px 14px rgba(37,99,235,0.25);
          letter-spacing: 0.01em;
        }
        .ga-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35); }
        .ga-btn-primary:active { transform: translateY(0); }
        .ga-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ga-btn-secondary {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .ga-btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }

        .ga-btn-ghost {
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
        .ga-btn-ghost:hover { background: rgba(241,245,249,0.8); color: #475569; }

        .ga-input {
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
        }
        .ga-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.08); background: #fff; }
        .ga-input::placeholder { color: #94a3b8; }

        .ga-tr { transition: background 0.15s ease; }
        .ga-tr:hover td { background: rgba(59,130,246,0.015); }

        .maint-alert-card {
          border-radius: 16px;
          padding: 16px;
          border: 1px solid;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .maint-alert-card.ok {
          background: rgba(16,185,129,0.04);
          border-color: rgba(16,185,129,0.15);
          color: #065f46;
        }
        .maint-alert-card.warning {
          background: rgba(245,158,11,0.04);
          border-color: rgba(245,158,11,0.15);
          color: #92400e;
        }
        .maint-alert-card.critical {
          background: rgba(239,68,68,0.04);
          border-color: rgba(239,68,68,0.15);
          color: #991b1b;
        }

        .maint-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 9999px;
          width: max-content;
        }
        .maint-badge.ok { background: rgba(16,185,129,0.15); color: #10b981; }
        .maint-badge.warning { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .maint-badge.critical { background: rgba(239,68,68,0.15); color: #ef4444; }

        @keyframes ga-modal-in {
          from { transform: scale(0.96) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-ga-modal-in { animation: ga-modal-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
        @media (min-width: 768px) {
          .cc-desktop-table { display: block; }
          .cc-mobile-cards { display: none; }
        }
        @media (max-width: 767px) {
          .cc-desktop-table { display: none; }
          .cc-mobile-cards { display: flex; flex-direction: column; gap: 12px; padding: 12px 0; }
          .cc-mobile-card {
            background: #ffffff;
            border: 1px solid #f1f5f9;
            border-radius: 14px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
          }
        }
      `}</style>

      {/* Título Principal */}
      <div className="ga-card px-6 py-5 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            {PAGE_META[activeTab]?.title || 'Finanzas'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">
            {PAGE_META[activeTab]?.subtitle || ''}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'gastos' ? (
            <button onClick={openNewGasto} className="ga-btn-primary">
              <Plus size={16} />
              Registrar Gasto
            </button>
          ) : activeTab === 'vehiculos' && !selectedVehiculo ? (
            <button onClick={openNewVehiculo} className="ga-btn-primary">
              <Plus size={16} />
              Registrar Vehículo
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs (Solo visibles en Gastos Operativos y Control de Vehículos) */}
      {(activeTab === 'gastos' || activeTab === 'vehiculos') && (
        <div className="ga-tab-bar">
          <button 
            onClick={() => { setActiveTab('gastos'); setSelectedVehiculo(null); }} 
            className={`ga-tab-btn ${activeTab === 'gastos' ? 'active' : ''}`}
          >
            <DollarSign size={15} />
            Gastos Operativos
          </button>
          <button 
            onClick={() => { setActiveTab('vehiculos'); setSelectedVehiculo(null); }} 
            className={`ga-tab-btn ${activeTab === 'vehiculos' ? 'active' : ''}`}
          >
            <Car size={15} />
            Control de Vehículos
          </button>
        </div>
      )}

      {/* PESTAÑA 1: GASTOS OPERATIVOS */}
      {activeTab === 'gastos' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="ga-card px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <FileText size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Transacciones</div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">{totales.total}</div>
              </div>
            </div>
            <div className="ga-card px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <DollarSign size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registrado</div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totales.totalMonto)}</div>
              </div>
            </div>
            <div className="ga-card px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <RefreshCw size={20} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promedio x Gasto</div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totales.promedio)}</div>
              </div>
            </div>
            <div className="ga-card px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(236,72,153,0.1)' }}>
                <Calendar size={20} style={{ color: '#ec4899' }} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presupuesto Mes</div>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totales.totalMes)}</div>
              </div>
            </div>
          </div>

          {/* Tabla de Gastos */}
          <div className="ga-card">
            <div className="px-5 py-4 border-b border-slate-100/60 flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input 
                className="ga-input max-w-xs !border-0 !bg-transparent !p-0 !shadow-none !text-sm !font-medium placeholder:!text-slate-400 focus:!ring-0"
                placeholder="Buscar por concepto, categoría o proveedor…"
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100/60 text-slate-400 bg-slate-50/20">
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Concepto</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Categoría</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Fecha</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Proveedor</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Método</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Monto</th>
                      <th className="text-center px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/40">
                    {paginated.map((g) => (
                      <tr key={g.id} className="ga-tr">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{g.concepto}</div>
                          {g.notas && <div className="text-[11px] text-slate-400 mt-0.5">{g.notas}</div>}
                          {g.id && <div className="text-[10px] text-slate-300 font-mono mt-0.5">{g.id}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: CAT_BADGES[g.categoria]?.bg, color: CAT_BADGES[g.categoria]?.color }}>
                            {CAT_BADGES[g.categoria]?.label ?? g.categoria}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-[12px]">
                          {g.fecha ? g.fecha.split('T')[0] : '—'}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{g.proveedor || <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {g.metodoPago?.nombre || <span className="text-slate-300">No especificado</span>}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-800">{fmt(Number(g.monto))}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => openEditGasto(g)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" 
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteGasto(g.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" 
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-16 text-slate-400 text-sm font-medium">No se encontraron gastos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100/60 bg-slate-50/30">
                <span className="text-[12px] font-medium text-slate-400">{filteredAll.length} gasto{filteredAll.length !== 1 ? 's' : ''}</span>
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
        </>
      )}

      {/* PESTAÑA 2: CONTROL DE VEHÍCULOS */}
      {activeTab === 'vehiculos' && (
        <>
          {!selectedVehiculo ? (
            /* --- LISTA DE VEHÍCULOS --- */
            <>
              {/* KPI Cards de Vehículos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="ga-card px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <Car size={20} style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Flota de Vehículos</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">{vehiculos.length}</div>
                  </div>
                </div>
                <div className="ga-card px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vehículos con Alerta</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">{vehiculosConAlertas}</div>
                  </div>
                </div>
                <div className="ga-card px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)' }}>
                    <DollarSign size={20} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inversión Mantenimientos</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totalGastosVehiculos)}</div>
                  </div>
                </div>
              </div>

              {/* Grid / Listado de Vehículos */}
              {loadingVehiculos ? (
                <div className="flex items-center justify-center py-20 ga-card">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehiculos.map((vehiculo) => {
                    const { oilAlert, tiresAlert, brakesAlert, hasWarning } = computeVehicleAlerts(vehiculo);
                    return (
                      <div 
                        key={vehiculo.id}
                        onClick={() => setSelectedVehiculo(vehiculo)}
                        className="ga-card p-5 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="bg-slate-100 text-slate-700 font-mono font-extrabold text-sm px-3 py-1 rounded-lg border border-slate-200 uppercase tracking-wider">
                              {vehiculo.placa}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              vehiculo.estado === 'activo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              vehiculo.estado === 'taller' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-slate-50 text-slate-500 border border-slate-100'
                            }`}>
                              {vehiculo.estado === 'activo' ? 'Activo' : vehiculo.estado === 'taller' ? 'En Taller' : 'Inactivo'}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {vehiculo.marca} {vehiculo.modelo}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">Año: {vehiculo.anio || 'N/D'} • Color: {vehiculo.color || 'N/D'}</p>

                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-400">Kilometraje:</span>
                              <span className="font-bold text-slate-700">{(vehiculo.kilometraje || 0).toLocaleString()} km</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-400">Responsable:</span>
                              <span className="font-medium text-slate-700">{vehiculo.responsable || 'Sin asignar'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Alertas preventivas */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          {hasWarning ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-50/50 border border-amber-100/50 p-2.5 rounded-xl">
                              <AlertCircle size={15} />
                              <span>Mantenimientos pendientes o sugeridos</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded-xl">
                              <CheckCircle size={15} />
                              <span>Vehículo al día</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {vehiculos.length === 0 && (
                    <div className="col-span-full ga-card p-16 text-center text-slate-400 text-sm font-medium">
                      <Car size={36} className="mx-auto text-slate-300 mb-3" />
                      No hay vehículos registrados en la flota de la empresa.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* --- VISTA DETALLADA DEL VEHÍCULO --- */
            <div className="space-y-6">
              {/* Encabezado Detalle */}
              <div className="ga-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setSelectedVehiculo(null); loadVehiculosData(); }} 
                    className="p-2.5 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors border border-slate-200 bg-white"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-slate-800">
                        {selectedVehiculo.marca} {selectedVehiculo.modelo}
                      </h2>
                      <span className="bg-slate-100 text-slate-700 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">
                        {selectedVehiculo.placa}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      Responsable actual: <strong className="text-slate-600">{selectedVehiculo.responsable || 'Sin asignar'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditVehiculo(selectedVehiculo)} 
                    className="ga-btn-secondary"
                  >
                    <Edit size={14} />
                    Editar Info
                  </button>
                  <button 
                    onClick={() => handleDeleteVehiculo(selectedVehiculo.id)} 
                    className="ga-btn-secondary hover:!text-red-600 hover:!border-red-200"
                  >
                    <Trash2 size={14} />
                    Eliminar Vehículo
                  </button>
                  <button 
                    onClick={openNewMaint} 
                    className="ga-btn-primary"
                  >
                    <Plus size={16} />
                    Registrar Mantenimiento
                  </button>
                </div>
              </div>

              {/* Información Ficha Técnica */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="ga-card p-5 lg:col-span-1 space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Info size={16} className="text-blue-500" />
                    Ficha del Vehículo
                  </h3>
                  <div className="space-y-3 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Marca:</span>
                      <span className="font-bold text-slate-800">{selectedVehiculo.marca}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Modelo:</span>
                      <span className="font-bold text-slate-800">{selectedVehiculo.modelo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Año:</span>
                      <span className="font-bold text-slate-800">{selectedVehiculo.anio || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Color:</span>
                      <span className="font-bold text-slate-800">{selectedVehiculo.color || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Kilometraje:</span>
                      <span className="font-bold text-blue-600">{(selectedVehiculo.kilometraje || 0).toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Estado:</span>
                      <span className="font-bold text-slate-800 capitalize">{selectedVehiculo.estado}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-slate-100 pt-2.5">
                      <span className="font-semibold text-slate-400">Observaciones / Notas:</span>
                      <p className="text-slate-600 italic leading-relaxed">{selectedVehiculo.notas || 'Sin observaciones adicionales.'}</p>
                    </div>
                  </div>
                </div>

                {/* Tarjetas Alertas de Salud del Vehículo */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="ga-card p-5">
                    <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                      <Wrench size={16} className="text-blue-500" />
                      Estado de Mantenimientos Preventivos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const { oilAlert, tiresAlert, brakesAlert } = computeVehicleAlerts(selectedVehiculo);
                        return (
                          <>
                            {/* Aceite */}
                            <div className={`maint-alert-card ${oilAlert.status}`}>
                              <div>
                                <span className={`maint-badge ${oilAlert.status}`}>{oilAlert.status === 'ok' ? 'Al día' : 'Atención'}</span>
                                <h4 className="font-extrabold text-sm mt-2">Cambio de Aceite</h4>
                                <p className="text-[11px] mt-1.5 leading-relaxed opacity-90">{oilAlert.message}</p>
                              </div>
                              <div className="mt-4 pt-2.5 border-t border-current/10 text-[10px] flex justify-between">
                                <span className="opacity-60">Último cambio:</span>
                                <strong className="font-extrabold">{oilAlert.lastInfo}</strong>
                              </div>
                            </div>

                            {/* Llantas */}
                            <div className={`maint-alert-card ${tiresAlert.status}`}>
                              <div>
                                <span className={`maint-badge ${tiresAlert.status}`}>{tiresAlert.status === 'ok' ? 'Al día' : 'Atención'}</span>
                                <h4 className="font-extrabold text-sm mt-2">Cambio de Llantas</h4>
                                <p className="text-[11px] mt-1.5 leading-relaxed opacity-90">{tiresAlert.message}</p>
                              </div>
                              <div className="mt-4 pt-2.5 border-t border-current/10 text-[10px] flex justify-between">
                                <span className="opacity-60">Último cambio:</span>
                                <strong className="font-extrabold">{tiresAlert.lastInfo}</strong>
                              </div>
                            </div>

                            {/* Frenos */}
                            <div className={`maint-alert-card ${brakesAlert.status}`}>
                              <div>
                                <span className={`maint-badge ${brakesAlert.status}`}>{brakesAlert.status === 'ok' ? 'Al día' : 'Atención'}</span>
                                <h4 className="font-extrabold text-sm mt-2">Revisión de Frenos</h4>
                                <p className="text-[11px] mt-1.5 leading-relaxed opacity-90">{brakesAlert.message}</p>
                              </div>
                              <div className="mt-4 pt-2.5 border-t border-current/10 text-[10px] flex justify-between">
                                <span className="opacity-60">Última revisión:</span>
                                <strong className="font-extrabold">{brakesAlert.lastInfo}</strong>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Historial de Mantenimientos Realizados */}
                  <div className="ga-card">
                    <div className="px-5 py-4 border-b border-slate-100/60 flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" />
                        Historial de Mantenimientos y Reparaciones
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold">
                        {(selectedVehiculo.mantenimientos || []).length} registros
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-slate-100/60 text-slate-400 bg-slate-50/20">
                            <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Fecha / Tipo</th>
                            <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Descripción</th>
                            <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Kilometraje</th>
                            <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Proveedor</th>
                            <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Monto</th>
                            <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider w-20">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/40">
                          {(selectedVehiculo.mantenimientos || []).map((m) => (
                            <tr key={m.id} className="ga-tr">
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-800">{m.tipo}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{m.fechaRealizado.split('T')[0]}</div>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="text-slate-600">{m.descripcion || '—'}</p>
                                {m.notas && <p className="text-[11px] text-slate-400 mt-1 italic">Nota: {m.notas}</p>}
                                {(m.kmProximo || m.fechaProxima) && (
                                  <div className="text-[10px] text-blue-500 font-semibold mt-1 flex gap-2">
                                    {m.kmProximo && <span>Próximo: {m.kmProximo.toLocaleString()} km</span>}
                                    {m.fechaProxima && <span>Próxima fecha: {m.fechaProxima.split('T')[0]}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-700">
                                {m.kilometraje ? `${m.kilometraje.toLocaleString()} km` : '—'}
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{m.proveedor || '—'}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-slate-800">{fmt(Number(m.monto))}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button 
                                    onClick={() => openEditMaint(m)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" 
                                    title="Editar"
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMaint(m.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" 
                                    title="Eliminar"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(selectedVehiculo.mantenimientos || []).length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-slate-400 italic text-xs font-semibold">
                                Sin registros de mantenimientos previos.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* PESTAÑA 3: CIERRE DE CAJA */}
      {activeTab === 'cierre' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario de Cierre y Previsualización */}
            <div className="lg:col-span-2 space-y-6">
              <div className="ga-card p-6">
                <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  Rango de Fecha para Cierre de Caja
                </h3>
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Fecha de Cierre</label>
                  <DateRangePicker 
                    value={{ start: cierreDates.desde, end: cierreDates.hasta }} 
                    onChange={val => setCierreDates({ desde: val.start, hasta: val.end })}
                    placeholder="Seleccionar rango de cierre"
                  />
                </div>
              </div>

              {loadingPreview ? (
                <div className="ga-card flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
                </div>
              ) : cierrePreview ? (
                <div className="space-y-6">
                  {/* KPI Cards de Previsualización */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ga-card px-5 py-4 border-l-4 border-emerald-500">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</div>
                      <div className="text-2xl font-extrabold text-emerald-600 mt-1">{fmt(cierrePreview.totalIngresos)}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{cierrePreview.ingresosConteo} transacciones</div>
                    </div>
                    <div className="ga-card px-5 py-4 border-l-4 border-red-500">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Egresos Totales</div>
                      <div className="text-2xl font-extrabold text-red-600 mt-1">{fmt(cierrePreview.totalEgresos)}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{cierrePreview.egresosConteo} transacciones</div>
                    </div>
                    <div className={`ga-card px-5 py-4 border-l-4 ${cierrePreview.balance >= 0 ? 'border-blue-500' : 'border-amber-500'}`}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Neto</div>
                      <div className={`text-2xl font-extrabold mt-1 ${cierrePreview.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(cierrePreview.balance)}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Saldo en caja</div>
                    </div>
                  </div>

                  {/* Tabla por métodos de pago */}
                  <div className="ga-card p-6">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">
                      Desglose por Métodos de Pago
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-left font-bold uppercase tracking-wider">
                            <th className="py-2.5">Método</th>
                            <th className="py-2.5 text-right">Ingresos (+)</th>
                            <th className="py-2.5 text-right">Egresos (-)</th>
                            <th className="py-2.5 text-right">Balance Neto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {cierrePreview.metodosDetalle?.map((m) => (
                            <tr key={m.metodoPagoId} className="ga-tr">
                              <td className="py-3 font-semibold text-slate-700">{m.nombre}</td>
                              <td className="py-3 text-right text-emerald-600 font-bold">{fmt(m.ingresos)}</td>
                              <td className="py-3 text-right text-red-500 font-bold">{fmt(m.egresos)}</td>
                              <td className={`py-3 text-right font-extrabold ${m.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                {fmt(m.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Observaciones y Guardar Cierre */}
            <div className="ga-card p-6 flex flex-col justify-between h-fit space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  Registro de Cierre
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Escribe observaciones sobre las transacciones de este rango antes de guardar el cierre de caja oficial.
                </p>
                <textarea 
                  value={cierreObservaciones} 
                  onChange={e => setCierreObservaciones(e.target.value)}
                  rows={4} 
                  placeholder="Observaciones de arqueo, diferencias, billetes falsos, cheques retenidos, etc..." 
                  className="ga-input text-xs resize-none" 
                />
              </div>
              <button 
                onClick={handleSaveCierre} 
                disabled={!cierrePreview || savingCierre}
                className="ga-btn-primary w-full justify-center"
              >
                {savingCierre && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-1" aria-hidden="true" />
                )}
                Guardar Cierre de Caja
              </button>
            </div>
          </div>

          {/* Historial de Cierres */}
          <div className="ga-card">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Historial de Cierres de Caja
              </h3>
            </div>
            {loadingCierreHistory ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto cc-desktop-table">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/10 text-left font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Rango de Cierre</th>
                        <th className="px-5 py-3">Fecha Cierre</th>
                        <th className="px-5 py-3">Registrado Por</th>
                        <th className="px-5 py-3 text-right">Ingresos</th>
                        <th className="px-5 py-3 text-right">Egresos</th>
                        <th className="px-5 py-3 text-right">Balance Neto</th>
                        <th className="px-5 py-3">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/40">
                      {cierreHistory.map((c) => {
                        return (
                          <tr key={c.id} className="ga-tr">
                            <td className="px-5 py-3.5 font-semibold text-slate-700">
                              {c.fechaInicio.split('T')[0]} al {c.fechaFin.split('T')[0]}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {new Date(c.fecha).toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-600">
                              {c.usuario?.nombre || 'Administrador'}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{fmt(c.totalIngresos)}</td>
                            <td className="px-5 py-3.5 text-right font-bold text-red-500">{fmt(c.totalEgresos)}</td>
                            <td className={`px-5 py-3.5 text-right font-extrabold ${c.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                              {fmt(c.balance)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 italic max-w-xs truncate" title={c.observaciones}>
                              {c.observaciones || <span className="text-slate-300">Sin notas</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {cierreHistory.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                            No se han registrado cierres de caja todavía.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cc-mobile-cards">
                  {cierreHistory.map((c) => {
                    return (
                      <div key={c.id} className="cc-mobile-card">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">
                            {c.fechaInicio.split('T')[0]} al {c.fechaFin.split('T')[0]}
                          </span>
                          <span className="text-[10px] text-slate-450 font-medium">
                            {new Date(c.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs pt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Registrado Por</span>
                            <span className="font-semibold text-slate-700">{c.usuario?.nombre || 'Administrador'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Balance Neto</span>
                            <span className={`font-extrabold ${c.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                              {fmt(c.balance)}
                            </span>
                          </div>
                          <div className="text-emerald-600">
                            <span className="text-[9px] text-emerald-400 font-bold uppercase block">Ingresos</span>
                            <span className="font-bold">{fmt(c.totalIngresos)}</span>
                          </div>
                          <div className="text-red-500">
                            <span className="text-[9px] text-red-400 font-bold uppercase block">Egresos</span>
                            <span className="font-bold">{fmt(c.totalEgresos)}</span>
                          </div>
                        </div>
                        {c.observaciones && (
                          <div className="mt-1 pt-1.5 border-t border-slate-50 text-[11px] text-slate-500 italic">
                            <span className="text-[9px] text-slate-400 font-bold uppercase not-italic block mb-0.5">Observaciones</span>
                            {c.observaciones}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {cierreHistory.length === 0 && (
                    <div className="text-center py-10 text-slate-400 font-medium text-xs">
                      No se han registrado cierres de caja todavía.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: REPORTES FINANCIEROS */}
      {activeTab === 'reportes' && (
        <div className="space-y-6 animate-slide-up">
          {/* Selector de Rango de Fechas */}
          <div className="ga-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                Reportes Financieros y Métricas
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Analiza el rendimiento, rentabilidad y egresos por canal</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap" style={{ minWidth: '240px' }}>
              <DateRangePicker 
                value={{ start: reportDates.desde, end: reportDates.hasta }} 
                onChange={val => setReportDates({ desde: val.start, hasta: val.end })}
                placeholder="Rango de reporte"
              />
            </div>
          </div>

          {loadingReport ? (
            <div className="ga-card flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
            </div>
          ) : reportData ? (
            <>
              {/* KPIs de Reportes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="ga-card px-5 py-4 flex items-center gap-4 border-l-4 border-emerald-500">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 shrink-0">
                    <DollarSign size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">{fmt(reportData.kpi.ingresos)}</div>
                    <div className="text-[10px] text-slate-400">{reportData.kpi.conteoVentas} ventas aprobadas</div>
                  </div>
                </div>

                <div className="ga-card px-5 py-4 flex items-center gap-4 border-l-4 border-red-500">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-50 shrink-0">
                    <DollarSign size={20} className="text-red-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Egresos Totales</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">{fmt(reportData.kpi.egresos)}</div>
                    <div className="text-[10px] text-slate-400">{reportData.kpi.conteoEgresos} egresos / compras</div>
                  </div>
                </div>

                <div className={`ga-card px-5 py-4 flex items-center gap-4 border-l-4 ${reportData.kpi.balance >= 0 ? 'border-blue-500' : 'border-amber-500'}`}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-50 shrink-0">
                    <TrendingUp size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance de Periodo</div>
                    <div className={`text-xl font-black mt-0.5 ${reportData.kpi.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(reportData.kpi.balance)}</div>
                    <div className="text-[10px] text-slate-400">Balance neto</div>
                  </div>
                </div>

                <div className="ga-card px-5 py-4 flex items-center gap-4 border-l-4 border-indigo-500">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-50 shrink-0">
                    <Percent size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentabilidad</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">
                      {reportData.kpi.ingresos > 0 
                        ? ((reportData.kpi.balance / reportData.kpi.ingresos) * 100).toFixed(1) + '%' 
                        : '0.0%'
                      }
                    </div>
                    <div className="text-[10px] text-slate-400">Margen neto de caja</div>
                  </div>
                </div>
              </div>

              {/* Fila de Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico 6 meses */}
                <div className="ga-card p-6 lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-500" />
                      Histórico Ingresos vs Egresos (6 meses)
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Ingresos</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Egresos</span>
                    </div>
                  </div>
                  <div className="py-4">
                    <RenderEvolucionChart data={reportData.evolucionMensual} />
                  </div>
                </div>

                {/* Categorías de Gastos */}
                <div className="ga-card p-6 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <PieChart size={16} className="text-blue-500" />
                    Distribución de Egresos
                  </h3>
                  <div className="py-2">
                    <RenderCategoriasChart data={reportData.breakdownCategorias} />
                  </div>
                </div>
              </div>

              {/* Detalle de Cuentas */}
              <div className="ga-card p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-500" />
                    Detalle de Cuentas (Métodos de Pago)
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Resumen consolidado por periodo
                  </span>
                </div>

                {loadingMetodosReport ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs text-left text-slate-500 border-collapse">
                      <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/75 border-b border-slate-100 font-bold font-mono">
                        <tr>
                          <th className="px-5 py-3">Nombre</th>
                          <th className="px-5 py-3">Tipo</th>
                          <th className="px-5 py-3 text-right">Saldo Actual</th>
                          <th className="px-5 py-3 text-right text-emerald-600">Ingresos (P)</th>
                          <th className="px-5 py-3 text-right text-red-500">Egresos (P)</th>
                          <th className="px-5 py-3 text-right">Neto (P)</th>
                          <th className="px-5 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metodosReport.map(m => {
                          const isEfectivo = m.tipo === 'EFECTIVO';
                          return (
                            <tr key={m.id} className="ga-tr">
                              <td className="px-5 py-3.5 font-semibold text-slate-700">{m.nombre}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase border ${
                                  isEfectivo 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {m.tipo || 'EFECTIVO'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-medium text-slate-800">{fmt(m.saldoActual || 0)}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-emerald-600">
                                {m.ingresosPeriod > 0 ? `+${fmt(m.ingresosPeriod)}` : '—'}
                              </td>
                              <td className="px-5 py-3.5 text-right font-bold text-red-500">
                                {m.egresosPeriod > 0 ? `-${fmt(m.egresosPeriod)}` : '—'}
                              </td>
                              <td className={`px-5 py-3.5 text-right font-extrabold ${m.netoPeriod >= 0 ? 'text-slate-800' : 'text-amber-700'}`}>
                                {fmt(m.netoPeriod || 0)}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                  m.activo 
                                    ? 'bg-green-50 text-green-700' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {m.activo ? 'ACTIVA' : 'INACTIVA'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {metodosReport.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                              No hay cuentas o métodos de pago registrados en el sistema.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* --- PORTALES Y MODALES --- */}

      {/* 1. MODAL CRUD GASTO */}
      <ModalPortal open={formOpen}>
        <div className="ga-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px) saturate(130%)', WebkitBackdropFilter: 'blur(10px) saturate(130%)' }}
            onClick={() => deferClose(() => setFormOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-ga-modal-in max-h-[90vh] flex flex-col border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editing ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
                <button type="button" onClick={() => deferClose(() => setFormOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form onSubmit={handleSaveGasto} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Concepto</label>
                    <input name="concepto" value={form.concepto} onChange={handleGastoChange} required placeholder="Ej. Papelería de oficina" className="ga-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Categoría</label>
                      <select name="categoria" value={form.categoria} onChange={handleGastoChange} className="ga-input bg-white">
                        {CATEGORIAS.map(c => (
                          <option key={c} value={c}>{CAT_BADGES[c]?.label || c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Fecha</label>
                      <input name="fecha" type="date" value={form.fecha} onChange={handleGastoChange} required className="ga-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Monto ($)</label>
                      <input name="monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleGastoChange} required className="ga-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Método de Pago</label>
                      <select name="metodoPagoId" value={form.metodoPagoId} onChange={handleGastoChange} required className="ga-input bg-white">
                        <option value="">Seleccione método...</option>
                        {metodosPago.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Proveedor</label>
                    <input name="proveedor" value={form.proveedor} onChange={handleGastoChange} placeholder="Opcional" className="ga-input" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notas</label>
                    <textarea name="notas" value={form.notas} onChange={handleGastoChange} rows={2} placeholder="Observaciones…" className="ga-input resize-none" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                    <button type="button" onClick={() => deferClose(() => setFormOpen(false))} className="ga-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={saving} className="ga-btn-primary">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1 ${saving ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!saving}
                      />
                      {editing ? 'Guardar Cambios' : 'Registrar Gasto'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* 2. MODAL REGISTRO/EDICION VEHICULO */}
      <ModalPortal open={vehiculoFormOpen}>
        <div className="ga-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px) saturate(130%)', WebkitBackdropFilter: 'blur(10px) saturate(130%)' }}
            onClick={() => deferClose(() => setVehiculoFormOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-ga-modal-in max-h-[90vh] flex flex-col border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editingVehiculo ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h2>
                <button type="button" onClick={() => deferClose(() => setVehiculoFormOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form onSubmit={handleSaveVehiculo} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Placa</label>
                      <input name="placa" value={vehiculoForm.placa} onChange={handleVehiculoChange} required placeholder="Ej. PBG-1234" className="ga-input font-mono uppercase" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Estado</label>
                      <select name="estado" value={vehiculoForm.estado} onChange={handleVehiculoChange} className="ga-input bg-white">
                        <option value="activo">Activo (Operativo)</option>
                        <option value="taller">En Taller (Mantenimiento)</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Marca</label>
                      <input name="marca" value={vehiculoForm.marca} onChange={handleVehiculoChange} required placeholder="Ej. Chevrolet" className="ga-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Modelo</label>
                      <input name="modelo" value={vehiculoForm.modelo} onChange={handleVehiculoChange} required placeholder="Ej. D-Max" className="ga-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Año</label>
                      <input name="anio" type="number" min="0" step="1" inputMode="numeric" value={vehiculoForm.anio} onChange={handleVehiculoChange} placeholder="Ej. 2022" className="ga-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Color</label>
                      <input name="color" value={vehiculoForm.color} onChange={handleVehiculoChange} placeholder="Ej. Blanco" className="ga-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Kilometraje Actual</label>
                      <input name="kilometraje" type="number" min="0" step="1" inputMode="numeric" value={vehiculoForm.kilometraje} onChange={handleVehiculoChange} required placeholder="Ej. 45000" className="ga-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Responsable Asignado</label>
                    <input name="responsable" value={vehiculoForm.responsable} onChange={handleVehiculoChange} placeholder="Ej. Ing. Juan Pérez" className="ga-input" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notas y Detalles</label>
                    <textarea name="notas" value={vehiculoForm.notas} onChange={handleVehiculoChange} rows={2} placeholder="Detalles de aseguradora, historial de fallas, etc..." className="ga-input resize-none" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                    <button type="button" onClick={() => deferClose(() => setVehiculoFormOpen(false))} className="ga-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={savingVehiculo} className="ga-btn-primary">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1 ${savingVehiculo ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!savingVehiculo}
                      />
                      {editingVehiculo ? 'Guardar Cambios' : 'Registrar Vehículo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* 3. MODAL REGISTRO/EDICION MANTENIMIENTO */}
      <ModalPortal open={maintFormOpen}>
        <div className="ga-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px) saturate(130%)', WebkitBackdropFilter: 'blur(10px) saturate(130%)' }}
            onClick={() => deferClose(() => setMaintFormOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-ga-modal-in max-h-[90vh] flex flex-col border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editingMaint ? 'Editar Mantenimiento' : 'Registrar Mantenimiento / Gasto'}</h2>
                <button type="button" onClick={() => deferClose(() => setMaintFormOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form onSubmit={handleSaveMaint} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo de Mantenimiento</label>
                      <select name="tipo" value={maintForm.tipo} onChange={handleMaintChange} className="ga-input bg-white">
                        <option value="Cambio de Aceite">Cambio de Aceite</option>
                        <option value="Cambio de Llantas">Cambio de Llantas</option>
                        <option value="Frenos">Revisión de Frenos</option>
                        <option value="Reparación Mecánica">Reparación Mecánica</option>
                        <option value="ABC Motor">ABC Motor</option>
                        <option value="Otros">Otros (Describir)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Monto de Gasto ($)</label>
                      <input name="monto" type="number" step="0.01" min="0" value={maintForm.monto} onChange={handleMaintChange} required className="ga-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Descripción de Trabajos</label>
                    <input name="descripcion" value={maintForm.descripcion} onChange={handleMaintChange} placeholder="Ej. Cambio de aceite 10W-30 y filtro de aire" className="ga-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Fecha Realizado</label>
                      <input name="fechaRealizado" type="date" value={maintForm.fechaRealizado} onChange={handleMaintChange} required className="ga-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Próxima Fecha (Límite)</label>
                      <input name="fechaProxima" type="date" value={maintForm.fechaProxima} onChange={handleMaintChange} className="ga-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Kilometraje de Realización</label>
                      <input name="kilometraje" type="number" value={maintForm.kilometraje} onChange={handleMaintChange} className="ga-input" placeholder={selectedVehiculo?.kilometraje} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Kilometraje Próximo Maint.</label>
                      <input name="kmProximo" type="number" value={maintForm.kmProximo} onChange={handleMaintChange} className="ga-input" placeholder="Ej. 105000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Proveedor / Taller</label>
                      <input name="proveedor" value={maintForm.proveedor} onChange={handleMaintChange} placeholder="Ej. Toyocosta S.A." className="ga-input" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Método de Pago</label>
                      <select name="metodoPagoId" value={maintForm.metodoPagoId} onChange={handleMaintChange} required className="ga-input bg-white">
                        <option value="">Seleccione método...</option>
                        {metodosPago.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notas Internas</label>
                    <input name="notas" value={maintForm.notas} onChange={handleMaintChange} placeholder="Observaciones adicionales" className="ga-input" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                    <button type="button" onClick={() => deferClose(() => setMaintFormOpen(false))} className="ga-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={savingMaint} className="ga-btn-primary">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1 ${savingMaint ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!savingMaint}
                      />
                      {editingMaint ? 'Guardar Cambios' : 'Registrar Mantenimiento'}
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
