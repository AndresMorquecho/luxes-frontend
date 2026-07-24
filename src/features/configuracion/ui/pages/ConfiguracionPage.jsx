import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { getConfiguracion, updateConfiguracion } from '../../application/configuracionService';
import { toast } from '../../../../shared/ui/components/Toast';
import { getHorarioConfig, saveHorarioConfig } from '../../../asistencia/application/asistenciaService';
import { HorarioDelDiaBanner, HorarioEditModal } from '../../../asistencia/ui/components/HorarioDelDiaBanner';
import { normalizeHorariosConfig, DEFAULT_HORARIOS_CONFIG } from '../../../asistencia/helpers/horarioLaboral';
import { DEFAULT_HIDDEN_MODULES, normalizeHiddenModules, SIDEBAR_MODULES } from '../../../navigation/application/sidebarModules';

const AVAILABLE_MODULES = SIDEBAR_MODULES;

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
    let hidden = [...DEFAULT_HIDDEN_MODULES];
    if (loggedInUser?.sidebarConfig) {
      try {
        const configObj = typeof loggedInUser.sidebarConfig === 'string'
          ? JSON.parse(loggedInUser.sidebarConfig)
          : loggedInUser.sidebarConfig;
        if (configObj && Array.isArray(configObj.hiddenModules)) {
          hidden = normalizeHiddenModules(configObj.hiddenModules);
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
        body: JSON.stringify({ sidebarConfig: { hiddenModules: normalizeHiddenModules(selectedHidden) } }),
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

  const tabSubtitle =
    activeTab === 'general'
      ? 'Datos de la empresa y políticas de cotizaciones'
      : activeTab === 'sidebar'
        ? 'Visibilidad de módulos en la barra lateral'
        : 'Horarios laborales para el control de asistencia';

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:bg-white transition-colors';

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
        activeTab === id
          ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
          : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <Settings className="w-5 h-5 text-blue-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                Sistema
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{tabSubtitle}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="px-4 sm:px-5 pb-4 flex gap-1 border-t border-slate-100 pt-3 bg-slate-50/50 overflow-x-auto">
            {tabBtn('general', 'General')}
            {tabBtn('sidebar', 'Sidebar')}
            {tabBtn('horarios', 'Horarios')}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          <span>Cargando...</span>
        </div>
      ) : activeTab === 'horarios' && isAdmin ? (
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-6">
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
      ) : activeTab === 'general' || !isAdmin ? (
        <form onSubmit={handleSubmit} className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                Datos de contacto
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Celular / teléfono *</label>
                  <input
                    name="celular"
                    type="text"
                    value={form.celular}
                    onChange={handleChange}
                    required
                    placeholder="Ej. +593 99 999 9999"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Ej. administracion@luxes.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Dirección física *</label>
                <input
                  name="direccion"
                  type="text"
                  value={form.direccion}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Av. República de El Salvador y Naciones Unidas"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                Parámetros de proformas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Días de validez por defecto *</label>
                  <input
                    name="diasValidez"
                    type="number"
                    min={1}
                    value={form.diasValidez}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                  <span className="text-[11px] text-slate-400 mt-1.5 block">
                    Días antes del vencimiento automático
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  Condiciones y formas de pago *
                </label>
                <textarea
                  name="condicionesPago"
                  value={form.condicionesPago}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Escribe cada término en una línea nueva..."
                  className={`${inputClass} font-sans resize-y`}
                />
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Cada línea se mostrará como condición en las proformas
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving && (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
              )}
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveSidebar} className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                Categorías del menú lateral
              </h2>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                Elige qué secciones aparecen en <span className="font-semibold text-slate-700">Módulos principales</span>.
                Las desactivadas siguen disponibles con <span className="font-semibold text-slate-700">Ver todo</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {AVAILABLE_MODULES.map((mod) => {
                const isVisible = !selectedHidden.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => handleToggleModuleVisible(mod.key)}
                    className={`flex items-center justify-between p-4 border rounded-xl text-left transition-colors select-none ${
                      isVisible
                        ? 'border-blue-100 bg-white hover:bg-slate-50'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <span className="text-sm font-semibold text-slate-800 block truncate">{mod.label}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isVisible ? 'Visible en principales' : 'Oculto en principales'}
                      </p>
                    </div>
                    <div className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${isVisible ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isVisible ? 'translate-x-4' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={savingSidebar}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {savingSidebar && (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
              )}
              {savingSidebar ? 'Guardando...' : 'Guardar sidebar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
