// src/features/auth/infrastructure/ui/LandingPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Award, Headphones, ArrowRight, PhoneCall,
  MapPin, Phone, Sparkles, ChevronLeft, ChevronRight, Layers, Eye
} from 'lucide-react';
import { WhatsAppFloat } from './WhatsAppFloat';
import { ALUX_DATA } from './aluxLandingData';
import { useLandingConfig } from '../../../landing-config/application/useLandingImages.js';
import { HERO_DEFAULT_IMAGES } from '../../../landing-config/application/landingImageDefaults.js';
import aluxLogoHQ from '../../../../assets/aluxLogoHQ.png';
import './LandingPage.css';

const CategoryProductCard = ({ prod, waPhone }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const images = prod.images || [];
  const hasMultiple = images.length > 1;

  // Auto-carrusel suave si hay más de 1 foto
  useEffect(() => {
    if (!hasMultiple || isHovered) return;
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [hasMultiple, isHovered, images.length]);

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };

  const currentImgObj = images[currentImgIndex] || {};
  const currentImgUrl = currentImgObj.imageUrl || currentImgObj.url || (typeof currentImgObj === 'string' ? currentImgObj : 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80');
  const itemWa = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ALUX, me interesa cotizar soluciones en ${prod.nombre}.`)}`;

  return (
    <div 
      className="alux-nestoria-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="alux-card-image-wrap">
        <img
          src={currentImgUrl}
          alt={`${prod.nombre} - ${currentImgIndex + 1}`}
          className="alux-card-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <span className={`alux-card-tag-badge ${prod.tagType}`}>
          {prod.tag || 'A Medida'}
        </span>

        {/* Indicador de cantidad de fotos */}
        {hasMultiple && (
          <span className="alux-card-count-badge">
            <Layers size={11} />
            <span>{currentImgIndex + 1}/{images.length}</span>
          </span>
        )}

        {/* Flechas de navegación en el carrusel de la tarjeta */}
        {hasMultiple && (
          <div className="alux-card-carousel-controls">
            <button
              type="button"
              className="alux-card-arrow left"
              onClick={prevImage}
              aria-label="Foto anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="alux-card-arrow right"
              onClick={nextImage}
              aria-label="Siguiente foto"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Puntos indicadores inferiores */}
        {hasMultiple && (
          <div className="alux-card-img-dots">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`alux-card-img-dot ${idx === currentImgIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentImgIndex(idx);
                }}
                aria-label={`Ver foto ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="alux-card-body">
        <span className="alux-card-category">{prod.categoria}</span>
        <h3 className="alux-card-title">{prod.nombre}</h3>
        <p className="alux-card-desc">{prod.desc}</p>

        <div className="alux-card-footer">
          <div className="alux-card-meta">
            <span className="alux-card-meta-label">Fabricación</span>
            <span className="alux-card-meta-val">A Medida</span>
          </div>

          <div className="alux-card-actions">
            <Link
              to={`/catalogo/${prod.categorySlug}`}
              className="alux-btn-card-more"
              title={`Ver todas las fotos de ${prod.nombre}`}
            >
              <span>Ver más</span>
              <Eye size={13} />
            </Link>

            <a
              href={itemWa}
              target="_blank"
              rel="noopener noreferrer"
              className="alux-btn-card-quote"
            >
              <span>Cotizar</span>
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const { images, whatsapp, social, categories, loading } = useLandingConfig();
  const [activeCategory, setActiveCategory] = useState('todos');

  // Hero carousel slides derived dynamically from backend configuration
  const heroSlides = useMemo(() => {
    return [
      {
        url: images?.hero?.['hero-1'] || HERO_DEFAULT_IMAGES['hero-1'],
        alt: 'Fachada Residencial en Vidrio y Aluminio ALUX',
      },
      {
        url: images?.hero?.['hero-2'] || HERO_DEFAULT_IMAGES['hero-2'],
        alt: 'Ventanería Moderna y Pérgolas de Aluminio',
      },
      {
        url: images?.hero?.['hero-3'] || HERO_DEFAULT_IMAGES['hero-3'],
        alt: 'Mamparas y Cerramientos de Cristal Templado',
      },
      {
        url: images?.hero?.['hero-4'] || HERO_DEFAULT_IMAGES['hero-4'],
        alt: 'Arquitectura Comercial en Paneles Alucobond',
      },
    ];
  }, [images]);

  // Estados de Carrusel Automático
  const [heroIndex, setHeroIndex] = useState(0);

  // Temporizador para cambio automático de imágenes del hero
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const heroTimer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const waPhone = whatsapp?.phone || ALUX_DATA.whatsappPhone;
  const waDefaultMsg = whatsapp?.message || 'Hola ALUX, me interesa conocer más sobre sus servicios.';

  // ── Construir exactamente 1 tarjeta por cada categoría configurada ──
  const allCategoryCards = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories
        .filter((cat) => cat.active !== false)
        .map((cat, index) => {
          const catImages = Array.isArray(cat.images) && cat.images.length > 0
            ? cat.images.map((img) => (typeof img === 'string' ? { imageUrl: img } : img))
            : [
                {
                  imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
                  title: cat.name,
                  description: `Soluciones en ${cat.name.toLowerCase()} de alta resistencia y acabados arquitectónicos.`,
                },
              ];

          const firstImg = catImages[0] || {};
          const tag = (firstImg.tags && firstImg.tags.length > 0) ? firstImg.tags[0] : 'Diseño a Medida';

          return {
            id: cat.id,
            categoryId: cat.id,
            categorySlug: cat.slug || cat.id,
            categoria: cat.name,
            nombre: cat.name,
            desc: cat.description || firstImg.description || `Soluciones en ${cat.name.toLowerCase()} de alta resistencia y acabados arquitectónicos.`,
            images: catImages,
            totalImages: cat.images?.length || 0,
            tag,
            tagType: index % 3 === 0 ? 'featured' : index % 3 === 1 ? 'new' : 'guaranteed',
          };
        });
    }

    return ALUX_DATA.productos.map((p, index) => ({
      id: p.id,
      categoryId: p.id,
      categorySlug: p.slug,
      categoria: p.categoria || p.nombre,
      nombre: p.nombre,
      desc: p.desc,
      images: [{ imageUrl: p.image, title: p.nombre, description: p.desc }],
      totalImages: 1,
      tag: p.tag || 'Diseño a Medida',
      tagType: index % 3 === 0 ? 'featured' : index % 3 === 1 ? 'new' : 'guaranteed',
    }));
  }, [categories]);

  // List of active tabs
  const categoryTabs = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories
        .filter((c) => c.active !== false)
        .map((c) => ({ id: c.id, slug: c.slug || c.id, name: c.name }));
    }
    return ALUX_DATA.productos.map((p) => ({ id: p.id, slug: p.slug, name: p.nombre }));
  }, [categories]);

  // Filtrado de productos para la sección destacada
  const productosFiltrados = useMemo(() => {
    if (activeCategory === 'todos') return allCategoryCards;
    return allCategoryCards.filter(
      (p) => p.categoryId === activeCategory || p.categorySlug === activeCategory || p.id === activeCategory
    );
  }, [activeCategory, allCategoryCards]);

  return (
    <div className="landing-page-container">
      {/* ── HEADER MINIMALISTA FLOTANTE ── */}
      <div className="alux-header-wrapper">
        <header className="alux-header">
          <a href="#inicio" className="alux-logo-group">
            <img src={aluxLogoHQ} alt="ALUX" className="alux-header-logo-img" />
            <div className="alux-logo-text-group">
              <span className="alux-brand-title-clean">ALUX</span>
              <span className="alux-brand-tagline">ALUMINIO & VIDRIO</span>
            </div>
          </a>

          <nav className="alux-nav">
            <a href="#inicio" className="alux-nav-link active">Inicio</a>
            <a href="#productos" className="alux-nav-link">Productos</a>
            <a href="#proceso" className="alux-nav-link">El Proceso</a>
            <a href="#contacto" className="alux-nav-link">Contacto</a>
          </nav>

          <div className="alux-header-actions">
            <button
              type="button"
              className="alux-btn-login"
              onClick={() => navigate('/login')}
            >
              Iniciar Sesión
            </button>
          </div>
        </header>
      </div>

      {/* ── HERO BANNER CON CARRUSEL DE IMÁGENES AUTOMÁTICO ── */}
      <section id="inicio" className="alux-hero-wrapper">
        <div className="alux-hero-banner">
          {/* Diapositivas de fondo con transición suave */}
          {heroSlides.map((img, idx) => (
            <div
              key={idx}
              className={`alux-hero-slide ${idx === heroIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url('${img.url}')` }}
              aria-label={img.alt}
            />
          ))}

          {/* Degradado lateral sutil para contraste del texto */}
          <div className="alux-hero-backdrop" />

          {/* Contenido Principal con Sello de Marca ALUX */}
          <div className="alux-hero-content">
            <div className="alux-hero-brand-badge">
              <img 
                src={aluxLogoHQ} 
                alt="ALUX" 
                className="alux-hero-badge-logo-img" 
              />
              <div className="alux-hero-badge-text">
                <span className="alux-hero-badge-title">ALUX</span>
                <span className="alux-hero-badge-sub">CONSTRUCTORES EN ALUMINIO & VIDRIO</span>
              </div>
            </div>

            <h1 className="alux-hero-h1">
              Diseñamos Espacios
              <span className="alux-hero-h1-accent">Que Inspiran y Perduran</span>
            </h1>
            <p className="alux-hero-desc">
              Especialistas en fachadas de Alucobond (ACM), ventanería acústica y vidrio templado a medida para hogares y comercios.
            </p>

            <div className="alux-hero-actions-row">
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waDefaultMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="alux-hero-btn-primary"
              >
                <PhoneCall size={16} />
                <span>Cotizar por WhatsApp</span>
                <ArrowRight size={15} />
              </a>
              <a
                href="#productos"
                className="alux-hero-btn-secondary"
              >
                <span>Ver Productos</span>
              </a>
            </div>
          </div>

          {/* Dots / Puntos de Navegación del Carrusel Hero */}
          <div className="alux-hero-dots">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`alux-hero-dot ${idx === heroIndex ? 'active' : ''}`}
                onClick={() => setHeroIndex(idx)}
                aria-label={`Ver imagen ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── ROW OF 4 VALUE PROPOSITION CARDS (PASTEL ICONS) ── */}
      <section className="alux-value-section">
        <div className="alux-value-grid">
          <div className="alux-value-card">
            <div className="alux-value-icon-box purple">
              <Award size={20} />
            </div>
            <div>
              <h4 className="alux-value-title">Materiales Certificados</h4>
              <p className="alux-value-desc">Perfiles de aluminio extruido y vidrio templado con estándares de alta durabilidad.</p>
            </div>
          </div>

          <div className="alux-value-card">
            <div className="alux-value-icon-box blue">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="alux-value-title">Instalación Segura</h4>
              <p className="alux-value-desc">Montaje profesional, nivelado milimétrico y sellado impermeable en cada obra.</p>
            </div>
          </div>

          <div className="alux-value-card">
            <div className="alux-value-icon-box cyan">
              <Headphones size={20} />
            </div>
            <div>
              <h4 className="alux-value-title">Asesoría Técnica</h4>
              <p className="alux-value-desc">Acompañamiento personalizado y levantamiento de medidas en tu proyecto.</p>
            </div>
          </div>

          <div className="alux-value-card">
            <div className="alux-value-icon-box rose">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="alux-value-title">Garantía Directa</h4>
              <p className="alux-value-desc">Respaldo total postventa y presupuestos claros sin costos ocultos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS Y SOLUCIONES DESTACADAS (CARDS NESTORIA CONECTADAS AL BACKEND) ── */}
      <section id="productos" className="alux-featured-section">
        <div className="alux-featured-header">
          <div className="alux-featured-title-group">
            <span className="alux-section-eyebrow">CATÁLOGO SELECCIONADO</span>
            <h2>Soluciones y Productos Destacados</h2>
          </div>

          <a
            href={`https://wa.me/${waPhone}?text=${encodeURIComponent('Hola ALUX, deseo consultar sobre su catálogo completo.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="alux-view-all-link"
          >
            <span>Consultar Catálogo</span>
            <ArrowRight size={16} />
          </a>
        </div>

        {/* Pestañas de Filtro */}
        <div className="alux-category-tabs">
          <button
            onClick={() => setActiveCategory('todos')}
            className={`alux-tab-btn ${activeCategory === 'todos' ? 'active' : ''}`}
          >
            Todos los Productos
          </button>
          {categoryTabs.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`alux-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid de Tarjetas */}
        <div className="alux-cards-grid">
          {productosFiltrados.map((prod, index) => (
            <CategoryProductCard
              key={prod.id || prod.categoryId || index}
              prod={prod}
              waPhone={waPhone}
            />
          ))}
        </div>
      </section>

      {/* ── PROCESO DE TRABAJO (5 PASOS) ── */}
      <section id="proceso" className="alux-process-section">
        <div className="alux-process-header">
          <span className="alux-section-eyebrow">METODOLOGÍA TRANSPARENTE</span>
          <h2 className="alux-why-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            Nuestro Proceso de Trabajo
          </h2>
          <p className="alux-why-desc">
            Garantizamos tiempos de entrega puntuales y acabados de precisión en cada etapa.
          </p>
        </div>

        <div className="alux-process-grid">
          {ALUX_DATA.procesos.map((proc) => (
            <div key={proc.num} className="alux-process-card">
              <div className="alux-process-num-badge">{proc.num}</div>
              <h4 className="alux-process-title">{proc.titulo}</h4>
              <p className="alux-process-desc">{proc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER LIMPIO Y MODERNO CONECTADO A CONFIGURACIONES DE CONTACTO Y REDES ── */}
      <footer id="contacto" className="alux-footer">
        <div className="alux-footer-container">
          <div className="alux-footer-grid">
            {/* Branding */}
            <div>
              <div className="alux-footer-brand-header">
                <img src={aluxLogoHQ} alt="ALUX" className="alux-footer-logo-img" />
                <div>
                  <h3 className="alux-footer-brand-title">ALUX</h3>
                  <span className="alux-brand-tagline">ALUMINIO & VIDRIO</span>
                </div>
              </div>
              <p className="alux-footer-brand-desc">
                Constructores en Aluminio & Vidrio. Especialistas en fachadas de Alucobond, ventanería acústica, mamparas y vidrio templado.
              </p>

              {/* Social Links from Backend Config */}
              <div className="flex items-center gap-3 pt-3">
                {social?.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                    title="Facebook"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {social?.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-pink-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                    title="Instagram"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {social?.tiktok && (
                  <a
                    href={social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-black hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                    title="TikTok"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46V11.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.04-.63z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div>
              <h4 className="alux-footer-col-title">Contacto en Obra</h4>
              <ul className="alux-footer-list">
                <li>
                  <span className="alux-footer-link">
                    <MapPin size={15} />
                    <span>{ALUX_DATA.address} — {ALUX_DATA.city}</span>
                  </span>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waDefaultMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="alux-footer-link"
                  >
                    <Phone size={15} />
                    <span>WhatsApp / Celular: +{waPhone}</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Enlaces */}
            <div>
              <h4 className="alux-footer-col-title">Enlaces Rápidos</h4>
              <ul className="alux-footer-list">
                <li><a href="#inicio" className="alux-footer-link">Inicio</a></li>
                <li><a href="#productos" className="alux-footer-link">Productos y Fachadas</a></li>
                <li><a href="#proceso" className="alux-footer-link">Proceso de Fabricación</a></li>
                <li>
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waDefaultMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="alux-footer-link"
                  >
                    Contactar por WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="alux-footer-bottom">
            <p>© {new Date().getFullYear()} ALUX Constructores en Aluminio & Vidrio. Todos los derechos reservados.</p>
            <p>Milagro - Guayas - Ecuador</p>
          </div>
        </div>
      </footer>

      {/* Botón Flotante de WhatsApp */}
      <WhatsAppFloat />
    </div>
  );
};

