import React, { useEffect, useState } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { 
  getGastos, saveGasto, deleteGasto, CATEGORIAS,
  getMetodosPago, getCierrePreview, saveCierre, getCierres,
  getVehiculos, getVehiculoDetails, saveVehiculo, deleteVehiculo,
  addMantenimiento, updateMantenimiento, deleteMantenimiento 
} from '../../application/gastosService';
import { getUsuarios } from '../../../usuarios/application/usuariosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { 
  Car, Wrench, Calendar, DollarSign, Trash2, Edit, Plus, 
  ArrowLeft, AlertTriangle, CheckCircle, Clock, User, 
  Settings, Key, AlertCircle, Info, RefreshCw, FileText,
  ClipboardCheck, BarChart3, Filter
} from 'lucide-react';

const EMPTY_FORM = { concepto: '', categoria: 'oficina', fecha: new Date().toISOString().split('T')[0], monto: 0, proveedor: '', notas: '', metodoPagoId: '' };

const EMPTY_VEHICULO_FORM = { placa: '', marca: '', modelo: '', anio: '', color: '', kilometraje: '', responsable: '', notas: '', estado: 'activo' };

const esMetodoEfectivo = (nombre) => {
  const name = (nombre || '').toLowerCase();
  return name.includes('efectivo') || name.includes('caja') || name.includes('chica') || name.includes('principal') || name.includes('cash');
};

const EMPTY_MAINT_FORM = { tipo: 'Cambio de Aceite', descripcion: '', fechaRealizado: new Date().toISOString().split('T')[0], fechaProxima: '', kilometraje: '', kmProximo: '', monto: 0, proveedor: '', notas: '', metodoPagoId: '' };

