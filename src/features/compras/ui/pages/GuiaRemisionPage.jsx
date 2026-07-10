import React, { useState } from 'react';
import { emitirGuiaRemision, consultarEstadoGuia } from '../../application/guiasRemisionService';
import { toast } from '../../../../shared/ui/components/Toast';
import { ComprasPageHeader } from '../components/ComprasPageHeader';
import './ComprasPage.css';

const CO_PRIMARY = '#2b41b8';
const CO_NAVY = '#1a1c3d';

export const GuiaRemisionPage = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [queryId, setQueryId] = useState('');
  const [queryResult, setQueryResult] = useState(null);

  // Form states
  const [transportista, setTransportista] = useState({
    dirPartida: '',
    dirEstablecimiento: '',
    razonSocialTransportista: '',
    tipoIdentificacionTransportista: '04', // 04 = RUC, 05 = Cédula
    rucTransportista: '',
    placa: '',
    fechaIniTransporte: new Date().toISOString().split('T')[0],
    fechaFinTransporte: new Date().toISOString().split('T')[0],
    emailReceiver: '',
  });

  const [destinatario, setDestinatario] = useState({
    identificacionDestinatario: '',
    razonSocialDestinatario: '',
    dirDestinatario: '',
    motivoTraslado: 'Venta',
    ruta: '',
  });

  const [items, setItems] = useState([
    { codigoInterno: '', descripcion: '', cantidad: 1 },
  ]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { codigoInterno: '', descripcion: '', cantidad: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.some(it => !it.descripcion || it.cantidad <= 0)) {
      toast.error('Todos los ítems deben tener una descripción y cantidad mayor a 0.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        dirPartida: transportista.dirPartida,
        dirEstablecimiento: transportista.dirEstablecimiento || undefined,
        razonSocialTransportista: transportista.razonSocialTransportista,
        tipoIdentificacionTransportista: transportista.tipoIdentificacionTransportista,
        rucTransportista: transportista.rucTransportista,
        placa: transportista.placa,
        fechaIniTransporte: formatDateToDDMMYYYY(transportista.fechaIniTransporte),
        fechaFinTransporte: formatDateToDDMMYYYY(transportista.fechaFinTransporte),
        emailReceiver: transportista.emailReceiver || undefined,
        destinatarios: [
          {
            identificacionDestinatario: destinatario.identificacionDestinatario,
            razonSocialDestinatario: destinatario.razonSocialDestinatario,
            dirDestinatario: destinatario.dirDestinatario,
            motivoTraslado: destinatario.motivoTraslado,
            ruta: destinatario.ruta || undefined,
            detalles: items,
          }
        ]
      };

      const res = await emitirGuiaRemision(payload);
      setResult(res);
      toast.success('Guía de remisión enviada correctamente');
    } catch (err) {
      toast.error(err.message || 'Error al emitir guía de remisión');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryStatus = async (e) => {
    e.preventDefault();
    if (!queryId.trim()) return;

    setChecking(true);
    setQueryResult(null);
    try {
      const res = await consultarEstadoGuia(queryId.trim());
      setQueryResult(res);
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err.message || 'Error al consultar estado');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="co-page animate-slide-up">
      <ComprasPageHeader
        title="Guías de Remisión SRI"
        subtitle="Módulo de emisión y firma de guías de remisión de contabilidad."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        {/* Formulario de Emisión */}
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Transportista & Viaje */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                1. Información del Transportista y Viaje
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="co-label">Razon Social / Nombre Completo</label>
                  <input
                    type="text"
                    className="co-input"
                    value={transportista.razonSocialTransportista}
                    onChange={e => setTransportista(prev => ({ ...prev, razonSocialTransportista: e.target.value }))}
                    required
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="co-label">Tipo Identificación</label>
                  <select
                    className="co-input"
                    value={transportista.tipoIdentificacionTransportista}
                    onChange={e => setTransportista(prev => ({ ...prev, tipoIdentificacionTransportista: e.target.value }))}
                    required
                  >
                    <option value="04">RUC</option>
                    <option value="05">Cédula</option>
                    <option value="06">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="co-label">Identificación (RUC/CI)</label>
                  <input
                    type="text"
                    className="co-input"
                    value={transportista.rucTransportista}
                    onChange={e => setTransportista(prev => ({ ...prev, rucTransportista: e.target.value }))}
                    required
                    placeholder="Identificación del transportista"
                  />
                </div>
                <div>
                  <label className="co-label">Placa Vehículo</label>
                  <input
                    type="text"
                    className="co-input"
                    value={transportista.placa}
                    onChange={e => setTransportista(prev => ({ ...prev, placa: e.target.value }))}
                    required
                    placeholder="Ej. AAA-1234"
                  />
                </div>
                <div>
                  <label className="co-label">Fecha Inicio Transporte</label>
                  <input
                    type="date"
                    className="co-input"
                    value={transportista.fechaIniTransporte}
                    onChange={e => setTransportista(prev => ({ ...prev, fechaIniTransporte: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="co-label">Fecha Fin Transporte</label>
                  <input
                    type="date"
                    className="co-input"
                    value={transportista.fechaFinTransporte}
                    onChange={e => setTransportista(prev => ({ ...prev, fechaFinTransporte: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="co-label">Dirección de Partida</label>
                  <input
                    type="text"
                    className="co-input"
                    value={transportista.dirPartida}
                    onChange={e => setTransportista(prev => ({ ...prev, dirPartida: e.target.value }))}
                    required
                    placeholder="Dirección desde donde arranca el viaje"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="co-label">Dirección Establecimiento (Opcional)</label>
                  <input
                    type="text"
                    className="co-input"
                    value={transportista.dirEstablecimiento}
                    onChange={e => setTransportista(prev => ({ ...prev, dirEstablecimiento: e.target.value }))}
                    placeholder="Establecimiento emisor"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="co-label">Correo Destinatario Notificaciones (Opcional)</label>
                  <input
                    type="email"
                    className="co-input"
                    value={transportista.emailReceiver}
                    onChange={e => setTransportista(prev => ({ ...prev, emailReceiver: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Destinatario */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                2. Información del Destinatario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="co-label">Razon Social / Nombre Completo</label>
                  <input
                    type="text"
                    className="co-input"
                    value={destinatario.razonSocialDestinatario}
                    onChange={e => setDestinatario(prev => ({ ...prev, razonSocialDestinatario: e.target.value }))}
                    required
                    placeholder="Ej. Distribuidora S.A."
                  />
                </div>
                <div>
                  <label className="co-label">Identificación (RUC/CI)</label>
                  <input
                    type="text"
                    className="co-input"
                    value={destinatario.identificacionDestinatario}
                    onChange={e => setDestinatario(prev => ({ ...prev, identificacionDestinatario: e.target.value }))}
                    required
                    placeholder="Ej. 1790000000001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="co-label">Dirección de Destino</label>
                  <input
                    type="text"
                    className="co-input"
                    value={destinatario.dirDestinatario}
                    onChange={e => setDestinatario(prev => ({ ...prev, dirDestinatario: e.target.value }))}
                    required
                    placeholder="Dirección exacta de entrega"
                  />
                </div>
                <div>
                  <label className="co-label">Motivo de Traslado</label>
                  <input
                    type="text"
                    className="co-input"
                    value={destinatario.motivoTraslado}
                    onChange={e => setDestinatario(prev => ({ ...prev, motivoTraslado: e.target.value }))}
                    required
                    placeholder="Ej. Venta, Traslado entre locales"
                  />
                </div>
                <div>
                  <label className="co-label">Ruta (Opcional)</label>
                  <input
                    type="text"
                    className="co-input"
                    value={destinatario.ruta}
                    onChange={e => setDestinatario(prev => ({ ...prev, ruta: e.target.value }))}
                    placeholder="Ej. Quito - Guayaquil por Alóag"
                  />
                </div>
              </div>
            </div>

            {/* Ítems/Detalles */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-base font-bold text-slate-800">
                  3. Mercadería / Ítems a Trasladar
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: CO_PRIMARY }}
                >
                  + Agregar Ítem
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                    <div className="w-28 shrink-0">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Código (Opcional)</label>
                      <input
                        type="text"
                        className="co-input bg-white h-9 text-xs"
                        value={item.codigoInterno}
                        onChange={e => handleItemChange(index, 'codigoInterno', e.target.value)}
                        placeholder="Cód. int"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Descripción</label>
                      <input
                        type="text"
                        className="co-input bg-white h-9 text-xs"
                        value={item.descripcion}
                        onChange={e => handleItemChange(index, 'descripcion', e.target.value)}
                        required
                        placeholder="Descripción de la mercadería"
                      />
                    </div>
                    <div className="w-20 shrink-0">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Cantidad</label>
                      <input
                        type="number"
                        className="co-input bg-white h-9 text-xs"
                        value={item.cantidad}
                        onChange={e => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        required
                        min="1"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-9 h-9 flex items-center justify-center bg-rose-50 border border-rose-100 rounded-lg text-rose-600 hover:bg-rose-100/70"
                        title="Eliminar ítem"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: CO_PRIMARY }}
            >
              {loading ? (
                <>
                  <div className="co-spinner-sm" />
                  Emitiendo comprobante...
                </>
              ) : (
                'Firmar y Emitir Guía de Remisión'
              )}
            </button>
          </form>
        </div>

        {/* Panel de Resultados y Consulta */}
        <div className="space-y-6">
          {/* Consulta de Estado */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              Consultar Comprobante por ID
            </h2>
            <form onSubmit={handleQueryStatus} className="space-y-3">
              <div>
                <label className="co-label">ID de Emisión</label>
                <input
                  type="text"
                  className="co-input font-mono"
                  value={queryId}
                  onChange={e => setQueryId(e.target.value)}
                  placeholder="ID retornado por la API"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={checking}
                className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {checking ? (
                  <>
                    <div className="co-spinner-sm" />
                    Consultando...
                  </>
                ) : (
                  'Verificar Estado'
                )}
              </button>
            </form>

            {queryResult && (
              <div className="mt-4 p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-3 font-mono text-xs">
                <p className="font-semibold text-slate-800 border-b pb-1.5">Resultado Consulta</p>
                <div>
                  <span className="text-slate-500 block">ID:</span>
                  <span className="text-slate-800">{queryResult.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estado:</span>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                    queryResult.estado === 'autorizado' ? 'bg-emerald-100 text-emerald-800' :
                    queryResult.estado === 'encolado' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>{queryResult.estado}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Clave Acceso:</span>
                  <span className="text-slate-800 break-all select-all">{queryResult.clave_acceso || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mensaje / Info:</span>
                  <span className="text-slate-800">{queryResult.mensaje || '—'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Resultado de Última Emisión */}
          {result && (
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                Última Emisión Realizada
              </h2>
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block">Comprobante ID:</span>
                  <span className="text-slate-800 font-bold select-all bg-slate-100 px-1 py-0.5 rounded block">{result.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estado:</span>
                  <span className="text-slate-800 font-semibold uppercase">{result.estado}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Clave Acceso:</span>
                  <span className="text-slate-800 break-all">{result.clave_acceso || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mensaje SRI:</span>
                  <span className="text-slate-700 leading-normal">{result.mensaje}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
