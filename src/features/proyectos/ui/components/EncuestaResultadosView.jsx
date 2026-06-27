import React from 'react';
import { Star, MessageSquare, UserCheck } from 'lucide-react';

function StarRating({ value, size = 28, showLabel = true }) {
  const rating = Number(value) || 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={size}
            strokeWidth={1.5}
            fill={s <= rating ? 'currentColor' : 'none'}
            className={s <= rating ? 'text-amber-400' : 'text-slate-200'}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-sm font-black text-slate-800">{rating}/5</span>
      )}
    </div>
  );
}

export function EncuestaResultadosView({ encuesta }) {
  if (!encuesta?.completada) return null;

  const { fecha, calificacionGeneral, comentarios, personal = [] } = encuesta;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Evaluación General del Cliente
        </h4>

        <div className="mb-4">
          <StarRating value={calificacionGeneral} size={28} />
        </div>

        {comentarios ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
            <MessageSquare size={16} className="absolute top-4 left-4 text-slate-300" />
            <p className="text-sm text-slate-700 italic pl-6">
              &quot;{comentarios}&quot;
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Sin comentarios adicionales.</p>
        )}

        {fecha && (
          <p className="text-xs text-slate-400 mt-4">Respondida el {fecha}</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Desempeño del Personal Involucrado
        </h4>

        {personal.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No se calificó al personal.</p>
        ) : (
          <div className="space-y-3">
            {personal.map((p) => {
              const rating = Number(p.estrellas) || 0;
              return (
                <div
                  key={p.empleadoId || p.nombre}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <UserCheck size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{p.nombre}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">{p.rol}</p>
                    </div>
                  </div>
                  {rating > 0 ? (
                    <StarRating value={rating} size={14} showLabel={false} />
                  ) : (
                    <span className="text-xs text-slate-400">Sin calificar</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
