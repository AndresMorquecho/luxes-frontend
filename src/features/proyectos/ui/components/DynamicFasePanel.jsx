// src/features/proyectos/ui/components/DynamicFasePanel.jsx

import React, { useState } from 'react';
import { 
  Camera, Plus, Trash2, Calendar, DollarSign, Image as ImageIcon,
  Edit3, Eye, X, CheckCircle2, Clock, User, FileText, ShoppingCart, AlertCircle
} from 'lucide-react';
import { uploadEvidenciaInstalacion } from '../../application/proyectosService.js';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export function DynamicFasePanel({
  proyecto,
  fase,
  faseIndex = 0,
  totalFases = 1,
  onUpdateFase,
  onDeleteFase,
  onOpenEditModal,
  onAddGasto,
  gastos = [],
}) {
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estado para editar "¿Qué se hizo?" directamente
  const [isEditingNotas, setIsEditingNotas] = useState(false);
  const [notasInput, setNotasInput] = useState(fase?.queSeHizo || fase?.descripcion || '');

  // Subir foto de evidencia fotográfica
  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFoto(true);
    try {
      const res = await uploadEvidenciaInstalacion(proyecto.id, file);
      const url = res.url || res;

      const nuevaEvidencia = {
        id: 'evid-' + Date.now(),
        url,
        fecha: new Date().toISOString(),
        nombre: file.name,
      };

      const evidenciasActuales = fase.evidencias || [];
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userName = user?.nombre || user?.usuario || 'Usuario';

      onUpdateFase({
        ...fase,
        evidencias: [...evidenciasActuales, nuevaEvidencia],
        ultimaEdicionPor: userName,
        ultimaEdicionEn: new Date().toISOString(),
      });
    } catch (err) {
      alert('Error al subir evidencia: ' + err.message);
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Eliminar foto de evidencia
  const handleDeleteFoto = (evidenciaId) => {
    const evidenciasActuales = fase.evidencias || [];
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userName = user?.nombre || user?.usuario || 'Usuario';

    onUpdateFase({
      ...fase,
      evidencias: evidenciasActuales.filter((e) => e.id !== evidenciaId),
      ultimaEdicionPor: userName,
      ultimaEdicionEn: new Date().toISOString(),
    });
  };

  // Guardar notas / "¿Qué se hizo en esta fase?"
  const handleSaveNotas = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userName = user?.nombre || user?.usuario || 'Usuario';

    onUpdateFase({
      ...fase,
      queSeHizo: notasInput.trim(),
      descripcion: notasInput.trim() || 'Actividades de la fase',
      ultimaEdicionPor: userName,
      ultimaEdicionEn: new Date().toISOString(),
    });
    setIsEditingNotas(false);
  };

  // Cambiar estado de la fase
  const handleSetStatus = (newStatus) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userName = user?.nombre || user?.usuario || 'Usuario';

    onUpdateFase({
      ...fase,
      estado: newStatus,
      fechaCompletada: newStatus === 'COMPLETADA' ? new Date().toISOString() : fase.fechaCompletada,
      ultimaEdicionPor: userName,
      ultimaEdicionEn: new Date().toISOString(),
    });
  };

  // Gastos de esta fase
  const gastosFase = gastos.filter(
    (g) => g.faseId === fase.id || g.concepto?.toLowerCase().includes(fase?.nombre?.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER DE LA FASE SELECCIONADA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-blue-100 text-blue-700">
              Fase {faseIndex + 1}
            </span>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              {fase.nombre}
            </h2>
            <button
              type="button"
              onClick={onOpenEditModal}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Editar título y fechas"
            >
              <Edit3 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap font-medium">
            <div className="flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              <span>
                <strong>Inicio:</strong> {fase.fechaInicio || fase.fechaInicioPlan || 'Hoy'}
              </span>
              <span className="text-slate-300 mx-1">➔</span>
              <span>
                <strong>Estimada:</strong> {fase.fechaFinEstimada || fase.fechaFinPlan || 'Sin definir'}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones del Header: Estado + Eliminar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Estado */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSetStatus('PENDIENTE')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                fase.estado === 'PENDIENTE'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              Pendiente
            </button>
            <button
              type="button"
              onClick={() => handleSetStatus('EN_PROGRESO')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                fase.estado === 'EN_PROGRESO'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-white/60'
              }`}
            >
              En Progreso
            </button>
            <button
              type="button"
              onClick={() => handleSetStatus('COMPLETADA')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                fase.estado === 'COMPLETADA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-white/60'
              }`}
            >
              ✓ Completada
            </button>
          </div>

          {/* Botón Eliminar Fase */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
            title="Eliminar esta fase"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: ¿QUÉ SE HIZO EN ESTA FASE? (Detalles / Actividades) */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <FileText size={16} className="text-blue-600" />
            <span>¿Qué se hizo en esta fase?</span>
          </div>

          {!isEditingNotas ? (
            <button
              type="button"
              onClick={() => {
                setNotasInput(fase.queSeHizo || fase.descripcion || '');
                setIsEditingNotas(true);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Edit3 size={13} />
              Editar detalle
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingNotas(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNotas}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Guardar
              </button>
            </div>
          )}
        </div>

        {isEditingNotas ? (
          <textarea
            className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition-all resize-none min-h-[90px] text-slate-700"
            placeholder="Escriba las actividades realizadas, notas técnicas o avances de esta fase..."
            value={notasInput}
            onChange={(e) => setNotasInput(e.target.value)}
            autoFocus
          />
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl p-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed min-h-[50px] whitespace-pre-wrap">
            {fase.queSeHizo || fase.descripcion ? (
              fase.queSeHizo || fase.descripcion
            ) : (
              <span className="text-slate-400 italic">
                No se han registrado detalles o actividades para esta fase. Haz clic en "Editar detalle" para agregar lo que se realizó.
              </span>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: EVIDENCIA FOTOGRÁFICA */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Evidencias Fotográficas
            </h3>
            {fase.evidencias?.length > 0 && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {fase.evidencias.length} foto(s)
              </span>
            )}
          </div>

          <label className="cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
            <Plus size={14} />
            {subiendoFoto ? 'Subiendo imagen...' : 'Cargar Foto Evidencia'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadFoto}
              disabled={subiendoFoto}
              className="hidden"
            />
          </label>
        </div>

        {/* Galería de Fotos */}
        {fase.evidencias && fase.evidencias.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {fase.evidencias.map((ev) => (
              <div
                key={ev.id}
                className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square shadow-xs"
              >
                <img
                  src={ev.url}
                  alt="Evidencia"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFotoModalUrl(ev.url)}
                    className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm cursor-pointer"
                    title="Ver imagen ampliada"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFoto(ev.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
                    title="Eliminar foto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
            <ImageIcon size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              No hay fotografías de evidencia cargadas en esta fase.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Toma fotos o sube archivos de los avances, armado, pruebas o instalación realizada.
            </p>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: COMPRAS / GASTOS DE LA FASE (OPCIONAL) */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <DollarSign size={17} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Compras y Gastos de la Fase
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onAddGasto && onAddGasto(fase)}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-colors border border-emerald-200 cursor-pointer"
          >
            <Plus size={13} />
            Registrar Gasto de Fase
          </button>
        </div>

        {gastosFase.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {gastosFase.map((g) => (
              <div key={g.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">
                    {g.concepto || g.descripcion}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {g.proveedor ? `Proveedor: ${g.proveedor}` : 'Gasto directo'} • {g.fecha || 'Sin fecha'}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {formatUSD(g.monto)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No hay gastos registrados específicamente para esta fase.
          </p>
        )}
      </div>

      {/* FOOTER: AUDITORÍA Y METADATOS */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500 bg-slate-50/60 p-3.5 rounded-xl">
        <div className="flex items-center gap-4 flex-wrap">
          {fase.creadoPor && (
            <div className="flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span><strong>Creado por:</strong> {fase.creadoPor}</span>
            </div>
          )}
          {fase.ultimaEdicionEn && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span>
                <strong>Última edición:</strong> {new Date(fase.ultimaEdicionEn).toLocaleString('es-EC')}
                {fase.ultimaEdicionPor ? ` por ${fase.ultimaEdicionPor}` : ''}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenEditModal}
          className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline cursor-pointer"
        >
          Modificar detalles de la fase
        </button>
      </div>

      {/* MODAL AMPLIAR FOTO */}
      {fotoModalUrl && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-black/85 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2">
              <button
                onClick={() => setFotoModalUrl(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors z-10 cursor-pointer"
              >
                <X size={20} />
              </button>
              <img
                src={fotoModalUrl}
                alt="Evidencia Ampliada"
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CONFIRMACIÓN DE ELIMINAR FASE */}
      {showDeleteConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle size={24} className="shrink-0" />
                <h3 className="text-base font-bold text-slate-800">
                  ¿Eliminar esta fase?
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se eliminará permanentemente la fase <strong className="text-slate-800">"{fase.nombre}"</strong> y sus evidencias asociadas.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDeleteFase(fase.id);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Sí, eliminar fase
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
