// src/features/auth/infrastructure/ui/LandingPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Award, Headphones, ArrowRight, Search, PhoneCall,
  MapPin, Phone, Sparkles, Check
} from 'lucide-react';
import { WhatsAppFloat } from './WhatsAppFloat';
import { ALUX_DATA } from './aluxLandingData';
import aluxLogoHQ from '../../../../assets/aluxLogoHQ.png';
import './LandingPage.css';

// Imágenes de alta resolución para el carrusel del Hero
const HERO_CAROUSEL_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=90',
    alt: 'Fachada Residencial en Vidrio y Aluminio ALUX'
  },
  {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=90',
    alt: 'Ventanería Moderna y Pérgolas de Aluminio'
  },
  {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=90',
    alt: 'Mamparas y Cerramientos de Cristal Templado'
  },
  {
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=90',
    alt: 'Arquitectura Comercial en Paneles Alucobond'
  }
];

// Imágenes para el carrusel de la sección "Por Qué Elegir ALUX"
const WHY_CAROUSEL_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=90',
    alt: 'Interiores con Ventanería y Mamparas de Cristal'
  },
  {
    url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=90',
    alt: 'Divisiones de Oficina en Vidrio Templado'
  },
  {
    url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=90',
    alt: 'Cubiertas y Cerramientos de Aluminio'
  },
  {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=90',
    alt: 'Fachadas Corporativas en Alucobond ACM'
  }
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('todos');

  // Estado para la barra de cotización rápida (Estilo Nestoria)
  const [quoteProduct, setQuoteProduct] = useState('Ventanas de Aluminio');
  const [quoteSector, setQuoteSector] = useState('Residencial');
  const [quoteCity, setQuoteCity] = useState('Milagro');

  // Estados de Carruseles Automáticos
  const [heroIndex, setHeroIndex] = useState(0);
  const [whyIndex, setWhyIndex] = useState(0);

  // Temporizadores para cambio automático de imágenes
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_CAROUSEL_IMAGES.length);
    }, 5000);

    const whyTimer = setInterval(() => {
      setWhyIndex((prev) => (prev + 1) % WHY_CAROUSEL_IMAGES.length);
    }, 4500);

    return () => {
      clearInterval(heroTimer);
      clearInterval(whyTimer);
    };
  }, []);

  const waPhone = ALUX_DATA.whatsappPhone;

  // Generar link de WhatsApp dinámico según filtros seleccionados
  const dynamicWaLink = useMemo(() => {
    const message = `Hola ALUX, me gustaría cotizar: ${quoteProduct} para el sector ${quoteSector} en la ciudad de ${quoteCity}.`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
  }, [quoteProduct, quoteSector, quoteCity, waPhone]);

  // Filtrado de productos para la sección destacada
  const productosFiltrados = useMemo(() => {
    if (activeCategory === 'todos') return ALUX_DATA.productos;
    return ALUX_DATA.productos.filter((p) => p.slug === activeCategory || p.id === activeCategory);
  }, [activeCategory]);

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
            <a href="#nosotros" className="alux-nav-link">Por Qué ALUX</a>
            <a href="#contacto" className="alux-nav-link">Contacto</a>
          </nav>

          <div className="alux-header-actions">
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent('Hola ALUX, deseo más información.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="alux-btn-wa-header"
            >
              <PhoneCall size={14} />
              <span>WhatsApp</span>
            </a>
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
          {HERO_CAROUSEL_IMAGES.map((img, idx) => (
            <div
              key={idx}
              className={`alux-hero-slide ${idx === heroIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url('${img.url}')` }}
              aria-label={img.alt}
            />
          ))}

          {/* Degradado lateral sutil para contraste del texto */}
          <div className="alux-hero-backdrop" />

          {/* Fila Superior: Badge flotante de confianza */}
          <div className="alux-hero-top-row">
            <div className="alux-trusted-badge">
              <div className="alux-avatar-stack">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                  alt="Cliente" 
                  className="alux-avatar-img"
                />
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" 
                  alt="Cliente" 
                  className="alux-avatar-img"
                />
                <img 
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" 
                  alt="Cliente" 
                  className="alux-avatar-img"
                />
              </div>
              <span className="alux-trusted-text">
                Garantía en <strong>+1.200 Proyectos</strong>
              </span>
            </div>
          </div>

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
          </div>

          {/* Dots / Puntos de Navegación del Carrusel Hero */}
          <div className="alux-hero-dots">
            {HERO_CAROUSEL_IMAGES.map((_, idx) => (
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

      {/* ── BARRA FLOTANTE DE BÚSQUEDA / COTIZACIÓN (ESTILO NESTORIA) ── */}
      <div className="alux-search-bar-wrapper">
        <div className="alux-search-bar">
          <div className="alux-search-field">
            <label className="alux-search-label">Tipo de Proyecto</label>
            <select
              className="alux-search-select"
              value={quoteProduct}
              onChange={(e) => setQuoteProduct(e.target.value)}
            >
              <option value="Ventanas de Aluminio">Ventanas de Aluminio</option>
              <option value="Fachadas en Alucobond (ACM)">Fachadas en Alucobond (ACM)</option>
              <option value="Mamparas de Vidrio Templado">Mamparas de Vidrio Templado</option>
              <option value="Pérgolas Modernas">Pérgolas Modernas</option>
              <option value="Puertas Residenciales">Puertas Residenciales</option>
              <option value="Vitrinas Comerciales">Vitrinas Comerciales</option>
              <option value="Barandas de Vidrio">Barandas de Vidrio</option>
            </select>
          </div>

          <div className="alux-search-field">
            <label className="alux-search-label">Sector / Uso</label>
            <select
              className="alux-search-select"
              value={quoteSector}
              onChange={(e) => setQuoteSector(e.target.value)}
            >
              <option value="Residencial">Residencial / Hogar</option>
              <option value="Comercial / Negocio">Comercial / Negocio</option>
              <option value="Edificio / Industrial">Edificio / Industrial</option>
            </select>
          </div>

          <div className="alux-search-field">
            <label className="alux-search-label">Ubicación</label>
            <select
              className="alux-search-select"
              value={quoteCity}
              onChange={(e) => setQuoteCity(e.target.value)}
            >
              <option value="Milagro">Milagro</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Durán / Samborondón">Durán / Samborondón</option>
              <option value="Todo Ecuador">Todo el Ecuador</option>
            </select>
          </div>

          <a
            href={dynamicWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="alux-search-btn"
          >
            <Search size={16} className="alux-search-btn-icon" />
            <span>Cotizar Proyecto</span>
          </a>
        </div>
      </div>

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

      {/* ── SECCIÓN "POR QUÉ ELEGIR ALUX" (SPLIT SECTION CON CARRUSEL) ── */}
      <section id="nosotros" className="alux-why-section">
        <div className="alux-why-grid">
          <div>
            <span className="alux-section-eyebrow">POR QUÉ ELEGIR ALUX</span>
            <h2 className="alux-why-title">
              Más Que Fabricación, Creamos Tu Visión
            </h2>
            <p className="alux-why-desc">
              Nos apasiona transformar espacios residenciales y comerciales combinando ingeniería de precisión, acabados impecables y diseños arquitectónicos de vanguardia.
            </p>

            <div className="alux-checklist">
              <div className="alux-check-item">
                <div className="alux-check-badge">
                  <Check size={14} />
                </div>
                <span>Amplia gama de perfiles anodizados y acabados Alucobond</span>
              </div>
              <div className="alux-check-item">
                <div className="alux-check-badge">
                  <Check size={14} />
                </div>
                <span>Aislamiento térmico, acústico y protección hermética</span>
              </div>
              <div className="alux-check-item">
                <div className="alux-check-badge">
                  <Check size={14} />
                </div>
                <span>Levantamiento en obra y cotizaciones detalladas a medida</span>
              </div>
              <div className="alux-check-item">
                <div className="alux-check-badge">
                  <Check size={14} />
                </div>
                <span>Más de 10 años de experiencia y respaldo comprobado</span>
              </div>
            </div>

            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent('Hola ALUX, deseo asesoría técnica para mi proyecto.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="alux-btn-learn"
            >
              <span>Hablar con un Especialista</span>
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Carrusel de Imágenes en Sección "Por Qué Elegir ALUX" */}
          <div className="alux-why-image-box">
            {WHY_CAROUSEL_IMAGES.map((img, idx) => (
              <img
                key={idx}
                src={img.url}
                alt={img.alt}
                className={`alux-why-slide ${idx === whyIndex ? 'active' : ''}`}
                loading="lazy"
              />
            ))}

            {/* Dots / Puntos del Carrusel */}
            <div className="alux-why-dots">
              {WHY_CAROUSEL_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`alux-why-dot ${idx === whyIndex ? 'active' : ''}`}
                  onClick={() => setWhyIndex(idx)}
                  aria-label={`Ver diapositiva ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS Y SOLUCIONES DESTACADAS (CARDS NESTORIA) ── */}
      <section id="productos" className="alux-featured-section">
        <div className="alux-featured-header">
          <div className="alux-featured-title-group">
            <span className="alux-section-eyebrow">CATÁLOGO SELECCIONADO</span>
            <h2>Soluciones y Productos Destacados</h2>
          </div>

          <a href="#contacto" className="alux-view-all-link">
            <span>Ver Catálogo Completo</span>
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
          {ALUX_DATA.productos.slice(0, 5).map((prod) => (
            <button
              key={prod.id}
              onClick={() => setActiveCategory(prod.id)}
              className={`alux-tab-btn ${activeCategory === prod.id ? 'active' : ''}`}
            >
              {prod.nombre}
            </button>
          ))}
        </div>

        {/* Grid de Tarjetas */}
        <div className="alux-cards-grid">
          {productosFiltrados.slice(0, 6).map((prod, index) => {
            const itemWa = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ALUX, me interesa cotizar ${prod.nombre}.`)}`;
            const tagType = index % 3 === 0 ? 'featured' : index % 3 === 1 ? 'new' : 'guaranteed';

            return (
              <div key={prod.id} className="alux-nestoria-card">
                <div className="alux-card-image-wrap">
                  <img
                    src={prod.image}
                    alt={prod.nombre}
                    className="alux-card-img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <span className={`alux-card-tag-badge ${tagType}`}>
                    {prod.tag}
                  </span>
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
            );
          })}
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

      {/* ── FOOTER LIMPIO Y MODERNO ── */}
      <footer id="contacto" className="alux-footer">
        <div className="alux-footer-container">
          <div className="alux-footer-grid">
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
            </div>

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
                  <a href={`https://wa.me/${waPhone}`} className="alux-footer-link">
                    <Phone size={15} />
                    <span>WhatsApp: {ALUX_DATA.phone}</span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="alux-footer-col-title">Enlaces Rápidos</h4>
              <ul className="alux-footer-list">
                <li><a href="#inicio" className="alux-footer-link">Inicio</a></li>
                <li><a href="#productos" className="alux-footer-link">Productos y Fachadas</a></li>
                <li><a href="#proceso" className="alux-footer-link">Proceso de Fabricación</a></li>
                <li><a href="#nosotros" className="alux-footer-link">Por Qué ALUX</a></li>
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
