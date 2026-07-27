import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLandingConfig } from '../../../landing-config/application/useLandingImages';
import { ArrowLeft, X, MessageCircle, ChevronLeft, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { WhatsAppFloat } from './WhatsAppFloat';
import './CategoryDetailPage.css';

const ITEMS_PER_PAGE = 12;

export const CategoryDetailPage = () => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const { categories, whatsapp } = useLandingConfig();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);

  // Find target category
  const category = useMemo(() => {
    return categories.find((c) => c.slug === categorySlug);
  }, [categories, categorySlug]);

  const allImages = useMemo(() => {
    if (!category) return [];
    return (category.images || []).map((img) => ({
      ...img,
      categoryName: category.name,
      categorySlug: category.slug,
    }));
  }, [category]);

  // Pagination calculations
  const totalPages = Math.ceil(allImages.length / ITEMS_PER_PAGE) || 1;

  const paginatedImages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allImages.slice(start, start + ITEMS_PER_PAGE);
  }, [allImages, currentPage]);

  const waPhone = whatsapp?.phone || '593968982380';

  const getWaLinkForItem = (item) => {
    const itemTitle = item?.title ? `"${item.title}"` : 'este trabajo';
    const msg = `Hola! Me interesa solicitar una cotización basada en ${itemTitle} de la categoría "${category?.name || ''}".`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (!category && categories.length > 0) {
    return (
      <div className="cat-detail-not-found">
        <h2>Categoría no encontrada</h2>
        <p>La categoría que estás buscando no existe o fue desactivada.</p>
        <button type="button" className="cat-detail-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="cat-detail-container">
      {/* HEADER */}
      <header className="cat-detail-header">
        <div className="cat-detail-header-inner">
          <Link to="/" className="cat-detail-logo-link">
            <img src="/LogoGlobo.png" alt="Luxes" className="cat-detail-logo" />
            <div className="cat-detail-logo-text">
              <span className="cat-detail-brand">LUXES</span>
              <span className="cat-detail-sub">DISEÑO Y PUBLICIDAD</span>
            </div>
          </Link>

          <div className="cat-detail-header-actions">
            <button type="button" className="cat-detail-btn-ghost" onClick={() => navigate('/')}>
              <ArrowLeft size={16} /> Volver al inicio
            </button>
            <button type="button" className="cat-detail-btn-login" onClick={() => navigate('/login')}>
              Iniciar sesión
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION FOR CATEGORY */}
      <section className="cat-detail-hero">
        <div className="cat-detail-hero-content">
          <div className="cat-detail-breadcrumb">
            <Link to="/">Inicio</Link>
            <span>/</span>
            <Link to="/#catalogo">Catálogo</Link>
            <span>/</span>
            <span className="current">{category?.name || 'Cargando...'}</span>
          </div>

          <div className="cat-detail-hero-header">
            <div>
              <h1 className="cat-detail-title">{category?.name}</h1>
              <p className="cat-detail-subtitle">
                Explora nuestros trabajos y proyectos realizados en la categoría de {category?.name}. Diseños de alta calidad listos para personalizar según la visión de tu marca.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN GALLERY GRID */}
      <main className="cat-detail-main">
        {allImages.length === 0 ? (
          <div className="cat-detail-empty">
            <Sparkles size={48} className="empty-icon" />
            <h3>Próximamente más proyectos</h3>
            <p>No hay proyectos registrados en esta categoría por el momento.</p>
          </div>
        ) : (
          <>
            <div className="cat-detail-grid">
              {paginatedImages.map((img) => (
                <div
                  key={img.id}
                  className="cat-detail-card"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className="cat-card-img-wrapper">
                    <img src={img.imageUrl} alt={img.title || category?.name} loading="lazy" />
                    <div className="cat-card-overlay">
                      <span className="cat-card-zoom-badge">Ver imagen</span>
                    </div>
                  </div>

                  {((img.title && img.title.trim() && img.title.trim().toLowerCase() !== category?.name?.toLowerCase()) || img.description || (Array.isArray(img.tags) && img.tags.length > 0)) && (
                    <div className="cat-card-info">
                      {img.title && img.title.trim() && img.title.trim().toLowerCase() !== category?.name?.toLowerCase() && (
                        <h4 className="cat-card-item-title">{img.title}</h4>
                      )}
                      {img.description && (
                        <p className="cat-card-item-desc">{img.description}</p>
                      )}
                      {Array.isArray(img.tags) && img.tags.length > 0 && (
                        <div className="cat-card-item-tags">
                          {img.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="cat-tag-pill">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="cat-detail-pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={18} /> Anterior
                </button>

                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`pagination-num ${page === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* MINIMALIST LIGHTBOX IMAGE VIEWER */}
      {selectedImage && (
        <div className="cat-lightbox-backdrop" onClick={() => setSelectedImage(null)}>
          <div className="cat-lightbox-clean-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cat-lightbox-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>

            <div className="cat-lightbox-clean-media">
              <img src={selectedImage.imageUrl} alt={selectedImage.title || category?.name} />
            </div>

            {selectedImage.title && selectedImage.title.trim() && selectedImage.title.trim().toLowerCase() !== category?.name?.toLowerCase() && (
              <div className="cat-lightbox-clean-caption">
                <h3>{selectedImage.title}</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING WHATSAPP BUTTON */}
      <WhatsAppFloat />

      {/* FOOTER */}
      <footer className="cat-detail-footer">
        <p>© {new Date().getFullYear()} LUXES Diseño y Publicidad. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
