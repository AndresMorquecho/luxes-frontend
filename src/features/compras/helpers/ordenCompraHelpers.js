export const ESTADO_ORDEN_LABELS = {
  pendiente_aprobacion: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Pendiente aprobación' },
  aprobada: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Aprobada' },
  parcialmente_recibida: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Recepción parcial' },
  recibida: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Recibida' },
  cancelada: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', label: 'Cancelada / Rechazada' },
};

export const FILTROS_HISTORIAL = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendiente_aprobacion', label: 'Pendientes' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'parcialmente_recibida', label: 'Parcial' },
  { id: 'recibida', label: 'Recibidas' },
  { id: 'cancelada', label: 'Canceladas' },
];

export const fmtMoney = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
export const fmtDateTime = (d) => d
  ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

/** Etiqueta legible del proyecto vinculado a una orden de compra. */
export const getOrdenProyectoLabel = (orden) => {
  if (orden?.proyecto?.nombre) {
    return orden.proyecto.id
      ? `${orden.proyecto.id} - ${orden.proyecto.nombre}`
      : orden.proyecto.nombre;
  }
  if (orden?.proyectoId) return orden.proyectoId;
  return null;
};

export const mapOrdenToPDFFormat = (orden) => {
  if (!orden) return null;
  return {
    id: orden.numero,
    fechaCreacion: orden.fecha ? new Date(orden.fecha).toISOString().split('T')[0] : '',
    estado: (orden.estado || 'PENDIENTE').toUpperCase(),
    proyectoNombre: getOrdenProyectoLabel(orden) || orden.concepto || 'Compra de Materiales',
    comentarios: orden.notas || 'Sin observaciones.',
    items: (orden.detalles || []).map((d) => ({
      sku: d.materialId ? d.materialId.slice(-8).toUpperCase() : 'ESP-LIBRE',
      nombre: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      unidad: 'unidad',
    })),
  };
};

export function buildOrdenTimeline(orden) {
  if (!orden) return [];
  const steps = [
    {
      key: 'creada',
      label: 'Orden creada',
      date: orden.fechaCreacion || orden.fecha,
      done: true,
      detail: orden.usuario?.nombre ? `Solicitada por ${orden.usuario.nombre}` : null,
    },
    {
      key: 'aprobacion',
      label: orden.estado === 'cancelada' ? 'Rechazada' : 'Aprobación administrativa',
      date: orden.estado === 'cancelada' ? null : orden.fechaAprobacion,
      done: ['aprobada', 'parcialmente_recibida', 'recibida'].includes(orden.estado),
      failed: orden.estado === 'cancelada',
      detail: orden.estado === 'cancelada'
        ? (orden.notas || 'Sin motivo registrado')
        : orden.aprobadoPor?.nombre
          ? `Aprobada por ${orden.aprobadoPor.nombre}`
          : orden.estado === 'pendiente_aprobacion'
            ? 'En espera de revisión'
            : null,
    },
    {
      key: 'recepcion',
      label: 'Productos recibidos',
      date: orden.fechaRecepcion,
      done: orden.estado === 'recibida' || orden.estado === 'parcialmente_recibida',
      detail: orden.recibidoPor?.nombre
        ? `Recibido por ${orden.recibidoPor.nombre}`
        : orden.estado === 'aprobada'
          ? 'Pendiente de recepción'
          : null,
    },
  ];
  return steps;
}
