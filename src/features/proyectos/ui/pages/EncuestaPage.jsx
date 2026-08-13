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
  const RATING_LABELS = {
    1: 'Necesita mejorar',
    2: 'Regular',
    3: 'Bueno',
    4: 'Muy Bueno',
    5: '¡Excelente!',
  };

  return (
    <div className="min-h-screen w-screen overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e3a8a 2px, transparent 2px)', backgroundSize: '24px 24px' }} />

      <form onSubmit={handleSubmit} className="w-full max-w-6xl z-10 my-auto py-2 sm:py-4">
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-5">
          
          {/* HEADER: LOGO, SALUDO Y EL ÚNICO BOTÓN DE ENVÍO */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5 text-center sm:text-left min-w-0">
              <img src="/Logo.jpg" alt="LUXES" className="h-10 sm:h-12 rounded shadow-xs shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                  Nos importa tu opinión
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm truncate">
                  Hola <span className="font-semibold text-blue-600">{contexto?.clienteNombre || 'Cliente'}</span>, ayúdanos a evaluar el proyecto: <span className="font-medium text-slate-700">{contexto?.nombre || id}</span>
                </p>
              </div>
            </div>

            {/* EL ÚNICO BOTÓN DE ENVÍO EN TODA LA PÁGINA */}
            <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-1 shrink-0">
              <button
                type="submit"
                disabled={estrellas === 0 || enviando}
                className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg ${
                  estrellas === 0 || enviando
                    ? 'bg-slate-200 text-slate-400 border border-slate-300/80 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-blue-500/25 ring-4 ring-blue-500/20'
                }`}
              >
                {enviando ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Enviar Calificación</span>
                  </>
                )}
              </button>
              {estrellas === 0 && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200/80">
                  ⚠️ Selecciona tus estrellas primero
                </span>
              )}
            </div>
          </div>

          {/* GRID CONTENEDOR EN WEB (2 COLUMNAS SIDE-BY-SIDE SIN SCROLL) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* COLUMNA IZQUIERDA (5 COLS EN WEB): EXPERIENCIA GENERAL + COMENTARIOS */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              
              {/* EXPERIENCIA GENERAL */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 text-center sm:text-left">
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  ¿Cómo fue tu experiencia general?
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">
                  {estrellas > 0 ? (
                    <span className="font-bold text-blue-600">{estrellas} de 5 estrellas — {RATING_LABELS[estrellas]}</span>
                  ) : (
                    'Toca una estrella para calificar'
                  )}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverEstrellas(star)}
                      onMouseLeave={() => setHoverEstrellas(0)}
                      onClick={() => handleEstrellaGeneral(star)}
                      className="focus:outline-none transition-transform hover:scale-125 active:scale-90 p-1 cursor-pointer"
                      title={`${star} Estrellas`}
                    >
                      <Star
                        size={36}
                        strokeWidth={1.5}
                        fill={star <= (hoverEstrellas || estrellas) ? 'currentColor' : 'none'}
                        className={`transition-colors duration-150 ${
                          star <= (hoverEstrellas || estrellas)
                            ? 'text-blue-500 drop-shadow-xs'
                            : 'text-slate-300 hover:text-blue-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* COMENTARIOS */}
              <div className="flex-1 flex flex-col">
                <p className="text-sm font-bold text-slate-800 mb-1.5">Comentarios adicionales (opcional)</p>
                <textarea
                  className="w-full p-3.5 text-sm text-slate-700 bg-slate-50/60 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none shadow-xs flex-1 min-h-[90px]"
                  placeholder="¿Qué podríamos mejorar para tu próxima experiencia?"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  {error}
                </p>
              )}
            </div>

            {/* COLUMNA DERECHA (7 COLS EN WEB): EVALUACIÓN DEL EQUIPO */}
            <div className="lg:col-span-7 flex flex-col justify-start">
              {personal.length > 0 && (
                <div className="h-full flex flex-col bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/60">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-slate-800">Evaluación del equipo</p>
                    <p className="text-xs text-slate-500">Califica la atención de las personas que trabajaron en tu proyecto (opcional).</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[320px] lg:max-h-[380px] pr-1">
                    {personal.map((emp) => {
                      const empId = getEmpleadoKey(emp);
                      const estrellasPersona = calificacionPersonal[empId] || 0;
                      return (
                        <div key={empId} className="flex flex-col justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">{emp.nombre}</p>
                            <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider mt-0.5">{emp.rol}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleEstrellaPersonal(empId, star)}
                                className="focus:outline-none p-0.5 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                              >
                                <Star
                                  size={20}
                                  strokeWidth={1.5}
                                  fill={star <= estrellasPersona ? 'currentColor' : 'none'}
                                  className={`transition-colors duration-150 ${
                                    star <= estrellasPersona
                                      ? 'text-blue-500'
                                      : 'text-slate-300 hover:text-blue-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </form>
    </div>
  );
}
