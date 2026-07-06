import { useEffect, useRef, useCallback } from 'react';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { getNotifications } from '../../../notificaciones/application/notificationsService.js';
import { getDatosInstalacionMerged } from '../../domain/instalacionRules.js';
import { getSiguienteFase } from '../../domain/value-objects/FaseConfig.js';

function esNotificacionInstalacionCompletada(notification, proyectoId, proyectoNombre) {
  const title = (notification?.title || '').toLowerCase();
  if (!title.includes('instalación completada') && !title.includes('instalacion completada')) {
    return false;
  }
  const message = notification?.message || '';
  const matchId = message.match(/\[PROYECTO_ID:(.+?)\]/);
  if (matchId && matchId[1] === proyectoId) return true;
  if (proyectoNombre && message.includes(proyectoNombre)) return true;
  return message.includes(proyectoId);
}

function mensajeAvance(faltantes, faseDestinoLabel) {
  if (faltantes.length > 0) {
    return `Instalación completada. El proyecto avanzó a ${faseDestinoLabel}. Pendiente: ${faltantes.join(', ')}`;
  }
  return `Instalación completada. El proyecto avanzó automáticamente a ${faseDestinoLabel}.`;
}

/**
 * Avanza automáticamente la fase de instalación para administradores
 * cuando el taller cierra la obra o llega la notificación correspondiente.
 */
export function useAutoAvanceInstalacionAdmin({
  proyectoId,
  proyecto,
  isAdmin,
  avanzar,
  reloadProyectos,
  validacionFaseActual,
}) {
  const procesadoRef = useRef(false);

  const datosInstalacion = proyecto ? getDatosInstalacionMerged(proyecto) : {};
  const instalacionCompletada = datosInstalacion.instalacionCompletada === true;
  const faseDestino = proyecto
    ? getSiguienteFase('INSTALACION', proyecto.requiereInstalacion !== false)
  : null;
  const faseDestinoLabel = faseDestino?.label || 'la siguiente fase';

  const faltantesRelevantes = (validacionFaseActual?.faltantes || []).filter(
    (f) => f !== 'Instalación completada en sitio por el taller',
  );

  const notificarAvance = useCallback(
    (tipo = 'success') => {
      const mensaje = mensajeAvance(faltantesRelevantes, faseDestinoLabel);
      if (tipo === 'warning' || faltantesRelevantes.length > 0) {
        toast.warning(mensaje);
      } else {
        toast.success(mensaje);
      }
    },
    [faltantesRelevantes, faseDestinoLabel],
  );

  const intentarAvanceAutomatico = useCallback(async () => {
    if (!isAdmin || procesadoRef.current || !proyecto) return;
    if (!instalacionCompletada) return;

    if (proyecto.faseActual !== 'INSTALACION') {
      if (proyecto.faseActual === faseDestino?.id) {
        procesadoRef.current = true;
        notificarAvance(faltantesRelevantes.length > 0 ? 'warning' : 'success');
      }
      return;
    }

    procesadoRef.current = true;
    try {
      await avanzar();
      notificarAvance(faltantesRelevantes.length > 0 ? 'warning' : 'success');
    } catch (err) {
      procesadoRef.current = false;
      console.error('[useAutoAvanceInstalacionAdmin]', err);
      toast.error('No se pudo avanzar la fase automáticamente');
    }
  }, [
    isAdmin,
    proyecto,
    instalacionCompletada,
    faseDestino?.id,
    avanzar,
    notificarAvance,
    faltantesRelevantes.length,
  ]);

  useEffect(() => {
    intentarAvanceAutomatico();
  }, [intentarAvanceAutomatico]);

  useEffect(() => {
    if (!isAdmin || !proyectoId) return undefined;
    if (proyecto?.faseActual !== 'INSTALACION' && procesadoRef.current) return undefined;

    const revisarNotificaciones = async () => {
      try {
        const notifs = await getNotifications();
        const match = (notifs || []).find(
          (n) => !n.isRead && esNotificacionInstalacionCompletada(n, proyectoId, proyecto?.nombre),
        );
        if (match) {
          reloadProyectos?.();
          window.setTimeout(() => intentarAvanceAutomatico(), 600);
        }
      } catch {
        // ignorar errores de red en polling
      }
    };

    const refrescar = () => {
      reloadProyectos?.();
      revisarNotificaciones();
    };

    const interval = setInterval(refrescar, 15000);
    window.addEventListener('notifications-updated', refrescar);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', refrescar);
    };
  }, [isAdmin, proyectoId, proyecto?.faseActual, proyecto?.nombre, reloadProyectos, intentarAvanceAutomatico]);

  useEffect(() => {
    if (!isAdmin || procesadoRef.current || !proyectoId) return undefined;

    const onInstalacionCompletada = (event) => {
      const { proyectoId: notifProyectoId } = event.detail || {};
      if (notifProyectoId && notifProyectoId !== proyectoId) return;
      reloadProyectos?.();
      window.setTimeout(() => intentarAvanceAutomatico(), 600);
    };

    window.addEventListener('instalacion-completada-admin', onInstalacionCompletada);
    return () => window.removeEventListener('instalacion-completada-admin', onInstalacionCompletada);
  }, [isAdmin, proyectoId, reloadProyectos, intentarAvanceAutomatico]);
}

export { esNotificacionInstalacionCompletada };
