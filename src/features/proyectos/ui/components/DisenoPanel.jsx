import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, CheckCircle, Clock, File, Trash2, Calendar, ShieldCheck, X } from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { uploadArchivoDiseno } from '../../application/proyectosService.js';

export function DisenoPanel({ proyectoId, soloLectura }) {
  const { proyecto, updateFaseDatos } = useProyecto(proyectoId);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const disenoFase = proyecto?.fases?.DISEÑO || {};
  const archivos = disenoFase.datos?.archivosArte || 
    (disenoFase.datos?.archivoArte ? [disenoFase.datos.archivoArte] : 
     disenoFase.archivoArte ? [disenoFase.archivoArte] : []);
  const fechaAprobacion = disenoFase.datos?.fechaAprobacionDiseno || disenoFase.fechaAprobacionDiseno || '';

  const fileInputRef = useRef(null);

  // Manejo de Drag & Drop
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
      handleFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(Array.from(e.target.files));
    }
  };

  const handleFilesSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        // Subir cada archivo al backend
        const fileData = await uploadArchivoDiseno(proyectoId, file);
        uploadedFiles.push(fileData);
      }
      
      // Obtener el arreglo de archivos actuales
      const actualArchivos = disenoFase.datos?.archivosArte || 
        (disenoFase.datos?.archivoArte ? [disenoFase.datos.archivoArte] : []);
      const nuevoArchivos = [...actualArchivos, ...uploadedFiles];
      
      // Actualizar el estado local y backend
      updateFaseDatos('DISEÑO', { 
        archivosArte: nuevoArchivos,
        archivoArte: nuevoArchivos[0] || null
      });
    } catch (error) {
      console.error('Error al subir archivos:', error);
      alert('Error al subir archivos: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileUrl) => {
    const actualArchivos = disenoFase.datos?.archivosArte || 
      (disenoFase.datos?.archivoArte ? [disenoFase.datos.archivoArte] : []);
    const nuevoArchivos = actualArchivos.filter(f => f.url !== fileUrl);
    
    updateFaseDatos('DISEÑO', { 
      archivosArte: nuevoArchivos,
      archivoArte: nuevoArchivos[0] || null,
      ...(nuevoArchivos.length === 0 ? { fechaAprobacionDiseno: '' } : {})
    });
  };

  const handleAprobarHoy = () => {
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    updateFaseDatos('DISEÑO', { fechaAprobacionDiseno: hoy });
  };

  return (
    <div className="space-y-8">
      {/* 1. Subida de Archivo de Arte */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-blue-500" />
          Archivos de Arte Final
        </h3>

        {!soloLectura && (
          <div
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer mb-6 ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.ai,.psd,.jpg,.png"
              multiple
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-3">
              <UploadCloud size={20} className={isDragging ? 'text-blue-600' : 'text-slate-400'} />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">
              Arrastra y suelta los diseños aquí
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Archivos soportados: PDF, AI, PSD, JPG, PNG
            </p>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
              {uploading ? 'Subiendo...' : 'Seleccionar archivos'}
            </button>
          </div>
        )}

        {archivos.length === 0 ? (
          soloLectura && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-sm font-medium">
              No se subieron archivos en esta fase.
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archivos.map((file, idx) => (
              <div key={file.url || idx} className="bg-white border border-slate-200 rounded-2xl p-1 overflow-hidden animate-slide-up">
                <div className="flex gap-4 p-4">
                  {/* Preview Box */}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shrink-0 relative group"
                  >
                    {file.type && file.type.includes('image') ? (
                      <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <File size={28} className="text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold bg-slate-800/80 px-2 py-1 rounded backdrop-blur-sm">
                        Ver
                      </span>
                    </div>
                  </a>

                  {/* File Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={file.name}>{file.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{file.size} • {file.type?.split('/')[1]?.toUpperCase() || 'Archivo'}</p>
                      </div>
                      {!soloLectura && (
                        <button
                          onClick={() => handleRemoveFile(file.url)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Eliminar archivo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit mt-2">
                      <CheckCircle size={12} /> Listo para impresión
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Aprobación del Cliente */}
      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-emerald-500" />
          Aprobación del Cliente
        </h3>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">¿El cliente aprobó este arte?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Es necesario registrar la fecha de aprobación para poder avanzar el proyecto a Producción.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {fechaAprobacion ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100/50 px-4 py-2.5 rounded-xl border border-emerald-200">
                  <CheckCircle size={16} />
                  <span className="text-sm font-bold">Aprobado el {fechaAprobacion}</span>
                </div>
                {!soloLectura && (
                  <button
                    onClick={() => updateFaseDatos('DISEÑO', { fechaAprobacionDiseno: '' })}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    title="Deshacer aprobación"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-40">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    disabled={soloLectura}
                    value={fechaAprobacion}
                    onChange={(e) => updateFaseDatos('DISEÑO', { fechaAprobacionDiseno: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                {!soloLectura && (
                  <button
                    onClick={handleAprobarHoy}
                    disabled={archivos.length === 0}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title={archivos.length === 0 ? "Sube el archivo primero" : "Marcar con fecha de hoy"}
                  >
                    Aprobar Hoy
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
