import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle, UploadCloud, Trash2, PenTool, ShieldCheck, Loader2 } from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { uploadEvidenciaInstalacion } from '../../application/proyectosService.js';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { resolveMediaUrl } from '../../../../shared/utils/mediaUrl.js';

export function EntregaPanel({ proyectoId, soloLectura }) {
  const { proyecto, updateFaseDatos } = useProyecto(proyectoId);
  const [fotos, setFotos] = useState(proyecto?.fases?.ENTREGA?.datos?.fotoEntrega || proyecto?.fases?.ENTREGA?.fotoEntrega || []);
  const [firma, setFirma] = useState(proyecto?.fases?.ENTREGA?.datos?.firmaCliente || proyecto?.fases?.ENTREGA?.firmaCliente || false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Drag & Drop para las fotos
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of fileList) {
        const fileData = await uploadEvidenciaInstalacion(proyectoId, file);
        uploadedFiles.push({
          name: file.name,
          url: fileData.url,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        });
      }
      
      const nuevoFotos = [...fotos, ...uploadedFiles];
      setFotos(nuevoFotos);
      
      await updateFaseDatos('ENTREGA', {
        fotoEntrega: nuevoFotos
      });
    } catch (error) {
      console.error('Error al subir fotos de entrega:', error);
      await alertDialog('Error', 'Error al subir fotos: ' + error.message, { type: 'warning' });
    } finally {
      setUploading(false);
    }
  };

  const removeFoto = async (index) => {
    const nuevoFotos = fotos.filter((_, i) => i !== index);
    setFotos(nuevoFotos);
    await updateFaseDatos('ENTREGA', {
      fotoEntrega: nuevoFotos
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Galería de Evidencia (Fotos) */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Camera size={18} className="text-emerald-500" />
          Evidencia Fotográfica de la Instalación
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Sube fotos que demuestren que el trabajo fue entregado e instalado correctamente.
        </p>

        {/* Área Dropzone */}
        {!soloLectura && (
          <div
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer mb-6 ${
              isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
            } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            onDragOver={uploading ? undefined : handleDragOver}
            onDragLeave={uploading ? undefined : handleDragLeave}
            onDrop={uploading ? undefined : handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? (
              <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-3">
                <Loader2 size={20} className="text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-3">
                <UploadCloud size={20} className={isDragging ? 'text-emerald-600' : 'text-slate-400'} />
              </div>
            )}
            <p className="text-sm font-bold text-slate-700 mb-1">
              {uploading ? 'Subiendo imágenes...' : 'Arrastra fotos aquí o haz clic para buscar'}
            </p>
            <p className="text-xs text-slate-500">
              {uploading ? 'Por favor espera un momento' : 'Puedes subir múltiples imágenes (JPG, PNG)'}
            </p>
          </div>
        )}

        {/* Galería de Fotos Subidas */}
        {fotos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fotos.map((foto, idx) => (
              <div key={idx} className="relative group bg-slate-100 rounded-xl overflow-hidden aspect-square border border-slate-200">
                <img
                  src={resolveMediaUrl(foto.url || foto.previewDataUrl || '')}
                  alt={`Evidencia ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {!soloLectura && (
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => removeFoto(idx)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                      title="Eliminar foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
