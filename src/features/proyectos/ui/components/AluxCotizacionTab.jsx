// src/features/proyectos/ui/components/AluxCotizacionTab.jsx

import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Link as LinkIcon } from 'lucide-react';
import { getProformas } from '../../../proformas/application/proformasService.js';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { ProformaPDF } from '../../../proformas/ui/components/ProformaPDF.jsx';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export function AluxCotizacionTab({ proyecto, onUpdateProyecto }) {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [proformaIdSelected, setProformaIdSelected] = useState(proyecto?.proformaId || '');

  useEffect(() => {
    getProformas({ limit: 100 })
      .then((data) => {
        const list = data?.data || data || [];
        setProformas(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar proformas:', err);
        setLoading(false);
      });
  }, []);

  const proformaActual = proformas.find((p) => p.id === (proyecto?.proformaId || proformaIdSelected));

  const handleVincular = (id) => {
    setProformaIdSelected(id);
    if (onUpdateProyecto) {
      onUpdateProyecto({ proformaId: id });
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado Sobrio */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Cotización / Proforma Vinculada
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Documento base comercial que dio origen a la obra
          </p>
        </div>

        {proformaActual && (
          <button
            type="button"
            onClick={() => setPdfPreview(proformaActual)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Eye size={15} />
            Ver PDF Proforma Alux
          </button>
        )}
      </div>

      {/* Detalles de la Proforma */}
      {proformaActual ? (
        <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">CÓDIGO PROFORMA</span>
              <span className="font-extrabold text-slate-900 text-sm">{proformaActual.id}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">CLIENTE</span>
              <span className="font-semibold text-slate-800">{proformaActual.cliente || '—'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">FECHA DE EMISIÓN</span>
              <span className="font-semibold text-slate-800">{proformaActual.fecha || '—'}</span>
            </div>
          </div>

          {/* Tabla sobria de ítems de la cotización */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ítems Cotizados
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">CÁNT</th>
                    <th className="p-2.5">DESCRIPCIÓN</th>
                    <th className="p-2.5 text-right">METRAJE TOTAL</th>
                    <th className="p-2.5 text-right">VALOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proformaActual.items && proformaActual.items.length > 0 ? (
                    proformaActual.items.map((it, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{it.cantidad || 1}</td>
                        <td className="p-2.5 text-slate-700">{it.descripcion}</td>
                        <td className="p-2.5 text-right font-mono">{it.metrajeTotal ? `${it.metrajeTotal} m²` : '—'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatUSD(it.valor || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">Sin detalles de ítems.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end pt-2 border-t border-slate-100 text-xs">
            <div className="w-64 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>SUBTOTAL:</span>
                <span>{formatUSD(proformaActual.subtotal || proformaActual.total)}</span>
              </div>
              {parseFloat(proformaActual.descuento) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>DESCUENTO:</span>
                  <span>-{formatUSD(proformaActual.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatUSD(proformaActual.total)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-300 rounded-xl p-8 text-center space-y-3">
          <FileText size={32} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 text-sm">No hay Proforma Alux vinculada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Selecciona una proforma existente para vincularla a este proyecto:
          </p>

          <div className="max-w-xs mx-auto pt-2">
            <select
              className="co-input w-full text-xs"
              value={proformaIdSelected}
              onChange={(e) => handleVincular(e.target.value)}
            >
              <option value="">-- Seleccionar Proforma --</option>
              {proformas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} - {p.cliente} ({formatUSD(p.total)})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Modal PDF Preview */}
      {pdfPreview && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden p-6 max-h-[92vh] overflow-y-auto">
              <ProformaPDF proforma={pdfPreview} onClose={() => setPdfPreview(null)} />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
