import React, { useEffect, useState, useRef } from 'react';
import {
  ImageIcon,
  RotateCcw,
  Upload,
  Phone,
  MessageSquare,
  Save,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  LayoutGrid,
  Tag,
  Share2,
  Globe,
} from 'lucide-react';
import {
  getLandingImageOverrides,
  resetLandingImage,
  uploadLandingImage,
  getWhatsappConfig,
  updateWhatsappConfig,
  getSocialConfig,
  updateSocialConfig,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  addCategoryImage,
  deleteCategoryImage,
  updateCategoryImage,
} from '../../application/landingConfigService';
import {
  LANDING_IMAGE_SECTIONS,
  mergeLandingImageOverrides,
} from '../../application/landingImageDefaults';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
  .lcp-root { color: #0f172a; }

  /* Cards */
  .lcp-section { background: white; border: 1px solid #f3f4f6; border-radius: 0.75rem; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
  .lcp-section-title { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 4px; }
  .lcp-section-desc { color: #64748b; font-size: 13px; margin: 0 0 18px; }

  /* Hero Image Grid */
  .lcp-img-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 640px) { .lcp-img-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .lcp-img-grid { grid-template-columns: repeat(4, 1fr); } }
  .lcp-img-card { border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background: #f8fafc; }
  .lcp-img-preview { position: relative; aspect-ratio: 16/10; background: #e2e8f0; overflow: hidden; }
  .lcp-img-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lcp-img-badge {
    position: absolute; top: 8px; right: 8px;
    background: rgba(15,23,42,.75); color: white;
    font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em;
  }
  .lcp-img-body { padding: 12px; }
  .lcp-img-label { font-size: 12px; font-weight: 700; color: #334155; margin: 0 0 10px; }
  .lcp-img-actions { display: flex; gap: 6px; }

  /* Buttons */
  .lcp-btn {
    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
    border-radius: 9px; padding: 7px 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .2s; border: none;
  }
  .lcp-btn-primary { background: #2563eb; color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .lcp-btn-primary:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,.25); }
  .lcp-btn-outline { background: white; color: #64748b; border: 1px solid #cbd5e1; }
  .lcp-btn-outline:hover:not(:disabled) { color: #ef4444; border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.05); }
  .lcp-btn-danger { background: rgba(239,68,68,.1); color: #dc2626; border: 1px solid rgba(239,68,68,.2); }
  .lcp-btn-danger:hover:not(:disabled) { background: #ef4444; color: white; }
  .lcp-btn-green { background: linear-gradient(135deg, #059669, #047857); color: white; }
  .lcp-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  .lcp-file-input { display: none; }

  /* WhatsApp form */
  .lcp-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .lcp-label { font-size: 13px; font-weight: 700; color: #374151; display: flex; align-items: center; gap: 6px; }
  .lcp-input, .lcp-textarea {
    border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;
    font-size: 14px; color: #0f172a; font-family: 'Inter', sans-serif;
    transition: border-color .2s, box-shadow .2s; outline: none; background: #f8fafc;
  }
  .lcp-input:focus, .lcp-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); background: white; }
  .lcp-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
  .lcp-wa-preview { 
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px;
    font-size: 13px; color: #166534; margin-top: 4px;
  }

  /* Categories */
  .lcp-cat-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
  .lcp-cat-list { display: flex; flex-direction: column; gap: 16px; }
  .lcp-cat-card { border: 1.5px solid #e2e8f0; border-radius: 16px; background: white; overflow: hidden; }
  .lcp-cat-card-header {
    display: flex; align-items: center; gap: 10px; padding: 14px 18px;
    background: linear-gradient(135deg, #fafafa, #f1f5f9); border-bottom: 1px solid #e2e8f0; cursor: pointer;
  }
  .lcp-cat-name { font-size: 15px; font-weight: 700; color: #1e293b; flex: 1; }
  .lcp-cat-slug { font-size: 11px; color: #94a3b8; font-family: monospace; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
  .lcp-cat-count { font-size: 11px; font-weight: 700; color: #2563eb; background: rgba(37,99,235,.1); padding: 3px 9px; border-radius: 999px; }
  .lcp-cat-images { padding: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .lcp-cat-img-card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #f8fafc; position: relative; }
  .lcp-cat-img-thumb { aspect-ratio: 4/3; overflow: hidden; background: #e2e8f0; }
  .lcp-cat-img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lcp-cat-img-meta { padding: 8px 10px; }
  .lcp-cat-img-title { font-size: 11px; font-weight: 700; color: #334155; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lcp-cat-img-desc { font-size: 10px; color: #94a3b8; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lcp-cat-img-remove {
    position: absolute; top: 6px; right: 6px;
    background: rgba(239,68,68,.9); color: white; border: none; border-radius: 999px;
    width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; opacity: 0; transition: opacity .2s;
  }
  .lcp-cat-img-card:hover .lcp-cat-img-remove { opacity: 1; }
  .lcp-cat-img-add {
    aspect-ratio: 4/3; border: 2px dashed #cbd5e1; border-radius: 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; color: #94a3b8; gap: 6px; font-size: 12px; font-weight: 600;
    transition: all .2s; background: #f8fafc;
  }
  .lcp-cat-img-add:hover { border-color: #2563eb; color: #2563eb; background: rgba(37,99,235,.03); }
  .lcp-cat-img-add.disabled { cursor: not-allowed; opacity: .5; }
  .lcp-cat-actions { display: flex; gap: 6px; padding: 0 18px 14px; }

  /* Inline edit */
  .lcp-inline-input {
    border: 1.5px solid #2563eb; border-radius: 8px; padding: 4px 10px;
    font-size: 14px; font-weight: 700; color: #1e293b; font-family: 'Inter', sans-serif;
    outline: none; background: white; flex: 1; min-width: 0;
  }
  .lcp-inline-btns { display: flex; gap: 4px; }
  .lcp-inline-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px; border: none; cursor: pointer; transition: all .2s;
  }
  .lcp-inline-btn.save { background: #059669; color: white; }
  .lcp-inline-btn.cancel { background: #f1f5f9; color: #64748b; }

  /* Create category form */
  .lcp-create-form { 
    padding: 18px; background: #fafafa; border: 1.5px dashed #cbd5e1; border-radius: 14px; margin-bottom: 20px;
  }
  .lcp-create-form-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .lcp-create-form-row .lcp-input { flex: 1; min-width: 160px; }
  
  /* Active badge */
  .lcp-badge-active { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .lcp-badge-active.on { background: rgba(5,150,105,.12); color: #059669; }
  .lcp-badge-active.off { background: rgba(100,116,139,.1); color: #64748b; }

  /* Loading */
  .lcp-loading { padding: 60px; text-align: center; color: #94a3b8; font-size: 14px; }

  /* Image meta edit modal */
  .lcp-img-edit-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,.5); backdrop-filter: blur(4px);
    z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .lcp-img-edit-modal {
    background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 480px;
    box-shadow: 0 25px 60px rgba(15,23,42,.2);
  }
  .lcp-img-edit-title { font-size: 18px; font-weight: 800; margin: 0 0 20px; color: #1e293b; }
`;

// ─── Sub-components ────────────────────────────────────────────────────────────

function HeroTab({ overrides, setOverrides, mergedImages, setMergedImages }) {
  const [uploadingKey, setUploadingKey] = useState(null);

  const handleUpload = async (section, item, file) => {
    if (!file) return;
    const key = `${section}:${item.id}`;
    setUploadingKey(key);
    try {
      const result = await uploadLandingImage(section, item.id, file);
      setOverrides(result.overrides);
      setMergedImages(mergeLandingImageOverrides(result.overrides));
      toast.success(`Imagen "${item.label}" actualizada`);
    } catch (err) {
      toast.error(err.message || 'Error al subir imagen');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleReset = async (section, item) => {
    const confirmed = await confirmDialog(
      '¿Restaurar imagen?',
      `Se usará la imagen predeterminada de "${item.label}".`,
      { confirmLabel: 'Restaurar', cancelLabel: 'Cancelar', type: 'warning' }
    );
    if (!confirmed) return;
    const key = `${section}:${item.id}`;
    setUploadingKey(key);
    try {
      const result = await resetLandingImage(section, item.id);
      setOverrides(result.overrides);
      setMergedImages(mergeLandingImageOverrides(result.overrides));
      toast.success(`Imagen "${item.label}" restaurada`);
    } catch (err) {
      toast.error(err.message || 'Error al restaurar');
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <>
      {LANDING_IMAGE_SECTIONS.map((section) => (
        <div key={section.key} className="lcp-section">
          <h2 className="lcp-section-title">{section.title}</h2>
          <p className="lcp-section-desc">{section.description}</p>
          <div className="lcp-img-grid">
            {section.items.map((item) => {
              const src = mergedImages[section.key]?.[item.id];
              const isCustom = Boolean(overrides?.[section.key]?.[item.id]);
              const key = `${section.key}:${item.id}`;
              const busy = uploadingKey === key;
              return (
                <article key={item.id} className="lcp-img-card">
                  <div className="lcp-img-preview">
                    {src && <img src={src} alt={item.label} />}
                    <span className="lcp-img-badge">{isCustom ? 'Personalizada' : 'Predeterminada'}</span>
                  </div>
                  <div className="lcp-img-body">
                    <p className="lcp-img-label">{item.label}</p>
                    <div className="lcp-img-actions">
                      <label className={`lcp-btn lcp-btn-primary ${busy ? 'disabled' : ''}`} style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
                        <Upload size={12} />
                        {busy ? 'Guardando...' : 'Cambiar'}
                        <input
                          type="file" accept="image/*" className="lcp-file-input" disabled={busy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(section.key, item, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button" className="lcp-btn lcp-btn-outline"
                        disabled={!isCustom || busy}
                        onClick={() => handleReset(section.key, item)}
                      >
                        <RotateCcw size={12} /> Restaurar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function SocialTab({ waConfig, setWaConfig, socialConfig, setSocialConfig }) {
  const [phone, setPhone] = useState(waConfig.phone || '');
  const [message, setMessage] = useState(waConfig.message || '');
  const [facebook, setFacebook] = useState(socialConfig.facebook || '');
  const [instagram, setInstagram] = useState(socialConfig.instagram || '');
  const [tiktok, setTiktok] = useState(socialConfig.tiktok || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhone(waConfig.phone || '');
    setMessage(waConfig.message || '');
  }, [waConfig]);

  useEffect(() => {
    setFacebook(socialConfig.facebook || '');
    setInstagram(socialConfig.instagram || '');
    setTiktok(socialConfig.tiktok || '');
  }, [socialConfig]);

  const handleSave = async () => {
    if (!phone.trim()) return toast.error('El número de WhatsApp es requerido');
    if (!/^\d{7,15}$/.test(phone.trim())) return toast.error('Número de WhatsApp inválido (solo dígitos, 7-15 caracteres)');
    setSaving(true);
    try {
      const [savedWa, savedSocial] = await Promise.all([
        updateWhatsappConfig(phone.trim(), message.trim()),
        updateSocialConfig(facebook.trim(), instagram.trim(), tiktok.trim()),
      ]);
      setWaConfig(savedWa);
      setSocialConfig(savedSocial);
      toast.success('Configuración de redes sociales y WhatsApp guardada');
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sección WhatsApp */}
      <div className="lcp-section">
        <h2 className="lcp-section-title">WhatsApp de Contacto</h2>
        <p className="lcp-section-desc">
          Número y mensaje que aparecerán en el botón flotante y en los botones de cotización del sitio.
        </p>

        <div className="lcp-form-group">
          <label className="lcp-label">
            <Phone size={14} /> Número de WhatsApp
          </label>
          <input
            type="text" className="lcp-input"
            placeholder="Ej: 593968982380 (solo dígitos con código de país)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={15}
          />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Incluye el código de país sin el + (ej: 593 para Ecuador)</span>
        </div>

        <div className="lcp-form-group">
          <label className="lcp-label">
            <MessageSquare size={14} /> Mensaje predeterminado
          </label>
          <textarea
            className="lcp-textarea"
            placeholder="Hola, me interesa conocer más sobre sus servicios..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        {phone && (
          <div className="lcp-wa-preview">
            <Phone size={15} />
            <span>
              Vista previa del enlace:{' '}
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#166534', fontWeight: 600 }}>
                wa.me/{phone}
              </a>
            </span>
          </div>
        )}
      </div>

      {/* Sección Redes Sociales */}
      <div className="lcp-section">
        <h2 className="lcp-section-title">Redes Sociales (Pie de página)</h2>
        <p className="lcp-section-desc">
          Enlaces a las perfiles oficiales que se mostrarán en los íconos del pie de página del landing page.
        </p>

        <div className="lcp-form-group">
          <label className="lcp-label">
            <Globe size={14} /> Facebook URL
          </label>
          <input
            type="url" className="lcp-input"
            placeholder="https://www.facebook.com/tupagina"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
        </div>

        <div className="lcp-form-group">
          <label className="lcp-label">
            <Globe size={14} /> Instagram URL
          </label>
          <input
            type="url" className="lcp-input"
            placeholder="https://www.instagram.com/tuperfil"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>

        <div className="lcp-form-group">
          <label className="lcp-label">
            <Globe size={14} /> TikTok URL
          </label>
          <input
            type="url" className="lcp-input"
            placeholder="https://www.tiktok.com/@tuperfil"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
          />
        </div>
      </div>

      <div>
        <button type="button" className="lcp-btn lcp-btn-primary" style={{ flex: 'none', width: 'auto', padding: '10px 24px' }} onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar todas las configuraciones'}
        </button>
      </div>
    </div>
  );
}

function ImageMetaModal({ image, onSave, onClose }) {
  const [title, setTitle] = useState(image?.title || '');
  const [description, setDescription] = useState(image?.description || '');
  const [tagsInput, setTagsInput] = useState((image?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await onSave(image.id, { title, description, tags });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lcp-img-edit-overlay" onClick={onClose}>
      <div className="lcp-img-edit-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="lcp-img-edit-title" style={{ margin: 0 }}>Editar metadatos de imagen</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <img src={image.imageUrl} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
        </div>
        <div className="lcp-form-group">
          <label className="lcp-label">Título del producto</label>
          <input type="text" className="lcp-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Letrero 3D Retroiluminado" />
        </div>
        <div className="lcp-form-group">
          <label className="lcp-label">Descripción</label>
          <textarea className="lcp-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve del producto..." rows={3} />
        </div>
        <div className="lcp-form-group">
          <label className="lcp-label"><Tag size={13} /> Etiquetas (separadas por coma)</label>
          <input type="text" className="lcp-input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="LED, Exterior, Acrílico" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="lcp-btn lcp-btn-outline" style={{ flex: 'none' }} onClick={onClose}>Cancelar</button>
          <button type="button" className="lcp-btn lcp-btn-primary" style={{ flex: 'none', padding: '8px 20px' }} onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoriesTab({ categories, setCategories }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [uploadingCatId, setUploadingCatId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editImageMeta, setEditImageMeta] = useState(null);
  const fileInputsRef = useRef({});

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('El nombre es requerido');
    setSaving(true);
    try {
      const cat = await createCategory({ name: newName.trim(), slug: newSlug.trim() || undefined });
      setCategories(prev => [...prev, cat]);
      setNewName(''); setNewSlug(''); setCreating(false);
      toast.success('Categoría creada');
    } catch (err) {
      toast.error(err.message || 'Error al crear categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (id) => {
    if (!editName.trim()) return toast.error('El nombre es requerido');
    try {
      const updated = await updateCategory(id, { name: editName.trim() });
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
      setEditingId(null);
      toast.success('Categoría actualizada');
    } catch (err) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      const updated = await updateCategory(cat.id, { active: !cat.active });
      setCategories(prev => prev.map(c => c.id === cat.id ? updated : c));
    } catch (err) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (cat) => {
    const confirmed = await confirmDialog(
      '¿Eliminar categoría?',
      `Se eliminará "${cat.name}" y todas sus imágenes permanentemente.`,
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast.success('Categoría eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleAddImage = async (catId, file) => {
    setUploadingCatId(catId);
    try {
      const img = await addCategoryImage(catId, file);
      setCategories(prev =>
        prev.map(c =>
          c.id === catId ? { ...c, images: [...(c.images || []), img] } : c
        )
      );
      toast.success('Imagen agregada');
    } catch (err) {
      toast.error(err.message || 'Error al subir imagen');
    } finally {
      setUploadingCatId(null);
    }
  };

  const handleDeleteImage = async (catId, imageId) => {
    const confirmed = await confirmDialog('¿Eliminar imagen?', 'Se eliminará permanentemente.', {
      confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteCategoryImage(imageId);
      setCategories(prev =>
        prev.map(c =>
          c.id === catId ? { ...c, images: c.images.filter(i => i.id !== imageId) } : c
        )
      );
      toast.success('Imagen eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar imagen');
    }
  };

  const handleSaveImageMeta = async (imageId, data) => {
    const updated = await updateCategoryImage(imageId, data);
    const catId = categories.find(c => c.images.some(i => i.id === imageId))?.id;
    if (catId) {
      setCategories(prev =>
        prev.map(c =>
          c.id === catId
            ? { ...c, images: c.images.map(i => i.id === imageId ? { ...i, ...updated, tags: data.tags } : i) }
            : c
        )
      );
    }
    toast.success('Metadatos actualizados');
  };

  return (
    <>
      {/* Toolbar */}
      <div className="lcp-cat-toolbar">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Categorías del catálogo</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Máximo 6 imágenes por categoría. Las categorías aparecerán en el catálogo de la landing.
          </p>
        </div>
        {!creating && (
          <button type="button" className="lcp-btn lcp-btn-primary" style={{ flex: 'none', padding: '10px 18px' }} onClick={() => setCreating(true)}>
            <Plus size={14} /> Nueva categoría
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="lcp-create-form">
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>Nueva categoría</p>
          <div className="lcp-create-form-row">
            <input
              type="text" className="lcp-input"
              placeholder="Nombre de la categoría *"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
              }}
            />
            <input
              type="text" className="lcp-input"
              placeholder="Slug (auto-generado)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="lcp-btn lcp-btn-primary" style={{ flex: 'none', padding: '8px 20px' }} onClick={handleCreate} disabled={saving}>
              <Check size={13} /> {saving ? 'Creando...' : 'Crear'}
            </button>
            <button type="button" className="lcp-btn lcp-btn-outline" style={{ flex: 'none' }} onClick={() => { setCreating(false); setNewName(''); setNewSlug(''); }}>
              <X size={13} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 && !creating ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <LayoutGrid size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No hay categorías creadas</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Crea la primera para organizar el catálogo</p>
        </div>
      ) : (
        <div className="lcp-cat-list">
          {categories.map((cat) => {
            const isExpanded = expandedId === cat.id;
            const imgCount = cat.images?.length ?? 0;
            const canAddMore = imgCount < 6;
            const isUploadingThis = uploadingCatId === cat.id;
            const isEditing = editingId === cat.id;

            return (
              <div key={cat.id} className="lcp-cat-card">
                <div className="lcp-cat-card-header" onClick={() => setExpandedId(isExpanded ? null : cat.id)}>
                  {isEditing ? (
                    <>
                      <input
                        type="text" className="lcp-inline-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(cat.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <div className="lcp-inline-btns" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="lcp-inline-btn save" onClick={() => handleEditSave(cat.id)}><Check size={13} /></button>
                        <button type="button" className="lcp-inline-btn cancel" onClick={() => setEditingId(null)}><X size={13} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="lcp-cat-name">{cat.name}</span>
                      <span className="lcp-cat-slug">{cat.slug}</span>
                      <span className={`lcp-badge-active ${cat.active ? 'on' : 'off'}`}>{cat.active ? 'Activa' : 'Oculta'}</span>
                      <span className="lcp-cat-count">{imgCount}/6</span>
                      <svg style={{ transform: isExpanded ? 'rotate(180deg)' : '', transition: 'transform .2s', marginLeft: 4, color: '#94a3b8' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </>
                  )}
                </div>

                {isExpanded && (
                  <>
                    <div className="lcp-cat-images">
                      {(cat.images || []).map((img) => (
                        <div key={img.id} className="lcp-cat-img-card">
                          <div className="lcp-cat-img-thumb">
                            <img src={img.imageUrl} alt={img.title || 'Imagen'} />
                          </div>
                          <div className="lcp-cat-img-meta">
                            <p className="lcp-cat-img-title">{img.title || <em style={{ opacity: .5 }}>Sin título</em>}</p>
                            <p className="lcp-cat-img-desc">{img.description || <em style={{ opacity: .5 }}>Sin descripción</em>}</p>
                            {(img.tags?.length > 0) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                                {img.tags.map((t, i) => (
                                  <span key={i} style={{ fontSize: 9, background: 'rgba(37,99,235,.1)', color: '#2563eb', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, padding: '0 8px 8px' }}>
                            <button type="button" onClick={() => setEditImageMeta(img)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#f1f5f9', border: 'none', borderRadius: 7, padding: '5px', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>
                              <Pencil size={10} /> Editar
                            </button>
                            <button type="button" onClick={() => handleDeleteImage(cat.id, img.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(239,68,68,.08)', border: 'none', borderRadius: 7, padding: '5px', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: '#dc2626' }}>
                              <Trash2 size={10} /> Eliminar
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add image slot */}
                      <label className={`lcp-cat-img-add ${!canAddMore || isUploadingThis ? 'disabled' : ''}`}>
                        {isUploadingThis ? (
                          <span style={{ fontSize: 12, color: '#2563eb' }}>Subiendo...</span>
                        ) : canAddMore ? (
                          <>
                            <Upload size={20} strokeWidth={1.5} />
                            <span>Agregar imagen</span>
                            <span style={{ fontSize: 10, color: '#b0bec5' }}>{6 - imgCount} disponibles</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={20} strokeWidth={1.5} />
                            <span>Límite alcanzado</span>
                          </>
                        )}
                        <input
                          type="file" accept="image/*" className="lcp-file-input"
                          disabled={!canAddMore || isUploadingThis}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAddImage(cat.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div className="lcp-cat-actions">
                      <button type="button" className="lcp-btn lcp-btn-outline" style={{ flex: 'none', fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); setExpandedId(cat.id); }}>
                        <Pencil size={12} /> Renombrar
                      </button>
                      <button type="button" className="lcp-btn lcp-btn-outline" style={{ flex: 'none', fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(cat); }}>
                        {cat.active ? <><X size={12} /> Ocultar</> : <><Check size={12} /> Activar</>}
                      </button>
                      <button type="button" className="lcp-btn lcp-btn-danger" style={{ flex: 'none', fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(cat); }}>
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editImageMeta && (
        <ImageMetaModal
          image={editImageMeta}
          onSave={handleSaveImageMeta}
          onClose={() => setEditImageMeta(null)}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const LandingConfigPage = () => {
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState({});
  const [mergedImages, setMergedImages] = useState(() => mergeLandingImageOverrides());
  const [waConfig, setWaConfig] = useState({ phone: '', message: '' });
  const [socialConfig, setSocialConfig] = useState({ facebook: '', instagram: '', tiktok: '' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [imgData, waData, socialData, catData] = await Promise.all([
          getLandingImageOverrides(),
          getWhatsappConfig(),
          getSocialConfig(),
          getCategories(),
        ]);
        setOverrides(imgData);
        setMergedImages(mergeLandingImageOverrides(imgData));
        setWaConfig(waData);
        setSocialConfig(socialData);
        setCategories(catData);
      } catch (err) {
        toast.error(err.message || 'Error al cargar configuración');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tabs = [
    { key: 'hero', label: 'Carrusel Hero', Icon: ImageIcon },
    { key: 'social', label: 'Redes Sociales', Icon: Share2 },
    { key: 'categories', label: 'Categorías', Icon: LayoutGrid },
  ];

  return (
    <div className="lcp-root space-y-3 sm:space-y-5 animate-slide-up pb-10 w-full" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{S}</style>

      <ComprasPageHeader
        icon={Globe}
        badge="CONFIG"
        title="Landing Page"
        subtitle="Gestiona el contenido público del sitio: carrusel principal, redes sociales, WhatsApp y catálogo de productos."
      />

      <div className="flex items-center justify-start gap-1.5 overflow-x-auto no-scrollbar w-full min-w-0">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === key
                ? 'bg-blue-900 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-card'
            }`}
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="lcp-loading">Cargando configuración del landing...</div>
      ) : (
        <>
          {activeTab === 'hero' && (
            <HeroTab overrides={overrides} setOverrides={setOverrides} mergedImages={mergedImages} setMergedImages={setMergedImages} />
          )}
          {activeTab === 'social' && (
            <SocialTab waConfig={waConfig} setWaConfig={setWaConfig} socialConfig={socialConfig} setSocialConfig={setSocialConfig} />
          )}
          {activeTab === 'categories' && (
            <CategoriesTab categories={categories} setCategories={setCategories} />
          )}
        </>
      )}
    </div>
  );
};
