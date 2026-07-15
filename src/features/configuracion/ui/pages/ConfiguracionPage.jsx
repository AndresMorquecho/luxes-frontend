import React, { useEffect, useState } from 'react';
import { getConfiguracion, updateConfiguracion } from '../../application/configuracionService';
import { toast } from '../../../../shared/ui/components/Toast';
import { getHorarioConfig, saveHorarioConfig } from '../../../asistencia/application/asistenciaService';
import { HorarioDelDiaBanner, HorarioEditModal } from '../../../asistencia/ui/components/HorarioDelDiaBanner';
import { normalizeHorariosConfig, DEFAULT_HORARIOS_CONFIG } from '../../../asistencia/helpers/horarioLaboral';

const AVAILABLE_MODULES = [
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'nomina', label: 'Nómina' },
  { key: 'proformas', label: 'Proformas' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'tallerImpresion', label: 'Taller de Impresión' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'tareas', label: 'Tareas' },
  { key: 'proyectos', label: 'Gestión de Proyectos' },
  { key: 'devolucionesTaller', label: 'Devoluciones (Taller)' },
  { key: 'controlVehiculos', label: 'Control de Vehículos' },
  { key: 'instalaciones', label: 'Instalaciones' },
  { key: 'compras', label: 'Compras' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'relaciones', label: 'Contactos' },
];

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const ConfiguracionPage = () => {
  const [form, setForm] = useState({
    condicionesPago: '',
    celular: '',
    email: '',
    direccion: '',
    diasValidez: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSidebar, setSavingSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [horariosConfig, setHorariosConfig] = useState(DEFAULT_HORARIOS_CONFIG);
  const [horarioModalOpen, setHorarioModalOpen] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (loggedInUser?.rol || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';

  const [selectedHidden, setSelectedHidden] = useState(() => {
    let hidden = ['relaciones', 'instalaciones', 'inventario']; // defaults
    if (loggedInUser?.sidebarConfig) {
      try {
        const configObj = typeof loggedInUser.sidebarConfig === 'string'
          ? JSON.parse(loggedInUser.sidebarConfig)
          : loggedInUser.sidebarConfig;
        if (configObj && Array.isArray(configObj.hiddenModules)) {
          hidden = configObj.hiddenModules.filter((k) => k !== 'reportesFinancieros');
          if (hidden.includes('cierreCaja')) {
            hidden = hidden.filter((k) => k !== 'cierreCaja');
            if (!hidden.includes('finanzas')) {
              hidden.push('finanzas');
            }
          }
        }
      } catch (e) {
        console.error('Error parsing sidebarConfig in config page:', e);
      }
    }
    return hidden;
  });

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const data = await getConfiguracion();
        if (data) {
          setForm({
            condicionesPago: data.condicionesPago || '',
            celular: data.celular || '',
            email: data.email || '',
            direccion: data.direccion || '',
            diasValidez: Number(data.diasValidez ?? 3),
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    const loadHorarios = async () => {
      try {
        const cfg = await getHorarioConfig();
        setHorariosConfig(normalizeHorariosConfig(cfg));
      } catch (err) {
        console.error('Error cargando horarios', err);
      }
    };

    loadConfig();
    loadHorarios();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'diasValidez' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfiguracion(form);
      toast.success('Configuración guardada correctamente');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModuleVisible = (key) => {
    setSelectedHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSaveSidebar = async (e) => {
    e.preventDefault();
    setSavingSidebar(true);
    try {
      const res = await fetch('/api/auth/users/me/sidebar-config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ sidebarConfig: { hiddenModules: selectedHidden } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Error al guardar la configuración del sidebar');
      }

      // Update local user details
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.sidebarConfig = data.data.sidebarConfig;
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.dispatchEvent(new Event('user-updated'));

      toast.success('Configuración de barra lateral guardada correctamente');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar la configuración del sidebar');
    } finally {
      setSavingSidebar(false);
    }
  };

  const handleSaveHorario = async (config) => {
    setSavingHorario(true);
    try {
      const saved = await saveHorarioConfig(config);
      setHorariosConfig(normalizeHorariosConfig(saved));
      toast.success('Horarios laborales actualizados correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar los horarios');
    } finally {
      setSavingHorario(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 xl:p-8 w-full animate-slide-up pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex items-center justify-between mb-6 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {activeTab === 'general' ? 'Configuración General' : activeTab === 'sidebar' ? 'Personalizar Sidebar' : 'Horarios Laborales'}
            </h1>
          <p className="text-sm text-slate-500">
            {activeTab === 'general'
              ? 'Datos de la empresa y políticas de cotizaciones'
              : activeTab === 'sidebar'
              ? 'Configura la visibilidad de los módulos de la barra lateral'
              : 'Configura los horarios laborales estándar para el control de asistencia'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Configuración General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sidebar')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'sidebar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Personalizar Sidebar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'horarios'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Horarios Laborales
          </button>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'horarios' && isAdmin ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <HorarioDelDiaBanner
            horariosConfig={horariosConfig}
            fechaActiva={new Date().toISOString().split('T')[0]}
            showAllHorarios
            editable
            onEdit={() => setHorarioModalOpen(true)}
          />

          <HorarioEditModal
            open={horarioModalOpen}
            initialConfig={horariosConfig}
            onClose={() => setHorarioModalOpen(false)}
            onSave={handleSaveHorario}
            saving={savingHorario}
          />
        </div>
      ) : (activeTab === 'general' || !isAdmin) ? (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Company Details Section */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                Datos de contacto de la empresa
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Celular / Teléfono *</label>
                  <input
                    name="celular"
                    type="text"
                    value={form.celular}
                    onChange={handleChange}
                    required
                    placeholder="Ej. +593 99 999 9999"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Ej. administracion@luxes.com"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Dirección Física *</label>
                <input
                  name="direccion"
                  type="text"
                  value={form.direccion}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Av. República de El Salvador y Naciones Unidas, Edificio Luxes"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>

            {/* Proformas Parameters Section */}
            <div className="space-y-4 pt-4">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                Parámetros de proformas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Días de Validez por Defecto *</label>
                  <input
                    name="diasValidez"
                    type="number"
                    min={1}
                    value={form.diasValidez}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Número de días antes del vencimiento automático
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Condiciones y formas de pago (Política Precargada) *
                </label>
                <textarea
                  name="condicionesPago"
                  value={form.condicionesPago}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Escribe cada término en una línea nueva..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-sans resize-y"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Cada párrafo o condición en una línea separada se dibujará en las proformas generadas
                </span>
              </div>
            </div>

          </div>

          {/* Form Footer */}
          <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 shadow-sm text-sm"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              {saving && (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
              )}
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveSidebar} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                Personalización de Módulos Principales
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selecciona cuáles módulos se mostrarán cuando estés en el modo de vista <strong>"Módulos Principales"</strong>. 
                Los módulos desactivados (gris) se ocultarán temporalmente de la barra lateral, pero seguirán estando disponibles 
                en el modo de vista <strong>"Ver todo"</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                {AVAILABLE_MODULES.map((mod) => {
                  const isVisible = !selectedHidden.includes(mod.key);
                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggleModuleVisible(mod.key)}
                      className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-200 select-none ${
                        isVisible
                          ? 'border-blue-200 bg-blue-50/20 hover:bg-blue-50/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{mod.label}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isVisible ? 'Visible en Principales' : 'Oculto en Principales'}
                        </p>
                      </div>
                      <div className={`relative w-9 h-5 rounded-full transition-colors ${isVisible ? 'bg-blue-600' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isVisible ? 'translate-x-4' : ''}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={savingSidebar}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 shadow-sm text-sm"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              {savingSidebar && (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
              )}
              {savingSidebar ? 'Guardando...' : 'Guardar Configuración de Sidebar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
