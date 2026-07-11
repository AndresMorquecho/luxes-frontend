import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { 
  getGastos, saveGasto, deleteGasto, CATEGORIAS,
  getMetodosPago, getCierrePreview, saveCierre, getCierres,
  getVehiculos, getVehiculoDetails, saveVehiculo, deleteVehiculo,
  addMantenimiento, updateMantenimiento, deleteMantenimiento,
  getVehiculoControles, addVehiculoControl
} from '../../application/gastosService';
import { getUsuarios } from '../../../usuarios/application/usuariosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal.jsx';
import { 
  Car, Wrench, Calendar, DollarSign, Trash2, Edit, Plus, 
  ArrowLeft, AlertTriangle, CheckCircle, Clock, User, 
  Settings, Key, AlertCircle, Info, RefreshCw, FileText,
  ClipboardCheck, BarChart3, Filter, ArrowUp, ArrowDown, Scale, Wallet
} from 'lucide-react';
import { CierrePDFPreviewModal } from '../components/CierrePDFPreviewModal';

const EMPTY_FORM = { concepto: '', categoria: 'oficina', fecha: new Date().toISOString().split('T')[0], monto: 0, proveedor: '', notas: '', metodoPagoId: '' };

const EMPTY_VEHICULO_FORM = { placa: '', marca: '', modelo: '', anio: '', color: '', kilometraje: '', responsable: '', notas: '', estado: 'activo' };

const esMetodoEfectivo = (nombre) => {
  const name = (nombre || '').toLowerCase();
  return name.includes('efectivo') || name.includes('caja') || name.includes('chica') || name.includes('principal') || name.includes('cash');
};

const EMPTY_MAINT_FORM = { tipo: 'Cambio de Aceite', descripcion: '', fechaRealizado: new Date().toISOString().split('T')[0], fechaProxima: '', kilometraje: '', kmProximo: '', monto: 0, proveedor: '', notas: '', metodoPagoId: '' };

