import React, { useEffect, useState } from 'react';
import { getConfiguracion, updateConfiguracion } from '../../application/configuracionService';
import { toast } from '../../../../shared/ui/components/Toast';
import { getHorarioConfig, saveHorarioConfig, getAutoAsistenciaStatus, toggleAutoAsistenciaStatus } from '../../../asistencia/application/asistenciaService';
import { HorarioDelDiaBanner, HorarioEditModal } from '../../../asistencia/ui/components/HorarioDelDiaBanner';
import { normalizeHorariosConfig, DEFAULT_HORARIOS_CONFIG, getTodayEcuadorStr } from '../../../asistencia/helpers/horarioLaboral';

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

  const targetEmpId = loggedInUser?.empleadoId || 'EMP-001';
  const isTargetAutoUser = Boolean(
    loggedInUser?.empleadoId === 'EMP-001' ||
    (loggedInUser?.username || '').toLowerCase() === 'ismorquecho' ||
    (loggedInUser?.correo || '').toLowerCase().includes('morquecho') ||
    (loggedInUser?.nombre || '').toLowerCase().includes('morquecho')
  );

  const [autoAsistenciaEnabled, setAutoAsistenciaEnabled] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);

  useEffect(() => {
    if (!isTargetAutoUser) return;
    getAutoAsistenciaStatus(targetEmpId)
      .then((res) => setAutoAsistenciaEnabled(!!res?.autoAsistencia))
      .catch((err) => console.error('Error cargando auto-asistencia', err));
  }, [isTargetAutoUser, targetEmpId]);

  const handleToggleAutoAsistencia = async () => {
    setTogglingAuto(true);
    try {
      const nextVal = !autoAsistenciaEnabled;
      const res = await toggleAutoAsistenciaStatus(targetEmpId, nextVal);
      setAutoAsistenciaEnabled(!!res?.autoAsistencia);
      toast.success(
        nextVal
          ? 'Marcación automática de asistencia ACTIVADA'
          : 'Marcación automática de asistencia DESACTIVADA'
      );
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar la marcación automática.');
    } finally {
      setTogglingAuto(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up cf-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .cf-root, .cf-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }

        .cf-btn-primary {
          background: #0b2d64;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 22px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(11,45,100,0.28);
        }
        .cf-btn-primary:hover {
          background: #071f45;
          box-shadow: 0 6px 16px rgba(11,45,100,0.38);
        }
        .cf-btn-primary:active { transform: translateY(0); }
        .cf-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .cf-input {
          width: 100%;
          border: 1.5px solid rgba(226,232,240,0.85);
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          outline: none;
          transition: all 0.2s ease;
          background: #ffffff;
        }
        .cf-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
      `}</style>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Sistema
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Datos de la empresa, parámetros y políticas del sistema</p>
            </div>
          </div>
        </div>

        {/* Tabs Bar at the bottom of Header Card */}
        {isAdmin && (
          <div className="px-4 sm:px-5 pb-3.5 flex gap-1.5 border-t border-slate-100 pt-3 bg-slate-50/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sidebar')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'sidebar'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
              Sidebar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('horarios')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'horarios'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Horarios Laborales
            </button>
          </div>
        )}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'horarios' && isAdmin ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 sm:p-6 overflow-hidden">
          <HorarioDelDiaBanner
            horariosConfig={horariosConfig}
            fechaActiva={getTodayEcuadorStr()}
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
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            
            {/* Company Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Datos de contacto de la empresa
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Celular / Teléfono *</label>
                  <input
                    name="celular"
                    type="text"
                    value={form.celular}
                    onChange={handleChange}
                    required
                    placeholder="Ej. +593 99 999 9999"
                    className="cf-input"
                  />
                </div>
                
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Ej. administracion@alux.com"
                    className="cf-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Dirección Física *</label>
                <input
                  name="direccion"
                  type="text"
                  value={form.direccion}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Av. República de El Salvador y Naciones Unidas, Edificio Alux"
                  className="cf-input"
                />
              </div>
            </div>

            {/* Proformas Parameters Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Parámetros de proformas
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Días de Validez por Defecto *</label>
                  <input
                    name="diasValidez"
                    type="number"
                    min={1}
                    value={form.diasValidez}
                    onChange={handleChange}
                    required
                    className="cf-input"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Número de días antes del vencimiento automático
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Condiciones y formas de pago (Política Precargada) *
                </label>
                <textarea
                  name="condicionesPago"
                  value={form.condicionesPago}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Escribe cada término en una línea nueva..."
                  className="cf-input resize-y"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Cada párrafo o condición en una línea separada se dibujará en las proformas generadas
                </span>
              </div>
            </div>

          </div>

          {/* Form Footer */}
          <div className="bg-slate-50/50 border-t border-slate-100 px-5 sm:px-6 py-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="cf-btn-primary"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveSidebar} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Categorías del menú lateral
                </h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Elige qué secciones aparecen en el modo <strong>Módulos principales</strong>.
                Las categorías desactivadas siguen disponibles al activar <strong>Ver todo</strong> en el sidebar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                {AVAILABLE_MODULES.map((mod) => {
                  const isVisible = !selectedHidden.includes(mod.key);
                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggleModuleVisible(mod.key)}
                      className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all duration-200 select-none ${
                        isVisible
                          ? 'border-blue-200 bg-blue-50/30 hover:bg-blue-50/50'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{mod.label}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isVisible ? 'Visible en Principales' : 'Oculto en Principales'}
                        </p>
                      </div>
                      <div className={`relative w-9 h-5 rounded-full transition-colors ${isVisible ? 'bg-[#0b2d64]' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isVisible ? 'translate-x-4' : ''}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="bg-slate-50/50 border-t border-slate-100 px-5 sm:px-6 py-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={savingSidebar}
              className="cf-btn-primary"
            >
              {savingSidebar ? 'Guardando...' : 'Guardar Configuración de Sidebar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
