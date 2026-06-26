import React, { useState, useEffect, useMemo } from 'react';
import { Send, X, Smartphone, MessageCircle, Copy, Star } from 'lucide-react';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';

function formatWhatsAppNumber(telefono) {
  const fallback = '593968982380';
  if (!telefono || typeof telefono !== 'string') return fallback;
  const digits = telefono.replace(/\D/g, '');
  if (!digits) return fallback;
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('0')) return `593${digits.slice(1)}`;
  if (digits.length === 9) return `593${digits}`;
  return digits;
}

export function SendSurveyModal({
  isOpen,
  onClose,
  proyecto,
  onConfirm,
  onSend,
  variant = 'proyecto',
}) {
  const urlEncuesta = `${window.location.origin}/encuesta/${proyecto?.id || 'demo'}`;
  const nombreCliente = typeof proyecto?.cliente === 'object'
    ? proyecto?.cliente?.nombre
    : (proyecto?.cliente || 'Cliente');
  const telefonoCliente = typeof proyecto?.cliente === 'object'
    ? proyecto?.cliente?.telefono
    : '';

  const mensajeDefault = useMemo(() => (
    `Hola ${nombreCliente}, en LUXES queremos seguir mejorando para brindarte el mejor servicio. `
    + `La instalación del proyecto "${proyecto?.nombre || 'Proyecto'}" ha sido completada. `
    + `Por favor califica nuestro trabajo con las estrellas en este enlace: ${urlEncuesta} `
    + `¡Gracias por tu confianza!`
  ), [nombreCliente, proyecto?.nombre, urlEncuesta]);

  const [mensaje, setMensaje] = useState(mensajeDefault);
  const [enviando, setEnviando] = useState(false);
  const numeroWA = formatWhatsAppNumber(telefonoCliente);

  useEffect(() => {
    if (isOpen) setMensaje(mensajeDefault);
  }, [isOpen, mensajeDefault]);

  if (!isOpen) return null;

  const subtitle = variant === 'instalacion'
    ? 'La obra fue completada — envía el link para que el cliente califique con estrellas'
    : 'Paso final antes de cerrar el proyecto';

  const confirmLabel = variant === 'instalacion'
    ? 'Enviar WhatsApp al cliente'
    : 'Enviar WhatsApp y Finalizar';

  const handleSendAndComplete = async () => {
    setEnviando(true);
    try {
      if (onSend) await onSend();
      const waLink = `https://wa.me/${numeroWA}?text=${encodeURIComponent(mensaje)}`;
      window.open(waLink, '_blank');
      onConfirm?.();
    } catch (err) {
      toast.error(err?.message || 'No se pudo registrar el envío de la encuesta');
    } finally {
      setEnviando(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(urlEncuesta);
      toast.success('Enlace de encuesta copiado.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="bg-emerald-50 px-6 py-4 flex items-center justify-between border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <MessageCircle size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Enviar Encuesta de Satisfacción</h2>
              <p className="text-xs text-emerald-600 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
            <Star size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <p>
              El cliente abrirá el enlace y podrá calificar el servicio con estrellas (1 a 5)
              y evaluar al personal que participó en la obra.
            </p>
          </div>

          <p className="text-sm text-slate-600">
            Envía el mensaje por WhatsApp con el link de la encuesta. Puedes editar el texto antes de enviarlo.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Enlace de encuesta
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={urlEncuesta}
                className="flex-1 p-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Copy size={14} />
                Copiar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mensaje de WhatsApp
            </label>
            <textarea
              className="w-full h-32 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <Smartphone size={16} className="text-slate-400" />
            <span className="text-xs text-slate-500">
              Se enviará al número del cliente:
              {' '}
              <strong className="text-slate-700">
                +
                {numeroWA}
              </strong>
              {!telefonoCliente && (
                <span className="text-amber-600"> (número predeterminado — sin teléfono en ficha)</span>
              )}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
          >
            Omitir por ahora
          </button>
          <button
            type="button"
            onClick={handleSendAndComplete}
            disabled={enviando}
            className="px-6 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60"
          >
            <Send size={16} />
            {enviando ? 'Enviando...' : confirmLabel}
          </button>
        </div>

        </div>
      </div>
    </ModalPortal>
  );
}
