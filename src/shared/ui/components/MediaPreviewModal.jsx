import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Download, FileText, FileImage } from 'lucide-react';
import { ProjectMediaImage } from './ProjectMediaImage.jsx';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

export function MediaPreviewModal({ isOpen, onClose, files = [], initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  if (!isOpen || !files || files.length === 0) return null;

  const currentFile = files[currentIndex] || files[0];
  const fileUrl = resolveMediaUrl(typeof currentFile === 'string' ? currentFile : (currentFile.url || currentFile.path || ''));
  const fileName = (typeof currentFile === 'object' ? currentFile.name : '') || 'Archivo de Diseño';
  const isImage = (typeof currentFile === 'object' && (currentFile.type || '').includes('image')) ||
                  /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName) ||
                  /\.(png|jpg|jpeg|gif|webp)$/i.test(fileUrl);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal contenedor con dimensión fija limpia: 900px ancho, 640px alto */}
      <div
        className="relative w-[900px] h-[640px] max-w-[95vw] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con paleta de colores limpia del sistema */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl shrink-0 border border-slate-200">
              {isImage ? <FileImage size={18} /> : <FileText size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate" title={fileName}>
                {fileName}
              </h3>
              {files.length > 1 && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Archivo {currentIndex + 1} de {files.length}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title="Abrir imagen original"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Abrir Original</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport de Imagen (Permite ver la imagen COMPLETA incluso en 9:16 vertical) */}
        <div className="relative flex-1 min-h-0 bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <ProjectMediaImage
                archivo={currentFile}
                alt={fileName}
                className="max-w-full max-h-full object-contain block m-auto rounded shadow-lg"
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 p-8 text-center">
              <FileText size={56} className="text-slate-600 mb-3" />
              <p className="text-sm font-bold">{fileName}</p>
              <p className="text-xs text-slate-400 mt-1">Este archivo no es una imagen directamente previsualizable.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-700"
              >
                <Download size={14} /> Descargar archivo
              </a>
            </div>
          )}

          {/* Flechas de Navegación */}
          {files.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center border border-slate-700 shadow-md transition-colors cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center border border-slate-700 shadow-md transition-colors cursor-pointer"
                title="Siguiente"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Footer con carrusel de miniaturas (Altura fija 64px) */}
        {files.length > 1 && (
          <div className="h-[64px] bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-center gap-2 shrink-0 overflow-x-auto">
            {files.map((f, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  idx === currentIndex
                    ? 'border-white opacity-100 ring-2 ring-white/20 scale-105'
                    : 'border-slate-700 opacity-50 hover:opacity-90'
                }`}
              >
                <ProjectMediaImage archivo={f} alt="thumb" className="w-full h-full object-cover" width={40} height={40} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
