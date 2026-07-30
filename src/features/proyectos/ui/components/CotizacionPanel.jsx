import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, FileText, Eye, X, CheckCircle, Clock, FileEdit, Calendar, ChevronDown, AlertTriangle, Package, User } from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { getProformas } from '../../../proformas/application/proformasService.js';
import { ProformaPDF } from '../../../proformas/ui/components/ProformaPDF.jsx';
import { getProyectos } from '../../application/proyectosService.js';

const normalizeClientName = (value) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const formatTimelineDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

export function CotizacionPanel({ proyectoId, soloLectura }) {
  const { proyecto, updateFaseDatos } = useProyecto(proyectoId);
  const isAdmin = useMemo(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const rol = (user?.rol || '').toLowerCase();
    return rol === 'admin' || rol === 'administrador';
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCotizaciones, setSelectedCotizaciones] = useState(proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas || []);
  const [previewOriginal, setPreviewOriginal] = useState(null);
  const [proformas, setProformas] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const searchRef = useRef(null);

  const [isSearching, setIsSearching] = useState(selectedCotizaciones.length === 0);
  const [showLinkConfirmModal, setShowLinkConfirmModal] = useState(false);
  const [proformaToLink, setProformaToLink] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [hasInitializedSearchState, setHasInitializedSearchState] = useState(false);

  // Actualizar selectedCotizaciones cuando cambie el proyecto (útil después de refrescar)
  useEffect(() => {
    if (proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas) {
      const cotizaciones = proyecto.fases.COTIZACION.datos.cotizacionesSeleccionadas;
      setSelectedCotizaciones(cotizaciones);
      if (!hasInitializedSearchState) {
        setIsSearching(cotizaciones.length === 0);
        setHasInitializedSearchState(true);
      }
    }
  }, [proyecto, hasInitializedSearchState]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!proyecto) return;

    const filters = { limit: 1000, estado: 'Aprobada' };
    if (proyecto.clienteId) {
      filters.clienteId = proyecto.clienteId;
    } else {
      const clientName = proyecto.cliente?.nombre || proyecto.clienteNombre;
      if (clientName) filters.search = clientName;
    }

    getProformas(filters).then(response => {
      const proformasData = response?.data || response || [];
      setProformas(Array.isArray(proformasData) ? proformasData : []);
    }).catch(err => {
      console.error('Error loading proformas:', err);
      setProformas([]);
    });
  }, [proyecto]);

  useEffect(() => {
    getProyectos({ limit: 100 }).then(response => {
      const projectsData = response?.data || response || [];
      setAllProjects(Array.isArray(projectsData) ? projectsData : []);
    }).catch(err => {
      console.error('Error loading all projects:', err);
      setAllProjects([]);
    });
  }, []);

  const normProformas = proformas.map(p => ({
    id: p.id,
    clienteId: p.clienteId,
    cliente: p.cliente || p.clienteNombre || '',
    creadoPor: p.atiende || '—',
    atiende: p.atiende || '—',
    fecha: p.fecha,
    total: (p.items || []).reduce((s, i) => s + i.cantidad * i.precioUnitario, 0),
    estado: p.estado,
    items: p.items || [],
    iva: p.iva,
    abonos: p.abonos || [],
  }));

  const projectClientNames = useMemo(() => {
    if (!proyecto) return [];
    return [
      proyecto.cliente?.nombre,
      proyecto.cliente?.empresa,
      proyecto.clienteNombre,
      proyecto.clienteEmpresa,
    ]
      .map(normalizeClientName)
      .filter(Boolean);
  }, [proyecto]);

  const isRelatedToClient = (c) => {
    if (!proyecto) return false;
    if (c.clienteId && proyecto.clienteId) {
      return c.clienteId === proyecto.clienteId;
    }
    const profName = normalizeClientName(c.cliente);
    if (!profName) return false;
    return projectClientNames.some((name) => name === profName || name.includes(profName) || profName.includes(name));
  };

  const isLinkedToOtherProject = (proformaId) => {
    return allProjects.some(proj => 
      proj.id !== proyectoId &&
      proj.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas?.some(sc => sc.id === proformaId)
    );
  };

  const approvedProformas = normProformas.filter(
    (c) => (c.estado === 'Aprobada' || c.estado === 'Pagada') &&
           (c.abonos || []).reduce((sum, ab) => sum + Number(ab.monto), 0) > 0
  );

  const matchesSearch = (c) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      c.id.toLowerCase().includes(term) ||
      (c.cliente || '').toLowerCase().includes(term)
    );
  };

  // Solo proformas del cliente del proyecto, aprobadas/pagadas con abonos, y que no estén vinculadas a otro proyecto
  const filteredProformas = approvedProformas.filter((c) =>
    isRelatedToClient(c) &&
    !selectedCotizaciones.find((sc) => sc.id === c.id) &&
    !isLinkedToOtherProject(c.id) &&
    matchesSearch(c)
  );

  const getEmptyMessage = () => {
    if (proformas.length === 0) return 'No hay proformas disponibles para este cliente.';
    if (approvedProformas.length === 0) return 'No hay proformas aprobadas con abonos para este cliente.';

    const availableByClient = approvedProformas.filter((c) => isRelatedToClient(c));
    if (availableByClient.length === 0) {
      return 'Hay proformas aprobadas, pero ninguna corresponde al cliente de este proyecto.';
    }

    const notLinked = availableByClient.filter(
      (c) =>
        !selectedCotizaciones.find((sc) => sc.id === c.id) &&
        !isLinkedToOtherProject(c.id)
    );
    if (notLinked.length === 0 && availableByClient.length > 0) {
      return 'Las proformas aprobadas de este cliente ya están vinculadas a este u otro proyecto.';
    }

    if (searchTerm.trim()) {
      return `No se encontraron proformas aprobadas para "${searchTerm}"`;
    }
    return 'No hay proformas aprobadas disponibles para vincular.';
  };

  const handleSelect = (cotizacion) => {
    setProformaToLink(cotizacion);
    setShowLinkConfirmModal(true);
  };

  const handleConfirmLink = () => {
    if (!proformaToLink) return;
    const updatedProforma = {
      ...proformaToLink,
      fechaVinculacion: new Date().toISOString()
    };
    const nuevasCotizaciones = [updatedProforma];
    setSelectedCotizaciones(nuevasCotizaciones);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setIsSearching(false);
    setShowLinkConfirmModal(false);
    setProformaToLink(null);

    // Guardar automáticamente en el backend
    if (!soloLectura) {
      updateFaseDatos('COTIZACION', { cotizacionesSeleccionadas: nuevasCotizaciones });
    }
  };

  const handleRemove = (id) => {
    const nuevasCotizaciones = selectedCotizaciones.filter(c => c.id !== id);
    setSelectedCotizaciones(nuevasCotizaciones);
    
    // Guardar automáticamente en el backend
    if (!soloLectura) {
      updateFaseDatos('COTIZACION', { cotizacionesSeleccionadas: nuevasCotizaciones });
    }
  };

  const getEstadoIcon = (estado) => {
    switch(estado) {
      case 'Aprobada': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'Pendiente': return <Clock size={14} className="text-amber-500" />;
      default: return <FileEdit size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Buscador */}
      {isSearching && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Vincular Proforma
          </label>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1" ref={searchRef}>
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                disabled={soloLectura}
                className={`w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${soloLectura ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 focus:bg-white'}`}
                placeholder="Buscar proforma por código o cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              
              {/* Dropdown de resultados */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto overflow-x-hidden">
                  {filteredProformas.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      {getEmptyMessage()}
                    </div>
                  ) : (
                    filteredProformas.map(c => (
                      <button
                        key={c.id}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors text-left"
                        onClick={() => handleSelect(c)}
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <p className="text-sm font-bold text-slate-800 mb-0.5 truncate">{c.id}</p>
                          <div className="flex flex-col gap-0.5 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-600 truncate">{c.cliente}</span>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1"><FileText size={12} className="text-slate-400" /> {c.items?.length || 0} ítem(s)</span>
                              <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> {c.fecha}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-slate-700">${c.total.toFixed(2)}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {getEstadoIcon(c.estado)}
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">{c.estado}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Si ya hay proformas vinculadas y se está editando, mostrar botón para cancelar */}
            {selectedCotizaciones.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsSearching(false);
                  setSearchTerm('');
                  setIsDropdownOpen(false);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-colors cursor-pointer shrink-0 animate-in fade-in slide-in-from-right-1 duration-150"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tarjeta seleccionada */}
      {!isSearching && selectedCotizaciones.length > 0 && (
        <div className="space-y-4">
          {selectedCotizaciones.map(c => {
            const fechaCreada = c.createdAt || c.fecha;
            const fechaAprobada = c.fechaAprobacion || c.createdAt || c.fecha;
            const fechaVinculada = c.fechaVinculacion || c.fechaAprobacion || c.createdAt || c.fecha;

            return (
              <div key={c.id} className="space-y-4 animate-in fade-in duration-200">
                {/* Contenedor PROFORMA VINCULADA */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  {/* Header with Icon, Title, and Badge */}
                  <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          PROFORMA VINCULADA
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Esta proforma está vinculada al proyecto y define el monto total.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Vinculada
                    </div>
                  </div>

                  {/* Three Column Grid for details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                    {/* Column 1: Código & Cliente */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Código</p>
                        <p className="text-xl font-extrabold text-slate-900 tracking-tight">{c.id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Cliente</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <User size={14} className="text-slate-400" />
                          <span>{c.cliente}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Fecha & Items */}
                    <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Fecha</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{c.fecha}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Items</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <Package size={14} className="text-slate-400" />
                          <span>{c.items?.length || 0} {c.items?.length === 1 ? 'ítem' : 'ítems'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Monto Total */}
                    <div className="flex flex-col justify-between md:border-l md:border-slate-100 md:pl-6">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Monto Total</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">
                          ${c.total.toFixed(2)}
                        </p>
                      </div>
                      
                      {/* Buttons */}
                      <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button
                          type="button"
                          onClick={() => setPreviewOriginal(proformas.find(p => p.id === c.id) || null)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          <FileText size={14} />
                          Ver PDF
                        </button>
                        {!soloLectura && (
                          <button
                            type="button"
                            onClick={() => setIsSearching(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Cambiar Proforma
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historial collapsible */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full flex items-center justify-between font-bold text-slate-800 text-sm focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-500" />
                      <span>Historial</span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-500 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isHistoryOpen && (
                    <div className="mt-4 pl-2 pt-2 border-t border-slate-100">
                      <div className="relative border-l border-emerald-200 pl-6 space-y-6 py-2 ml-1.5">
                        {/* Timeline item 1: Proforma creada */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white border-2 border-white shadow-sm animate-in zoom-in duration-200"></div>
                          <div className="flex justify-between items-center gap-4 flex-wrap">
                            <span className="text-sm font-semibold text-slate-700">Proforma creada</span>
                            <span className="text-xs text-slate-400 font-medium">
                              {formatTimelineDateTime(fechaCreada)}
                            </span>
                          </div>
                        </div>

                        {/* Timeline item 2: Proforma Aprobada */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white border-2 border-white shadow-sm animate-in zoom-in duration-200"></div>
                          <div className="flex justify-between items-center gap-4 flex-wrap">
                            <span className="text-sm font-semibold text-slate-700">Proforma Aprobada</span>
                            <span className="text-xs text-slate-400 font-medium">
                              {formatTimelineDateTime(fechaAprobada)}
                            </span>
                          </div>
                        </div>

                        {/* Timeline item 3: Proforma vinculada */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white border-2 border-white shadow-sm animate-in zoom-in duration-200"></div>
                          <div className="flex justify-between items-center gap-4 flex-wrap">
                            <span className="text-sm font-semibold text-slate-700">Proforma vinculada</span>
                            <span className="text-xs text-slate-400 font-medium">
                              {formatTimelineDateTime(fechaVinculada)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de vinculación */}
      {showLinkConfirmModal && proformaToLink && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle size={24} className="shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">
                ¿Está seguro de vincular esta proforma?
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Se vinculará la proforma <strong className="text-slate-800 font-bold">{proformaToLink.id}</strong> del cliente <strong className="text-slate-800 font-bold">{proformaToLink.cliente}</strong> con un monto total de <strong className="text-slate-800 font-bold">${proformaToLink.total.toFixed(2)}</strong> a este proyecto.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowLinkConfirmModal(false);
                  setProformaToLink(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                Sí, vincular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview PDF — mismo diseño que Proformas */}
      {previewOriginal && (
        <ProformaPDF proforma={previewOriginal} onClose={() => setPreviewOriginal(null)} />
      )}
    </div>
  );
}
