import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Car, Wrench, ClipboardCheck, Clock, User, Gauge, CheckSquare, Plus, AlertCircle, Sparkles, Camera, Image as ImageIcon, X, Loader2, Fuel, Flag } from 'lucide-react';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { CameraCaptureModal } from '../../../../shared/ui/components/CameraCaptureModal.jsx';
import {
  getVehiculos, saveVehiculo, deleteVehiculo, saveMantenimiento, deleteMantenimiento,
  getVehiculoControles, addVehiculoControl, uploadControlFoto,
  TIPOS_MANTENIMIENTO, labelTipoMantenimiento, estadoMantenimiento,
  getMetodosPago,
} from '../../application/gastosService';
import { compressImage } from '../../../../shared/utils/imageCompressor';
import { MODAL_HEADER_STYLE, MODAL_FORM_STYLES, fmt } from '../shared/gastosUi';
import { todayDateInputValue } from '../../../../shared/utils/dateOnly';

const getNowLocalDateTime = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PHOTO_FIELDS = [
  { key: 'fotoGasolinaInicio', label: '1. Gasolina Inicial', subtitle: 'Nivel con el que empiezan', icon: Fuel, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'fotoKmInicio', label: '2. KM Inicial', subtitle: 'Kilometraje con el que inicia', icon: Gauge, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'fotoKmFin', label: '3. KM Final', subtitle: 'Kilometraje con el que queda', icon: Flag, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'fotoGasolinaFin', label: '4. Gasolina Final', subtitle: 'Nivel de gasolina que queda', icon: Fuel, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

const INITIAL_PHOTOS = {
  fotoGasolinaInicio: null,
  fotoKmInicio: null,
  fotoKmFin: null,
  fotoGasolinaFin: null,
};

const EMPTY_VEHICULO = { placa: '', marca: '', modelo: '', anio: '', color: '', kilometraje: 0, responsable: '', notas: '', estado: 'activo' };
const EMPTY_MANT = {
  tipo: 'cambio_aceite', descripcion: '', fechaRealizado: todayDateInputValue(),
  fechaProxima: '', kilometraje: '', kmProximo: '', monto: 0, proveedor: '', notas: '',
  metodoPagoId: '',
};
const EMPTY_CONTROL = {
  fecha: getNowLocalDateTime(),
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

const ESTADO_BADGE = {
  vencido: { label: 'Vencido', bg: 'bg-red-50 text-red-700 border-red-200' },
  proximo: { label: 'Próximo', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ok: { label: 'Al día', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const GastosCarrosTab = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [vehFormOpen, setVehFormOpen] = useState(false);
  const [mantFormOpen, setMantFormOpen] = useState(false);
  const [controlFormOpen, setControlFormOpen] = useState(false);
  const [editingVeh, setEditingVeh] = useState(null);
  const [editingMant, setEditingMant] = useState(null);
  const [vehForm, setVehForm] = useState(EMPTY_VEHICULO);
  const [mantForm, setMantForm] = useState(EMPTY_MANT);
  const [controlForm, setControlForm] = useState(EMPTY_CONTROL);
  const [selectedPhotos, setSelectedPhotos] = useState(INITIAL_PHOTOS);
  const [uploadStatus, setUploadStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [cameraModal, setCameraModal] = useState({ isOpen: false, targetKey: '', title: '' });

  const handleOpenLiveCamera = (key, label) => {
    setCameraModal({
      isOpen: true,
      targetKey: key,
      title: `Tomar foto: ${label}`,
    });
  };

  const [controles, setControles] = useState([]);
  const [loadingControles, setLoadingControles] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getVehiculos();
      setVehiculos(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadControles = async (vehId) => {
    setLoadingControles(true);
    try {
      const data = await getVehiculoControles(vehId);
      setControles(data);
    } catch (e) { console.error(e); } finally { setLoadingControles(false); }
  };

  useEffect(() => {
    load();
    const loadMetodos = async () => {
      try {
        const data = await getMetodosPago();
        setMetodosPago(data);
      } catch (err) {
        console.error('Error loading payment methods:', err);
      }
    };
    loadMetodos();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadControles(selectedId);
    }
  }, [selectedId]);

  const selected = vehiculos.find((v) => v.id === selectedId) ?? null;
  const mantenimientos = selected?.mantenimientos ?? [];

  const alertas = useMemo(() => {
    let vencidos = 0;
    let proximos = 0;
    vehiculos.forEach((v) => {
      (v.mantenimientos ?? []).forEach((m) => {
        const est = estadoMantenimiento(m, v.kilometraje);
        if (est === 'vencido') vencidos++;
        if (est === 'proximo') proximos++;
      });
    });
    return { vencidos, proximos };
  }, [vehiculos]);

  const openNewVeh = () => {
    setEditingVeh(null);
    setVehForm(EMPTY_VEHICULO);
    setFormError('');
    setVehFormOpen(true);
  };

  const openEditVeh = (v) => {
    setEditingVeh(v);
    setVehForm({ ...v, anio: v.anio ?? '' });
    setFormError('');
    setVehFormOpen(true);
  };

  const openNewMant = () => {
    if (!selected) return;
    setEditingMant(null);
    setMantForm({
      ...EMPTY_MANT,
      fechaRealizado: todayDateInputValue(),
      kilometraje: selected.kilometraje,
      metodoPagoId: '',
    });
    setFormError('');
    setMantFormOpen(true);
  };

  const openEditMant = (m) => {
    setEditingMant(m);
    setMantForm({
      ...m,
      kilometraje: m.kilometraje ?? '',
      kmProximo: m.kmProximo ?? '',
      fechaProxima: m.fechaProxima ?? '',
      metodoPagoId: m.gasto?.metodoPagoId ?? '',
    });
    setFormError('');
    setMantFormOpen(true);
  };

  const handlePhotoSelect = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }
    const preview = URL.createObjectURL(file);
    setSelectedPhotos(prev => {
      if (prev[key]?.preview) {
        URL.revokeObjectURL(prev[key].preview);
      }
      return {
        ...prev,
        [key]: { file, preview, name: file.name, size: file.size },
      };
    });
  };

  const handlePhotoRemove = (key) => {
    setSelectedPhotos(prev => {
      if (prev[key]?.preview) {
        URL.revokeObjectURL(prev[key].preview);
      }
      return {
        ...prev,
        [key]: null,
      };
    });
  };

  const resetPhotos = () => {
    Object.values(selectedPhotos).forEach(item => {
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setSelectedPhotos(INITIAL_PHOTOS);
  };

  const openNewControl = () => {
    if (!selected) return;
    resetPhotos();
    setControlForm({
      ...EMPTY_CONTROL,
      fecha: new Date().toISOString().slice(0, 16),
      kilometraje: selected.kilometraje,
    });
    setFormError('');
    setUploadStatus('');
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
    if (!selected) return;
    if (!controlForm.kilometraje || Number(controlForm.kilometraje) <= 0) {
      setFormError('El kilometraje debe ser mayor a 0');
      return;
    }
    setSaving(true);
    setFormError('');
    setUploadStatus('Optimizando y subiendo fotos...');
    try {
      const uploadedUrls = {};
      const keys = ['fotoGasolinaInicio', 'fotoKmInicio', 'fotoKmFin', 'fotoGasolinaFin'];

      for (const k of keys) {
        const photoItem = selectedPhotos[k];
        if (photoItem?.file) {
          const compressed = await compressImage(photoItem.file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.82,
          });
          const url = await uploadControlFoto(compressed);
          uploadedUrls[k] = url;
        } else {
          uploadedUrls[k] = null;
        }
      }

      setUploadStatus('Guardando control...');

      const payload = {
        ...controlForm,
        kilometraje: Number(controlForm.kilometraje),
        ...uploadedUrls,
      };
      const saved = await addVehiculoControl(selected.id, payload);
      setControles((prev) => [saved, ...prev]);
      setVehiculos((prev) => prev.map((v) => {
        if (v.id === selected.id) {
          return { ...v, kilometraje: Math.max(v.kilometraje, Number(controlForm.kilometraje)) };
        }
        return v;
      }));
      resetPhotos();
      setControlFormOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  const handleVehChange = (e) => {
    const val = e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    setVehForm((p) => ({ ...p, [e.target.name]: val }));
  };

  const handleMantChange = (e) => {
    const val = e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    setMantForm((p) => ({ ...p, [e.target.name]: val }));
  };

  const handleSaveVeh = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = editingVeh ? { ...vehForm, id: editingVeh.id } : vehForm;
      const saved = await saveVehiculo(payload);
      setVehiculos((prev) => {
        const idx = prev.findIndex((v) => v.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
      setSelectedId(saved.id);
      setVehFormOpen(false);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleSaveMant = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = editingMant ? { ...mantForm, id: editingMant.id } : mantForm;
      const saved = await saveMantenimiento(selected.id, payload);
      setVehiculos((prev) => prev.map((v) => {
        if (v.id !== selected.id) return v;
        const mants = v.mantenimientos ?? [];
        const idx = mants.findIndex((m) => m.id === saved.id);
        const nextMants = idx >= 0 ? mants.map((m, i) => (i === idx ? saved : m)) : [saved, ...mants];
        return { ...v, mantenimientos: nextMants, kilometraje: Math.max(v.kilometraje, saved.kilometraje ?? v.kilometraje) };
      }));
      setMantFormOpen(false);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleDeleteVeh = async (v) => {
    const ok = await confirmDialog('¿Eliminar vehículo?', `Se eliminará ${v.placa} y todo su historial de mantenimiento.`, { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' });
    if (!ok) return;
    await deleteVehiculo(v.id);
    setVehiculos((prev) => prev.filter((x) => x.id !== v.id));
    if (selectedId === v.id) setSelectedId(null);
  };

  const handleDeleteMant = async (m) => {
    const ok = await confirmDialog('¿Eliminar registro?', `Eliminar ${labelTipoMantenimiento(m.tipo)} del ${selected?.placa}.`, { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' });
    if (!ok) return;
    await deleteMantenimiento(m.id);
    setVehiculos((prev) => prev.map((v) =>
      v.id === selected.id ? { ...v, mantenimientos: (v.mantenimientos ?? []).filter((x) => x.id !== m.id) } : v
    ));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" /></div>;
  }

  return (
    <>
      {(alertas.vencidos > 0 || alertas.proximos > 0) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 ${alertas.vencidos > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <Wrench className={`w-5 h-5 shrink-0 ${alertas.vencidos > 0 ? 'text-red-600' : 'text-amber-600'}`} />
          <p className={`text-sm font-medium ${alertas.vencidos > 0 ? 'text-red-800' : 'text-amber-800'}`}>
            {alertas.vencidos > 0 && <span>{alertas.vencidos} mantenimiento{alertas.vencidos !== 1 ? 's' : ''} vencido{alertas.vencidos !== 1 ? 's' : ''}</span>}
            {alertas.vencidos > 0 && alertas.proximos > 0 && ' · '}
            {alertas.proximos > 0 && <span>{alertas.proximos} próximo{alertas.proximos !== 1 ? 's' : ''} en 30 días</span>}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-slate-500">Control de vehículos, cambios de aceite, SOAT y mantenimientos programados</p>
        <button onClick={openNewVeh} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2">
          <Car size={16} /> Nuevo Vehículo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {vehiculos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === v.id ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 tracking-wide">{v.placa}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400">{v.estado}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{v.marca} {v.modelo} {v.anio ? `· ${v.anio}` : ''}</p>
              <p className="text-[11px] text-slate-400 mt-1">{v.kilometraje.toLocaleString()} km · {v.responsable || 'Sin responsable'}</p>
            </button>
          ))}
          {vehiculos.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">Sin vehículos registrados</div>
          )}
        </div>

        {selected ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Tipo', 'Realizado', 'Próximo', 'Km actual / próximo', 'Monto', 'Estado', ''].map((h) => (
                        <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase ${h === 'Monto' ? 'text-right' : h === '' ? 'text-center w-20' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mantenimientos.map((m) => {
                      const est = estadoMantenimiento(m, selected.kilometraje);
                      const badge = ESTADO_BADGE[est];
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{labelTipoMantenimiento(m.tipo)}</p>
                            {m.descripcion && <p className="text-[11px] text-slate-400">{m.descripcion}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{m.fechaRealizado}</td>
                          <td className="px-4 py-3 text-slate-600">{m.fechaProxima || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {m.kilometraje != null ? `${m.kilometraje.toLocaleString()} km` : '—'}
                            {m.kmProximo != null && <span className="text-slate-400"> → {m.kmProximo.toLocaleString()} km</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{m.monto ? fmt(m.monto) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => openEditMant(m)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600" title="Editar">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteMant(m)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500" title="Eliminar">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {mantenimientos.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">Sin mantenimientos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD: HISTORIAL DE CONTROLES DIARIOS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" />
                  Historial de Controles Diarios
                </h3>
              </div>
              <div className="overflow-x-auto">
                {loadingControles ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-xs">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-blue-600" />
                    <span>Cargando controles...</span>
                  </div>
                ) : controles.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-12">Sin controles diarios registrados</p>
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
                      {controles.map((log) => {
                        const checksCount = [
                          log.nivelAceite, log.nivelAgua, log.aceiteHidraulico,
                          log.liquidoFrenos, log.gataLlave, log.extintorBotiquin, log.bandas
                        ].filter(Boolean).length;

                        const fechaFmt = new Date(log.fecha).toLocaleString('es-EC', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        });

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{fechaFmt}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{log.usuarioNom}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{log.kilometraje.toLocaleString()} km</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                log.combustible === 'bajo' ? 'text-red-600 bg-red-50 border-red-200' :
                                log.combustible === 'medio' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                'text-emerald-600 bg-emerald-50 border-emerald-200'
                              }`}>
                                {log.combustible === 'bajo' ? 'Bajo' : log.combustible === 'medio' ? 'Medio' : 'Bueno'}
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
                              {log.sugerencia && <p className="line-clamp-2 mt-0.5"><strong className="font-bold text-slate-500">Sug:</strong> {log.sugerencia}</p>}
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
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 flex items-center justify-center py-24 text-slate-400 text-sm">
            Selecciona o registra un vehículo
          </div>
        )}
      </div>

      {/* Modal Vehículo */}
      {vehFormOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setVehFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(720px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">{editingVeh ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
                  <p className="text-xs text-white/60 mt-0.5">Datos del vehículo de la flota</p>
                </div>
                <button type="button" onClick={() => setVehFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveVeh} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Placa</label><input name="placa" value={vehForm.placa} onChange={handleVehChange} required className="input-field uppercase" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Kilometraje</label><input name="kilometraje" type="number" value={vehForm.kilometraje} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Marca</label><input name="marca" value={vehForm.marca} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Modelo</label><input name="modelo" value={vehForm.modelo} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Año</label><input name="anio" type="number" value={vehForm.anio} onChange={handleVehChange} className="input-field" /></div>
                    <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Color</label><input name="color" value={vehForm.color} onChange={handleVehChange} className="input-field" /></div>
                    <div className="col-span-2"><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Responsable</label><input name="responsable" value={vehForm.responsable} onChange={handleVehChange} className="input-field" /></div>
                    <div className="col-span-2"><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Notas</label><textarea name="notas" value={vehForm.notas} onChange={handleVehChange} rows={2} className="input-field resize-none" /></div>
                  </div>
                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
                </div>
                <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button type="button" onClick={() => setVehFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60">{editingVeh ? 'Guardar' : 'Registrar'}</button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Mantenimiento */}
      {mantFormOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setMantFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(780px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">{editingMant ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'}</h2>
                  <p className="text-xs text-white/60 mt-0.5">{selected?.placa} — programar próxima fecha o km</p>
                </div>
                <button type="button" onClick={() => setMantFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveMant} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Tipo de servicio</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Tipo</label>
                        <select name="tipo" value={mantForm.tipo} onChange={handleMantChange} className="input-field">
                          {TIPOS_MANTENIMIENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Descripción</label>
                        <input name="descripcion" value={mantForm.descripcion} onChange={handleMantChange} className="input-field" placeholder="Ej. Aceite 5W-30 sintético + filtro" />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Fechas y kilometraje</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Fecha realizado</label><input name="fechaRealizado" type="date" value={mantForm.fechaRealizado} onChange={handleMantChange} required className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Próximo mantenimiento</label><input name="fechaProxima" type="date" value={mantForm.fechaProxima} onChange={handleMantChange} className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Km al realizar</label><input name="kilometraje" type="number" value={mantForm.kilometraje} onChange={handleMantChange} className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Km próximo servicio</label><input name="kmProximo" type="number" value={mantForm.kmProximo} onChange={handleMantChange} className="input-field" placeholder="Ej. 52000" /></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full" />Costo y Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Monto ($)</label><input name="monto" type="number" step="0.01" value={mantForm.monto} onChange={handleMantChange} className="input-field" /></div>
                      <div><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Proveedor / taller</label><input name="proveedor" value={mantForm.proveedor} onChange={handleMantChange} className="input-field" /></div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Método de Pago *</label>
                        <select name="metodoPagoId" value={mantForm.metodoPagoId} onChange={handleMantChange} required className="input-field bg-white">
                          <option value="">Seleccione método...</option>
                          {metodosPago.filter(m => m.activo).map(m => (
                            <option key={m.id} value={m.id}>{m.nombre} ({fmt(m.saldoActual)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2"><label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Notas</label><textarea name="notas" value={mantForm.notas} onChange={handleMantChange} rows={2} className="input-field resize-none" /></div>
                    </div>
                  </div>
                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
                </div>
                <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button type="button" onClick={() => setMantFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60">{editingMant ? 'Guardar' : 'Registrar'}</button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Control Diario */}
      {controlFormOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setControlFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(780px,92vh)] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">Registrar Control de Vehículo</h2>
                  <p className="text-xs text-white/60 mt-0.5">{selected?.placa} — checklist de control circular</p>
                </div>
                <button type="button" onClick={() => setControlFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveControl} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Fecha y Hora *</label>
                      <input type="datetime-local" name="fecha" value={controlForm.fecha} onChange={handleControlChange} required className="input-field" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Kilometraje *</label>
                      <input type="number" name="kilometraje" value={controlForm.kilometraje} onChange={handleControlChange} required className="input-field" placeholder={`Actual: ${selected?.kilometraje}`} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Nivel Combustible *</label>
                      <select name="combustible" value={controlForm.combustible} onChange={handleControlChange} className="input-field font-semibold">
                        <option value="bajo">Bajo (menos de 1/4)</option>
                        <option value="medio">Medio</option>
                        <option value="bueno">Bueno</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-emerald-500 rounded-full" />Niveles y Herramientas (OK)</h3>
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
                        <label key={item.name} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          controlForm[item.name] ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}>
                          <input type="checkbox" name={item.name} checked={controlForm[item.name]} onChange={handleControlChange} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600" />
                          <span className="text-xs font-semibold">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-emerald-500 rounded-full" />Otros Accesorios / Controles</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre del Accesorio / Control Adicional</label>
                        <input type="text" name="otroCheckNombre" value={controlForm.otroCheckNombre} onChange={handleControlChange} placeholder="Ej. Llantas, Luces, etc." className="input-field text-xs" />
                      </div>
                      <div>
                        <label className={`flex items-center gap-3 h-10 px-3 rounded-xl border transition-all cursor-pointer select-none ${
                          controlForm.otroCheckValor ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}>
                          <input type="checkbox" name="otroCheckValor" checked={controlForm.otroCheckValor} onChange={handleControlChange} disabled={!controlForm.otroCheckNombre.trim()} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 disabled:opacity-55" />
                          <span className="text-xs font-semibold">¿Está OK?</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Sección de Registro Fotográfico Opcional */}
                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-blue-600 rounded-full" />
                        Registro Fotográfico
                      </h3>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
                        Opcional (4 fotos)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PHOTO_FIELDS.map((pf) => {
                        const currentPhoto = selectedPhotos[pf.key];
                        const IconComponent = pf.icon;
                        return (
                          <div
                            key={pf.key}
                            className={`relative rounded-xl border p-3 transition-all ${
                              currentPhoto
                                ? 'border-blue-300 bg-blue-50/40 shadow-2xs'
                                : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${pf.color}`}>
                                    <IconComponent size={13} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 truncate">{pf.label}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{pf.subtitle}</p>
                              </div>
                              {currentPhoto && (
                                <button
                                  type="button"
                                  onClick={() => handlePhotoRemove(pf.key)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar foto"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            {currentPhoto ? (
                              <div className="mt-2.5 flex items-center gap-2.5 bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                                <img
                                  src={currentPhoto.preview}
                                  alt={pf.label}
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-slate-700 truncate">{currentPhoto.name}</p>
                                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                    ✓ Foto lista ({(currentPhoto.size / 1024).toFixed(0)} KB)
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2.5 grid grid-cols-2 gap-2">
                                {/* Botón Cámara (Abre el visor de cámara en vivo directamente) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenLiveCamera(pf.key, pf.label)}
                                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-blue-700 font-bold text-xs cursor-pointer transition-all active:scale-[0.98] shadow-2xs group"
                                >
                                  <Camera size={14} className="text-blue-600 group-hover:scale-110 transition-transform" />
                                  <span>Cámara</span>
                                </button>

                                {/* Botón Galería / Archivos */}
                                <label className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-all active:scale-[0.98] shadow-2xs group">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handlePhotoSelect(pf.key, file);
                                      e.target.value = '';
                                    }}
                                  />
                                  <ImageIcon size={14} className="text-slate-500 group-hover:scale-110 transition-transform" />
                                  <span>Galería</span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Observación</label>
                      <textarea name="observacion" value={controlForm.observacion} onChange={handleControlChange} rows={2} className="input-field resize-none" placeholder="Novedades encontradas..." />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1 block">Sugerencia</label>
                      <textarea name="sugerencia" value={controlForm.sugerencia} onChange={handleControlChange} rows={2} className="input-field resize-none" placeholder="Recomendaciones o sugerencias..." />
                    </div>
                  </div>

                  {uploadStatus && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      <span className="font-semibold">{uploadStatus}</span>
                    </div>
                  )}

                  {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
                </div>
                <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <button type="button" disabled={saving} onClick={() => setControlFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? (uploadStatus || 'Guardando...') : 'Registrar Control'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal({ isOpen: false, targetKey: '', title: '' })}
        title={cameraModal.title}
        onCapture={(capturedFile) => {
          if (cameraModal.targetKey && capturedFile) {
            handlePhotoSelect(cameraModal.targetKey, capturedFile);
          }
        }}
      />
    </>
  );
};
