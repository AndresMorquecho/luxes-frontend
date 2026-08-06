import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Car, Clock, User, Plus, Eye, FileDown } from 'lucide-react';
import { getVehiculos, getVehiculoControles, addVehiculoControl } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { ControlVehiculoPDFModal } from '../components/ControlVehiculoPDFModal';

const COMBUSTIBLE_OPTIONS = [
  { value: 'bajo', label: 'Bajo', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'medio', label: 'Medio', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'bueno', label: 'Bueno', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
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
  sugerencia: ''
};

// ────────────────────────────────────────────────────────────────────────────

export const TallerControlPage = () => {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
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

  // Date range filter state — uses DateRangePicker format { start, end }
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  // PDF modal state
  const [pdfOpen, setPdfOpen] = useState(false);

  // Fetch active vehicles
  useEffect(() => {
    const fetchVehs = async () => {
      setLoadingVehs(true);
      try {
        const data = await getVehiculos();
        const activos = data.filter(v => v.estado === 'activo');
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

  // Fetch control history when selected vehicle changes
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
    // Reset date range when switching vehicles
    setDateRange({ start: '', end: '' });
  }, [selectedVehId]);

  const selectedVeh = vehiculos.find(v => v.id === selectedVehId);

  // ── Apply date range filter ──────────────────────────────────────────────
  const controlesFiltrados = controles.filter(log => {
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

  const getLocalDateTimeString = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const openNewControl = () => {
    if (!selectedVeh) {
      toast.error('Selecciona un vehículo primero');
      return;
    }
    setForm({
      ...INITIAL_FORM,
      fecha: getLocalDateTimeString(),
      kilometraje: selectedVeh.kilometraje || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value
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
        kilometraje: Number(form.kilometraje)
      };
      const saved = await addVehiculoControl(selectedVehId, payload);
      toast.success('Control registrado correctamente');

      // Update local vehicle mileage
      setVehiculos(prev => prev.map(v => {
        if (v.id === selectedVehId) {
          return { ...v, kilometraje: Math.max(v.kilometraje, Number(form.kilometraje)) };
        }
        return v;
      }));

      // Prepend to logs list
      setControles(prev => [saved, ...prev]);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingVehs) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <div className="co-compras-page animate-slide-up pb-6 space-y-6">
      <ComprasPageHeader
        title="Control de Vehículos"
        subtitle="Registro de control diario y kilometraje para la flota de vehículos activos"
      />

      {/* Vehicle select and header controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Car size={16} className="text-slate-400" />
              Vehículo Seleccionado
            </h2>
            <p className="text-xs text-slate-400">Selecciona la unidad para ver historial y registrar un nuevo control</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Fixed: smaller font, wider, full text visible */}
            <select
              value={selectedVehId}
              onChange={(e) => setSelectedVehId(e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 focus:bg-white transition-all w-full sm:w-72"
            >
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>{v.placa} ({v.marca} {v.modelo})</option>
              ))}
              {vehiculos.length === 0 && <option value="">Sin vehículos activos</option>}
            </select>
            <button
              onClick={openNewControl}
              disabled={!selectedVehId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 px-4 rounded-xl text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <Plus size={16} /> Nuevo Control
            </button>
          </div>
        </div>

        {selectedVeh && (
          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Marca / Modelo</span>
              <span className="font-bold text-slate-700">{selectedVeh.marca} {selectedVeh.modelo}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Año / Color</span>
              <span className="font-bold text-slate-700">{selectedVeh.anio || '—'} · {selectedVeh.color || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Kilometraje Actual</span>
              <span className="font-bold text-blue-600">{selectedVeh.kilometraje.toLocaleString()} km</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Responsable Principal</span>
              <span className="font-bold text-slate-700">{selectedVeh.responsable || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* History table */}
      {selectedVehId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* ── History Header with date filter + PDF export ── */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-2 shrink-0">
              <Clock size={16} className="text-slate-400" />
              <h3 className="font-bold text-slate-800 text-sm">Historial de Controles Diarios</h3>
              {hayFiltroActivo && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  {controlesFiltrados.length} resultado{controlesFiltrados.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Real DateRangePicker shared component */}
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Filtrar por rango de fechas"
              />

              {/* Export PDF button — opens the PDF preview modal */}
              <button
                type="button"
                onClick={() => setPdfOpen(true)}
                disabled={controlesFiltrados.length === 0}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="Exportar a PDF"
              >
                <FileDown size={13} />
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-xl">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-600" />
                <span>Cargando historial...</span>
              </div>
            ) : controlesFiltrados.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                {hayFiltroActivo
                  ? 'No hay controles en el rango de fechas seleccionado.'
                  : 'No hay controles diarios registrados para este vehículo.'}
              </div>
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
                  {controlesFiltrados.map(log => {
                    const checksCount = [
                      log.nivelAceite, log.nivelAgua, log.aceiteHidraulico,
                      log.liquidoFrenos, log.gataLlave, log.extintorBotiquin, log.bandas
                    ].filter(Boolean).length;

                    const fuelOpt = COMBUSTIBLE_OPTIONS.find(o => o.value === log.combustible);

                    const fechaFmt = new Date(log.fecha).toLocaleString('es-EC', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    });

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
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${fuelOpt?.color || ''}`}>
                            {fuelOpt?.label || log.combustible}
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
                          {log.observacion && (
                            <p className="line-clamp-2"><strong className="font-bold text-slate-500">Obs:</strong> {log.observacion}</p>
                          )}
                          {log.sugerencia && (
                            <p className="line-clamp-2 mt-0.5"><strong className="font-bold text-slate-500">Sugerencia:</strong> {log.sugerencia}</p>
                          )}
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
      )}

      {/* Modal portal for registering new control */}
      {modalOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-slate-100 max-h-[min(780px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 shrink-0 bg-white">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Registrar Control de Vehículo</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedVeh?.placa} — checklist de control circular</p>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all border border-slate-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  {/* Row 1: Date/Time, Mileage, Fuel */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fecha y Hora *</label>
                      <input
                        type="datetime-local"
                        name="fecha"
                        value={form.fecha}
                        onChange={handleInputChange}
                        required
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kilometraje *</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="kilometraje"
                          value={form.kilometraje}
                          onChange={handleInputChange}
                          required
                          placeholder={`Actual: ${selectedVeh?.kilometraje || 0}`}
                          className="w-full h-10 pl-3 pr-10 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">km</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nivel Combustible *</label>
                      <select
                        name="combustible"
                        value={form.combustible}
                        onChange={handleInputChange}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-semibold"
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
                            form[item.name]
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 font-medium'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={item.name}
                            checked={form[item.name]}
                            onChange={handleInputChange}
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
                          value={form.otroCheckNombre}
                          onChange={handleInputChange}
                          placeholder="Ej. Estado de llantas, Luces, etc."
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label
                          className={`flex items-center gap-3 h-10 px-3 rounded-xl border transition-all cursor-pointer select-none ${
                            form.otroCheckValor
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="otroCheckValor"
                            checked={form.otroCheckValor}
                            onChange={handleInputChange}
                            disabled={!form.otroCheckNombre.trim()}
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
                        value={form.observacion}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="Detalla si encontraste alguna novedad..."
                        className="w-full p-3 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:border-blue-600 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Sugerencia</label>
                      <textarea
                        name="sugerencia"
                        value={form.sugerencia}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="Indica qué reparación o revisión recomiendas..."
                        className="w-full p-3 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:border-blue-600 resize-none"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {formError}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Registrar Control'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal para Visualizar Detalles del Control */}
      {viewingControl && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => setViewingControl(null)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 shrink-0 bg-white">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Detalles de Control Diario</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedVeh?.placa} — {new Date(viewingControl.fecha).toLocaleDateString()}</p>
                </div>
                <button type="button" onClick={() => setViewingControl(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all border border-slate-200">
                  ✕
                </button>
              </div>

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
                  <div className="mt-2">
                    <span className="text-slate-450 block mb-0.5 uppercase tracking-wider font-bold text-[10px]">Combustible</span>
                    <span className="font-bold text-slate-750 capitalize">{viewingControl.combustible}</span>
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
                            <span className="text-[9px] font-bold text-slate-450 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">No OK</span>
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
                          <span className="text-[9px] font-bold text-slate-450 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">No OK</span>
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

              <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button type="button" onClick={() => setViewingControl(null)} className="bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2 rounded-xl text-xs transition-all border border-slate-300 bg-white">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
      {/* PDF Preview Modal */}
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
