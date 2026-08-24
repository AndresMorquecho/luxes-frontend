import React, { useState, useRef } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { uploadComprobanteProforma } from '../../application/proformasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { Upload, X, FileText, AlertCircle, Calendar } from 'lucide-react';
import { todayDateInputValue } from '../../../../shared/utils/dateOnly';

const formatUSD = (num) => '$' + Number(num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const AbonoModal = ({
  open,
  onClose,
  title,
  subtitle,
  proformaId,
  total = 0,
  pending = 0,
  monto,
  setMonto,
  fecha,
  setFecha,
  metodoPagoId,
  setMetodoPagoId,
  metodosPago = [],
  referencia,
  setReferencia,
  comprobanteUrl,
  setComprobanteUrl,
  isApproval = false,
  onSubmit,
  submitting = false,
  submitText = 'Confirmar Cobro',
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const numericMonto = parseFloat(monto || '0');
  const canUpload = !isNaN(numericMonto) && numericMonto > 0;

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!canUpload) {
      toast.error('El comprobante solo se puede adjuntar si el monto del abono es mayor a $0.00');
      return;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor selecciona una imagen (JPG, PNG, WEBP) o un archivo PDF');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadComprobanteProforma(file);
      setComprobanteUrl(res.url);
      toast.success('Comprobante subido correctamente');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al subir el comprobante');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <ModalPortal open={open}>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal Container */}
        <div
          className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-[740px] max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden relative z-[201] animate-slide-up my-auto"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header (Fixed) */}
          <div className="p-4 sm:p-6 border-b border-slate-100/80 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#eff4ff] text-[#2563eb] flex items-center justify-center shrink-0">
                <FileText size={18} className="sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-[17px] font-extrabold text-[#111827] leading-tight truncate">
                  {title || (isApproval ? 'Aprobación y Registro de Abono' : 'Registrar Cobro / Abono')}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {subtitle || 'Ingresa el monto a cobrar y adjunta el comprobante opcional.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form container with flex-1 */}
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
              {/* Top Cards: Proforma ID, Total & Saldo Pendiente (3 cols in single row) */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-2 sm:mb-4">
                {/* Card 1: PROFORMA */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-[12px] sm:rounded-[14px] p-2.5 sm:p-4 flex flex-col justify-center min-w-0">
                  <span className="text-[#64748b] font-bold text-[8px] sm:text-[10px] uppercase tracking-wider truncate">
                    PROFORMA
                  </span>
                  <span className="font-extrabold text-[#1e293b] text-xs sm:text-[15px] mt-0.5 sm:mt-1 truncate">
                    {proformaId || '—'}
                  </span>
                </div>

                {/* Card 2: VALOR TOTAL */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-[12px] sm:rounded-[14px] p-2.5 sm:p-4 flex flex-col justify-center min-w-0">
                  <span className="text-[#64748b] font-bold text-[8px] sm:text-[10px] uppercase tracking-wider truncate">
                    VALOR TOTAL
                  </span>
                  <span className="font-extrabold text-[#2563eb] text-xs sm:text-[15px] mt-0.5 sm:mt-1 font-mono truncate">
                    {formatUSD(total)}
                  </span>
                </div>

                {/* Card 3: SALDO PENDIENTE */}
                <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-[12px] sm:rounded-[14px] p-2.5 sm:p-4 flex flex-col justify-center min-w-0">
                  <span className="text-[#d97706] font-bold text-[8px] sm:text-[10px] uppercase tracking-wider truncate">
                    SALDO PENDIENTE
                  </span>
                  <span className="font-extrabold text-[#d97706] text-xs sm:text-[15px] mt-0.5 sm:mt-1 font-mono truncate">
                    {formatUSD(pending)}
                  </span>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="space-y-4 sm:space-y-5">
                {/* Row 1: Monto & Método de Pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
                  {/* Monto */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="text-[#334155] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">
                        MONTO DEL ABONO / COBRO {isApproval ? '(OPCIONAL)' : '*'}
                      </label>
                    </div>
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-sm h-11 bg-white">
                      <div className="bg-[#f8fafc] border-r border-slate-200 px-3.5 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                        $
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        className="w-full px-3 text-sm bg-white font-mono font-bold text-[#0f172a] focus:outline-none placeholder-slate-400 h-full"
                        placeholder="0.00"
                        required={!isApproval}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {isApproval && (
                        <button
                          type="button"
                          onClick={() => setMonto('0.00')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 transition-colors"
                        >
                          Sin Abono ($0)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMonto(Number(pending || 0).toFixed(2))}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-bold text-[#2563eb] transition-colors"
                      >
                        Abono Total (100%)
                      </button>
                      {isApproval && total > 0 && (
                        <button
                          type="button"
                          onClick={() => setMonto((Number(total || 0) / 2).toFixed(2))}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-bold text-[#2563eb] transition-colors"
                        >
                          Abono 50%
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="text-[#334155] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">
                        CAJA / MÉTODO DE PAGO {isApproval && (!monto || parseFloat(monto || '0') === 0) ? '(OPCIONAL)' : '*'}
                      </label>
                    </div>
                    <select
                      required={!isApproval || (parseFloat(monto || '0') > 0)}
                      value={metodoPagoId}
                      onChange={(e) => setMetodoPagoId(e.target.value)}
                      className="w-full px-3.5 h-11 border border-slate-200 rounded-xl text-sm font-semibold text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer"
                    >
                      <option value="">Seleccione una caja...</option>
                      {metodosPago.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Fecha del Abono & Referencia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
                  {/* Fecha */}
                  <div className="flex flex-col">
                    <label className="text-[#334155] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Calendar size={13} className="text-[#2563eb]" />
                      FECHA DEL ABONO / COBRO *
                    </label>
                    <input
                      type="date"
                      required
                      value={fecha || todayDateInputValue()}
                      onChange={(e) => setFecha && setFecha(e.target.value)}
                      className="w-full px-3.5 h-11 border border-slate-200 rounded-xl text-sm font-semibold text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer"
                    />
                  </div>

                  {/* Referencia */}
                  <div className="flex flex-col">
                    <label className="text-[#334155] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider mb-1.5 sm:mb-2 block">
                      REFERENCIA / N° COMPROBANTE
                    </label>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className="w-full px-3.5 h-11 border border-slate-200 rounded-xl text-sm bg-white text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      placeholder="Ej. Transferencia 88910, Efectivo"
                    />
                  </div>
                </div>

                {/* Row 3: Comprobante Dropzone / Preview */}
                <div>
                  <label className="text-[#334155] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider mb-1.5 sm:mb-2 block">
                    COMPROBANTE DE PAGO (IMAGEN / PDF - OPCIONAL)
                  </label>

                  {!canUpload ? (
                    <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-[16px] p-3.5 flex items-center gap-3 text-[#b45309] text-xs font-medium">
                      <AlertCircle size={18} className="text-[#d97706] shrink-0" />
                      <span>
                        El comprobante solo se puede adjuntar si el monto del abono es mayor a <strong>$0.00</strong>.
                      </span>
                    </div>
                  ) : comprobanteUrl ? (
                    /* Preview de comprobante subido */
                    <div className="border border-emerald-200 bg-[#f0fdf4] rounded-[16px] p-3 sm:p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {comprobanteUrl.match(/\.(jpeg|jpg|png|webp)$/i) ? (
                          <img
                            src={comprobanteUrl}
                            alt="Comprobante"
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-emerald-200 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs font-bold text-[#14532d] truncate">Comprobante Adjuntado</span>
                          <a
                            href={comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#166534] hover:underline truncate"
                          >
                            Ver archivo subido
                          </a>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setComprobanteUrl(null)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="Eliminar comprobante"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    /* Dropzone de carga */
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-[16px] p-4 sm:p-6 text-center cursor-pointer transition-all ${
                        dragActive
                          ? 'border-[#2563eb] bg-[#eff4ff]'
                          : 'border-slate-200 hover:border-[#2563eb] hover:bg-slate-50/50 bg-white'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-2" />
                          <span className="text-xs font-bold text-slate-600">Subiendo comprobante...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#eff4ff] text-[#2563eb] flex items-center justify-center mb-2 sm:mb-2.5">
                            <Upload size={18} className="sm:w-5 sm:h-5 stroke-[2.2]" />
                          </div>
                          <p className="text-xs font-medium text-[#334155]">
                            Arrastra el comprobante aquí o{' '}
                            <span className="text-[#2563eb] font-bold">haz clic para examinar</span>
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-[#94a3b8] mt-0.5 sm:mt-1 font-medium">
                            Soporta JPG, PNG, WEBP o PDF (Opcional)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Action Buttons (Fixed at bottom) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-[#334155] text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className="px-5 sm:px-7 py-2 sm:py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                )}
                {submitting ? 'Procesando...' : submitText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
