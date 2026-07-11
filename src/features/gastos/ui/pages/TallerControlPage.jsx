import React, { useState, useEffect } from 'react';
import { Car, ClipboardCheck, Gauge, CheckSquare, Clock, User, MessageSquare, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { getVehiculos, getVehiculoControles, addVehiculoControl } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';


const COMBUSTIBLE_OPTIONS = [
  { value: 'bajo', label: 'Bajo', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'medio', label: 'Medio', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'bueno', label: 'Bueno', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
];

const INITIAL_FORM = {
  fecha: new Date().toISOString().slice(0, 16),
  kilometraje: '',
  combustible: 'bueno',
  nivelAceite: true,
  nivelAgua: true,
  aceiteHidraulico: true,
  liquidoFrenos: true,
  gataLlave: true,
  extintorBotiquin: true,
  bandas: true,
  otroCheckNombre: '',
  otroCheckValor: false,
  observacion: '',
  sugerencia: ''
};

export const TallerControlPage = () => {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehId, setSelectedVehId] = useState('');
  const [controles, setControles] = useState([]);
  const [loadingVehs, setLoadingVehs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

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
  }, [selectedVehId]);

  const selectedVeh = vehiculos.find(v => v.id === selectedVehId);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedVehId) {
      toast.error('Selecciona un vehículo primero');
      return;
    }
    if (!form.kilometraje || Number(form.kilometraje) <= 0) {
      toast.error('El kilometraje debe ser mayor a 0');
      return;
    }

    const confirmed = await confirmDialog(
      'Confirmar Registro',
      '¿Desea registrar este control de vehículo?'
    );
    if (!confirmed) return;

    setSaving(true);
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

      // Prepend to logs
      setControles(prev => [saved, ...prev]);

      // Reset form (keeping date as now and resetting fields)
      setForm({
        ...INITIAL_FORM,
        fecha: new Date().toISOString().slice(0, 16),
        kilometraje: Math.max(selectedVeh?.kilometraje || 0, Number(form.kilometraje))
      });
    } catch (err) {
      toast.error('Error al registrar: ' + err.message);
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

      {/* Vehicle select */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Car size={16} className="text-slate-400" />
              Selecciona el vehículo
            </h2>
            <p className="text-xs text-slate-400">Selecciona el auto de la lista activa de la flota</p>
          </div>
          <select
            value={selectedVehId}
            onChange={(e) => setSelectedVehId(e.target.value)}
            className="h-10 px-4 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-600 focus:bg-white transition-all w-full sm:w-64"
          >
            {vehiculos.map(v => (
              <option key={v.id} value={v.id}>{v.placa} ({v.marca} {v.modelo})</option>
            ))}
            {vehiculos.length === 0 && <option value="">Sin vehículos activos</option>}
          </select>
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

      {selectedVehId ? (
        <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles size={16} className="text-yellow-500" />
              Checklist de Control
            </h3>
            <span className="text-xs text-slate-400">Todos los campos marcados con * son requeridos</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Rango de Fechas / Kilometraje / Combustible */}
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
                    className="w-full h-10 pl-3 pr-10 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-bold"
                >
                  <option value="bajo">🔴 Bajo (Menos de 1/4)</option>
                  <option value="medio">🟡 Medio (Media capacidad)</option>
                  <option value="bueno">🟢 Bueno (Lleno/Casi lleno)</option>
                </select>
              </div>
            </div>

            {/* Checkbox Matrix */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <CheckSquare size={13} /> Niveles y Herramientas (OK)
              </h4>
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
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
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
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Plus size={13} /> Otros Accesorios / Controles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre del Accesorio / Control Adicional</label>
                  <input
                    type="text"
                    name="otroCheckNombre"
                    value={form.otroCheckNombre}
                    onChange={handleInputChange}
                    placeholder="Ej. Estado de llantas, Luces direccionales, etc."
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

            {/* Observation and suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Observación</label>
                <textarea
                  name="observacion"
                  value={form.observacion}
                  onChange={handleInputChange}
                  rows={3}
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
                  rows={3}
                  placeholder="Indica qué reparación o revisión recomiendas..."
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:border-blue-600 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shadow-blue-200 flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <ClipboardCheck size={16} />
                  <span>Registrar Control</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400 text-sm">
          No hay ningún vehículo activo disponible para control.
        </div>
      )}

      {/* History table */}
      {selectedVehId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock size={16} className="text-slate-400" />
              Historial de Controles Diarios
            </h3>
          </div>

          <div className="overflow-x-auto">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-600" />
                <span>Cargando historial...</span>
              </div>
            ) : controles.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-12">No hay controles diarios registrados para este vehículo.</p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {controles.map(log => {
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
