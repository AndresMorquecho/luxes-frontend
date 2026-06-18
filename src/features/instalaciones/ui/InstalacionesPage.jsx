// src/features/instalaciones/ui/InstalacionesPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProyectos } from '../../proyectos/application/hooks/useProyectos.js';
import { useProyectosContext } from '../../proyectos/application/context/ProyectosContext.jsx';
import { 
  Wrench, Search, Play, CheckCircle2, User, MapPin, 
  Calendar, Clock, CheckCircle, Eye, ClipboardList, AlertTriangle 
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('TODAS'); // TODAS, PENDIENTES, ACTIVAS, COMPLETADAS

  // Filtrar proyectos que requieren instalación
  const proyectosInstalacion = todosLosProyectos.filter(p => p.requiereInstalacion === true);

  // Estadísticas KPI
  const stats = {
    total: proyectosInstalacion.length,
    pendientes: proyectosInstalacion.filter(p => 
      ['COTIZACION', 'DISEÑO', 'PRODUCCION'].includes(p.faseActual)
    ).length,
    activas: proyectosInstalacion.filter(p => p.faseActual === 'INSTALACION').length,
    completadas: proyectosInstalacion.filter(p => 
      ['ENTREGA', 'COMPLETADO'].includes(p.faseActual)
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
    if (activeTab === 'PENDIENTES') {
      matchesTab = ['COTIZACION', 'DISEÑO', 'PRODUCCION'].includes(p.faseActual);
    } else if (activeTab === 'ACTIVAS') {
      matchesTab = p.faseActual === 'INSTALACION';
    } else if (activeTab === 'COMPLETADAS') {
      matchesTab = ['ENTREGA', 'COMPLETADO'].includes(p.faseActual);
    }

    return matchesSearch && matchesTab;
  });

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

        <div className="instalaciones-tabs">
          <button
            onClick={() => setActiveTab('TODAS')}
            className={`tab-pill-btn ${activeTab === 'TODAS' ? 'active' : ''}`}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('PENDIENTES')}
            className={`tab-pill-btn ${activeTab === 'PENDIENTES' ? 'active' : ''}`}
          >
            Pendientes ({stats.pendientes})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVAS')}
            className={`tab-pill-btn ${activeTab === 'ACTIVAS' ? 'active' : ''}`}
          >
            En Curso ({stats.activas})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETADAS')}
            className={`tab-pill-btn ${activeTab === 'COMPLETADAS' ? 'active' : ''}`}
          >
            Completadas ({stats.completadas})
          </button>
        </div>
      </div>

      {/* List layout */}
      {filteredInstallations.length === 0 ? (
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
          {filteredInstallations.map((proyecto) => {
            const datosInstalacion = proyecto.fases?.INSTALACION?.datos || {};
            const isStarted = !!(datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion);
            const isFinished = ['ENTREGA', 'COMPLETADO'].includes(proyecto.faseActual);
            
            const personalAsignado = datosInstalacion.personalAsignado || [];
            const materiales = datosInstalacion.materiales || [];
            
            const priorityClass = PRIORIDAD_COLORS[proyecto.prioridad] || 'media';
            const progressColor = FASE_COLORS[proyecto.faseActual] || '#6366f1';

            const ocDelProyecto = proyecto.ordenesCompra || [];
            const ocPendiente = ocDelProyecto.find(oc => oc.estado === 'PENDIENTE');
            const ocAprobada = ocDelProyecto.find(oc => oc.estado === 'APROBADA');

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
                  <div className="instalacion-progress-box min-w-[120px] mt-2">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${proyecto.progreso}%`, 
                          backgroundColor: progressColor 
                        }}
                      />
                    </div>
                    <div className="progress-labels mt-1" style={{ fontSize: '10px' }}>
                      <span>Progreso: {proyecto.progreso}%</span>
                    </div>
                  </div>
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
                      ) : (
                        <span className="list-oc-badge rejected">
                          OC Rechazada
                        </span>
                      )}
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
    </div>
  );
}
