import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Send } from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import {
  getEncuestaSatisfaccion,
  instalacionListaParaEncuesta,
  encuestaFueEnviada,
} from '../../domain/encuestaUtils.js';
import { EncuestaResultadosView } from './EncuestaResultadosView.jsx';
import { SendSurveyModal } from './SendSurveyModal.jsx';
import { deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { isTallerUser, isAdminUser } from '../../../../shared/utils/userRoleHelpers.js';

export function CompletadoPanel({ proyectoId, soloLectura = false }) {
  const { proyecto, updateFaseDatos } = useProyecto(proyectoId);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userRole = (user?.rol || '').toLowerCase();
  const isVentasODisenador = userRole.includes('ventas') || userRole.includes('diseñador') || userRole.includes('disenador');
  const puedeEnviarEncuesta = isTallerUser(user) || isAdminUser(user) || isVentasODisenador;
  const encuesta = getEncuestaSatisfaccion(proyecto);
  const instalacionCompletada = instalacionListaParaEncuesta(proyecto);
  const enviada = encuestaFueEnviada(proyecto);

  const marcarEncuestaEnviada = async () => {
    const targetFase = proyecto.requiereInstalacion !== false ? 'INSTALACION' : 'COMPLETADO';
    await updateFaseDatos(targetFase, {
      encuestaEnviada: true,
      fechaEncuestaEnviada: new Date().toISOString().split('T')[0],
    });
  };

  if (encuesta?.completada) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-800">Proyecto finalizado exitosamente</h3>
            <p className="text-xs text-emerald-600">
              Encuesta de satisfacción recibida el {encuesta.fecha}
            </p>
          </div>
        </div>

        <EncuestaResultadosView encuesta={encuesta} />
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
          <MessageSquare size={24} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">
          {!instalacionCompletada
            ? 'Fase pendiente de cierre'
            : (enviada ? 'Esperando respuesta del cliente' : 'Encuesta pendiente de envío')}
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          {!instalacionCompletada
            ? (proyecto.requiereInstalacion !== false
                ? 'El proyecto se encuentra actualmente en la fase de Instalación. Se deben cumplir los requisitos de obra para completar la instalación y finalizar el proyecto.'
                : 'El proyecto aún no ha sido finalizado. Completa las fases previas para avanzar a la finalización.')
            : (enviada
                ? (proyecto.requiereInstalacion !== false
                    ? 'La instalación fue completada y la encuesta ya fue enviada. Los resultados aparecerán aquí cuando el cliente responda.'
                    : 'El proyecto fue finalizado y la encuesta ya fue enviada. Los resultados aparecerán aquí cuando el cliente responda.')
                : (puedeEnviarEncuesta
                    ? (proyecto.requiereInstalacion !== false
                        ? 'La obra está completada. Envía el enlace de calificación con estrellas al cliente por WhatsApp.'
                        : 'El proyecto está finalizado. Envía el enlace de calificación con estrellas al cliente por WhatsApp.')
                    : (proyecto.requiereInstalacion !== false
                        ? 'La obra está completada. El equipo de Taller enviará la encuesta de calificación al cliente.'
                        : 'El proyecto está finalizado. El equipo de LUXES enviará la encuesta de calificación al cliente.')))
          }
        </p>
        {instalacionCompletada && !soloLectura && puedeEnviarEncuesta && (
          <button
            type="button"
            onClick={() => setShowSurveyModal(true)}
            className="mt-5 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2"
          >
            <Send size={16} />
            {enviada ? 'Reenviar encuesta' : 'Enviar encuesta'}
          </button>
        )}
      </div>

      {puedeEnviarEncuesta && (
        <SendSurveyModal
          isOpen={showSurveyModal}
          onClose={() => setShowSurveyModal(false)}
          proyecto={proyecto}
          variant="instalacion"
          onSend={marcarEncuestaEnviada}
          onConfirm={() => deferClose(() => setShowSurveyModal(false))}
        />
      )}
    </>
  );
}
