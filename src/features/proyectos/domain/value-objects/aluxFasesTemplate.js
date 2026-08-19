// src/features/proyectos/domain/value-objects/aluxFasesTemplate.js

export const ALUX_DEFAULT_FASES = [
  {
    id: 'fase-1',
    orden: 1,
    nombre: 'Rectificación de Medidas y Planos en Obra',
    descripcion: 'Verificación presencial de medidas finales, escuadras y detalles técnicos en obra.',
    diasEstimados: 2,
    estado: 'EN_PROGRESO',
    evidencias: [],
    notas: '',
  },
  {
    id: 'fase-2',
    orden: 2,
    nombre: 'Adquisición de Perfiles, Vidrios y Herrajes',
    descripcion: 'Compra y recepción de materia prima (perfilería de aluminio, vidrios templados, empaques y accesorios).',
    diasEstimados: 5,
    estado: 'PENDIENTE',
    evidencias: [],
    notas: '',
  },
  {
    id: 'fase-3',
    orden: 3,
    nombre: 'Fabricación, Corte y Armado en Taller',
    descripcion: 'Proceso de corte a medida, troquelado, perforación y ensamblado de estructuras en taller.',
    diasEstimados: 4,
    estado: 'PENDIENTE',
    evidencias: [],
    notas: '',
  },
  {
    id: 'fase-4',
    orden: 4,
    nombre: 'Transporte e Instalación en Obra',
    descripcion: 'Traslado seguro del material y montaje/fijación de ventanería y estructuras en la ubicación del cliente.',
    diasEstimados: 3,
    estado: 'PENDIENTE',
    evidencias: [],
    notas: '',
  },
  {
    id: 'fase-5',
    orden: 5,
    nombre: 'Sellado, Acabados Finales y Entrega',
    descripcion: 'Aplicación de selladores de silicona, pruebas de estanqueidad, limpieza y firma de acta de entrega.',
    diasEstimados: 1,
    estado: 'PENDIENTE',
    evidencias: [],
    notas: '',
  },
];

export const generateAluxFasesWithDates = (baseDateStr = new Date().toISOString().split('T')[0], proformaId = null) => {
  let currentDate = new Date(baseDateStr);
  if (isNaN(currentDate.getTime())) currentDate = new Date();

  return ALUX_DEFAULT_FASES.map((fase) => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + fase.diasEstimados);

    // Mover la fecha de inicio del siguiente al fin del actual
    currentDate = new Date(endDate);

    return {
      ...fase,
      proformaId: fase.orden === 1 ? proformaId : null,
      fechaInicioPlan: startDate.toISOString().split('T')[0],
      fechaFinPlan: endDate.toISOString().split('T')[0],
      fechaCompletada: null,
    };
  });
};

/** Detecta si un proyecto aún tiene el paquete completo de fases precargado al crear (bug legacy). */
export function isPreloadedDefaultAluxFases(fases) {
  if (!Array.isArray(fases) || fases.length !== ALUX_DEFAULT_FASES.length) return false;

  const matchesTemplate = ALUX_DEFAULT_FASES.every((template, idx) => {
    const fase = fases[idx];
    return fase?.nombre === template.nombre;
  });

  if (!matchesTemplate) return false;

  return fases.every((f) => f.estado !== 'COMPLETADA');
};
