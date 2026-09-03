import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Trash2, X, FileText, AlertCircle, Clock, CheckCircle2, CreditCard, Calendar, Hash, Info, Pencil, Plus, Search, ChevronDown } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import {
  getCuentasPorPagar, registrarAbono, getMetodosPago, getComprasStats, getAbonos, eliminarAbono,
  getCheques, procesarChequeManual, editarCheque, eliminarCheque, createCuentaPorPagarManual, getProveedores
} from '../../application/comprasService';
import { buildOrdenParaAbono, getAbonoSaldoPendiente } from '../../helpers/ordenCompraHelpers';
import { ComprasPageHeader } from '../components/ComprasPageHeader';
import { isAdminUser } from '../../../../shared/utils/userRoleHelpers';
import './ComprasPage.css';

const CO_PRIMARY = '#2b41b8';
const CO_PRIMARY_HOVER = '#2436a0';
const CO_NAVY = '#1a1c3d';

const CXP_BADGES = {
  pendiente: { bg: 'bg-red-50', color: 'text-red-700', dot: 'bg-red-500', label: 'PENDIENTE' },
  parcial: { bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', label: 'PARCIAL' },
  pagado: { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PAGADO' },
  vencido: { bg: 'bg-red-50', color: 'text-red-800', dot: 'bg-red-600', label: 'VENCIDO' },
};

const ESTADO_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'vencido', label: 'Vencido' },
];

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const SearchableProveedorSelect = ({ proveedores, value, onChange }) => {
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

  const selectedProv = proveedores.find((p) => p.id === value);

  const filtered = proveedores.filter((p) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.ruc || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative" ref={containerRef}>
      <label className="block font-bold text-slate-700 mb-1">Proveedor *</label>
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 transition-all cursor-pointer flex items-center justify-between shadow-2xs"
      >
        <span className={selectedProv ? "text-slate-800 font-semibold truncate text-xs sm:text-sm" : "text-slate-400 text-xs sm:text-sm"}>
          {selectedProv ? `${selectedProv.nombre}${selectedProv.ruc ? ` (${selectedProv.ruc})` : ''}` : '-- Seleccionar Proveedor Registrado --'}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-fade-in">
          <div className="relative mb-1.5">
            <Search size={14} className="text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2b41b8]/20 focus:border-[#2b41b8]"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="p-3 text-xs text-slate-400 text-center font-medium">No se encontraron proveedores registrados</p>
            ) : (
              filtered.map((p) => {
                const isSelected = p.id === value;
                return (
                  <div
                    key={p.id}
                    onClick={() => { onChange(p.id); setIsOpen(false); }}
                    className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{p.nombre}</span>
                    {p.ruc && <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{p.ruc}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CuentasPorPagarPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isAdminUser(currentUser);
  const [searchParams] = useSearchParams();
  const paramOrdenId = searchParams.get('ordenId');
  const paramOrdenNumero = searchParams.get('ordenNumero');
  const paramCxpId = searchParams.get('cxpId');
  const paramAction = searchParams.get('action'); // 'ver' | 'abono'
  const [hasProcessedDeepLink, setHasProcessedDeepLink] = useState(false);

  const [chequesList, setChequesList] = useState([]);
  const [chequesLoading, setChequesLoading] = useState(false);
  const [procesandoChequeId, setProcesandoChequeId] = useState(null);

  // States para edición de cheque dentro del modal "Ver"
  const [editingChequeId, setEditingChequeId] = useState(null);
  const [editChequeNumero, setEditChequeNumero] = useState('');
  const [editChequeFecha, setEditChequeFecha] = useState('');
  const [editChequeMonto, setEditChequeMonto] = useState('');
  const [savingChequeEdit, setSavingChequeEdit] = useState(false);

  const [stats, setStats] = useState({ totalOrdenes: 0, pendientes: 0, totalGastado: 0, totalDeuda: 0 });
  const [cxpItems, setCxpItems] = useState([]);
  const [cxpPage, setCxpPage] = useState(1);
  const [cxpTotal, setCxpTotal] = useState(0);
  const [cxpFilter, setCxpFilter] = useState('');
  const [cxpLoading, setCxpLoading] = useState(true);
  const [metodos, setMetodos] = useState([]);

  // Modal Registrar Abono
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoOrden, setAbonoOrden] = useState(null);
  const [abonoForm, setAbonoForm] = useState({
    metodoPagoId: '',
    monto: '',
    referencia: '',
    esChequePosfechado: false,
    numeroCheque: '',
    fechaCobro: '',
  });
  const [abonoSaving, setAbonoSaving] = useState(false);
  
  // Modal Ver Pagos / Abonos
  const [verModalOpen, setVerModalOpen] = useState(false);
  const [verCuenta, setVerCuenta] = useState(null);
  const [verAbonosList, setVerAbonosList] = useState([]);
  const [verLoading, setVerLoading] = useState(false);
  const [deletingAbonoId, setDeletingAbonoId] = useState(null);
  const [confirmDeleteAbono, setConfirmDeleteAbono] = useState(null);

  // Modal Crear Cuenta por Pagar Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [proveedoresList, setProveedoresList] = useState([]);
  const [manualForm, setManualForm] = useState({
    proveedorId: '',
    proveedorNombreManual: '',
    concepto: '',
    montoTotal: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    proyectoId: '',
    notas: '',
    registrarAbonoInicial: false,
    abonoMetodoPagoId: '',
    abonoMonto: '',
    abonoReferencia: '',
    esChequePosfechado: false,
    numeroCheque: '',
    fechaCobro: '',
  });
  const [manualSaving, setManualSaving] = useState(false);

  const handleOpenManualModal = async () => {
    try {
      const provs = await getProveedores();
      setProveedoresList(provs || []);
    } catch (e) {
      console.error('Error al cargar proveedores:', e);
    }
    setManualForm({
      proveedorId: '',
      proveedorNombreManual: '',
      concepto: '',
      montoTotal: '',
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      proyectoId: '',
      notas: '',
      registrarAbonoInicial: false,
      abonoMetodoPagoId: '',
      abonoMonto: '',
      abonoReferencia: '',
      esChequePosfechado: false,
      numeroCheque: '',
      fechaCobro: '',
    });
    setManualModalOpen(true);
  };

  const handleManualSave = async (e) => {
    e.preventDefault();
    if (!manualForm.concepto.trim()) {
      toast.error('El concepto o descripción es obligatorio.');
      return;
    }
    const monto = parseFloat(manualForm.montoTotal);
    if (isNaN(monto) || monto <= 0) {
      toast.error('Ingrese un monto total válido mayor a $0.00.');
      return;
    }
    if (!manualForm.proveedorId) {
      toast.error('Debe seleccionar un proveedor registrado de la lista.');
      return;
    }

    setManualSaving(true);
    try {
      const payload = {
        proveedorId: manualForm.proveedorId,
        concepto: manualForm.concepto.trim(),
        montoTotal: monto,
        fechaEmision: manualForm.fechaEmision || undefined,
        fechaVencimiento: manualForm.fechaVencimiento || undefined,
        proyectoId: manualForm.proyectoId || undefined,
        notas: manualForm.notas.trim() || undefined,
      };

      if (manualForm.registrarAbonoInicial && manualForm.abonoMetodoPagoId && parseFloat(manualForm.abonoMonto) > 0) {
        payload.abonoInicial = {
          metodoPagoId: manualForm.abonoMetodoPagoId,
          monto: parseFloat(manualForm.abonoMonto),
          referencia: manualForm.abonoReferencia.trim() || undefined,
          esChequePosfechado: manualForm.esChequePosfechado,
          numeroCheque: manualForm.numeroCheque.trim() || undefined,
          fechaCobro: manualForm.fechaCobro || undefined,
        };
      }

      await createCuentaPorPagarManual(payload);
      toast.success('Cuenta por pagar manual registrada con éxito 🎉');
      setManualModalOpen(false);
      loadCxP();
      loadStats();
      loadMetodos();
      loadCheques();
    } catch (err) {
      toast.error(err.message || 'Error al registrar la cuenta por pagar.');
    } finally {
      setManualSaving(false);
    }
  };

  const perPage = 25;

  const loadStats = useCallback(async () => {
    try { const s = await getComprasStats(); setStats(s); } catch { }
  }, []);

  const loadCxP = useCallback(async () => {
    setCxpLoading(true);
    try {
      const data = await getCuentasPorPagar({ page: cxpPage, limit: perPage, estado: cxpFilter || undefined });
      setCxpItems(data.items || []);
      setCxpTotal(data.total || 0);
    } catch {
      setCxpItems([]);
      setCxpTotal(0);
    } finally {
      setCxpLoading(false);
    }
  }, [cxpPage, cxpFilter]);

  const loadMetodos = useCallback(async () => {
    try { const m = await getMetodosPago(); setMetodos(m); } catch { }
  }, []);

  const loadCheques = useCallback(async () => {
    setChequesLoading(true);
    try {
      const data = await getCheques();
      setChequesList(data || []);
    } catch {
      setChequesList([]);
    } finally {
      setChequesLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); loadMetodos(); loadCheques(); }, [loadStats, loadMetodos, loadCheques]);
  useEffect(() => { loadCxP(); }, [loadCxP]);
  useEffect(() => { setCxpPage(1); }, [cxpFilter]);

  const fetchVerPagosData = async (cuenta) => {
    const ordenId = cuenta.ordenCompraId || cuenta.ordenCompra?.id;
    const [abonosList, chequesListApi] = await Promise.all([
      getAbonos(ordenId).catch(() => []),
      getCheques({ ordenCompraId: ordenId }).catch(() => []),
    ]);

    const items = [];

    // 1. Cheques pendientes (aún no cobrados en banco)
    for (const ch of chequesListApi) {
      if (ch.estado === 'PENDIENTE') {
        items.push({
          isCheque: true,
          isPendingCheque: true,
          id: ch.id,
          fecha: ch.fechaEmision || ch.fechaCobro,
          fechaCobro: ch.fechaCobro,
          numeroCheque: ch.numeroCheque,
          monto: ch.monto,
          metodoPago: ch.metodoPago,
          referencia: ch.referencia || `Cheque Posfechado N° ${ch.numeroCheque}`,
          registradoPor: ch.registradoPor,
          estado: 'PENDIENTE',
          raw: ch,
        });
      }
    }

    // 2. Abonos reales de dinero (incluyendo cheques que ya fueron cobrados)
    for (const ab of abonosList) {
      const matchingCheque = chequesListApi.find(c => c.estado === 'PROCESADO' && (ab.referencia || '').includes(c.numeroCheque));
      items.push({
        isCheque: !!matchingCheque,
        isPendingCheque: false,
        id: ab.id,
        chequeId: matchingCheque?.id,
        numeroCheque: matchingCheque?.numeroCheque,
        fecha: ab.fecha,
        monto: ab.monto,
        referencia: ab.referencia,
        metodoPago: ab.metodoPago,
        registradoPor: ab.registradoPor,
        estado: matchingCheque ? 'PROCESADO' : 'REALIZADO',
        raw: ab,
      });
    }

    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return items;
  };

  const openAbonoModal = (cuenta) => {
    const orden = buildOrdenParaAbono(cuenta);
    if (!orden) return;
    setAbonoOrden(orden);
    setAbonoForm({
      metodoPagoId: metodos.filter(m => m.activo)[0]?.id || '',
      monto: '',
      referencia: '',
      esChequePosfechado: false,
      numeroCheque: '',
      fechaCobro: '',
    });
    setAbonoModalOpen(true);
  };

  const openVerModal = async (cuenta) => {
    setVerCuenta(cuenta);
    setEditingChequeId(null);
    setVerModalOpen(true);
    setVerLoading(true);
    try {
      const items = await fetchVerPagosData(cuenta);
      setVerAbonosList(items);
    } catch (err) {
      toast.error(err.message || 'Error al obtener historial de pagos');
      setVerAbonosList([]);
    } finally {
      setVerLoading(false);
    }
  };

  // Deep-link trigger from searchParams (from /movimientos or /gastos)
  useEffect(() => {
    if (!cxpLoading && cxpItems.length > 0 && (paramOrdenId || paramOrdenNumero || paramCxpId) && !hasProcessedDeepLink) {
      const match = cxpItems.find(c =>
        (paramCxpId && c.id === paramCxpId) ||
        (paramOrdenId && (c.ordenCompraId === paramOrdenId || c.ordenCompra?.id === paramOrdenId)) ||
        (paramOrdenNumero && (c.ordenCompra?.numero === paramOrdenNumero || c.numero === paramOrdenNumero))
      );
      if (match) {
        if (paramAction === 'abono') {
          openAbonoModal(match);
        } else {
          openVerModal(match);
        }
        setHasProcessedDeepLink(true);
      }
    }
  }, [cxpLoading, cxpItems, paramOrdenId, paramOrdenNumero, paramCxpId, paramAction, hasProcessedDeepLink]);

  const reloadVerAbonos = async () => {
    if (!verCuenta) return;
    setVerLoading(true);
    try {
      const items = await fetchVerPagosData(verCuenta);
      setVerAbonosList(items);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerLoading(false);
    }
  };

  const startEditCheque = (item) => {
    setEditingChequeId(item.id);
    setEditChequeNumero(item.numeroCheque || '');
    setEditChequeFecha(item.fechaCobro ? new Date(item.fechaCobro).toISOString().split('T')[0] : '');
    setEditChequeMonto(String(item.monto || ''));
  };

  const cancelEditCheque = () => {
    setEditingChequeId(null);
  };

  const handleSaveEditCheque = async (chequeId) => {
    if (!editChequeNumero.trim()) {
      toast.error('Ingrese el número de cheque.');
      return;
    }
    if (!editChequeFecha) {
      toast.error('Ingrese la fecha de cobro.');
      return;
    }

    setSavingChequeEdit(true);
    try {
      await editarCheque(chequeId, {
        numeroCheque: editChequeNumero.trim(),
        fechaCobro: editChequeFecha,
        monto: parseFloat(editChequeMonto) || undefined,
      });
      toast.success('Cheque posfechado modificado correctamente.');
      setEditingChequeId(null);
      await reloadVerAbonos();
      loadCxP();
      loadCheques();
    } catch (err) {
      toast.error(err.message || 'Error al modificar el cheque.');
    } finally {
      setSavingChequeEdit(false);
    }
  };

  const handleDeleteChequePendiente = async (item) => {
    if (!window.confirm(`¿Está seguro de eliminar/cancelar el cheque posfechado N° ${item.numeroCheque}? El saldo volverá a estar pendiente en esta cuenta por pagar.`)) {
      return;
    }
    setDeletingAbonoId(item.id);
    try {
      await eliminarCheque(item.id);
      toast.success('Cheque posfechado cancelado con éxito. Saldo restaurado.');
      await reloadVerAbonos();
      loadCxP();
      loadCheques();
      loadStats();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el cheque.');
    } finally {
      setDeletingAbonoId(null);
    }
  };

  const handleConfirmDeleteAbono = async () => {
    if (!confirmDeleteAbono || !verCuenta) return;
    const abonoId = confirmDeleteAbono.id;
    const ordenId = verCuenta.ordenCompraId || verCuenta.ordenCompra?.id;
    setDeletingAbonoId(abonoId);
    try {
      await eliminarAbono(ordenId, abonoId);
      toast.success('Abono eliminado con éxito. El dinero ha sido devuelto a la cuenta.');
      setConfirmDeleteAbono(null);
      await reloadVerAbonos();
      loadStats();
      loadCxP();
      loadMetodos();
      loadCheques();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar abono');
    } finally {
      setDeletingAbonoId(null);
    }
  };

  const saldoAbono = abonoOrden ? getAbonoSaldoPendiente(abonoOrden) : 0;

  const handleAbonoSave = async (e) => {
    e.preventDefault();
    if (abonoForm.esChequePosfechado) {
      if (!abonoForm.numeroCheque.trim()) {
        toast.error('Ingrese el número de cheque.');
        return;
      }
      if (!abonoForm.fechaCobro) {
        toast.error('Ingrese la fecha de cobro del cheque.');
        return;
      }
    }

    setAbonoSaving(true);
    try {
      const payload = {
        metodoPagoId: abonoForm.metodoPagoId,
        monto: parseFloat(abonoForm.monto) || 0,
        referencia: abonoForm.referencia,
      };

      if (abonoForm.esChequePosfechado) {
        payload.esChequePosfechado = true;
        payload.numeroCheque = abonoForm.numeroCheque.trim();
        payload.fechaCobro = abonoForm.fechaCobro;
      }

      await registrarAbono(abonoOrden.id, payload);
      toast.success(abonoForm.esChequePosfechado ? 'Cheque posfechado registrado con éxito' : 'Abono registrado con éxito');
      setAbonoModalOpen(false);
      loadStats();
      loadCxP();
      loadMetodos();
      loadCheques();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAbonoSaving(false);
    }
  };

  const cxpTotalPages = Math.max(1, Math.ceil(cxpTotal / perPage));
  const showingFrom = cxpTotal === 0 ? 0 : (cxpPage - 1) * perPage + 1;
  const showingTo = Math.min(cxpPage * perPage, cxpTotal);

  const kpiItems = [
    { label: 'Deuda total', mobileLabel: 'Deuda', value: fmt(stats.totalDeuda), hint: 'Saldo por pagar', accent: '#ef4444', iconBg: 'bg-red-50', iconColor: 'text-red-500', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z' },
    { label: 'Órdenes pendientes', mobileLabel: 'Pendientes', value: stats.pendientes, hint: 'Por aprobar o pagar', accent: '#f97316', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { label: 'Total gastado', mobileLabel: 'Gastado', value: fmt(stats.totalGastado), hint: 'Monto acumulado', accent: '#10b981', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { label: 'Cuentas listadas', mobileLabel: 'Cuentas', value: cxpTotal, hint: 'Según filtro actual', accent: '#2b41b8', iconBg: 'bg-[#eef1fc]', iconColor: 'text-[#2b41b8]', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z' },
  ];

  const renderKpiCardDesktop = (kpi) => (
    <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex items-start gap-3 p-5 min-w-0 overflow-hidden">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-5 h-5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 leading-tight">{kpi.label}</p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums leading-none truncate" style={{ color: CO_NAVY }}>{kpi.value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{kpi.hint}</p>
      </div>
    </div>
  );

  const renderKpiCardMobile = (kpi) => (
    <div
      key={kpi.label}
      className="co-kpi-mobile bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 p-3 min-w-0"
      style={{ borderBottomWidth: '3px', borderBottomColor: kpi.accent }}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-3.5 h-3.5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <p className="text-[9px] font-medium text-slate-600 leading-tight line-clamp-2">{kpi.mobileLabel || kpi.label}</p>
        <p className="text-sm font-semibold tabular-nums leading-none truncate" style={{ color: CO_NAVY }}>{kpi.value}</p>
        <p className="text-[8px] text-slate-400 leading-tight line-clamp-2">{kpi.hint}</p>
      </div>
    </div>
  );

  const renderBadge = (estado, compact = false) => {
    const b = CXP_BADGES[estado] || CXP_BADGES.pendiente;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${b.bg} ${b.color} ${compact ? 'px-1.5 py-0.5 text-[8px] gap-0.5' : 'px-2.5 py-1 text-[10px] gap-1.5'
        }`}>
        <span className={`rounded-full shrink-0 ${b.dot} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
        {b.label}
      </span>
    );
  };

  const renderEstadoFilter = (className = '') => (
    <select
      value={cxpFilter}
      onChange={(e) => setCxpFilter(e.target.value)}
      className={`h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-lg bg-white text-[10px] sm:text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0 ${className}`}
    >
      {ESTADO_FILTER_OPTIONS.map((opt) => (
        <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  const renderMobileRow = (c) => {
    const ordenId = c.ordenCompraId || c.ordenCompra?.id;
    const pendingCheque = chequesList.find(ch => ch.ordenCompraId === ordenId && ch.estado === 'PENDIENTE');
    return (
      <div key={c.id} className="co-orden-row border-b border-slate-100 last:border-b-0">
        <div className="flex items-start justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-bold leading-tight" style={{ color: CO_PRIMARY }}>{c.ordenCompra?.numero || '—'}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.ordenCompra?.proveedor?.nombre || '—'}</p>
            <div className="mt-1 flex flex-wrap gap-1 items-center">
              {renderBadge(c.estado, true)}
              {pendingCheque && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  <Clock size={9} className="text-amber-600" /> N° {pendingCheque.numeroCheque}
                </span>
              )}
            </div>
          </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400">Saldo</p>
          <p className="text-sm font-bold text-red-600 tabular-nums">{fmt(c.saldo)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
        <div><span className="text-slate-400 block text-[10px]">Total</span><span className="font-semibold text-slate-700">{fmt(c.montoTotal)}</span></div>
        <div><span className="text-slate-400 block text-[10px]">Pagado</span><span className="font-semibold text-emerald-600">{fmt(c.montoPagado)}</span></div>
        <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Vencimiento</span><span className="text-slate-700">{fmtDate(c.fechaVencimiento)}</span></div>
      </div>
      <div className="px-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={() => openVerModal(c)}
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <Eye size={14} />
          Ver pagos
        </button>
        <button
          type="button"
          onClick={() => openAbonoModal(c)}
          disabled={c.estado === 'pagado'}
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: c.estado === 'pagado' ? '#94a3b8' : CO_PRIMARY }}
        >
          Registrar abono
        </button>
      </div>
    </div>
    );
  };

  const renderPagination = () => (
    <div className="px-4 md:px-5 py-3 border-t border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
      <p className="text-xs text-slate-500 text-center md:text-left shrink-0">
        Mostrando {showingFrom} a {showingTo} de {cxpTotal} cuentas
      </p>
      {cxpTotalPages > 1 && (
        <div className="flex items-center justify-center md:justify-end gap-1">
          <button type="button" disabled={cxpPage <= 1} onClick={() => setCxpPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white">&lt;</button>
          <span className="md:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>{cxpPage} / {cxpTotalPages}</span>
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, cxpTotalPages) }, (_, i) => {
              const maxVisible = Math.min(5, cxpTotalPages);
              let start = Math.max(1, cxpPage - Math.floor(maxVisible / 2));
              const end = Math.min(cxpTotalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const pageNum = start + i;
              if (pageNum > end) return null;
              const isActive = cxpPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCxpPage(pageNum)}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${isActive ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={isActive ? { backgroundColor: CO_PRIMARY, borderColor: CO_PRIMARY } : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={cxpPage >= cxpTotalPages} onClick={() => setCxpPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white">&gt;</button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="co-compras-page animate-slide-up overflow-x-hidden pb-6"
    >
      {/* ── Móvil ── */}
      <div className="md:hidden">
        <ComprasPageHeader
          title="Cuentas por Pagar"
          subtitle="Deudas y saldos pendientes a proveedores."
          aside={(
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <p className="text-sm font-bold text-red-600 whitespace-nowrap tabular-nums">{fmt(stats.totalDeuda)}</p>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-2 mb-4">
          {kpiItems.map((kpi) => renderKpiCardMobile(kpi))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1">{renderEstadoFilter('w-full')}</div>
          <button
            type="button"
            onClick={handleOpenManualModal}
            className="h-9 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
            style={{ backgroundColor: CO_PRIMARY }}
          >
            <Plus size={14} />
            <span>Registrar Cuenta</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: CO_NAVY }}>Cuentas por pagar</h2>
          </div>
          {cxpLoading && <div className="flex justify-center py-10"><div className="co-spinner" /></div>}
          {!cxpLoading && cxpItems.map((c) => renderMobileRow(c))}
          {!cxpLoading && cxpItems.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">No hay cuentas por pagar</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">Mostrando {showingFrom} a {showingTo} de {cxpTotal} cuentas</p>
          {cxpTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button type="button" disabled={cxpPage <= 1} onClick={() => setCxpPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>{cxpPage} / {cxpTotalPages}</span>
              <button type="button" disabled={cxpPage >= cxpTotalPages} onClick={() => setCxpPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden md:block">
        <ComprasPageHeader
          title="Cuentas por Pagar"
          subtitle="Gestión de deudas y saldos pendientes a proveedores."
          aside={(
            <button
              type="button"
              onClick={handleOpenManualModal}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
              style={{ backgroundColor: CO_PRIMARY }}
            >
              <Plus size={18} />
              <span>Registrar Cuenta por Pagar</span>
            </button>
          )}
        />

        <div className="grid gap-4 mb-6 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((kpi) => renderKpiCardDesktop(kpi))}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="w-48">{renderEstadoFilter('w-full')}</div>
            {chequesList.filter(c => c.estado === 'PENDIENTE').length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl text-amber-900 text-xs font-bold">
                <Clock size={15} className="text-amber-600 shrink-0" />
                <span>
                  {chequesList.filter(c => c.estado === 'PENDIENTE').length} Cheque(s) Posfechado(s) Programado(s)
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto relative">
            {cxpLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="co-spinner" />
              </div>
            )}
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8f9fc] text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3 text-right">Monto total</th>
                  <th className="px-4 py-3 text-right">Pagado</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-center">Vencimiento</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center w-48">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!cxpLoading && cxpItems.map((c) => {
                  const ordenId = c.ordenCompraId || c.ordenCompra?.id;
                  const pendingCheque = chequesList.find(ch => ch.ordenCompraId === ordenId && ch.estado === 'PENDIENTE');
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold" style={{ color: CO_PRIMARY }}>
                          {c.ordenCompra?.numero || '—'}
                        </div>
                        {pendingCheque && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full" title={`Cheque N° ${pendingCheque.numeroCheque} cobro ${fmtDate(pendingCheque.fechaCobro)}`}>
                              <Clock size={10} className="text-amber-600" /> N° {pendingCheque.numeroCheque} ({fmtDate(pendingCheque.fechaCobro)})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: CO_NAVY }}>{c.ordenCompra?.proveedor?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{fmt(c.montoTotal)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold tabular-nums">{fmt(c.montoPagado)}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold tabular-nums">{fmt(c.saldo)}</td>
                      <td className="px-4 py-3 text-center text-slate-500 text-xs whitespace-nowrap">{fmtDate(c.fechaVencimiento)}</td>
                      <td className="px-4 py-3 text-center">{renderBadge(c.estado)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openVerModal(c)}
                            className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                            title="Ver historial de abonos y cheques posfechados"
                          >
                            <Eye size={14} />
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => openAbonoModal(c)}
                            disabled={c.estado === 'pagado'}
                            className="h-8 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: c.estado === 'pagado' ? '#94a3b8' : CO_PRIMARY }}
                            onMouseEnter={(e) => { if (c.estado !== 'pagado') e.currentTarget.style.backgroundColor = CO_PRIMARY_HOVER; }}
                            onMouseLeave={(e) => { if (c.estado !== 'pagado') e.currentTarget.style.backgroundColor = CO_PRIMARY; }}
                          >
                            Registrar abono
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!cxpLoading && cxpItems.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">No hay cuentas por pagar</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      </div>

      {/* Modal Registrar Abono */}
      <ModalPortal open={abonoModalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setAbonoModalOpen(false)} />
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden relative z-[201] animate-slide-up">
            <div className="co-modal-header">
              <h2 className="text-lg font-bold text-slate-800">Registrar Abono</h2>
              <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-modal-close cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="co-modal-body">
              {abonoOrden && (
                <div className="co-abono-info">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Orden:</span>
                    <span className="font-bold text-slate-800">{abonoOrden.numero}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total:</span>
                    <span className="font-semibold">{fmt(abonoOrden.cuentaPorPagar?.montoTotal ?? abonoOrden.total)}</span>
                  </div>
                  {(abonoOrden.cuentaPorPagar?.montoPagado ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Pagado:</span>
                      <span className="font-semibold text-emerald-600">{fmt(abonoOrden.cuentaPorPagar.montoPagado)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Saldo pendiente:</span>
                    <span className="font-bold text-red-500">{fmt(saldoAbono)}</span>
                  </div>
                </div>
              )}
              <form onSubmit={handleAbonoSave} className="space-y-4 mt-4">
                <div>
                  <label className="co-label">Método de Pago</label>
                  <select className="co-input" value={abonoForm.metodoPagoId}
                    onChange={e => setAbonoForm(p => ({ ...p, metodoPagoId: e.target.value }))} required>
                    <option value="">Seleccionar método…</option>
                    {metodos.filter(m => m.activo).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({fmt(m.saldoActual || 0)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="co-label">Monto ($)</label>
                  <input type="number" className="co-input" step="0.01" min="0.01"
                    max={saldoAbono || 999999}
                    value={abonoForm.monto}
                    onChange={e => {
                      const val = e.target.value;
                      if (parseFloat(val) > saldoAbono) {
                        setAbonoForm(p => ({ ...p, monto: saldoAbono.toString() }));
                      } else {
                        setAbonoForm(p => ({ ...p, monto: val }));
                      }
                    }} required />
                </div>
                <div>
                  <label className="co-label">Referencia (Nro. cheque, transferencia, etc.)</label>
                  <input className="co-input" value={abonoForm.referencia} placeholder="Opcional"
                    onChange={e => setAbonoForm(p => ({ ...p, referencia: e.target.value }))} />
                </div>

                {/* Toggle Cheque Posfechado */}
                <div className={`rounded-2xl p-3.5 transition-all duration-200 border ${abonoForm.esChequePosfechado
                    ? 'bg-blue-50/60 border-blue-200/80 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                  }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={abonoForm.esChequePosfechado}
                      onChange={e => setAbonoForm(p => ({ ...p, esChequePosfechado: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={15} className={abonoForm.esChequePosfechado ? 'text-blue-600' : 'text-slate-500'} />
                      <span className={`text-xs font-extrabold ${abonoForm.esChequePosfechado ? 'text-blue-950' : 'text-slate-700'}`}>
                        Registrar como Pago por Cheque Posfechado (A Fecha)
                      </span>
                    </div>
                  </label>

                  {abonoForm.esChequePosfechado && (
                    <div className="pt-3 mt-2.5 border-t border-blue-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1 mb-1 whitespace-nowrap">
                          <Hash size={12} className="text-blue-600 shrink-0" /> N° Cheque *
                        </label>
                        <input
                          type="text"
                          value={abonoForm.numeroCheque}
                          onChange={e => setAbonoForm(p => ({ ...p, numeroCheque: e.target.value }))}
                          placeholder="Ej. CHQ-10492"
                          className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs font-mono font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1 mb-1 whitespace-nowrap">
                          <Calendar size={12} className="text-blue-600 shrink-0" /> Fecha Cobro *
                        </label>
                        <input
                          type="date"
                          value={abonoForm.fechaCobro}
                          onChange={e => setAbonoForm(p => ({ ...p, fechaCobro: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="col-span-full bg-white/80 border border-blue-100 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed font-medium">
                        <Info size={15} className="shrink-0 text-blue-600 mt-0.5" />
                        <span>
                          El dinero permanecerá en la cuenta y se debitará automáticamente en la fecha de cobro.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-btn-ghost">Cancelar</button>
                  <button type="submit" disabled={abonoSaving || !abonoForm.monto || parseFloat(abonoForm.monto) <= 0 || parseFloat(abonoForm.monto) > saldoAbono} className="co-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                    {abonoSaving && <div className="co-spinner-sm" />}
                    Registrar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Modal Ver Historial de Abonos */}
      <ModalPortal open={verModalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          {/* Backdrop Overlay with Blur */}
          <div
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-md transition-opacity"
            onClick={() => setVerModalOpen(false)}
          />

          {/* Modal Container: Fixed max height & wide layout */}
          <div
            className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-2xl flex flex-col overflow-hidden relative z-[201] animate-slide-up"
            style={{ width: '96vw', maxWidth: '1240px', maxHeight: '88vh', fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header (Fixed) */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100/80 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-lg font-extrabold text-slate-800 leading-tight truncate">
                    Historial de Pagos y Abonos
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5 truncate">
                    {verCuenta?.ordenCompra?.numero || 'Orden'} • {verCuenta?.ordenCompra?.proveedor?.nombre || 'Proveedor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body (Scrollable inside) */}
            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto min-h-0 bg-white">
              {verCuenta && (
                /* 4 KPI Cards ALWAYS in 1 single row */
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3.5 bg-slate-50/80 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80">
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-center min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Monto Total</span>
                    <span className="text-xs sm:text-base font-extrabold text-slate-800 font-mono mt-0.5 block truncate">{fmt(verCuenta.montoTotal)}</span>
                  </div>
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-center min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Pagado</span>
                    <span className="text-xs sm:text-base font-extrabold text-emerald-600 font-mono mt-0.5 block truncate">{fmt(verCuenta.montoPagado)}</span>
                  </div>
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-center min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Saldo</span>
                    <span className="text-xs sm:text-base font-extrabold text-red-600 font-mono mt-0.5 block truncate">{fmt(verCuenta.saldo)}</span>
                  </div>
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Estado</span>
                    <div className="mt-0.5 sm:mt-1 truncate">{renderBadge(verCuenta.estado, true)}</div>
                  </div>
                </div>
              )}

              {verLoading ? (
                <div className="flex justify-center py-10">
                  <div className="co-spinner" />
                </div>
              ) : verAbonosList.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold">No hay abonos registrados para esta cuenta por pagar.</p>
                </div>
              ) : (
                <>
                  {/* Vista Escritorio: Tabla panorámica completa */}
                  <div className="hidden sm:block border border-slate-200/80 rounded-2xl shadow-2xs bg-white overflow-x-auto min-w-full">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f9fc] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                        <tr>
                          <th className="px-5 py-3.5">Tipo / Estado</th>
                          <th className="px-5 py-3.5">Fecha y Hora / Cobro</th>
                          <th className="px-5 py-3.5">Caja / Cuenta de Pago</th>
                          <th className="px-5 py-3.5">Referencia / N° Cheque</th>
                          <th className="px-5 py-3.5">Registrado Por</th>
                          <th className="px-5 py-3.5 text-right">Monto</th>
                          {isAdmin && <th className="px-5 py-3.5 text-center w-36">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {verAbonosList.map((ab, idx) => {
                          const isLastAbono = idx === 0;
                          const isEditingThis = editingChequeId === ab.id;

                          if (isEditingThis) {
                            return (
                              <tr key={ab.id} className="bg-blue-50/70 border-b border-blue-200">
                                <td colSpan={2} className="px-4 py-3">
                                  <label className="text-[10px] font-bold text-blue-900 block mb-1">Número Cheque *</label>
                                  <input
                                    type="text"
                                    value={editChequeNumero}
                                    onChange={e => setEditChequeNumero(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 text-xs font-mono font-bold bg-white"
                                    placeholder="Ej. CHQ-10492"
                                  />
                                </td>
                                <td colSpan={2} className="px-4 py-3">
                                  <label className="text-[10px] font-bold text-blue-900 block mb-1">Fecha de Cobro *</label>
                                  <input
                                    type="date"
                                    value={editChequeFecha}
                                    onChange={e => setEditChequeFecha(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 text-xs font-semibold bg-white"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <label className="text-[10px] font-bold text-blue-900 block mb-1">Monto ($)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editChequeMonto}
                                    onChange={e => setEditChequeMonto(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 text-xs font-mono font-bold bg-white text-right"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center gap-1.5 justify-center mt-3">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditCheque(ab.id)}
                                      disabled={savingChequeEdit}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditCheque}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={ab.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                {ab.isPendingCheque ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock size={12} className="text-amber-600" /> PROGRAMADO (A FECHA)
                                  </span>
                                ) : ab.isCheque ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 size={12} className="text-emerald-600" /> CHEQUE COBRADO
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    <CreditCard size={12} /> ABONO DIRECTO
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 font-mono font-medium text-slate-600 whitespace-nowrap">
                                {ab.isPendingCheque ? (
                                  <div>
                                    <span className="block font-bold text-amber-900 text-xs">Cobro: {fmtDate(ab.fechaCobro)}</span>
                                    <span className="text-[10px] text-slate-400">Emisión: {fmtDate(ab.fecha)}</span>
                                  </div>
                                ) : (
                                  fmtDateTime(ab.fecha)
                                )}
                              </td>
                              <td className="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap max-w-[160px] truncate" title={ab.metodoPago?.nombre || 'General'}>{ab.metodoPago?.nombre || 'General'}</td>
                              <td className="px-5 py-3.5 text-slate-700 max-w-[150px] truncate" title={ab.referencia || ab.numeroCheque || ''}>
                                {ab.isPendingCheque ? (
                                  <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md text-xs">
                                    N° {ab.numeroCheque}
                                  </span>
                                ) : (
                                  ab.referencia || <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap max-w-[180px] truncate" title={ab.registradoPor?.nombre || ''}>{ab.registradoPor?.nombre || <span className="text-slate-300">—</span>}</td>
                              <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 font-mono text-sm whitespace-nowrap">{fmt(ab.monto)}</td>
                              {isAdmin && (
                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {ab.isPendingCheque ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => startEditCheque(ab)}
                                          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer border border-blue-100 flex items-center gap-1"
                                          title="Editar datos del cheque"
                                        >
                                          <Pencil size={13} />
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteChequePendiente(ab)}
                                          disabled={deletingAbonoId === ab.id}
                                          className="p-1.5 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer border border-red-100 flex items-center gap-1"
                                          title="Cancelar/Eliminar cheque"
                                        >
                                          <Trash2 size={13} />
                                          Eliminar
                                        </button>
                                      </>
                                    ) : isLastAbono ? (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteAbono(ab)}
                                        disabled={deletingAbonoId === ab.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer border border-red-100"
                                        title="Eliminar este abono (reembolsar a la cuenta)"
                                      >
                                        <Trash2 size={14} />
                                        Eliminar
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-300" title="Solo se puede eliminar el último abono registrado">Anteriores</span>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista Móvil: Tarjetas optimizadas para pantallas pequeñas */}
                  <div className="block sm:hidden space-y-2.5">
                    {verAbonosList.map((ab, idx) => {
                      const isLastAbono = idx === 0;
                      return (
                        <div key={ab.id} className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">{ab.metodoPago?.nombre || 'General'}</span>
                            <span className="font-extrabold text-slate-900 font-mono text-sm">{fmt(ab.monto)}</span>
                          </div>
                          <div className="flex flex-col gap-1 text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tipo:</span>
                              <span className="font-bold text-slate-700">
                                {ab.isPendingCheque ? 'Cheque Posfechado (Pendiente)' : ab.isCheque ? 'Cheque Cobrado' : 'Abono'}
                              </span>
                            </div>
                            {ab.isPendingCheque ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">N° Cheque:</span>
                                  <span className="font-mono font-bold text-blue-800">{ab.numeroCheque}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Fecha Cobro:</span>
                                  <span className="font-mono text-slate-700 font-medium">{fmtDate(ab.fechaCobro)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Fecha:</span>
                                <span className="font-mono text-slate-700 font-medium">{fmtDateTime(ab.fecha)}</span>
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="pt-1.5 border-t border-slate-100 flex justify-end gap-2">
                              {ab.isPendingCheque ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditCheque(ab)}
                                    className="flex-1 py-1.5 inline-flex items-center justify-center gap-1 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold text-xs border border-blue-100 cursor-pointer"
                                  >
                                    <Pencil size={13} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChequePendiente(ab)}
                                    className="flex-1 py-1.5 inline-flex items-center justify-center gap-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs border border-red-100 cursor-pointer"
                                  >
                                    <Trash2 size={13} /> Eliminar
                                  </button>
                                </>
                              ) : isLastAbono && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAbono(ab)}
                                  disabled={deletingAbonoId === ab.id}
                                  className="w-full py-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs border border-red-100 cursor-pointer"
                                >
                                  <Trash2 size={14} /> Eliminar abono
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer (Fixed) */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setVerModalOpen(false)}
                className="px-5 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Confirmación para eliminar abono (z-index 300) */}
      <ModalPortal open={!!confirmDeleteAbono}>
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop con Blur acumulativo sobre el primer modal */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
            onClick={() => setConfirmDeleteAbono(null)}
          />

          {/* Card Container */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-md p-6 relative z-[301] space-y-4 animate-slide-up">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">¿Eliminar último abono?</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 text-xs text-red-900 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Monto a devolver:</span>
                <span className="font-extrabold font-mono text-slate-900">{fmt(confirmDeleteAbono?.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Cuenta / Caja:</span>
                <span className="font-bold text-slate-900">{confirmDeleteAbono?.metodoPago?.nombre || 'General'}</span>
              </div>
              <p className="text-[11px] text-red-600/90 pt-1.5 border-t border-red-200/60 leading-relaxed font-medium">
                Este dinero regresará al saldo de la cuenta de pago seleccionada y aumentará el saldo pendiente de la cuenta por pagar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAbono(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAbono}
                disabled={!!deletingAbonoId}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingAbonoId && <div className="co-spinner-sm" />}
                Sí, eliminar y devolver dinero
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Modal Registrar Cuenta por Pagar Manual */}
      <ModalPortal open={manualModalOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setManualModalOpen(false)} />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs" style={{ backgroundColor: CO_PRIMARY }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold" style={{ color: CO_NAVY }}>Registrar Cuenta por Pagar Manual</h3>
                  <p className="text-xs text-slate-500">Registrar una deuda sin orden de compra previa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleManualSave} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Row 1: Proveedor y Concepto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Proveedor (Buscador Selector) */}
                <SearchableProveedorSelect
                  proveedores={proveedoresList}
                  value={manualForm.proveedorId}
                  onChange={(id) => setManualForm((f) => ({ ...f, proveedorId: id }))}
                />

                {/* Concepto / Descripción */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Concepto / N° Factura / Descripción *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Factura #1042 - Servicios de publicidad / Materiales de imprenta"
                    value={manualForm.concepto}
                    onChange={(e) => setManualForm(f => ({ ...f, concepto: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 font-medium"
                  />
                </div>
              </div>

              {/* Grid: Monto Total y Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Total ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={manualForm.montoTotal}
                    onChange={(e) => setManualForm(f => ({ ...f, montoTotal: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={manualForm.fechaEmision}
                    onChange={(e) => setManualForm(f => ({ ...f, fechaEmision: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vencimiento (Opcional)</label>
                  <input
                    type="date"
                    value={manualForm.fechaVencimiento}
                    onChange={(e) => setManualForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
                  />
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales sobre las condiciones de pago..."
                  value={manualForm.notas}
                  onChange={(e) => setManualForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 text-xs"
                />
              </div>

              {/* Sección Opcional de Abono Inicial */}
              <div className="pt-3 border-t border-slate-200/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={manualForm.registrarAbonoInicial}
                    onChange={(e) => setManualForm(f => ({ ...f, registrarAbonoInicial: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#2b41b8] focus:ring-[#2b41b8]"
                  />
                  <span className="font-bold text-slate-800">¿Registrar pago o abono inicial de inmediato?</span>
                </label>

                {manualForm.registrarAbonoInicial && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Cuenta / Método de Pago *</label>
                        <select
                          value={manualForm.abonoMetodoPagoId}
                          onChange={(e) => setManualForm(f => ({ ...f, abonoMetodoPagoId: e.target.value }))}
                          className="w-full h-9 px-2.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-700"
                        >
                          <option value="">-- Seleccionar Cuenta --</option>
                          {metodos.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Monto Abonado ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Monto"
                          value={manualForm.abonoMonto}
                          onChange={(e) => setManualForm(f => ({ ...f, abonoMonto: e.target.value }))}
                          className="w-full h-9 px-2.5 border border-slate-200 rounded-lg font-bold font-mono text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Referencia / N° Comprobante</label>
                      <input
                        type="text"
                        placeholder="Ej: Transferencia Banco Pichincha #9872"
                        value={manualForm.abonoReferencia}
                        onChange={(e) => setManualForm(f => ({ ...f, abonoReferencia: e.target.value }))}
                        className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={manualForm.esChequePosfechado}
                        onChange={(e) => setManualForm(f => ({ ...f, esChequePosfechado: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-amber-900 text-xs">¿Es Cheque Posfechado?</span>
                    </label>

                    {manualForm.esChequePosfechado && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">N° Cheque</label>
                          <input
                            type="text"
                            placeholder="N° de cheque"
                            value={manualForm.numeroCheque}
                            onChange={(e) => setManualForm(f => ({ ...f, numeroCheque: e.target.value }))}
                            className="w-full h-8 px-2 border border-slate-200 rounded text-xs bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Fecha de Cobro</label>
                          <input
                            type="date"
                            value={manualForm.fechaCobro}
                            onChange={(e) => setManualForm(f => ({ ...f, fechaCobro: e.target.value }))}
                            className="w-full h-8 px-2 border border-slate-200 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={manualSaving}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all shadow-md hover:shadow-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: CO_PRIMARY }}
                >
                  {manualSaving && <div className="co-spinner-sm" />}
                  Guardar Cuenta por Pagar
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
