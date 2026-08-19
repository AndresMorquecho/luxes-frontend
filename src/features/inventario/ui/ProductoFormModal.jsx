import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, RefreshCw, Barcode, DollarSign, Tag, Check, AlertTriangle
} from 'lucide-react';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import { getEmpleados } from '../../empleados/application/empleadosService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';

const DEFAULT_CATEGORIAS = [
  'Perfilería de Aluminio',
  'Vidrio y Cristal Templado',
  'Alucobond / ACM',
  'Herrajes y Accesorios',
  'Selladores, Siliconas e Insumos',
  'Herramientas y Equipos',
  'Tornillería y Anclajes',
  'Policarbonato y Acrílicos',
  'Consumibles de Taller',
  'Otros / Varios',
];

const DEFAULT_UNIDADES = [
  { id: 'u_unid', nombre: 'Unidad (unid)', abreviacion: 'unid' },
  { id: 'u_m', nombre: 'Metro (m)', abreviacion: 'm' },
  { id: 'u_m2', nombre: 'Metro Cuadrado (m²)', abreviacion: 'm²' },
  { id: 'u_l', nombre: 'Litro (L)', abreviacion: 'L' },
  { id: 'u_kg', nombre: 'Kilogramo (kg)', abreviacion: 'kg' },
  { id: 'u_plancha', nombre: 'Plancha', abreviacion: 'plancha' },
  { id: 'u_rollo', nombre: 'Rollo', abreviacion: 'rollo' },
  { id: 'u_paq', nombre: 'Paquete', abreviacion: 'paq' },
  { id: 'u_pza', nombre: 'Pieza (pza)', abreviacion: 'pza' },
  { id: 'u_tubo', nombre: 'Tubo / Barra', abreviacion: 'tubo' },
];

