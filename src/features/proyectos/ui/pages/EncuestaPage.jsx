import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, Check, Loader2, AlertCircle } from 'lucide-react';
import { getEncuestaContext, submitEncuesta } from '../../application/encuestaService.js';

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
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-4">¡Gracias por tu respuesta!</h2>
          <p className="text-slate-600 text-base mb-8">
            Hemos recibido tus comentarios. Tu opinión es fundamental para nosotros.
          </p>
          <img src="/Logo.jpg" alt="LUXES" className="h-10 mx-auto rounded-lg shadow-sm" />
        </div>
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
