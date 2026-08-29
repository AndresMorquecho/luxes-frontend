import React, { useState, useMemo, useEffect } from 'react';
import { Send, X, Smartphone, MessageCircle, Copy } from 'lucide-react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { enviarProforma } from '../../application/proformasService.js';

function formatWhatsAppNumber(telefono) {
  const fallback = '';
  if (!telefono || typeof telefono !== 'string') return fallback;
  const digits = telefono.replace(/\D/g, '');
  if (!digits) return fallback;
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('0')) return `593${digits.slice(1)}`;
  if (digits.length === 9) return `593${digits}`;
  return digits;
}

export function SendProformaModal({ isOpen, onClose, proforma, onSent }) {
  const [visible, setVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const total = useMemo(() => {
    if (proforma?.total !== undefined && proforma?.total !== null && !isNaN(Number(proforma.total))) {
      return Number(proforma.total);
    }
    const sub = (proforma?.items || []).reduce((s, i) => {
      const valor = i.valor != null ? Number(i.valor) : 0;
      return s + (valor > 0 ? valor : Number(i.cantidad || 0) * Number(i.precioUnitario || 0));
    }, 0);
    const desc = Number(proforma?.descuento || 0);
    return Math.max(0, (sub - desc) * (1 + Number(proforma?.iva || 0)));
  }, [proforma]);

  const mensajeDefault = useMemo(() => (
    `Hola ${proforma?.cliente || 'estimado cliente'}, le saludamos de LUXES. `
    + `Adjuntamos la proforma ${proforma?.id || ''} por un total de $${total.toFixed(2)}. `
    + `Válida hasta ${proforma?.vencimiento || 'la fecha indicada'}. `
    + `Quedamos atentos a sus comentarios. ¡Gracias!`
  ), [proforma, total]);

  const [mensaje, setMensaje] = useState(mensajeDefault);
  const numeroWA = formatWhatsAppNumber(proforma?.telefono);

  useEffect(() => {
    if (isOpen && proforma) {
      setVisible(true);
      setMensaje(mensajeDefault);
    }
  }, [isOpen, proforma, mensajeDefault]);

  useEffect(() => {
    if (!isOpen && visible) {
      const frame = window.requestAnimationFrame(() => setVisible(false));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [isOpen, visible]);

  if (!visible || !proforma) return null;

  const handleClose = () => deferClose(() => onClose?.());

  const handleSend = async () => {
    setEnviando(true);
    try {
      await enviarProforma(proforma.id);
      if (numeroWA) {
        const waLink = `https://wa.me/${numeroWA}?text=${encodeURIComponent(mensaje)}`;
        window.open(waLink, '_blank');
      }
      toast.success('Proforma registrada como enviada.');
      deferClose(() => {
        onSent?.();
        onClose?.();
      });
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el envío');
    } finally {
      setEnviando(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      toast.success('Mensaje copiado.');
    } catch {
      toast.error('No se pudo copiar el mensaje.');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 flex items-center justify-between border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <MessageCircle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Enviar Proforma al Cliente</h2>
                <p className="text-xs text-blue-600 font-medium">{proforma.id} — {proforma.cliente}</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <textarea
              className="w-full h-32 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
            {numeroWA ? (
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500">
                <Smartphone size={16} className="text-slate-400" />
                WhatsApp: <strong className="text-slate-700">+{numeroWA}</strong>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                Sin teléfono en la proforma. Se registrará el envío; puedes copiar el mensaje manualmente.
              </p>
            )}
          </div>

          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={handleCopy} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5">
              <Copy size={14} /> Copiar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={handleSend}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 disabled:opacity-60"
            >
              <Send size={16} />
              {enviando ? 'Enviando...' : 'Enviar por WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
