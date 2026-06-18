import React, { useEffect, useState } from 'react';
import { getConfiguracion, updateConfiguracion } from '../../application/configuracionService';
import { toast } from '../../../../shared/ui/components/Toast';

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
    loadConfig();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex items-center justify-between mb-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Configuración General</h1>
          <p className="text-sm text-slate-500">Datos de la empresa y políticas de cotizaciones</p>
        </div>
      </div>

      {/* Main Card Form */}
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
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};