const CAT_BADGES = {
  oficina: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Oficina' },
  mantenimiento: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Mantenimiento' },
  servicios: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', label: 'Servicios' },
  logistica: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Logística' },
  vehiculos: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Vehículos' },
  varios: { bg: 'rgba(236,72,153,0.1)', color: '#ec4899', label: 'Varios' },
  compras: { bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Orden de Compra' },
  recursos_humanos: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Nómina y Anticipos' }
};

const fmt = (n) => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const PAGE_META = {
  gastos: {
    title: 'Control de Gastos',
    subtitle: 'Egresos operativos, pagos de órdenes de compra y mantenimiento central',
  },
  vehiculos: {
    title: 'Gestión de Flota',
    subtitle: 'Supervisión de vehículos corporativos, kilometrajes y alertas preventivas',
  },
  cierre: {
    title: 'Cierre de Caja',
    subtitle: 'Arqueo de caja, ingresos, egresos y cierres históricos',
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

const StatCard = ({ title, amount, icon: Icon, color, bg, trendValue, trendUp, trendText, sparklineSvg }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
          <div className="text-[22px] font-black text-slate-800 tracking-tight leading-none">{amount}</div>
        </div>
        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          <Icon size={18} style={{ color: color }} strokeWidth={2.5} />
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-auto">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${trendUp ? 'bg-emerald-100/60 text-emerald-600' : 'bg-rose-100/60 text-rose-500'}`}>
              {trendUp ? '↑' : '↓'} {trendValue}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">vs mes anterior</span>
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{trendText}</div>
        </div>
        
        {/* Sparkline */}
        <div className="w-16 h-8 opacity-80 -mr-2 -mb-1">
          <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
             <path 
               d={sparklineSvg} 
               fill="none" 
               stroke={trendUp ? '#10b981' : '#f43f5e'} 
               strokeWidth="2" 
               strokeLinecap="round" 
               strokeLinejoin="round" 
               style={{ filter: trendUp ? 'drop-shadow(0 2px 2px rgba(16,185,129,0.2))' : 'drop-shadow(0 2px 2px rgba(244,63,94,0.2))' }}
             />
          </svg>
        </div>
      </div>
    </div>
  );
};

export const GastosPage = ({ defaultTab = 'gastos' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'gastos' | 'vehiculos' | 'cierre'

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
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [filtroUsuarioId, setFiltroUsuarioId] = useState('');
  const [filtroMetodoPagoId, setFiltroMetodoPagoId] = useState('');
  const [dateRange, setDateRange] = useState({ desde: '', hasta: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totales, setTotales] = useState({ total: 0, otrosGastos: 0, nomina: 0, vehiculos: 0, ordenesCompra: 0 });
  const [usuarios, setUsuarios] = useState([]);

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
  const [efectivoFisicoContado, setEfectivoFisicoContado] = useState('');
  const [selectedCierreDetail, setSelectedCierreDetail] = useState(null);

  useEffect(() => {
    setEfectivoFisicoContado('');
  }, [cierrePreview]);

  // --- CARGA DE DATOS ---
  const loadGastosData = async () => {
    setLoading(true);
    try {
      const filters = {
        usuarioId: filtroUsuarioId,
        metodoPagoId: filtroMetodoPagoId,
        startDate: dateRange.desde,
        endDate: dateRange.hasta,
      };
      const response = await getGastos(page, limit, search, filtroOrigen, filters);
      if (response && response.data) {
        setItems(response.data);
        if (response.totales) {
          setTotales(response.totales);
        }
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalCount(response.pagination.totalCount);
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      toast.error('Error al cargar gastos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gastos') {
      const timeout = setTimeout(() => {
        loadGastosData();
      }, 300); // debounce search
      return () => clearTimeout(timeout);
    }
  }, [page, limit, search, filtroOrigen, filtroUsuarioId, filtroMetodoPagoId, dateRange, activeTab]);

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
      const totalEfectivoEsperado = (cierrePreview.metodosDetalle || [])
        .filter(m => esMetodoEfectivo(m.nombre))
        .reduce((sum, m) => sum + Number(m.balance), 0);

      const physicalEfectivo = efectivoFisicoContado === '' ? totalEfectivoEsperado : Number(efectivoFisicoContado);
      const ratio = totalEfectivoEsperado > 0 ? (physicalEfectivo / totalEfectivoEsperado) : 1;

      const metodosConFisico = (cierrePreview.metodosDetalle || []).map(m => {
        const esEfectivo = esMetodoEfectivo(m.nombre);
        const physical = esEfectivo ? (Number(m.balance) * ratio) : Number(m.balance);
        return {
          ...m,
          montoFisico: physical,
          diferencia: physical - Number(m.balance),
        };
      });

      await saveCierre({
        fechaInicio: cierrePreview.fechaInicio,
        fechaFin: cierrePreview.fechaFin,
        totalIngresos: cierrePreview.totalIngresos,
        totalEgresos: cierrePreview.totalEgresos,
        metodosDetalle: {
          metodos: metodosConFisico,
          efectivoFisicoContado: physicalEfectivo,
          diferenciaEfectivo: physicalEfectivo - totalEfectivoEsperado,
          seccionIngresos: cierrePreview.seccionIngresos || {},
          seccionEgresos: cierrePreview.seccionEgresos || {},
          usuariosDetalle: cierrePreview.usuariosDetalle || [],
        },
        observaciones: cierreObservaciones,
      });
      toast.success('Cierre de caja guardado con éxito');
      setCierreObservaciones('');
      setEfectivoFisicoContado('');
      setCierrePreview(null);
      loadCierreHistory();
    } catch (err) {
      toast.error('Error al registrar cierre de caja: ' + err.message);
    } finally {
      setSavingCierre(false);
    }
  };

  // Carga inicial de métodos de pago y usuarios
  useEffect(() => {
    getMetodosPago()
      .then(data => {
        setMetodosPago(data || []);
      })
      .catch(err => {
        console.error('Error al cargar métodos de pago:', err);
      });
      
    getUsuarios()
      .then(data => {
        setUsuarios(data || []);
      })
      .catch(err => {
        console.error('Error al cargar usuarios:', err);
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

  // El filtrado y paginación ahora se hacen en el backend
  const paginated = items;
  
  // Resetea a la página 1 cuando el filtro o la búsqueda cambian
  useEffect(() => { setPage(1); }, [search, filtroOrigen, filtroUsuarioId, filtroMetodoPagoId, dateRange]);

  // Totales ahora provienen del estado `totales` cargado desde el backend

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <StatCard 
              title="Total General" 
              amount={fmt(totales.total || 0)} 
              icon={BarChart3} 
              color="#3b82f6" 
              bg="rgba(59,130,246,0.1)"
              trendValue="12.5%" trendUp={false} trendText="GASTO GLOBAL"
              sparklineSvg="M0,5 C20,5 30,15 50,15 C70,15 80,25 100,25"
            />
            <StatCard 
              title="Otros Gastos" 
              amount={fmt(totales.otrosGastos || 0)} 
              icon={DollarSign} 
              color="#10b981" 
              bg="rgba(16,185,129,0.1)"
              trendValue="5.2%" trendUp={false} trendText="GASTOS MANUALES"
              sparklineSvg="M0,10 C20,10 40,20 60,15 C80,10 90,25 100,20"
            />
            <StatCard 
              title="Órdenes de Compra" 
              amount={fmt(totales.ordenesCompra || 0)} 
              icon={FileText} 
              color="#f59e0b" 
              bg="rgba(245,158,11,0.1)"
              trendValue="8.1%" trendUp={true} trendText="PAGOS A PROVEEDOR"
              sparklineSvg="M0,25 C20,25 30,15 50,15 C70,15 80,5 100,5"
            />
            <StatCard 
              title="Nómina y Anticipos" 
              amount={fmt(totales.nomina || 0)} 
              icon={User} 
              color="#8b5cf6" 
              bg="rgba(139,92,246,0.1)"
              trendValue="2.0%" trendUp={true} trendText="RECURSOS HUMANOS"
              sparklineSvg="M0,20 C30,20 40,10 70,10 C80,10 90,5 100,5"
            />
            <StatCard 
              title="Vehículos" 
              amount={fmt(totales.vehiculos || 0)} 
              icon={Car} 
              color="#ec4899" 
              bg="rgba(236,72,153,0.1)"
              trendValue="15.3%" trendUp={false} trendText="MANTENIMIENTOS"
              sparklineSvg="M0,5 C30,5 50,20 70,15 C80,10 90,25 100,25"
            />
          </div>


          {/* Contenedor de Filtros Avanzados */}
          <div className="ga-card mb-4 relative z-30">
            <div className="px-5 py-3 border-b border-slate-100/60 bg-slate-50/50 flex items-center gap-2 rounded-t-xl">
              <Filter size={16} className="text-slate-400" />
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Filtros Avanzados</span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Tipo de Gasto</label>
                <select
                  value={filtroOrigen}
                  onChange={(e) => setFiltroOrigen(e.target.value)}
                  className="ga-input w-full !bg-slate-50 hover:!bg-white focus:!bg-white transition-colors"
                >
                  <option value="todos">Todos los Tipos</option>
                  <option value="otros_gastos">Otros Gastos</option>
                  <option value="orden_compra">Órdenes de Compra</option>
                  <option value="nomina">Nómina y Anticipos</option>
                  <option value="vehiculo">Vehículos</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Usuario</label>
                <select
                  value={filtroUsuarioId}
                  onChange={(e) => setFiltroUsuarioId(e.target.value)}
                  className="ga-input w-full !bg-slate-50 hover:!bg-white focus:!bg-white transition-colors"
                >
                  <option value="">Cualquier Usuario</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Método de Pago</label>
                <select
                  value={filtroMetodoPagoId}
                  onChange={(e) => setFiltroMetodoPagoId(e.target.value)}
                  className="ga-input w-full !bg-slate-50 hover:!bg-white focus:!bg-white transition-colors"
                >
                  <option value="">Cualquier Método de Pago</option>
                  {metodosPago.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Fechas</label>
                <div className="h-10 w-full">
                  <DateRangePicker 
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Rango de fechas"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Gastos */}
          <div className="ga-card relative z-10">
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
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider w-32">Fecha Hora</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider w-40">Tipo</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Concepto</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider w-48">Método de Pago</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider w-32">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/40">
                    {paginated.map((g) => {
                      const origenStyles = {
                        otros_gastos: { label: 'Otros Gastos', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
                        orden_compra: { label: 'Ordenes de Compra', bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
                        nomina: { label: 'Nómina', bg: 'rgba(16,185,129,0.1)', color: '#059669' },
                        vehiculo: { label: 'Vehículo', bg: 'rgba(236,72,153,0.1)', color: '#db2777' }
                      };
                      const style = origenStyles[g.origen] || origenStyles.otros_gastos;
                      const canEdit = g.origen === 'otros_gastos' && !g.readonly;

                      return (
                        <tr 
                          key={`${g.origen || 'gasto'}-${g.id}`} 
                          className={`ga-tr ${canEdit ? 'cursor-pointer hover:bg-blue-50/50 transition-colors' : ''}`}
                          onClick={() => { if (canEdit) openEditGasto(g); }}
                          title={canEdit ? "Clic para editar" : ""}
                        >
                          <td className="px-5 py-4">
                            <div className="text-[12px] font-medium text-slate-700 whitespace-nowrap">
                              {g.fecha ? new Date(g.fecha).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                              {g.registradoPor?.nombre || 'Automático'}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span 
                              className="font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider whitespace-nowrap"
                              style={{ backgroundColor: style.bg, color: style.color }}
                            >
                              {style.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">{g.concepto}</div>
                            {g.notas && g.origen !== 'orden_compra' && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{g.notas}</div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-medium text-[12px]">
                            {g.metodoPago?.nombre || <span className="text-slate-300">No especificado</span>}
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-slate-800">{fmt(Number(g.monto))}</td>
                        </tr>
                      );
                    })}
                    {paginated.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-16 text-slate-400 text-sm font-medium">No se encontraron gastos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100/60 bg-slate-50/30">
                <span className="text-[12px] font-medium text-slate-400">{totalCount} registro{totalCount !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white hover:border-slate-300 transition-all text-xs font-bold">‹</button>
                  <span className="text-[12px] font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Panel Lateral: Parámetros y Arqueo (Izquierda) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="ga-card p-6 space-y-6 relative z-[60]" style={{ overflow: 'visible' }}>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Control de Caja
                  </h3>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rango de Fecha</label>
                  <DateRangePicker 
                    value={{ start: cierreDates.desde, end: cierreDates.hasta }} 
                    onChange={val => setCierreDates({ desde: val.start, hasta: val.end })}
                    placeholder="Seleccionar rango"
                  />
                </div>

                {cierrePreview && (() => {
                  const totalEfectivoEsperado = (cierrePreview.metodosDetalle || [])
                    .filter(m => esMetodoEfectivo(m.nombre))
                    .reduce((sum, m) => sum + Number(m.balance), 0);
                  
                  const physicalEfectivo = efectivoFisicoContado === '' ? totalEfectivoEsperado : Number(efectivoFisicoContado);
                  const diferenciaEfectivo = physicalEfectivo - totalEfectivoEsperado;

                  return (
                    <>
                      <hr className="border-slate-100" />
                      
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Arqueo de Efectivo
                        </h3>
                        <div className="bg-slate-50/60 p-3 rounded-xl flex justify-between items-center mb-3">
                          <span className="text-[11px] font-semibold text-slate-500">Esperado en Sistema:</span>
                          <span className="font-extrabold text-slate-800 text-xs font-mono">{fmt(totalEfectivoEsperado)}</span>
                        </div>

                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Efectivo Físico Contado</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-450 font-bold text-xs">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={efectivoFisicoContado}
                            onChange={(e) => setEfectivoFisicoContado(e.target.value)}
                            placeholder={totalEfectivoEsperado.toFixed(2)}
                            className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>

                        <div className={`p-3 rounded-xl border flex justify-between items-center mt-3 ${diferenciaEfectivo === 0 ? 'bg-emerald-55/35 border-emerald-100/50 text-emerald-800' : 'bg-rose-55/35 border-rose-100/50 text-rose-800'}`}>
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-75">Diferencia</span>
                            <span className="font-extrabold text-xs font-mono mt-0.5">
                              {diferenciaEfectivo === 0 ? 'Caja cuadrada' : (diferenciaEfectivo < 0 ? `-${fmt(Math.abs(diferenciaEfectivo))}` : `+${fmt(diferenciaEfectivo)}`)}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${diferenciaEfectivo === 0 ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-rose-100 border-rose-200 text-rose-800'}`}>
                            {diferenciaEfectivo === 0 ? 'Cuadra' : (diferenciaEfectivo < 0 ? 'Faltante' : 'Sobrante')}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <hr className="border-slate-100" />

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notas del Cierre</label>
                  <textarea 
                    value={cierreObservaciones} 
                    onChange={e => setCierreObservaciones(e.target.value)}
                    rows={3} 
                    placeholder="Observaciones adicionales, billetes, etc..." 
                    className="ga-input text-xs resize-none" 
                  />
                </div>

                <button 
                  onClick={handleSaveCierre} 
                  disabled={!cierrePreview || savingCierre}
                  className="ga-btn-primary w-full justify-center text-xs py-2.5"
                >
                  {savingCierre && (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white mr-1.5" aria-hidden="true" />
                  )}
                  Guardar Cierre de Caja
                </button>
              </div>
            </div>

            {/* Panel Principal: Resultados (Derecha) */}
            <div className="lg:col-span-2 space-y-6">
              {loadingPreview ? (
                <div className="ga-card flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
                </div>
              ) : cierrePreview ? (
                <div className="space-y-6 animate-slide-up">
                  {/* KPI Cards de Previsualización */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ga-card px-5 py-4 border-l-4 border-emerald-500">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</div>
                      <div className="text-2xl font-extrabold text-emerald-600 mt-1">{fmt(cierrePreview.totalIngresos)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cierrePreview.ingresosConteo} transacciones</div>
                    </div>
                    <div className="ga-card px-5 py-4 border-l-4 border-red-500">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Egresos Totales</div>
                      <div className="text-2xl font-extrabold text-red-600 mt-1">{fmt(cierrePreview.totalEgresos)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cierrePreview.egresosConteo} transacciones</div>
                    </div>
                    <div className={`ga-card px-5 py-4 border-l-4 ${cierrePreview.balance >= 0 ? 'border-blue-500' : 'border-amber-500'}`}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Neto</div>
                      <div className={`text-2xl font-extrabold mt-1 ${cierrePreview.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(cierrePreview.balance)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Saldo en sistema</div>
                    </div>
                  </div>

                  {/* Resumen por Métodos de Pago */}
                  <div className="ga-card p-6">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <ClipboardCheck size={14} className="text-blue-500" />
                      Saldos de Métodos de Pago
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-left font-bold uppercase tracking-wider">
                            <th className="py-2">Método</th>
                            <th className="py-2">Tipo</th>
                            <th className="py-2 text-right">Ingresos (+)</th>
                            <th className="py-2 text-right">Egresos (-)</th>
                            <th className="py-2 text-right">Balance Sistema</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150/40">
                          {cierrePreview.metodosDetalle?.map((m) => {
                            const esEfectivo = esMetodoEfectivo(m.nombre);
                            return (
                              <tr key={m.metodoPagoId} className="ga-tr">
                                <td className="py-3 font-semibold text-slate-700">{m.nombre}</td>
                                <td className="py-3">
                                  {esEfectivo ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                      Efectivo / Caja
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                                      Banco / Digital
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-right text-emerald-600 font-bold font-mono">{fmt(m.ingresos)}</td>
                                <td className="py-3 text-right text-red-500 font-bold font-mono">{fmt(m.egresos)}</td>
                                <td className={`py-3 text-right font-extrabold font-mono ${m.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                  {fmt(m.balance)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grid de Secciones y Usuarios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Operaciones por Sección */}
                    <div className="ga-card p-6">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <BarChart3 size={14} className="text-blue-500" />
                        Desglose de Operaciones
                      </h4>
                      <div className="divide-y divide-slate-100/50 text-xs">
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-slate-600 font-medium">Abonos Iniciales</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionIngresos?.abonosIniciales || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-slate-600 font-medium">Abonos Posteriores</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionIngresos?.abonosPosteriores || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium">Gastos Generales</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosGenerales || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium">Gastos por Auto / Vehículo</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosAuto || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium">Órdenes de Compra</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosCompras || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium">Pagos (Nómina/Personal)</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosPagos || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumen por Usuario */}
                    <div className="ga-card p-6">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <User size={14} className="text-blue-500" />
                        Movimientos por Usuario
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs animate-fade-in">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 text-left font-bold uppercase tracking-wider">
                              <th className="py-2">Usuario</th>
                              <th className="py-2 text-right">Ingresos</th>
                              <th className="py-2 text-right">Egresos</th>
                              <th className="py-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150/40">
                            {(cierrePreview.usuariosDetalle || []).map((u) => (
                              <tr key={u.id} className="ga-tr">
                                <td className="py-2.5 font-semibold text-slate-700">{u.nombre}</td>
                                <td className="py-2.5 text-right text-emerald-600 font-bold font-mono">{fmt(u.ingresos)}</td>
                                <td className="py-2.5 text-right text-red-500 font-bold font-mono">{fmt(u.egresos)}</td>
                                <td className={`py-2.5 text-right font-extrabold font-mono ${u.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                  {fmt(u.balance)}
                                </td>
                              </tr>
                            ))}
                            {(cierrePreview.usuariosDetalle || []).length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-4 text-slate-400">
                                  Sin movimientos por usuario en este rango.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ga-card flex flex-col items-center justify-center py-24 px-6 text-center border border-dashed border-slate-200 bg-slate-50/10">
                  <div className="w-12 h-12 rounded-full bg-blue-50/50 flex items-center justify-center text-blue-500 mb-4 animate-pulse">
                    <ClipboardCheck size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Previsualización del Cierre de Caja</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                    Selecciona un rango de fechas en el panel lateral y se cargará el resumen detallado de ingresos, egresos y el balance neto de tu operación.
                  </p>
                </div>
              )}

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
                        <th className="px-5 py-3 text-right">Acciones</th>
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
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => setSelectedCierreDetail(c)}
                                className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors text-[10px] uppercase tracking-wider"
                              >
                                Detalles
                              </button>
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
                        <div className="mt-2 pt-2 border-t border-slate-50 flex justify-end">
                          <button
                            onClick={() => setSelectedCierreDetail(c)}
                            className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors text-[10px] uppercase tracking-wider w-full text-center"
                          >
                            Ver Detalles
                          </button>
                        </div>
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

      {/* Modal Detalle de Cierre Histórico */}
      {selectedCierreDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCierreDetail(null)} />
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto relative z-[201] p-6 animate-ve-modal-in" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm md:text-base">Detalle de Cierre de Caja</h3>
                <p className="text-xs text-slate-400">Periodo: {selectedCierreDetail.fechaInicio.split('T')[0]} al {selectedCierreDetail.fechaFin.split('T')[0]}</p>
              </div>
              <button onClick={() => setSelectedCierreDetail(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            {(() => {
              let parsed = { metodos: [], seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [], efectivoFisicoContado: undefined, diferenciaEfectivo: undefined };
              try {
                const raw = JSON.parse(selectedCierreDetail.metodosDetalle);
                if (Array.isArray(raw)) {
                  parsed.metodos = raw;
                } else if (raw && raw.metodos) {
                  parsed = { ...parsed, ...raw };
                }
              } catch (e) {
                console.error("Error parsing historical closure details:", e);
              }

              const totalEfectivoEsperado = parsed.metodos
                .filter(m => esMetodoEfectivo(m.nombre))
                .reduce((sum, m) => sum + (Number(m.balance) || 0), 0);

              const hasGlobalCash = parsed.efectivoFisicoContado !== undefined;

              return (
                <div className="space-y-6 text-xs">
                  {/* Info Header */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-[11px] md:text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold uppercase block text-[9px]">Registrado el</span>
                      <span className="font-bold text-slate-700">{new Date(selectedCierreDetail.fecha).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold uppercase block text-[9px]">Usuario</span>
                      <span className="font-bold text-slate-700">{selectedCierreDetail.usuario?.nombre || 'Administrador'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold uppercase block text-[9px]">Ingresos / Egresos</span>
                      <span className="font-bold text-slate-700">{fmt(Number(selectedCierreDetail.totalIngresos))} / {fmt(Number(selectedCierreDetail.totalEgresos))}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold uppercase block text-[9px]">Balance Neto</span>
                      <span className={`font-bold ${Number(selectedCierreDetail.balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(Number(selectedCierreDetail.balance))}</span>
                    </div>
                  </div>

                  {/* Arqueo de Efectivo Físico Global */}
                  {hasGlobalCash && (
                    <div className="bg-violet-50/40 border border-violet-100 p-4 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="text-violet-600 font-bold uppercase tracking-wider block text-[9px]">Arqueo de Efectivo Físico</span>
                        <div className="flex gap-4 mt-1 font-semibold text-slate-700">
                          <span>Esperado: <strong className="font-mono text-slate-800">{fmt(totalEfectivoEsperado)}</strong></span>
                          <span>Físico Contado: <strong className="font-mono text-slate-800">{fmt(Number(parsed.efectivoFisicoContado))}</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-semibold block text-[9px] uppercase">Diferencia</span>
                        <span className={`font-mono font-extrabold text-sm ${Number(parsed.diferenciaEfectivo) === 0 ? 'text-emerald-600' : Number(parsed.diferenciaEfectivo) < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                          {Number(parsed.diferenciaEfectivo) === 0 ? 'Cuadra' : (Number(parsed.diferenciaEfectivo) < 0 ? `Faltante: ${fmt(Math.abs(Number(parsed.diferenciaEfectivo)))}` : `Sobrante: ${fmt(Number(parsed.diferenciaEfectivo))}`)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payment methods list with discrepancy */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Resumen por Métodos de Pago</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2">Método</th>
                            <th className="py-2">Tipo</th>
                            <th className="py-2 text-right">Ingresos</th>
                            <th className="py-2 text-right">Egresos</th>
                            <th className="py-2 text-right">Monto Esperado</th>
                            <th className="py-2 text-right">Dinero Físico</th>
                            <th className="py-2 text-right">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {parsed.metodos.map((m) => {
                            const esEfectivo = esMetodoEfectivo(m.nombre);
                            const hasFisico = m.montoFisico !== undefined;
                            const physical = hasFisico ? Number(m.montoFisico) : Number(m.balance);
                            const diff = hasFisico ? Number(m.diferencia) : 0;
                            return (
                              <tr key={m.metodoPagoId}>
                                <td className="py-2.5 font-semibold text-slate-700">{m.nombre}</td>
                                <td className="py-2.5">
                                  {esEfectivo ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                      Efectivo
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                                      Banco
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right text-emerald-600 font-mono font-semibold">{fmt(Number(m.ingresos))}</td>
                                <td className="py-2.5 text-right text-red-500 font-mono font-semibold">{fmt(Number(m.egresos))}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-slate-700">{fmt(Number(m.balance))}</td>
                                <td className="py-2.5 text-right font-mono font-semibold text-slate-600">
                                  {esEfectivo ? (hasGlobalCash ? '—' : fmt(physical)) : fmt(Number(m.balance))}
                                </td>
                                <td className={`py-2.5 text-right font-mono font-bold ${esEfectivo && hasGlobalCash ? 'text-slate-400' : diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                  {esEfectivo ? (hasGlobalCash ? 'Arqueo Global' : (diff === 0 ? 'Cuadra' : (diff < 0 ? `Faltante: ${fmt(Math.abs(diff))}` : `Sobrante: ${fmt(diff)}`))) : 'Cuadra'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section summaries */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-100 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Ingresos por Sección</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Abonos Iniciales:</span>
                          <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionIngresos.abonosIniciales || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Abonos Posteriores:</span>
                          <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionIngresos.abonosPosteriores || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-100 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Egresos por Sección</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Gastos Generales:</span>
                          <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos.gastosGenerales || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Gastos por Auto:</span>
                          <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos.gastosAuto || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Órdenes de Compra:</span>
                          <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos.gastosCompras || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pagos (Nómina/Personal):</span>
                          <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos.gastosPagos || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Users breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Movimientos por Usuario</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-1.5">Usuario</th>
                            <th className="py-1.5 text-right">Ingresos</th>
                            <th className="py-1.5 text-right">Egresos</th>
                            <th className="py-1.5 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {parsed.usuariosDetalle.map((u) => (
                            <tr key={u.id}>
                              <td className="py-2 font-semibold text-slate-700">{u.nombre}</td>
                              <td className="py-2 text-right text-emerald-600 font-mono">{fmt(Number(u.ingresos))}</td>
                              <td className="py-2 text-right text-red-500 font-mono">{fmt(Number(u.egresos))}</td>
                              <td className={`py-2 text-right font-mono font-bold ${Number(u.balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(Number(u.balance))}</td>
                            </tr>
                          ))}
                          {parsed.usuariosDetalle.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-2 text-slate-400">No se guardó desglose por usuarios para este periodo.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Observations */}
                  {selectedCierreDetail.observaciones && (
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Observaciones</h4>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap italic">"{selectedCierreDetail.observaciones}"</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