function generateNextCodigo(existingItems = [], categoria = '') {
  let prefix = 'PRD';
  const catLower = (categoria || '').toLowerCase();
  if (catLower.includes('alumin') || catLower.includes('perfil')) prefix = 'ALU';
  else if (catLower.includes('vidri') || catLower.includes('cristal') || catLower.includes('templad')) prefix = 'VID';
  else if (catLower.includes('acm') || catLower.includes('alucobond')) prefix = 'ACM';
  else if (catLower.includes('herraj') || catLower.includes('accesori')) prefix = 'HRR';
  else if (catLower.includes('sellad') || catLower.includes('silicon') || catLower.includes('insumo')) prefix = 'INS';
  else if (catLower.includes('herramient') || catLower.includes('equipo')) prefix = 'HER';
  else if (catLower.includes('tornill') || catLower.includes('anclaj')) prefix = 'TRN';
  else if (catLower.includes('acril') || catLower.includes('policarbonat')) prefix = 'ACR';

  let maxNum = 0;
  const regex = new RegExp(`^(${prefix}|PRD|MAT|ALU|VID|ACM|HRR|INS|HER|TRN|ACR)-(\\d+)$`, 'i');
  
  existingItems.forEach((item) => {
    if (!item.codigo) return;
    const match = String(item.codigo).trim().match(regex);
    if (match && match[2]) {
      const num = parseInt(match[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function ProductoFormModal({
  item,
  existingItems = [],
  unidades = [],
  onClose,
  onSave
}) {
  const isEdit = !!item;
  const nameInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [customCategoria, setCustomCategoria] = useState(false);

  const availableCategorias = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIAS);
    existingItems.forEach((i) => {
      if (i.categoria && i.categoria.trim()) {
        set.add(i.categoria.trim());
      }
    });
    return Array.from(set);
  }, [existingItems]);

  const allUnidades = useMemo(() => (unidades && unidades.length > 0 ? unidades : DEFAULT_UNIDADES), [unidades]);

  const [form, setForm] = useState(() => {
    if (item) {
      return {
        nombre: item.nombre || '',
        categoria: item.categoria || 'Perfilería de Aluminio',
        codigo: item.codigo || '',
        stockActual: item.stockActual ?? 0,
        stockMinimo: item.stockMinimo ?? 0,
        precioCosto: item.precioCosto ?? 0,
        unidadMedidaId: item.unidadMedidaId || item.unidadMedida?.id || '',
        unidadMedida: typeof item.unidadMedida === 'string' ? item.unidadMedida : (item.unidadMedida?.nombre || 'Unidad (unid)'),
        marca: item.marca || '',
        modelo: item.modelo || '',
        serie: item.serie || '',
      };
    }
    const defaultCat = 'Perfilería de Aluminio';
    return {
      nombre: '',
      categoria: defaultCat,
      codigo: generateNextCodigo(existingItems, defaultCat),
      stockActual: 0,
      stockMinimo: 0,
      precioCosto: 0,
      unidadMedidaId: allUnidades[0]?.id || '',
      unidadMedida: allUnidades[0]?.nombre || 'Unidad (unid)',
      marca: '',
      modelo: '',
      serie: '',
    };
  });

  useEffect(() => {
    if (nameInputRef.current) nameInputRef.current.focus();
  }, []);

  const duplicateItem = useMemo(() => {
    const cleanCode = (form.codigo || '').trim().toLowerCase();
    if (!cleanCode) return null;
    return existingItems.find(
      (i) => i.id !== item?.id && (i.codigo || '').trim().toLowerCase() === cleanCode
    ) || null;
  }, [form.codigo, existingItems, item]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegenerateCode = () => set('codigo', generateNextCodigo(existingItems, form.categoria));

  const handleCategoriaChange = (newCat) => {
    if (newCat === '__CUSTOM__') {
      setCustomCategoria(true);
      set('categoria', '');
    } else {
      setCustomCategoria(false);
      set('categoria', newCat);
      if (!isEdit) set('codigo', generateNextCodigo(existingItems, newCat));
    }
  };

  const handleUnidadChange = (unitNameOrId) => {
    const found = allUnidades.find((u) => u.id === unitNameOrId || u.nombre === unitNameOrId);
    setForm((prev) => ({
      ...prev,
      unidadMedidaId: found ? found.id : '',
      unidadMedida: found ? found.nombre : unitNameOrId,
    }));
  };

  async function handleSubmit(e, keepOpen = false) {
    if (e) e.preventDefault();
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio.');
    if (duplicateItem) return toast.error(`El código "${form.codigo}" ya está en uso.`);

    setSaving(true);
    try {
      const isHerramienta = (form.categoria || '').toLowerCase().includes('herramient');
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim(),
        tipo: isHerramienta ? 'herramienta' : 'consumible',
        subtipo: isHerramienta ? 'herramienta' : 'consumible_descargable',
        descargaStock: true,
        esPrestable: isHerramienta,
        stockActual: parseFloat(form.stockActual) || 0,
        stockMinimo: parseFloat(form.stockMinimo) || 0,
        precioCosto: parseFloat(form.precioCosto) || 0,
        unidadMedidaId: form.unidadMedidaId || undefined,
        unidadMedida: form.unidadMedida,
        codigo: form.codigo?.trim() || undefined,
        marca: form.marca?.trim() || undefined,
        modelo: form.modelo?.trim() || undefined,
        serie: form.serie?.trim() || undefined,
      };

      await onSave(payload, keepOpen);

      if (keepOpen) {
        setForm((prev) => ({
          ...prev,
          nombre: '',
          codigo: generateNextCodigo([...existingItems, { id: 'temp', codigo: form.codigo }], form.categoria),
          stockActual: 0,
          precioCosto: 0,
          marca: '',
          modelo: '',
          serie: '',
        }));
        nameInputRef.current?.focus();
      }
    } finally {
      setSaving(false);
    }
  }

  const handleClose = () => deferClose(onClose);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        style={{
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {isEdit ? 'Editar Producto / Material' : 'Nuevo Registro de Inventario'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEdit
                    ? 'Modifica los datos, categoría o stock del producto'
                    : 'Registra un nuevo item por categoría con código autogenerado'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Nombre del Producto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre del Producto / Material <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                placeholder="Ej: Perfil de Aluminio Serie 20 (3m), Broca 1/4, Vinil Blanco..."
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
              />
            </div>

            {/* Categoría y Código */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Categoría <span className="text-red-500">*</span>
                </label>
                {customCategoria ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                      placeholder="Escribe la nueva categoría..."
                      value={form.categoria}
                      onChange={(e) => set('categoria', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomCategoria(false);
                        set('categoria', DEFAULT_CATEGORIAS[0]);
                      }}
                      className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                      title="Volver a la lista"
                    >
                      Lista
                    </button>
                  </div>
                ) : (
                  <select
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs cursor-pointer"
                    value={form.categoria}
                    onChange={(e) => handleCategoriaChange(e.target.value)}
                  >
                    {availableCategorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Nueva categoría personalizada...</option>
                  </select>
                )}
              </div>

              {/* Código Autogenerado y Editable */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Código de Producto <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Autogenerar nuevo código correlativo"
                  >
                    <RefreshCw size={11} /> Autogenerar
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-xl text-sm font-bold tracking-wide transition-all shadow-xs ${
                      duplicateItem
                        ? 'border-red-400 bg-red-50/30 text-red-700 focus:ring-2 focus:ring-red-400/20 focus:border-red-500'
                        : 'border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="Ej: PRD-001, MAT-025"
                    value={form.codigo}
                    onChange={(e) => set('codigo', e.target.value.toUpperCase())}
                  />
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {duplicateItem ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : form.codigo ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : null}
                  </div>
                </div>
                {duplicateItem && (
                  <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                    <span>⚠️ Código en uso por: <strong>{duplicateItem.nombre}</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Unidad de Medida, Stock Inicial y Stock Mínimo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Unidad de Medida */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs cursor-pointer"
                  value={form.unidadMedidaId || form.unidadMedida}
                  onChange={(e) => handleUnidadChange(e.target.value)}
                >
                  {allUnidades.map((u) => (
                    <option key={u.id || u.nombre} value={u.id || u.nombre}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Inicial / Actual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Stock Actual <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  placeholder="0"
                  value={form.stockActual}
                  onChange={(e) => set('stockActual', e.target.value)}
                />
              </div>

              {/* Stock Mínimo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Stock Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  placeholder="0"
                  value={form.stockMinimo}
                  onChange={(e) => set('stockMinimo', e.target.value)}
                />
              </div>
            </div>

            {/* Costo / Precio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Costo / Precio Unitario ($)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                    placeholder="0.00"
                    value={form.precioCosto}
                    onChange={(e) => set('precioCosto', e.target.value)}
                  />
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Opcional: Marca / Fabricante */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Marca / Fabricante (Opcional)
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  placeholder="Ej: Stanley, 3M, Bosch..."
                  value={form.marca}
                  onChange={(e) => set('marca', e.target.value)}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2.5">
                {!isEdit && (
                  <button
                    type="button"
                    disabled={saving || !!duplicateItem}
                    onClick={(e) => handleSubmit(e, true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-blue-200 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    Guardar y agregar otro
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || !!duplicateItem}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-sm bg-[#0b2d64] hover:bg-[#071f45] cursor-pointer shadow-blue-950/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isEdit ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
