import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getInventarioCategoriaPorRol } from '../application/inventarioService.js';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';

export function NuevoProductoModal({ unidades = [], lockedCategory, onClose, onSave }) {
  const defaultUnit = unidades.find((u) => u.nombre.toLowerCase() === 'metros') || unidades[0];

  const [form, setForm] = useState({
    nombre: '',
    stockActual: '',
    stockMinimo: 0,
    precioCosto: '',
    unidadMedidaId: defaultUnit?.id || '',
    unidadMedida: defaultUnit?.nombre || 'metros',
    categoria: lockedCategory || 'Taller',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const cantidad = parseFloat(form.stockActual);
    if (!cantidad || cantidad < 0) return;

    setSaving(true);
    try {
      await onSave({
        nombre: form.nombre.trim(),
        tipo: 'consumible',
        stockActual: cantidad,
        stockMinimo: Number(form.stockMinimo) || 0,
        precioCosto: parseFloat(form.precioCosto) || 0,
        unidadMedidaId: form.unidadMedidaId,
        unidadMedida: form.unidadMedida,
        categoria: lockedCategory || form.categoria,
      });
    } finally {
      setSaving(false);
    }
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const showCategoria = !getInventarioCategoriaPorRol(user);
  const handleClose = () => deferClose(onClose);

  return (
    <ModalPortal>
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="inv-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="inv-modal-header">
            <h3>Nuevo producto</h3>
            <button type="button" className="inv-close" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="inv-modal-body">
            <label>Nombre del producto *
              <input
                required
                autoFocus
                placeholder="Ej: Vinilo laminación mate 1,2 m"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
              />
            </label>

            <div className="inv-row">
              <label>Cantidad en stock *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0"
                  value={form.stockActual}
                  onChange={(e) => set('stockActual', e.target.value)}
                />
              </label>
              <label>Unidad de medida *
                <select
                  required
                  value={form.unidadMedidaId || ''}
                  onChange={(e) => {
                    const selected = unidades.find((u) => u.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      unidadMedidaId: e.target.value,
                      unidadMedida: selected?.nombre || '',
                    }));
                  }}
                >
                  <option value="" disabled>Seleccionar unidad</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.abreviacion ? `(${u.abreviacion})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inv-row">
              <label>Stock mínimo
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stockMinimo}
                  onChange={(e) => set('stockMinimo', e.target.value)}
                />
              </label>
              <label>Precio costo ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.precioCosto}
                  onChange={(e) => set('precioCosto', e.target.value)}
                />
              </label>
            </div>

            {showCategoria && (
              <label>Categoría *
                <select
                  value={form.categoria}
                  onChange={(e) => set('categoria', e.target.value)}
                >
                  <option value="Taller">Taller</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Impresión">Impresión</option>
                </select>
              </label>
            )}

            <div className="inv-modal-footer">
              <button type="button" className="inv-btn-ghost" onClick={handleClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="inv-btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Crear producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
