// src/features/instalaciones/ui/InstalacionesPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProyectos } from '../../proyectos/application/hooks/useProyectos.js';
import { useProyectosContext } from '../../proyectos/application/context/ProyectosContext.jsx';
import { 
  Wrench, Search, Play, CheckCircle2, User, MapPin, 
  Calendar, Clock, CheckCircle, Eye, ClipboardList, AlertTriangle 
} from 'lucide-react';
import { DateRangePicker } from '../../../shared/ui/components/DateRangePicker.jsx';
import './InstalacionesPage.css';

const PRIORIDAD_COLORS = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
};

const FASE_LABELS = {
  COTIZACION: 'Cotización',
  DISEÑO: 'Diseño',
  PRODUCCION: 'Producción',
  INSTALACION: 'Instalación',
  ENTREGA: 'Entrega',
  COMPLETADO: 'Completado',
};

const FASE_COLORS = {
  COTIZACION: '#6366f1',
  DISEÑO: '#f59e0b',
  PRODUCCION: '#3b82f6',
  INSTALACION: '#f97316',
  ENTREGA: '#10b981',
  COMPLETADO: '#059669',
};

export function InstalacionesPage() {
  const navigate = useNavigate();
  const { todosLosProyectos, updateProyecto, avanzarFaseProyecto } = useProyectos();
  const { state } = useProyectosContext();
  const { ordenesCompra = [] } = state || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('EN_PROGRESO'); // Default to EN_PROGRESO (Pendientes + En Curso)
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Filtrar proyectos que requieren instalación y que YA están en la fase de instalación o posteriores
  const proyectosInstalacion = todosLosProyectos.filter(p => 
    p.requiereInstalacion === true && 
    ['INSTALACION', 'ENTREGA', 'COMPLETADO'].includes(p.faseActual)
  );

  const getStarted = (p) => !!(p.fases?.INSTALACION?.datos?.fechaInstalacion && p.fases?.INSTALACION?.datos?.horaInstalacion);
  const getFinished = (p) => ['ENTREGA', 'COMPLETADO'].includes(p.faseActual) || p.fases?.INSTALACION?.datos?.instalacionCompletada === true;

  // Estadísticas KPI
  const stats = {
    total: proyectosInstalacion.length,
    pendientes: proyectosInstalacion.filter(p => 
      p.faseActual === 'INSTALACION' && !getFinished(p) && !getStarted(p)
    ).length,
    activas: proyectosInstalacion.filter(p => 
      p.faseActual === 'INSTALACION' && !getFinished(p) && getStarted(p)
    ).length,
    completadas: proyectosInstalacion.filter(p => 
      getFinished(p)
    ).length,
  };

  // Filtrado final
  const filteredInstallations = proyectosInstalacion.filter((p) => {
    // 1. Filtro de Búsqueda
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.fases?.INSTALACION?.datos?.direccionInstalacion || p.cliente.direccion || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    // 2. Filtro de Pestaña/Estado
    let matchesTab = true;
    const isFinished = getFinished(p);
    const isStarted = getStarted(p);

    if (activeTab === 'EN_PROGRESO') {
      matchesTab = !isFinished;
    } else if (activeTab === 'PENDIENTES') {
      matchesTab = p.faseActual === 'INSTALACION' && !isFinished && !isStarted;
    } else if (activeTab === 'ACTIVAS') {
      matchesTab = p.faseActual === 'INSTALACION' && !isFinished && isStarted;
    } else if (activeTab === 'COMPLETADAS') {
      matchesTab = isFinished;
    }

    // 3. Filtro de Rango de Fechas
    let matchesDates = true;
    const projDateStr = p.fases?.INSTALACION?.datos?.fechaInstalacion || p.fechaCreacion || p.fecha;
    if (projDateStr) {
      const projDate = new Date(projDateStr);
      if (fechas.start) {
        const start = new Date(fechas.start);
        start.setHours(0,0,0,0);
        if (projDate < start) matchesDates = false;
      }
      if (fechas.end) {
        const end = new Date(fechas.end);
        end.setHours(23,59,59,999);
        if (projDate > end) matchesDates = false;
      }
    }

    return matchesSearch && matchesTab && matchesDates;
  });

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeTab, fechas]);

  const total = filteredInstallations.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const startIndex = (page - 1) * LIMIT;
  const paginatedInstallations = filteredInstallations.slice(startIndex, startIndex + LIMIT);

  // Obtener iniciales de los empleados
  function getInitials(name = '') {
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          className={`prest-page-btn ${page === i ? 'active-page' : ''}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="instalaciones-container">
      {/* Header */}
      <div className="instalaciones-header-box">
        <h1 className="instalaciones-title">Módulo de Instalaciones</h1>
        <p className="instalaciones-subtitle">
          Gestión, planificación y seguimiento en tiempo real de los montajes e instalaciones en sitio.
        </p>
      </div>

      {/* Stats KPI Widgets */}
      <div className="instalaciones-stats-grid">
        <div className="instalaciones-stat-card">
          <div className="stat-icon-wrapper total">
            <Wrench size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Proyectos</span>
          </div>
        </div>

        <div className="instalaciones-stat-card">
          <div className="stat-icon-wrapper pending">
            <ClipboardList size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.pendientes}</span>
            <span className="stat-label">Pendientes en cola</span>
          </div>
        </div>

        <div className="instalaciones-stat-card">
          <div className="stat-icon-wrapper active">
            <Play size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.activas}</span>
            <span className="stat-label">En curso en sitio</span>
          </div>
        </div>

        <div className="instalaciones-stat-card">
          <div className="stat-icon-wrapper completed">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.completadas}</span>
            <span className="stat-label">Instaladas / Finalizadas</span>
          </div>
        </div>
      </div>

      {/* Search & Filter controls */}
      <div className="instalaciones-control-bar">
        <div className="instalaciones-search-wrapper">
          <Search size={18} className="search-input-icon" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Buscar por proyecto, cliente o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="prest-datepicker-container">
          <DateRangePicker
            value={fechas}
            onChange={(val) => setFechas({ start: val.start, end: val.end })}
            placeholder="Rango de fechas"
          />
        </div>

        <div className="instalaciones-tabs">
          <button
            onClick={() => setActiveTab('EN_PROGRESO')}
            className={`tab-pill-btn ${activeTab === 'EN_PROGRESO' ? 'active' : ''}`}
          >
            Pendientes / En Curso ({stats.pendientes + stats.activas})
          </button>
          <button
            onClick={() => setActiveTab('PENDIENTES')}
            className={`tab-pill-btn ${activeTab === 'PENDIENTES' ? 'active' : ''}`}
          >
            Por Iniciar ({stats.pendientes})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVAS')}
            className={`tab-pill-btn ${activeTab === 'ACTIVAS' ? 'active' : ''}`}
          >
            En Montaje ({stats.activas})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETADAS')}
            className={`tab-pill-btn ${activeTab === 'COMPLETADAS' ? 'active' : ''}`}
          >
            Completadas ({stats.completadas})
          </button>
          <button
            onClick={() => setActiveTab('TODAS')}
            className={`tab-pill-btn ${activeTab === 'TODAS' ? 'active' : ''}`}
          >
            Todas ({stats.total})
          </button>
        </div>
      </div>

      {/* List layout */}
      {paginatedInstallations.length === 0 ? (
        <div className="instalaciones-empty-state">
          <div className="empty-state-icon-box">
            <Wrench size={32} />
          </div>
          <h3 className="empty-state-title">Sin instalaciones encontradas</h3>
          <p className="empty-state-desc">
            No hay proyectos que coincidan con los filtros de búsqueda o estados seleccionados en este momento.
          </p>
        </div>
      ) : (
        <div className="instalaciones-list-container">
          {paginatedInstallations.map((proyecto) => {
            const datosInstalacion = proyecto.fases?.INSTALACION?.datos || {};
            const isStarted = !!(datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion);
            const isFinished = ['ENTREGA', 'COMPLETADO'].includes(proyecto.faseActual) || datosInstalacion.instalacionCompletada === true;
            
            const personalAsignado = datosInstalacion.personalAsignado || [];
            const materiales = datosInstalacion.materiales || [];
            
            const priorityClass = PRIORIDAD_COLORS[proyecto.prioridad] || 'media';
            const progressColor = FASE_COLORS[proyecto.faseActual] || '#6366f1';

            const ocDelProyecto = proyecto.ordenesCompra || [];
            const ocPendiente = ocDelProyecto.find(oc => oc.estado === 'PENDIENTE');
            const ocAprobada = ocDelProyecto.find(oc => oc.estado === 'APROBADA');
            const ocRecibida = ocDelProyecto.find(oc => oc.estado === 'RECIBIDA');
            const ocRechazada = ocDelProyecto.find(oc => oc.estado === 'RECHAZADA');

            return (
              <div key={proyecto.id} className="instalacion-list-row">
                {/* Columna 1: Proyecto e Info Principal */}
                <div className="list-col col-main">
                  <div className="list-proj-header">
                    <span className={`badge-priority ${priorityClass}`}>
                      {proyecto.prioridad}
                    </span>
                    <span className="list-proj-id">{proyecto.id}</span>
                  </div>
                  <h3 className="list-proj-title">{proyecto.nombre}</h3>
                </div>

                {/* Columna 2: Cliente */}
                <div className="list-col col-client">
                  <span className="list-client-empresa">{proyecto.cliente.empresa}</span>
                  <span className="list-client-contacto">Contacto: {proyecto.cliente.nombre}</span>
                </div>

                {/* Columna 3: Dirección & Programación */}
                <div className="list-col col-details">
                  <div className="list-detail-item">
                    <MapPin size={14} className="list-detail-icon" />
                    <span className="list-detail-text" title={datosInstalacion.direccionInstalacion || proyecto.cliente.direccion || 'Sin dirección registrada'}>
                      {datosInstalacion.direccionInstalacion || proyecto.cliente.direccion || 'Sin dirección registrada'}
                    </span>
                  </div>
                  <div className="list-detail-item mt-1.5">
                    <Calendar size={14} className="list-detail-icon" />
                    <span className="list-detail-text">
                      {datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion
                        ? `${datosInstalacion.fechaInstalacion} a las ${datosInstalacion.horaInstalacion}`
                        : 'Pendiente de arranque'
                      }
                    </span>
                  </div>
                </div>

                {/* Columna 4: Equipo y Materiales */}
                <div className="list-col col-team-materials">
                  <div className="list-team-avatars">
                    {personalAsignado.length > 0 ? (
                      <div className="team-avatars-list">
                        {personalAsignado.map((p, i) => (
                          <div 
                            key={i} 
                            className="team-avatar-circle" 
                            title={`${p.nombre} - ${p.rol}`}
                          >
                            {getInitials(p.nombre)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="team-empty-msg">Sin personal asignado</span>
                    )}
                  </div>
                  <div className="list-materials-count mt-2">
                    <Wrench size={13} style={{ color: '#94a3b8' }} />
                    <span>
                      {materiales.length > 0 
                        ? `${materiales.length} materiales`
                        : 'Sin materiales'
                      }
                    </span>
                  </div>
                </div>

                {/* Columna 5: Estado / Orden de Compra */}
                <div className="list-col col-status">
                  {/* Estado Montaje */}
                  {isFinished ? (
                    <span className="list-state-badge completed">
                      <CheckCircle size={12} /> Completada
                    </span>
                  ) : proyecto.faseActual === 'INSTALACION' ? (
                    isStarted ? (
                      <span className="list-state-badge started">
                        <Clock size={12} /> En Montaje
                      </span>
                    ) : (
                      <span className="list-state-badge idle">
                        <AlertTriangle size={12} /> Iniciar Montaje
                      </span>
                    )
                  ) : (
                    <span className="list-state-badge queue" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>
                      <ClipboardList size={12} /> {FASE_LABELS[proyecto.faseActual]}
                    </span>
                  )}

                  {/* Orden de Compra */}
                  {ocDelProyecto.length > 0 && (
                    <div className="mt-2">
                      {ocPendiente ? (
                        <span className="list-oc-badge pending">
                          OC Pendiente
                        </span>
                      ) : ocAprobada ? (
                        <span className="list-oc-badge approved">
                          OC Aprobada
                        </span>
                      ) : ocRecibida ? (
                        <span className="list-oc-badge approved">
                          OC Recibida
                        </span>
                      ) : ocRechazada ? (
                        <span className="list-oc-badge rejected">
                          OC Rechazada
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Columna 6: Acciones */}
                <div className="list-col col-actions">
                  <button
                    onClick={() => navigate(`/instalaciones/${proyecto.id}/materiales`)}
                    className="card-action-btn primary list-btn"
                    title="Ver ficha del proyecto"
                  >
                    <Eye size={14} />
                    Ver Proyecto
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="prest-pagination" style={{ background: '#ffffff', marginTop: '1.5rem' }}>
          <span className="prest-pagination-info">
            {total} instalaciones ({page} de {totalPages})
          </span>
          <div className="prest-pagination-pages">
            <button
              type="button"
              className="prest-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              &lt;
            </button>
            {renderPageButtons()}
            <button
              type="button"
              className="prest-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
