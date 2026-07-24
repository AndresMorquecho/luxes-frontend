import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star, Send, Check, Loader2, AlertCircle,
  AlertTriangle, Headphones, ShieldCheck, Clock, CheckCircle2
} from 'lucide-react';
import { getEncuestaContext, submitEncuesta, submitReclamo } from '../../application/encuestaService.js';

function getEmpleadoKey(emp) {
  return emp?.empleadoId || emp?.id || '';
}

function buildCalificacionesPersonales(personal, calificacionGeneral) {
  const resultado = {};
  personal.forEach((emp) => {
    const empId = getEmpleadoKey(emp);
    if (empId) resultado[empId] = calificacionGeneral;
  });
  return resultado;
}

export function EncuestaPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contexto, setContexto] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [estrellas, setEstrellas] = useState(0);
  const [hoverEstrellas, setHoverEstrellas] = useState(0);
  const [calificacionPersonal, setCalificacionPersonal] = useState({});
  const [comentarios, setComentarios] = useState('');

  // Estados para seguimiento post-venta / reclamos
  const [reclamo, setReclamo] = useState(null);
  const [mostrarFormReclamo, setMostrarFormReclamo] = useState(false);
  const [detalleReclamo, setDetalleReclamo] = useState('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [enviandoReclamo, setEnviandoReclamo] = useState(false);
  const [errorReclamo, setErrorReclamo] = useState('');

  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError('');

    getEncuestaContext(id)
      .then((data) => {
        if (!activo) return;
        setContexto(data);
        if (data.encuestaCompletada) {
          setEnviado(true);
        }
        if (data.reclamo) {
          setReclamo(data.reclamo);
        }
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message || 'No se pudo cargar la encuesta');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => { activo = false; };
  }, [id]);

  const handleEstrellaGeneral = (valor) => {
    setEstrellas(valor);
    setCalificacionPersonal(buildCalificacionesPersonales(contexto?.personal || [], valor));
  };

  const handleEstrellaPersonal = (empId, valor) => {
    setCalificacionPersonal((prev) => ({
      ...prev,
      [empId]: valor,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (estrellas === 0 || enviando) return;

    setEnviando(true);
    setError('');

    try {
      const personal = (contexto?.personal || []).map((emp) => {
        const empId = getEmpleadoKey(emp);
        const estrellasPersona = Number(calificacionPersonal[empId]);
        return {
          empleadoId: empId,
          estrellas: Number.isFinite(estrellasPersona) && estrellasPersona >= 1
            ? estrellasPersona
            : estrellas,
        };
      });

      await submitEncuesta(id, {
        calificacionGeneral: estrellas,
        comentarios,
        personal,
      });
      setEnviado(true);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la encuesta');
    } finally {
      setEnviando(false);
    }
  };

  const handleOpenConfirmacion = (e) => {
    e.preventDefault();
    if (!detalleReclamo.trim()) {
      setErrorReclamo('Por favor detalla el inconveniente o problema');
      return;
    }
    setErrorReclamo('');
    setMostrarConfirmacion(true);
  };

  const handleConfirmEnviarReclamo = async () => {
    if (!detalleReclamo.trim() || enviandoReclamo) return;
    setEnviandoReclamo(true);
    setErrorReclamo('');
    try {
      const nuevoReclamo = await submitReclamo(id, { detalle: detalleReclamo.trim() });
      setReclamo(nuevoReclamo);
      setMostrarConfirmacion(false);
      setMostrarFormReclamo(false);
    } catch (err) {
      setErrorReclamo(err.message || 'Error al enviar el reporte');
      setMostrarConfirmacion(false);
    } finally {
      setEnviandoReclamo(false);
    }
  };

  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={13} /> Pendiente de revisión
          </span>
        );
      case 'EN_REVISION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock size={13} /> En revisión técnica
          </span>
        );
      case 'EN_PROCESO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock size={13} /> En proceso de solución
          </span>
        );
      case 'FINALIZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} /> Solucionado y finalizado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {estado}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error && !contexto) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-red-100">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Encuesta no disponible</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!contexto?.instalacionCompletada && !enviado) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-amber-100">
          <AlertCircle size={40} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Encuesta aún no disponible</h2>
          <p className="text-sm text-slate-500">
            La encuesta estará habilitada cuando el equipo de LUXES finalice la instalación en obra.
          </p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 text-center relative overflow-hidden my-6">
          {/* Sello de agua sutil */}
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-5 pointer-events-none">
            <ShieldCheck size={200} className="text-blue-900" />
          </div>

          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Check size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-3">
            ¡Gracias por tu respuesta!
          </h2>
          <p className="text-slate-600 text-base max-w-lg mx-auto mb-6 leading-relaxed">
            Hemos recibido tus comentarios. Tu opinión es fundamental para nosotros y nos ayuda a seguir mejorando cada día.
          </p>

          <div className="border-t border-slate-150 pt-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Headphones size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Seguimiento Post-Venta</h3>
                <p className="text-xs text-slate-500">Garantía de calidad y atención directa a nuestros clientes</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-5 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              En <span className="font-semibold text-slate-800">LUXES</span> queremos asegurarnos de que tu experiencia sea perfecta.
              Si se ha presentado algún inconveniente, falla o detalle pendiente con tu proyecto, estamos aquí para escucharte y darte una solución oportuna.
            </p>

            {/* CASO A: Aún no ha reportado un inconveniente */}
            {!reclamo ? (
              <div>
                {!mostrarFormReclamo ? (
                  <button
                    type="button"
                    onClick={() => setMostrarFormReclamo(true)}
                    className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={18} />
                    Reportar un inconveniente
                  </button>
                ) : (
                  <form onSubmit={handleOpenConfirmacion} className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Detállanos tu problema
                      </label>
                      <textarea
                        rows="4"
                        value={detalleReclamo}
                        onChange={(e) => setDetalleReclamo(e.target.value)}
                        placeholder="Por favor describe detalladamente qué ocurrió o cuál es la falla observada..."
                        className="w-full p-4 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none resize-none shadow-inner text-slate-800"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        * Tu queja será asignada de inmediato a nuestro equipo técnico para su seguimiento.
                      </p>
                    </div>

                    {errorReclamo && (
                      <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                        {errorReclamo}
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarFormReclamo(false);
                          setErrorReclamo('');
                        }}
                        className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold text-sm rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={enviandoReclamo}
                        className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        {enviandoReclamo ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Enviar reporte
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* CASO B: Ya tiene un inconveniente reportado */
              <div className="bg-slate-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Estado de tu reporte
                  </span>
                  {renderBadgeEstado(reclamo.estado)}
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">Detalle del problema enviado:</p>
                  <p className="text-sm font-medium text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                    "{reclamo.detalle}"
                  </p>
                </div>

                <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                  <span>
                    Tu queja ya se encuentra registrada y tendrá seguimiento directo. Para garantizar una atención eficiente, solo se permite registrar un reporte por proyecto.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-6 mt-8">
            <img src="/Logo.jpg" alt="LUXES" className="h-10 mx-auto rounded-lg shadow-sm" />
          </div>
        </div>

        {/* Modal de Confirmación de Envío de Reclamo */}
        {mostrarConfirmacion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>

              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                ¿Estás seguro de enviar tu reporte?
              </h3>

              <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
                Una vez enviado, nuestro equipo iniciará el seguimiento prioritario de tu caso.
                <span className="block mt-2 font-semibold text-slate-700">
                  Nota: Solo es posible registrar 1 reporte de inconveniente por proyecto.
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacion(false)}
                  disabled={enviandoReclamo}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  No, revisar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEnviarReclamo}
                  disabled={enviandoReclamo}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {enviandoReclamo ? <Loader2 size={16} className="animate-spin" /> : null}
                  Sí, enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const personal = contexto?.personal || [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e3a8a 2px, transparent 2px)', backgroundSize: '24px 24px' }} />

      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-full z-10 overflow-hidden">
        <div className="p-6 sm:px-10 sm:pt-8 sm:pb-6 border-b border-slate-50 text-center bg-white flex-shrink-0">
          <img src="/Logo.jpg" alt="LUXES" className="h-12 mx-auto mb-4 rounded shadow-sm" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
            Nos importa tu opinión
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            Hola <span className="font-semibold text-blue-600">{contexto?.clienteNombre || 'Cliente'}</span>,
            ayúdanos a evaluar el proyecto: <span className="font-medium text-slate-700">{contexto?.nombre || id}</span>
          </p>

          <h2 className="text-lg font-medium text-slate-700 tracking-tight mb-3">
            ¿Cómo fue tu experiencia general?
          </h2>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverEstrellas(star)}
                onMouseLeave={() => setHoverEstrellas(0)}
                onClick={() => handleEstrellaGeneral(star)}
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={42}
                  strokeWidth={1.5}
                  fill={star <= (hoverEstrellas || estrellas) ? 'currentColor' : 'none'}
                  className={`transition-colors duration-200 ${
                    star <= (hoverEstrellas || estrellas)
                      ? 'text-blue-500'
                      : 'text-slate-200 hover:text-blue-200'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-6 sm:px-10 py-6 flex-1 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="space-y-8 flex-1">
              {personal.length > 0 && (
                <div>
                  <div className="mb-4">
                    <p className="text-base font-semibold text-slate-800">Evaluación del equipo</p>
                    <p className="text-xs text-slate-500">Califica la atención de las personas que trabajaron en tu proyecto.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {personal.map((emp) => {
                      const empId = getEmpleadoKey(emp);
                      const estrellasPersona = calificacionPersonal[empId] || 0;
                      return (
                      <div key={empId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="mb-2 sm:mb-0">
                          <p className="font-semibold text-slate-700 text-sm">{emp.nombre}</p>
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{emp.rol}</p>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleEstrellaPersonal(empId, star)}
                              className="focus:outline-none"
                            >
                              <Star
                                size={20}
                                strokeWidth={1.5}
                                fill={star <= estrellasPersona ? 'currentColor' : 'none'}
                                className={`transition-colors duration-200 ${
                                  star <= estrellasPersona
                                    ? 'text-blue-400'
                                    : 'text-slate-200 hover:text-blue-100'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                <p className="text-base font-semibold text-slate-800 mb-3">Comentarios adicionales</p>
                <textarea
                  className="w-full p-4 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none shadow-sm"
                  placeholder="¿Qué podríamos mejorar para tu próxima experiencia?"
                  rows="3"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                {error}
              </p>
            )}

            <div className="mt-8 flex-shrink-0">
              <button
                type="submit"
                disabled={estrellas === 0 || enviando}
                className={`w-full py-3.5 font-medium text-base rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 ${
                  estrellas === 0 || enviando ? 'text-slate-400 cursor-not-allowed' : 'text-white hover:opacity-90'
                }`}
                style={{ backgroundColor: estrellas === 0 || enviando ? '#e2e8f0' : 'var(--color-secondary-blue)' }}
              >
                {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {enviando ? 'Enviando...' : 'Enviar retroalimentación'}
              </button>
              {estrellas === 0 && (
                <p className="text-center text-slate-400 text-xs mt-2">
                  * Selecciona una calificación general para poder enviar
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
