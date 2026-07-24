import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Car, User, Plus, Eye, FileDown, X, ClipboardCheck } from 'lucide-react';
import { getVehiculos, getVehiculoControles, addVehiculoControl } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { ControlVehiculoPDFModal } from '../components/ControlVehiculoPDFModal';
import { deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';

const COMBUSTIBLE_OPTIONS = [
  { value: 'bajo', label: 'Bajo', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { value: 'medio', label: 'Medio', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'bueno', label: 'Bueno', color: 'text-slate-700 bg-slate-100 border-slate-200' },
];

const INITIAL_FORM = {
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
  sugerencia: '',
};

const CHECK_ITEMS = [
  { name: 'nivelAceite', label: 'Nivel de Aceite' },
  { name: 'nivelAgua', label: 'Nivel de Agua' },
  { name: 'aceiteHidraulico', label: 'Aceite Hidráulico / Líquido' },
  { name: 'liquidoFrenos', label: 'Líquido de Frenos' },
  { name: 'gataLlave', label: 'Gata y Llave de Ruedas' },
  { name: 'extintorBotiquin', label: 'Extintor y Botiquín' },
  { name: 'bandas', label: 'Juego de Bandas' },
];

const inputClass =
  'w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

export const TallerControlPage = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehId, setSelectedVehId] = useState('');
  const [controles, setControles] = useState([]);
  const [loadingVehs, setLoadingVehs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewingControl, setViewingControl] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    const fetchVehs = async () => {
      setLoadingVehs(true);
      try {
        const data = await getVehiculos();
        const activos = data.filter((v) => v.estado === 'activo');
        setVehiculos(activos);
        if (activos.length > 0) {
          setSelectedVehId(activos[0].id);
        }
      } catch (err) {
        toast.error('Error al cargar vehículos: ' + err.message);
      } finally {
        setLoadingVehs(false);
      }
    };
    fetchVehs();
  }, []);

  useEffect(() => {
    if (!selectedVehId) return;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const data = await getVehiculoControles(selectedVehId);
        setControles(data);
      } catch (err) {
        toast.error('Error al cargar historial: ' + err.message);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
    setDateRange({ start: '', end: '' });
  }, [selectedVehId]);

  const selectedVeh = vehiculos.find((v) => v.id === selectedVehId);

  const controlesFiltrados = controles.filter((log) => {
    const logDate = new Date(log.fecha);
    if (dateRange.start) {
      if (logDate < new Date(dateRange.start + 'T00:00:00')) return false;
    }
    if (dateRange.end) {
      if (logDate > new Date(dateRange.end + 'T23:59:59')) return false;
    }
    return true;
  });

  const hayFiltroActivo = dateRange.start || dateRange.end;

  const ultimoControl = controles[0]
    ? new Date(controles[0].fecha).toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const kpiCards = [
    { label: 'Vehículos activos', value: vehiculos.length, border: 'border-t-blue-600', color: 'text-blue-600' },
    {
      label: 'Kilometraje actual',
      value: selectedVeh ? `${selectedVeh.kilometraje.toLocaleString()} km` : '—',
      border: 'border-t-indigo-500',
      color: 'text-indigo-600',
    },
    { label: 'Controles registrados', value: controles.length, border: 'border-t-emerald-500', color: 'text-emerald-600' },
    { label: 'Último control', value: ultimoControl, border: 'border-t-amber-500', color: 'text-amber-600' },
  ];

  const openNewControl = () => {
    if (!selectedVeh) {
      toast.error('Selecciona un vehículo primero');
      return;
    }
    setForm({
      ...INITIAL_FORM,
      fecha: new Date().toISOString().slice(0, 16),
      kilometraje: selectedVeh.kilometraje || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedVehId) return;
    if (!form.kilometraje || Number(form.kilometraje) <= 0) {
      setFormError('El kilometraje debe ser mayor a 0');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        kilometraje: Number(form.kilometraje),
      };
      const saved = await addVehiculoControl(selectedVehId, payload);
      toast.success('Control registrado correctamente');

      setVehiculos((prev) =>
        prev.map((v) => {
          if (v.id === selectedVehId) {
            return { ...v, kilometraje: Math.max(v.kilometraje, Number(form.kilometraje)) };
          }
          return v;
        })
      );

      setControles((prev) => [saved, ...prev]);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingVehs) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up pb-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <Car className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Control de vehículos</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Taller
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Registro diario de kilometraje y checklist de la flota activa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewControl}
            disabled={!selectedVehId}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm shrink-0 disabled:opacity-50"
          >
            <Plus size={15} />
            Nuevo control
          </button>
        </div>
      </div>

      {/* KPIs — una fila en web; 2×2 solo en móvil */}
      <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2 sm:gap-3">
        {kpiCards.map(({ label, value, border, color }) => (
          <div key={label} className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${border} px-2.5 sm:px-4 py-3 sm:py-4 min-w-0`}>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:truncate max-sm:leading-tight">{label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums max-sm:text-sm max-sm:break-words ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Selector de vehículo */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Vehículo</label>
            <select
              value={selectedVehId}
              onChange={(e) => setSelectedVehId(e.target.value)}
              className={inputClass}
            >
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
              {vehiculos.length === 0 && <option value="">Sin vehículos activos</option>}
            </select>
          </div>
        </div>

        {selectedVeh && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500 font-medium">Marca / Modelo</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {selectedVeh.marca} {selectedVeh.modelo}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Año / Color</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {selectedVeh.anio || '—'} · {selectedVeh.color || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Placa</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedVeh.placa}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Responsable</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {selectedVeh.responsable || '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      {selectedVehId && (
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-3 shrink-0">
              <h3 className="text-sm font-semibold text-gray-800">Historial de controles</h3>
              <span className="text-xs font-medium text-gray-400">
                {controlesFiltrados.length} registros
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Filtrar por rango de fechas"
              />
              <button
                type="button"
                onClick={() => setPdfOpen(true)}
                disabled={controlesFiltrados.length === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Exportar a PDF"
              >
                <FileDown size={13} />
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="relative">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
              </div>
            ) : controlesFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-sm">
                  {hayFiltroActivo
                    ? 'No hay controles en el rango seleccionado'
                    : 'No hay controles registrados'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {hayFiltroActivo
                    ? 'Prueba ajustando el filtro de fechas'
                    : 'Registra el primer control con el botón superior'}
                </p>
              </div>
            ) : (
              <>
                {/* Tabla — solo web */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha y hora</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Operador</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kilometraje</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Combustible</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Checks</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Observación / Sugerencia</th>
                        <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {controlesFiltrados.map((log) => {
                        const checksCount = [
                          log.nivelAceite,
                          log.nivelAgua,
                          log.aceiteHidraulico,
                          log.liquidoFrenos,
                          log.gataLlave,
                          log.extintorBotiquin,
                          log.bandas,
                        ].filter(Boolean).length;

                        const fuelOpt = COMBUSTIBLE_OPTIONS.find((o) => o.value === log.combustible);

                        const fechaFmt = new Date(log.fecha).toLocaleString('es-EC', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        });

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                              {fechaFmt}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <User size={14} className="text-slate-400 shrink-0" />
                                {log.usuarioNom}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                              {log.kilometraje.toLocaleString()} km
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${fuelOpt?.color || 'border-slate-200 bg-slate-50 text-slate-600'}`}
                              >
                                {fuelOpt?.label || log.combustible}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800 block">
                                  {checksCount} / 7 OK
                                </span>
                                {log.otroCheckNombre && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                                      log.otroCheckValor
                                        ? 'bg-slate-50 text-slate-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {log.otroCheckNombre}: {log.otroCheckValor ? 'OK' : 'Novedad'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 max-w-[220px] text-sm text-slate-600">
                              {log.observacion && (
                                <p className="line-clamp-2">
                                  <span className="font-medium text-slate-500">Obs:</span>{' '}
                                  {log.observacion}
                                </p>
                              )}
                              {log.sugerencia && (
                                <p className="line-clamp-2 mt-0.5">
                                  <span className="font-medium text-slate-500">Sugerencia:</span>{' '}
                                  {log.sugerencia}
                                </p>
                              )}
                              {!log.observacion && !log.sugerencia && (
                                <span className="text-slate-400">Sin novedades</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => setViewingControl(log)}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                  title="Ver detalles"
                                >
                                  <Eye size={16} strokeWidth={1.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cards — solo móvil */}
                <div className="md:hidden divide-y divide-slate-100">
                  {controlesFiltrados.map((log) => {
                    const checksCount = [
                      log.nivelAceite,
                      log.nivelAgua,
                      log.aceiteHidraulico,
                      log.liquidoFrenos,
                      log.gataLlave,
                      log.extintorBotiquin,
                      log.bandas,
                    ].filter(Boolean).length;

                    const fuelOpt = COMBUSTIBLE_OPTIONS.find((o) => o.value === log.combustible);

                    const fechaFmt = new Date(log.fecha).toLocaleString('es-EC', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });

                    return (
                      <div key={log.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight">{fechaFmt}</p>
                            <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
                              <User size={12} className="shrink-0" />
                              {log.usuarioNom}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingControl(log)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 shrink-0"
                            title="Ver detalles"
                          >
                            <Eye size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200 tabular-nums">
                            {log.kilometraje.toLocaleString()} km
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${fuelOpt?.color || 'border-slate-200 bg-slate-50 text-slate-600'}`}
                          >
                            {fuelOpt?.label || log.combustible}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {checksCount} / 7 OK
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          {log.observacion && (
                            <p className="line-clamp-2">
                              <span className="font-medium text-slate-500">Obs:</span> {log.observacion}
                            </p>
                          )}
                          {log.sugerencia && (
                            <p className="line-clamp-2">
                              <span className="font-medium text-slate-500">Sugerencia:</span> {log.sugerencia}
                            </p>
                          )}
                          {!log.observacion && !log.sugerencia && (
                            <p className="text-slate-400">Sin novedades</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal nuevo control */}
      {modalOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
              onClick={() => deferClose(() => setModalOpen(false))}
            />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 max-h-[min(780px,92vh)] overflow-hidden pointer-events-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                      <ClipboardCheck size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-800 truncate">Registrar control</h2>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {selectedVeh?.placa} — checklist de control diario
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deferClose(() => setModalOpen(false))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shrink-0"
                    title="Cerrar"
                  >
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                          Fecha y hora *
                        </label>
                        <input
                          type="datetime-local"
                          name="fecha"
                          value={form.fecha}
                          onChange={handleInputChange}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                          Kilometraje *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="kilometraje"
                            value={form.kilometraje}
                            onChange={handleInputChange}
                            required
                            placeholder={`Actual: ${selectedVeh?.kilometraje || 0}`}
                            className={`${inputClass} pr-10 font-semibold`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                            km
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                          Combustible *
                        </label>
                        <select
                          name="combustible"
                          value={form.combustible}
                          onChange={handleInputChange}
                          className={`${inputClass} font-semibold`}
                        >
                          <option value="bajo">Bajo (Menos de 1/4)</option>
                          <option value="medio">Medio (Media capacidad)</option>
                          <option value="bueno">Bueno (Lleno/Casi lleno)</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <h3 className="text-xs font-semibold text-slate-500 mb-3">
                        Niveles y herramientas
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {CHECK_ITEMS.map((item) => (
                          <label
                            key={item.name}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer select-none ${
                              form[item.name]
                                ? 'border-blue-200 bg-blue-50/40 text-slate-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={item.name}
                              checked={form[item.name]}
                              onChange={handleInputChange}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                            />
                            <span className="text-xs font-semibold">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <h3 className="text-xs font-semibold text-slate-500 mb-3">
                        Otros accesorios / controles
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                            Nombre del control adicional
                          </label>
                          <input
                            type="text"
                            name="otroCheckNombre"
                            value={form.otroCheckNombre}
                            onChange={handleInputChange}
                            placeholder="Ej. Estado de llantas, Luces…"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label
                            className={`flex items-center gap-3 h-10 px-3 rounded-xl border transition-colors cursor-pointer select-none ${
                              form.otroCheckValor
                                ? 'border-blue-200 bg-blue-50/40 text-slate-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="otroCheckValor"
                              checked={form.otroCheckValor}
                              onChange={handleInputChange}
                              disabled={!form.otroCheckNombre.trim()}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 disabled:opacity-50"
                            />
                            <span className="text-xs font-semibold">¿Está OK?</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                          Observación
                        </label>
                        <textarea
                          name="observacion"
                          value={form.observacion}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Detalla si encontraste alguna novedad…"
                          className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                          Sugerencia
                        </label>
                        <textarea
                          name="sugerencia"
                          value={form.sugerencia}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Indica qué reparación o revisión recomiendas…"
                          className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white resize-none"
                        />
                      </div>
                    </div>

                    {formError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {formError}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button
                      type="button"
                      onClick={() => deferClose(() => setModalOpen(false))}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Registrar control'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Modal detalle */}
      {viewingControl &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
              onClick={() => deferClose(() => setViewingControl(null))}
            />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 overflow-hidden max-h-[92vh] pointer-events-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                      <Car size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-800 truncate">Detalle del control</h2>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {selectedVeh?.placa} —{' '}
                        {new Date(viewingControl.fecha).toLocaleDateString('es-EC')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deferClose(() => setViewingControl(null))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shrink-0"
                    title="Cerrar"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-5 text-slate-700">
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-slate-500 font-medium mb-0.5">Fecha y hora</p>
                      <p className="font-semibold text-slate-800">
                        {new Date(viewingControl.fecha).toLocaleString('es-EC', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-0.5">Operador</p>
                      <p className="font-semibold text-slate-800">{viewingControl.usuarioNom}</p>
                    </div>
                    <div className="mt-1">
                      <p className="text-slate-500 font-medium mb-0.5">Kilometraje</p>
                      <p className="font-semibold text-slate-800 tabular-nums">
                        {(viewingControl.kilometraje || 0).toLocaleString()} km
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-slate-500 font-medium mb-0.5">Combustible</p>
                      <p className="font-semibold text-slate-800 capitalize">
                        {viewingControl.combustible}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500">
                      Estado de niveles y herramientas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CHECK_ITEMS.map((item) => {
                        const ok = viewingControl[item.name];
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                          >
                            <span className="font-semibold text-slate-700">{item.label}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                ok
                                  ? 'text-slate-700 bg-slate-100 border-slate-200'
                                  : 'text-rose-700 bg-rose-50 border-rose-200'
                              }`}
                            >
                              {ok ? 'OK' : 'No OK'}
                            </span>
                          </div>
                        );
                      })}

                      {viewingControl.otroCheckNombre && (
                        <div className="col-span-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                          <span className="font-semibold text-slate-700">
                            {viewingControl.otroCheckNombre} (Adicional)
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              viewingControl.otroCheckValor
                                ? 'text-slate-700 bg-slate-100 border-slate-200'
                                : 'text-rose-700 bg-rose-50 border-rose-200'
                            }`}
                          >
                            {viewingControl.otroCheckValor ? 'OK' : 'No OK'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    {viewingControl.observacion && (
                      <div className="text-xs">
                        <p className="font-semibold text-slate-500 mb-1">Observación</p>
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
                          {viewingControl.observacion}
                        </div>
                      </div>
                    )}
                    {viewingControl.sugerencia && (
                      <div className="text-xs">
                        <p className="font-semibold text-slate-500 mb-1">Sugerencia</p>
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
                          {viewingControl.sugerencia}
                        </div>
                      </div>
                    )}
                    {!viewingControl.observacion && !viewingControl.sugerencia && (
                      <p className="text-center text-slate-400 text-xs py-2">
                        Sin observaciones ni sugerencias registradas.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end px-5 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => deferClose(() => setViewingControl(null))}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors bg-white"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      <ControlVehiculoPDFModal
        isOpen={pdfOpen}
        onClose={() => setPdfOpen(false)}
        vehiculo={selectedVeh}
        controles={controlesFiltrados}
        desde={dateRange.start}
        hasta={dateRange.end}
      />
    </div>
  );
};