const EMPTY_CONTROL_FORM = {
  fecha: '',
  kilometraje: '',
  combustible: 'bueno',
  nivelAceite: false,
  nivelAgua: false,
  aceiteHidraulico: false,
  liquidoFrenos: false,
  gataLlave: false,
  extintorBotiquin: false,
  bandas: false,
  otroCheckNombre: '',
  otroCheckValor: false,
  observacion: '',
  sugerencia: ''
};

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
  
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = loggedInUser?.rol?.toLowerCase() === 'admin' || loggedInUser?.rol?.toLowerCase() === 'administrador';

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

  // --- ESTADOS CONTROLES ---
  const [controles, setControles] = useState([]);
  const [loadingControles, setLoadingControles] = useState(false);
  const [controlFormOpen, setControlFormOpen] = useState(false);
  const [viewingControl, setViewingControl] = useState(null);
  const [controlForm, setControlForm] = useState(EMPTY_CONTROL_FORM);
  const [formError, setFormError] = useState('');

  // --- ESTADOS MANTENIMIENTOS ---
  const [maintFormOpen, setMaintFormOpen] = useState(false);
  const [editingMaint, setEditingMaint] = useState(null);
  const [maintPage, setMaintPage] = useState(1);
  const maintLimit = 25;
  const [maintForm, setMaintForm] = useState(EMPTY_MAINT_FORM);
  const [savingMaint, setSavingMaint] = useState(false);
  const [maintFiltroTipo, setMaintFiltroTipo] = useState('todos');
  const [maintFiltroUsuarioId, setMaintFiltroUsuarioId] = useState('');
  const [maintFiltroMetodoPagoId, setMaintFiltroMetodoPagoId] = useState('');
  const [maintDateRange, setMaintDateRange] = useState({ desde: '', hasta: '' });

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
  const [pdfCierre, setPdfCierre] = useState(null);

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

  const loadControles = async (vehId) => {
    setLoadingControles(true);
    try {
      const data = await getVehiculoControles(vehId);
      setControles(data);
    } catch (err) {
      toast.error('Error al cargar historial de controles: ' + err.message);
    } finally {
      setLoadingControles(false);
    }
  };

  useEffect(() => {
    if (selectedVehiculo?.id) {
      loadControles(selectedVehiculo.id);
    }
  }, [selectedVehiculo]);

  const loadCierreHistory = async () => {
    setLoadingCierreHistory(true);
    try {
      const data = await getCierres();
      setCierreHistory(data || []);

      if (data && data.length > 0) {
        const latestCierre = data[0];
        if (latestCierre.fechaFin) {
          const nextDay = new Date(latestCierre.fechaFin);
          nextDay.setUTCDate(nextDay.getUTCDate() + 1);
          setCierreDates(prev => ({
            ...prev,
            desde: nextDay.toISOString().split('T')[0]
          }));
        }
      }
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
    const confirmed = await confirmDialog(
      'Confirmar Cierre de Caja',
      '¿Confirmar registro de cierre de caja para el rango seleccionado?'
    );
    if (!confirmed) return;
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

      const saved = await saveCierre({
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
      if (saved) {
        setPdfCierre(saved);
      }
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
    const confirmed = await confirmDialog(
      'Eliminar Gasto',
      '¿Estás seguro de eliminar este gasto? Si está asociado a un mantenimiento, se eliminará el registro de mantenimiento correspondiente.'
    );
    if (!confirmed) return;
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
    const confirmed = await confirmDialog(
      'Eliminar Vehículo',
      '¿Estás seguro de eliminar este vehículo? Esto eliminará todos sus mantenimientos y sus gastos asociados en la contabilidad.'
    );
    if (!confirmed) return;
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
    const confirmed = await confirmDialog(
      'Eliminar Mantenimiento',
      '¿Eliminar este mantenimiento? Esto también eliminará su entrada asociada en la lista de gastos generales.'
    );
    if (!confirmed) return;
    try {
      await deleteMantenimiento(maintId);
      toast.success('Registro de mantenimiento eliminado');
      refreshSelectedVehiculo(selectedVehiculo.id);
    } catch (err) {
      toast.error('Error al eliminar mantenimiento: ' + err.message);
    }
  };

  const openNewControl = () => {
    if (!selectedVehiculo) return;
    setControlForm({
      ...EMPTY_CONTROL_FORM,
      fecha: new Date().toISOString().slice(0, 16),
      kilometraje: selectedVehiculo.kilometraje || '',
    });
    setFormError('');
    setControlFormOpen(true);
  };

  const handleControlChange = (e) => {
    const { name, value, type, checked } = e.target;
    setControlForm((p) => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveControl = async (e) => {
    e.preventDefault();
    if (!selectedVehiculo) return;
    if (!controlForm.kilometraje || Number(controlForm.kilometraje) <= 0) {
      setFormError('El kilometraje debe ser mayor a 0');
      return;
    }

    setSavingMaint(true);
    setFormError('');
    try {
      const payload = {
        ...controlForm,
        kilometraje: Number(controlForm.kilometraje),
      };
      const saved = await addVehiculoControl(selectedVehiculo.id, payload);
      toast.success('Control registrado correctamente');
      
      setControles((prev) => [saved, ...prev]);

      setSelectedVehiculo((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          kilometraje: Math.max(prev.kilometraje, Number(controlForm.kilometraje)),
        };
      });
      setVehiculos((prev) =>
        prev.map((v) => {
          if (v.id === selectedVehiculo.id) {
            return {
              ...v,
              kilometraje: Math.max(v.kilometraje, Number(controlForm.kilometraje)),
            };
          }
          return v;
        })
      );

      setControlFormOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSavingMaint(false);
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
          flex-wrap: wrap;
          gap: 4px;
          background: rgba(241,245,249,0.7);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(226,232,240,0.8);
          width: 100%;
          max-width: max-content;
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
          .cc-desktop-table { display: table; }
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
      <div className="ga-card px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            {PAGE_META[activeTab]?.title || 'Finanzas'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">
            {PAGE_META[activeTab]?.subtitle || ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {activeTab === 'gastos' ? (
            <button onClick={openNewGasto} className="ga-btn-primary whitespace-nowrap">
              <Plus size={16} />
              Registrar Gasto
            </button>
          ) : activeTab === 'vehiculos' && !selectedVehiculo ? (
            <button onClick={openNewVehiculo} className="ga-btn-primary whitespace-nowrap">
              <Plus size={16} />
              Registrar Vehículo
            </button>
          ) : activeTab === 'cierre' ? (
            <Link to="/cierre-caja/historial" className="ga-btn-secondary text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 shadow-sm whitespace-nowrap">
              <Clock size={15} /> Historial de cierres
            </Link>
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
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="cc-desktop-table w-full text-[13px]">
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
                      const canEdit = isAdmin && g.origen === 'otros_gastos' && !g.readonly;

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
                
                {/* Vista Móvil (Cards) */}
                <div className="cc-mobile-cards">
                  <div className="flex flex-col gap-3 p-4 bg-slate-50/30">
                    {paginated.map((g) => {
                    const origenStyles = {
                      otros_gastos: { label: 'Otros Gastos', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
                      orden_compra: { label: 'Ordenes de Compra', bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
                      nomina: { label: 'Nómina', bg: 'rgba(16,185,129,0.1)', color: '#059669' },
                      vehiculo: { label: 'Vehículo', bg: 'rgba(236,72,153,0.1)', color: '#db2777' }
                    };
                    const style = origenStyles[g.origen] || origenStyles.otros_gastos;
                    const canEdit = isAdmin && g.origen === 'otros_gastos' && !g.readonly;

                    return (
                      <div 
                        key={`m-${g.origen || 'gasto'}-${g.id}`} 
                        className={`bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-2 shadow-sm ${canEdit ? 'cursor-pointer active:bg-blue-50/50 transition-colors' : ''}`}
                        onClick={() => { if (canEdit) openEditGasto(g); }}
                      >
                        <div className="flex justify-between items-start">
                          <span 
                            className="font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider"
                            style={{ backgroundColor: style.bg, color: style.color }}
                          >
                            {style.label}
                          </span>
                          <span className="font-bold text-slate-800 text-[15px]">{fmt(Number(g.monto))}</span>
                        </div>
                        <div className="text-[13px] font-semibold text-slate-800 mt-1">{g.concepto}</div>
                        {g.notas && g.origen !== 'orden_compra' && (
                          <div className="text-[11px] text-slate-400 -mt-1 leading-tight">{g.notas}</div>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-slate-100/80 pt-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span>{g.fecha ? new Date(g.fecha).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                            <span className="font-bold uppercase tracking-wider text-slate-400">{g.registradoPor?.nombre || 'Automático'}</span>
                          </div>
                          <span className="text-right max-w-[120px] truncate bg-slate-50 px-2 py-1 rounded-md">{g.metodoPago?.nombre || 'No especificado'}</span>
                        </div>
                      </div>
                    );
                  })}
                  {paginated.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm font-medium">No se encontraron gastos</div>
                  )}
                  </div>
                </div>
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

                <div className="flex flex-wrap gap-2 mt-2 w-full md:w-auto md:mt-0">
                  <button 
                    disabled={!isAdmin}
                    onClick={() => openEditVehiculo(selectedVehiculo)} 
                    className="ga-btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit size={14} />
                    Editar Info
                  </button>
                  <button 
                    disabled={!isAdmin}
                    onClick={() => handleDeleteVehiculo(selectedVehiculo.id)} 
                    className="ga-btn-secondary whitespace-nowrap hover:!text-red-600 hover:!border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                    Eliminar Vehículo
                  </button>
                  <button 
                    onClick={openNewMaint} 
                    className="ga-btn-primary whitespace-nowrap"
                  >
                    <Plus size={16} />
                    Registrar Mantenimiento
                  </button>
                  <button 
                    onClick={openNewControl} 
                    className="ga-btn-secondary text-emerald-600 border-emerald-100 hover:bg-emerald-50 whitespace-nowrap inline-flex items-center gap-1"
                  >
                    <ClipboardCheck size={14} />
                    Registrar Control
                  </button>
                </div>
              </div>

              {/* Diseño Principal del Vehículo */}
              <div className="flex flex-col gap-6">
                
                {/* Cabecera: Ficha y Alertas apiladas para mejor distribución */}
                <div className="flex flex-col gap-4">
                  
                  {/* Tarjetas Alertas de Salud del Vehículo (Minimalista) */}
                  <div className="ga-card p-4">
                    <h3 className="font-extrabold text-slate-800 text-sm mb-3 flex items-center gap-2">
                      <Wrench size={16} className="text-blue-500" />
                      Estado Preventivo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(() => {
                        const { oilAlert, tiresAlert, brakesAlert } = computeVehicleAlerts(selectedVehiculo);
                        const renderMinimalAlert = (title, alert) => (
                          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${alert.status === 'ok' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : alert.status === 'warning' ? 'bg-amber-50/50 border-amber-100 text-amber-800' : 'bg-red-50/50 border-red-100 text-red-800'}`}>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-xs">{title}</span>
                              <span className="text-[10px] font-medium opacity-80 mt-0.5">{alert.message}</span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${alert.status === 'ok' ? 'border-emerald-200 bg-emerald-100/50' : alert.status === 'warning' ? 'border-amber-200 bg-amber-100/50' : 'border-red-200 bg-red-100/50'}`}>
                              {alert.status === 'ok' ? 'Al día' : 'Revisar'}
                            </span>
                          </div>
                        );
                        return (
                          <>
                            {renderMinimalAlert("Aceite", oilAlert)}
                            {renderMinimalAlert("Llantas", tiresAlert)}
                            {renderMinimalAlert("Frenos", brakesAlert)}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Información Ficha Técnica */}
                  <div className="ga-card p-5">
                    <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <Info size={16} className="text-blue-500" />
                      Detalles del Vehículo
                    </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-400">Marca / Modelo:</span>
                      <span className="font-bold text-slate-800">{selectedVehiculo.marca} {selectedVehiculo.modelo}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-400">Año / Color:</span>
                      <span className="font-bold text-slate-800">{selectedVehiculo.anio || 'N/D'} • {selectedVehiculo.color || 'N/D'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-400">Kilometraje:</span>
                      <span className="font-bold text-blue-600">{(selectedVehiculo.kilometraje || 0).toLocaleString()} km</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-400">Estado:</span>
                      <span className="font-bold text-slate-800 capitalize">{selectedVehiculo.estado}</span>
                    </div>
                    <div className="col-span-full pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-400 block mb-1">Observaciones / Notas:</span>
                      <p className="text-slate-600 italic leading-relaxed">{selectedVehiculo.notas || 'Sin observaciones adicionales.'}</p>
                    </div>
                  </div>
                </div>
                </div>

                {/* Filtros de Mantenimientos */}
                <div className="ga-card p-4 relative z-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Tipo de Mantenimiento</label>
                      <select 
                        value={maintFiltroTipo}
                        onChange={(e) => setMaintFiltroTipo(e.target.value)}
                        className="ga-input w-full !bg-slate-50 hover:!bg-white focus:!bg-white transition-colors"
                      >
                        <option value="todos">Todos los Tipos</option>
                        <option value="Cambio de Aceite">Cambio de Aceite</option>
                        <option value="Cambio de Llantas">Cambio de Llantas</option>
                        <option value="Revisión de Frenos">Revisión de Frenos</option>
                        <option value="Reparación Mecánica">Reparación Mecánica</option>
                        <option value="ABC Motor">ABC Motor</option>
                        <option value="Otros (Describir)">Otros (Describir)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Registrado por</label>
                      <select
                        value={maintFiltroUsuarioId}
                        onChange={(e) => setMaintFiltroUsuarioId(e.target.value)}
                        className="ga-input w-full !bg-slate-50 hover:!bg-white focus:!bg-white transition-colors"
                      >
                        <option value="">Cualquier Usuario</option>
                        <option value="auto">Automático</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Método de Pago</label>
                      <select
                        value={maintFiltroMetodoPagoId}
                        onChange={(e) => setMaintFiltroMetodoPagoId(e.target.value)}
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
                          value={maintDateRange}
                          onChange={setMaintDateRange}
                          placeholder="Rango de fechas"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historial de Mantenimientos Realizados */}
                <div className="ga-card w-full mb-6">
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
                      <table className="cc-desktop-table hidden md:table w-full text-[13px]">
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
                          {(() => {
                            let allMaints = selectedVehiculo.mantenimientos || [];
                            
                            if (maintFiltroTipo !== 'todos') {
                              allMaints = allMaints.filter(m => m.tipo === maintFiltroTipo);
                            }
                            if (maintFiltroUsuarioId) {
                              allMaints = allMaints.filter(m => {
                                const uid = m.gasto?.registradoPor?.id;
                                if (maintFiltroUsuarioId === 'auto') return !uid;
                                return uid === maintFiltroUsuarioId;
                              });
                            }
                            if (maintFiltroMetodoPagoId) {
                              allMaints = allMaints.filter(m => m.gasto?.metodoPago?.id === maintFiltroMetodoPagoId);
                            }
                            if (maintDateRange.desde && maintDateRange.hasta) {
                              const start = new Date(maintDateRange.desde);
                              const end = new Date(maintDateRange.hasta);
                              end.setHours(23, 59, 59, 999);
                              allMaints = allMaints.filter(m => {
                                const dStr = m.gasto?.createdAt || m.fechaRealizado;
                                const d = new Date(dStr);
                                return d >= start && d <= end;
                              });
                            }

                            const totalPagesMaint = Math.ceil(allMaints.length / maintLimit);
                            const paginatedMaints = allMaints.slice((maintPage - 1) * maintLimit, maintPage * maintLimit);
                            
                            return (
                              <>
                                {paginatedMaints.map((m) => (
                                  <tr key={m.id} className="ga-tr">
                                    <td className="px-5 py-3.5">
                                      <div className="font-bold text-slate-800">{m.tipo}</div>
                                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        {m.gasto?.createdAt ? new Date(m.gasto.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : m.fechaRealizado.split('T')[0]}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {m.gasto?.registradoPor?.nombre || 'Automático'}
                                      </div>
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
                                          disabled={!isAdmin}
                                          onClick={() => openEditMaint(m)}
                                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                                          title="Editar"
                                        >
                                          <Edit size={13} />
                                        </button>
                                        <button 
                                          disabled={!isAdmin}
                                          onClick={() => handleDeleteMaint(m.id)}
                                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                                          title="Eliminar"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {paginatedMaints.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="text-center py-10 text-slate-400 italic text-xs font-semibold">
                                      Sin registros de mantenimientos previos.
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                      
                      {/* Vista Móvil (Cards) */}
                      <div className="cc-mobile-cards">
                        <div className="flex flex-col gap-3 p-4 bg-slate-50/30">
                          {(() => {
                              let allMaints = selectedVehiculo.mantenimientos || [];
                            
                            if (maintFiltroTipo !== 'todos') {
                              allMaints = allMaints.filter(m => m.tipo === maintFiltroTipo);
                            }
                            if (maintFiltroUsuarioId) {
                              allMaints = allMaints.filter(m => {
                                const uid = m.gasto?.registradoPor?.id;
                                if (maintFiltroUsuarioId === 'auto') return !uid;
                                return uid === maintFiltroUsuarioId;
                              });
                            }
                            if (maintFiltroMetodoPagoId) {
                              allMaints = allMaints.filter(m => m.gasto?.metodoPago?.id === maintFiltroMetodoPagoId);
                            }
                            if (maintDateRange.desde && maintDateRange.hasta) {
                              const start = new Date(maintDateRange.desde);
                              const end = new Date(maintDateRange.hasta);
                              end.setHours(23, 59, 59, 999);
                              allMaints = allMaints.filter(m => {
                                const dStr = m.gasto?.createdAt || m.fechaRealizado;
                                const d = new Date(dStr);
                                return d >= start && d <= end;
                              });
                            }

                            const paginatedMaints = allMaints.slice((maintPage - 1) * maintLimit, maintPage * maintLimit);
                            
                            return (
                              <>
                                {paginatedMaints.map((m) => (
                                  <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-2.5 shadow-sm relative">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-bold text-slate-800 text-[14px]">{m.tipo}</div>
                                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                                          {m.gasto?.createdAt ? new Date(m.gasto.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : m.fechaRealizado.split('T')[0]}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                          {m.gasto?.registradoPor?.nombre || 'Automático'}
                                        </div>
                                      </div>
                                      <span className="font-bold text-slate-800 text-[15px]">{fmt(Number(m.monto))}</span>
                                    </div>
                                    
                                    <div className="text-[13px] text-slate-600 mt-0.5">{m.descripcion || 'Sin descripción'}</div>
                                    
                                    <div className="flex justify-between items-end mt-2 pt-2.5 border-t border-slate-100/80 text-[11px]">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-slate-500"><span className="font-semibold text-slate-400">KM:</span> {m.kilometraje ? `${m.kilometraje.toLocaleString()}` : '—'}</span>
                                        <span className="text-slate-500"><span className="font-semibold text-slate-400">Prov:</span> {m.proveedor || '—'}</span>
                                      </div>
                                      
                                      <div className="flex gap-1">
                                        <button 
                                          disabled={!isAdmin}
                                          onClick={() => openEditMaint(m)}
                                          className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                                        >
                                          <Edit size={14} />
                                        </button>
                                        <button 
                                          disabled={!isAdmin}
                                          onClick={() => handleDeleteMaint(m.id)}
                                          className="p-2 rounded-lg bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {paginatedMaints.length === 0 && (
                                  <div className="text-center py-6 text-slate-400 italic text-xs font-semibold">Sin registros de mantenimientos previos.</div>
                                )}
                              </>
                            );
                        })()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Paginación de Mantenimientos */}
                    {(() => {
                      let allMaints = selectedVehiculo.mantenimientos || [];
                      
                      if (maintFiltroTipo !== 'todos') {
                        allMaints = allMaints.filter(m => m.tipo === maintFiltroTipo);
                      }
                      if (maintFiltroUsuarioId) {
                        allMaints = allMaints.filter(m => {
                          const uid = m.gasto?.registradoPor?.id;
                          if (maintFiltroUsuarioId === 'auto') return !uid;
                          return uid === maintFiltroUsuarioId;
                        });
                      }
                      if (maintFiltroMetodoPagoId) {
                        allMaints = allMaints.filter(m => m.gasto?.metodoPago?.id === maintFiltroMetodoPagoId);
                      }
                      if (maintDateRange.desde && maintDateRange.hasta) {
                        const start = new Date(maintDateRange.desde);
                        const end = new Date(maintDateRange.hasta);
                        end.setHours(23, 59, 59, 999);
                        allMaints = allMaints.filter(m => {
                          const dStr = m.gasto?.createdAt || m.fechaRealizado;
                          const d = new Date(dStr);
                          return d >= start && d <= end;
                        });
                      }

                      const totalPagesMaint = Math.ceil(allMaints.length / maintLimit);
                      if (totalPagesMaint <= 1) return null;
                      return (
                        <div className="px-5 py-3 border-t border-slate-100/60 bg-slate-50/50 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Mostrando {(maintPage - 1) * maintLimit + 1} a {Math.min(maintPage * maintLimit, allMaints.length)} de {allMaints.length}
                          </span>
                          <div className="flex gap-1">
                            <button 
                              disabled={maintPage === 1} 
                              onClick={() => setMaintPage(p => p - 1)}
                              className="px-3 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >Anterior</button>
                            <button 
                              disabled={maintPage === totalPagesMaint} 
                              onClick={() => setMaintPage(p => p + 1)}
                              className="px-3 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >Siguiente</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Historial de Controles Diarios */}
                  <div className="ga-card w-full">
                    <div className="px-5 py-4 border-b border-slate-100/60 flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        Historial de Controles Diarios
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold">
                        {controles.length} registros
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      {loadingControles ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-xs">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-blue-600" />
                          <span>Cargando controles...</span>
                        </div>
                      ) : controles.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs py-12">Sin controles diarios registrados para este vehículo.</p>
                      ) : (
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                              <th className="px-4 py-3">Fecha y Hora</th>
                              <th className="px-4 py-3">Operador</th>
                              <th className="px-4 py-3">Kilometraje</th>
                              <th className="px-4 py-3 text-center">Combustible</th>
                              <th className="px-4 py-3">Niveles Check</th>
                              <th className="px-4 py-3">Observación / Sugerencia</th>
                              <th className="px-4 py-3 text-center w-16">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {controles.map((log) => {
                              const checksCount = [
                                log.nivelAceite, log.nivelAgua, log.aceiteHidraulico,
                                log.liquidoFrenos, log.gataLlave, log.extintorBotiquin, log.bandas
                              ].filter(Boolean).length;

                              const fechaFmt = new Date(log.fecha).toLocaleString('es-EC', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              });

                              const fuelLabel = log.combustible === 'bajo' ? 'Bajo' : log.combustible === 'medio' ? 'Medio' : 'Bueno';
                              const fuelColor = log.combustible === 'bajo' ? 'text-red-700 bg-red-50 border-red-200' :
                                                log.combustible === 'medio' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                                'text-emerald-700 bg-emerald-50 border-emerald-200';

                              return (
                                <tr key={log.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{fechaFmt}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="flex items-center gap-1">
                                      <User size={12} className="text-slate-400" />
                                      {log.usuarioNom}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{log.kilometraje.toLocaleString()} km</td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${fuelColor}`}>
                                      {fuelLabel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-slate-600 block">{checksCount} / 7 OK</span>
                                      {log.otroCheckNombre && (
                                        <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border ${
                                          log.otroCheckValor ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'
                                        }`}>
                                          {log.otroCheckNombre}: {log.otroCheckValor ? 'OK' : 'Novedad'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 max-w-[200px]">
                                    {log.observacion && <p className="line-clamp-2"><strong className="font-bold text-slate-500">Obs:</strong> {log.observacion}</p>}
                                    {log.sugerencia && <p className="line-clamp-2 mt-0.5"><strong className="font-bold text-slate-500">Sugerencia:</strong> {log.sugerencia}</p>}
                                    {!log.observacion && !log.sugerencia && <span className="text-slate-400">Sin novedades</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setViewingControl(log)}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-blue-600 transition-colors border border-slate-200"
                                      title="Ver detalles"
                                    >
                                      <Eye size={13} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
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
          {/* Row 1: KPI Cards (full-width) */}
          {cierrePreview && !loadingPreview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              {/* Card 1: Ingresos */}
              <div className="ga-card flex items-center gap-4 px-5 py-4 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-blue-50/70 flex items-center justify-center text-blue-600 shrink-0">
                  <ArrowUp size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Ingresos Totales</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(cierrePreview.totalIngresos)}</div>
                  <div className="text-[9.5px] text-slate-400 font-semibold mt-0.5">{cierrePreview.ingresosConteo} transacción{cierrePreview.ingresosConteo === 1 ? '' : 'es'}</div>
                </div>
              </div>

              {/* Card 2: Egresos */}
              <div className="ga-card flex items-center gap-4 px-5 py-4 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-rose-50/70 flex items-center justify-center text-rose-500 shrink-0">
                  <ArrowDown size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Egresos Totales</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(cierrePreview.totalEgresos)}</div>
                  <div className="text-[9.5px] text-slate-400 font-semibold mt-0.5">{cierrePreview.egresosConteo} transacción{cierrePreview.egresosConteo === 1 ? '' : 'es'}</div>
                </div>
              </div>

              {/* Card 3: Balance */}
              <div className="ga-card flex items-center gap-4 px-5 py-4 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-indigo-50/70 flex items-center justify-center text-indigo-600 shrink-0">
                  <Scale size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Balance Neto</div>
                  <div className={`text-xl font-extrabold mt-0.5 ${cierrePreview.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    {cierrePreview.balance < 0 ? '-' : ''}{fmt(Math.abs(cierrePreview.balance))}
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Saldo en sistema</div>
                </div>
              </div>

              {/* Card 4: Efectivo Esperado */}
              {(() => {
                const totalEfectivoEsperado = (cierrePreview.metodosDetalle || [])
                  .filter(m => esMetodoEfectivo(m.nombre))
                  .reduce((sum, m) => sum + Number(m.balance), 0);
                return (
                  <div className="ga-card flex items-center gap-4 px-5 py-4 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-full bg-emerald-50/70 flex items-center justify-center text-emerald-600 shrink-0">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Efectivo en Sistema</div>
                      <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totalEfectivoEsperado)}</div>
                      <div className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Esperado</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Row 2: Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Panel Lateral: Parámetros y Arqueo (Izquierda) */}
            <div className="lg:col-span-1 flex flex-col">
              <div className="ga-card p-5 relative z-[60] flex flex-col h-full" style={{ overflow: 'visible' }}>
                <div className="space-y-4 flex-1">
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
                            <div className="flex items-center gap-1">
                              {diferenciaEfectivo === 0 && (
                                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${diferenciaEfectivo === 0 ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-rose-100 border-rose-200 text-rose-800'}`}>
                                {diferenciaEfectivo === 0 ? 'Cuadra' : (diferenciaEfectivo < 0 ? 'Faltante' : 'Sobrante')}
                              </span>
                            </div>
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
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
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
            </div>

            {/* Panel Principal: Resultados (Derecha) */}
            <div className="lg:col-span-2 space-y-6">
              {loadingPreview ? (
                <div className="ga-card flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
                </div>
              ) : cierrePreview ? (
                <div className="space-y-6 animate-slide-up">
                  {/* Resumen por Métodos de Pago */}
                  <div className="ga-card p-6">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <ClipboardCheck size={14} className="text-blue-500" />
                      Saldos de Métodos de Pago
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-left font-bold uppercase tracking-wider">
                            <th className="py-2.5">Método</th>
                            <th className="py-2.5">Tipo</th>
                            <th className="py-2.5 text-right">Ingresos (+)</th>
                            <th className="py-2.5 text-right">Egresos (-)</th>
                            <th className="py-2.5 text-right">Balance Sistema</th>
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
                                  {m.balance < 0 ? '-' : ''}{fmt(Math.abs(m.balance))}
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
                            <span className="text-slate-600 font-medium font-semibold">Abonos Iniciales</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionIngresos?.abonosIniciales || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-slate-600 font-medium font-semibold">Abonos Posteriores</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionIngresos?.abonosPosteriores || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium font-semibold">Gastos Generales</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosGenerales || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium font-semibold">Gastos por Auto / Vehículo</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosAuto || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium font-semibold">Órdenes de Compra</span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">{fmt(cierrePreview.seccionEgresos?.gastosCompras || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 font-medium font-semibold">Pagos (Nómina/Personal)</span>
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
                              <th className="py-2.5">Usuario</th>
                              <th className="py-2.5 text-right">Ingresos</th>
                              <th className="py-2.5 text-right">Egresos</th>
                              <th className="py-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150/40">
                            {(cierrePreview.usuariosDetalle || []).map((u) => (
                              <tr key={u.id} className="ga-tr">
                                <td className="py-3 font-semibold text-slate-700">{u.nombre?.toUpperCase()}</td>
                                <td className="py-3 text-right text-emerald-600 font-bold font-mono">{fmt(u.ingresos)}</td>
                                <td className="py-3 text-right text-red-500 font-bold font-mono">{fmt(u.egresos)}</td>
                                <td className={`py-3 text-right font-extrabold font-mono ${u.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {u.balance < 0 ? '-' : ''}{fmt(Math.abs(u.balance))}
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

      {/* 4. MODAL PREVIEW PDF CIERRE */}
      <CierrePDFPreviewModal isOpen={!!pdfCierre} onClose={() => setPdfCierre(null)} cierre={pdfCierre} />

      {/* Modal para Visualizar Detalles del Control */}
      <ModalPortal open={!!viewingControl}>
        <div className="ga-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px) saturate(130%)', WebkitBackdropFilter: 'blur(10px) saturate(130%)' }}
            onClick={() => deferClose(() => setViewingControl(null))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-ga-modal-in max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 shrink-0 bg-white">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Detalles de Control Diario</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedVehiculo?.placa} — {viewingControl ? new Date(viewingControl.fecha).toLocaleDateString() : ''}</p>
                </div>
                <button type="button" onClick={() => deferClose(() => setViewingControl(null))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all border border-slate-200">
                  ✕
                </button>
              </div>

              {viewingControl && (
                <div className="overflow-y-auto p-6 space-y-5 text-slate-700">
                  {/* Meta data */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-450 block mb-0.5 uppercase tracking-wider font-bold text-[10px]">Fecha y Hora</span>
                      <span className="font-bold text-slate-700">
                        {new Date(viewingControl.fecha).toLocaleString('es-EC', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 block mb-0.5 uppercase tracking-wider font-bold text-[10px]">Operador</span>
                      <span className="font-bold text-slate-700">{viewingControl.usuarioNom}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-450 block mb-0.5 uppercase tracking-wider font-bold text-[10px]">Kilometraje</span>
                      <span className="font-extrabold text-blue-600 text-sm">{(viewingControl.kilometraje || 0).toLocaleString()} km</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block mb-0.5 uppercase tracking-wider font-bold text-[10px] mt-2">Combustible</span>
                      <span className="font-bold text-slate-700 capitalize mt-2 block">{viewingControl.combustible === 'bajo' ? 'Bajo (Menos de 1/4)' : viewingControl.combustible === 'medio' ? 'Medio (Media capacidad)' : 'Bueno (Lleno/Casi lleno)'}</span>
                    </div>
                  </div>

                  {/* Matrix state */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full" />
                      Estado de Niveles y Herramientas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'nivelAceite', label: 'Nivel de Aceite' },
                        { key: 'nivelAgua', label: 'Nivel de Agua' },
                        { key: 'aceiteHidraulico', label: 'Aceite Hidráulico / Líquido' },
                        { key: 'liquidoFrenos', label: 'Líquido de Frenos' },
                        { key: 'gataLlave', label: 'Gata y Llave de Ruedas' },
                        { key: 'extintorBotiquin', label: 'Extintor y Botiquín' },
                        { key: 'bandas', label: 'Juego de Bandas' }
                      ].map((item) => {
                        const ok = viewingControl[item.key];
                        return (
                          <div key={item.key} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                            ok ? 'bg-emerald-50/20 border-emerald-100 text-emerald-800' : 'bg-slate-50/30 border-slate-200 text-slate-500'
                          }`}>
                            <span className="font-semibold">{item.label}</span>
                            {ok ? (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">OK</span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">No OK</span>
                            )}
                          </div>
                        );
                      })}

                      {viewingControl.otroCheckNombre && (
                        <div className={`col-span-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                          viewingControl.otroCheckValor ? 'bg-emerald-50/20 border-emerald-100 text-emerald-800' : 'bg-slate-50/30 border-slate-200 text-slate-500'
                        }`}>
                          <span className="font-semibold">{viewingControl.otroCheckNombre} (Adicional)</span>
                          {viewingControl.otroCheckValor ? (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">OK</span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">No OK</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Obs and suggestions */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    {viewingControl.observacion && (
                      <div className="text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Observación</span>
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-100">{viewingControl.observacion}</div>
                      </div>
                    )}
                    {viewingControl.sugerencia && (
                      <div className="text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Sugerencia o Recomendación</span>
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-100">{viewingControl.sugerencia}</div>
                      </div>
                    )}
                    {!viewingControl.observacion && !viewingControl.sugerencia && (
                      <p className="text-center text-slate-400 text-xs py-2 italic font-medium">Sin observaciones ni sugerencias registradas.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button type="button" onClick={() => deferClose(() => setViewingControl(null))} className="bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2 rounded-xl text-xs transition-all border border-slate-300 bg-white">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* 5. MODAL REGISTRO CONTROL DE VEHÍCULO */}
      <ModalPortal open={controlFormOpen}>
        <div className="ga-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px) saturate(130%)', WebkitBackdropFilter: 'blur(10px) saturate(130%)' }}
            onClick={() => deferClose(() => setControlFormOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-ga-modal-in max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 shrink-0 bg-white">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Registrar Control de Vehículo</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedVehiculo?.placa} — checklist de control circular</p>
                </div>
                <button type="button" onClick={() => deferClose(() => setControlFormOpen(false))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all border border-slate-200">
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-6 flex-1 min-h-0">
                <form onSubmit={handleSaveControl} className="space-y-6">
                  {/* Row 1: Date/Time, Mileage, Fuel */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Fecha y Hora *</label>
                      <input
                        type="datetime-local"
                        name="fecha"
                        value={controlForm.fecha}
                        onChange={handleControlChange}
                        required
                        className="ga-input"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Kilometraje *</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="kilometraje"
                          value={controlForm.kilometraje}
                          onChange={handleControlChange}
                          required
                          placeholder={`Actual: ${selectedVehiculo?.kilometraje || 0}`}
                          className="ga-input pr-10 font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">km</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nivel Combustible *</label>
                      <select
                        name="combustible"
                        value={controlForm.combustible}
                        onChange={handleControlChange}
                        className="ga-input bg-white font-semibold"
                      >
                        <option value="bajo">Bajo (Menos de 1/4)</option>
                        <option value="medio">Medio (Media capacidad)</option>
                        <option value="bueno">Bueno (Lleno/Casi lleno)</option>
                      </select>
                    </div>
                  </div>

                  {/* Checkbox Matrix */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                      Niveles y Herramientas (OK)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { name: 'nivelAceite', label: 'Nivel de Aceite' },
                        { name: 'nivelAgua', label: 'Nivel de Agua' },
                        { name: 'aceiteHidraulico', label: 'Aceite Hidráulico / Líquido' },
                        { name: 'liquidoFrenos', label: 'Líquido de Frenos' },
                        { name: 'gataLlave', label: 'Gata y Llave de Ruedas' },
                        { name: 'extintorBotiquin', label: 'Extintor y Botiquín' },
                        { name: 'bandas', label: 'Juego de Bandas' }
                      ].map((item) => (
                        <label
                          key={item.name}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            controlForm[item.name]
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 font-medium'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={item.name}
                            checked={controlForm[item.name]}
                            onChange={handleControlChange}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                          />
                          <span className="text-xs font-semibold">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom check item */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                      Otros Accesorios / Controles
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre del Accesorio / Control Adicional</label>
                        <input
                          type="text"
                          name="otroCheckNombre"
                          value={controlForm.otroCheckNombre}
                          onChange={handleControlChange}
                          placeholder="Ej. Estado de llantas, Luces, etc."
                          className="ga-input text-xs"
                        />
                      </div>
                      <div>
                        <label
                          className={`flex items-center gap-3 h-10 px-3 rounded-xl border transition-all cursor-pointer select-none ${
                            controlForm.otroCheckValor
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="otroCheckValor"
                            checked={controlForm.otroCheckValor}
                            onChange={handleControlChange}
                            disabled={!controlForm.otroCheckNombre.trim()}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 disabled:opacity-55"
                          />
                          <span className="text-xs font-semibold">¿Está OK?</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Observations and suggestions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Observación</label>
                      <textarea
                        name="observacion"
                        value={controlForm.observacion}
                        onChange={handleControlChange}
                        rows={2}
                        placeholder="Detalla si encontraste alguna novedad..."
                        className="ga-input resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Sugerencia</label>
                      <textarea
                        name="sugerencia"
                        value={controlForm.sugerencia}
                        onChange={handleControlChange}
                        rows={2}
                        placeholder="Indica qué reparación o revisión recomiendas..."
                        className="ga-input resize-none"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {formError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                    <button type="button" onClick={() => deferClose(() => setControlFormOpen(false))} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all">Cancelar</button>
                    <button type="submit" disabled={savingMaint} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1 ${savingMaint ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!savingMaint}
                      />
                      Registrar Control
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
