import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLandingConfig } from '../../../landing-config/application/useLandingImages';
import { ArrowRight, Play, Award, Users, Clock, Shield, Smile, Palette, Printer, Wrench, Megaphone, PhoneCall } from 'lucide-react';
import { HeroCarousel } from './HeroCarousel';
import { WhatsAppFloat } from './WhatsAppFloat';
import { CategoryCard } from './CategoryCard';
import './LandingPage.css';

// Las categorías y productos vienen del backend dinámicamente

export const LandingPage = () => {
  const navigate = useNavigate();
  const { images, whatsapp, social, categories: backendCategories } = useLandingConfig();
  const [activeSection, setActiveSection] = useState('inicio');
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState(['todos']);

  const toggleCategoryFilter = (slug) => {
    if (selectedCategorySlugs.includes('todos')) {
      setSelectedCategorySlugs([slug]);
    } else {
      if (selectedCategorySlugs.includes(slug)) {
        const next = selectedCategorySlugs.filter((s) => s !== slug);
        setSelectedCategorySlugs(next.length === 0 ? ['todos'] : next);
      } else {
        const next = [...selectedCategorySlugs, slug];
        if (next.length === backendCategories.length) {
          setSelectedCategorySlugs(['todos']);
        } else {
          setSelectedCategorySlugs(next);
        }
      }
    }
  };

  const displayedCategories = useMemo(() => {
    if (selectedCategorySlugs.includes('todos') || selectedCategorySlugs.length === 0) {
      return backendCategories;
    }
    return backendCategories.filter((c) => selectedCategorySlugs.includes(c.slug));
  }, [backendCategories, selectedCategorySlugs]);

  const heroImages = useMemo(
    () => [
      { id: 'hero-1', src: images.hero['hero-1'], alt: 'Proyecto Luxes 1' },
      { id: 'hero-2', src: images.hero['hero-2'], alt: 'Proyecto Luxes 2' },
      { id: 'hero-3', src: images.hero['hero-3'], alt: 'Proyecto Luxes 3' },
      { id: 'hero-4', src: images.hero['hero-4'], alt: 'Proyecto Luxes 4' },
    ],
    [images.hero]
  );

  const waPhone = whatsapp?.phone || '593968982380';
  const waMessage = whatsapp?.message || 'Hola, me interesa conocer más sobre los servicios de LUXES.';

  const waLink = useMemo(
    () => `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`,
    [waPhone, waMessage]
  );


  useEffect(() => {
    const sections = ['inicio', 'servicios', 'catalogo'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setActiveSection(id);
        }
      }, {
        rootMargin: '-30% 0px -50% 0px'
      });
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach(obs => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  return (
    <div className="landing-page-container">

      {/* FIXED HEADER WITH BLUR EFFECT */}
      <header className="landing-header">
        <div className="landing-logo-group">
          <img src="/LogoGlobo.png" alt="Luxes" className="landing-logo" />
          <div className="landing-logo-text">
            <span className="landing-brand-name">LUXES</span>
            <span className="landing-brand-subtitle">DISEÑO Y PUBLICIDAD</span>
          </div>
        </div>

        <nav className="landing-nav">
          <a href="#inicio" className={`landing-nav-link ${activeSection === 'inicio' ? 'active' : ''}`}>Inicio</a>
          <a href="#servicios" className={`landing-nav-link ${activeSection === 'servicios' ? 'active' : ''}`}>Servicios</a>
          <a href="#catalogo" className={`landing-nav-link ${activeSection === 'catalogo' ? 'active' : ''}`}>Catálogo</a>
        </nav>

        <div className="landing-header-actions">
          <button
            type="button"
            className="landing-header-login-btn-text"
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="landing-header-cta-btn">
            Solicitar cotización
            <ArrowRight size={16} />
          </a>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section id="inicio" className="landing-section landing-hero-section">
        <div className="landing-slide-inner">
          <div className="landing-hero">
            <div className="landing-hero-content">
              <div className="landing-hero-promo">
                <h1 className="landing-hero-title">
                  <span className="hero-title-line line-blue">RENUEVA</span>
                  <span className="hero-title-line line-yellow">TU MARCA</span>
                  <span className="hero-title-line line-blue">IMPULSA TU ÉXITO</span>
                </h1>
                
                <p className="landing-hero-desc">
                  Diseñamos y producimos piezas que comunican, conectan y venden. Desde la idea hasta la instalación, gestionamos todo tu proyecto.
                </p>
                
                <div className="landing-hero-cta-group">
                  <a href="#catalogo" className="btn-cta-yellow">
                    Ver catálogo
                    <ArrowRight size={18} />
                  </a>
                </div>

                <div className="landing-hero-features">
                  <div className="hero-feature-item">
                    <div className="feature-icon-box">
                      <Award size={16} />
                    </div>
                    <span>Calidad garantizada</span>
                  </div>
                  <div className="hero-feature-item">
                    <div className="feature-icon-box">
                      <Users size={16} />
                    </div>
                    <span>Asesoría personalizada</span>
                  </div>
                  <div className="hero-feature-item">
                    <div className="feature-icon-box">
                      <Clock size={16} />
                    </div>
                    <span>Entregas a tiempo</span>
                  </div>
                  <div className="hero-feature-item">
                    <div className="feature-icon-box">
                      <Shield size={16} />
                    </div>
                    <span>Soluciones integrales</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-hero-visual">
              <span className="visual-top-label">Algunos de nuestros proyectos</span>
              
              <div className="visual-carousel-container">
                <div className="visual-shape shape-blue" />
                <div className="visual-shape shape-yellow" />
                
                <div className="hero-carousel-wrapper">
                  <HeroCarousel heroImages={heroImages} />
                </div>
              </div>

              <div className="hero-stats-card">
                <div className="stats-item">
                  <div className="stats-icon-box">
                    <Users size={22} />
                  </div>
                  <span className="stats-number">+500</span>
                  <span className="stats-label">Proyectos realizados</span>
                </div>
                <div className="stats-divider" />
                <div className="stats-item">
                  <div className="stats-icon-box">
                    <Smile size={22} />
                  </div>
                  <span className="stats-number">+300</span>
                  <span className="stats-label">Clientes satisfechos</span>
                </div>
                <div className="stats-divider" />
                <div className="stats-item">
                  <div className="stats-icon-box">
                    <Award size={22} />
                  </div>
                  <span className="stats-number">8+</span>
                  <span className="stats-label">Años de experiencia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SERVICES */}
      <section id="servicios" className="landing-section landing-services-section">
        <div className="landing-slide-inner">
          <div className="landing-services-header">
            <span className="landing-services-subtitle">¿QUÉ HACEMOS?</span>
            <h2 className="landing-services-title">
              Servicios que <span className="landing-services-title-accent">potencian tu marca</span>
            </h2>
          </div>

          <div className="landing-services-grid">
            <div className="service-card-new">
              <div className="service-icon-circle bg-blue-soft">
                <Palette size={24} className="text-blue" />
              </div>
              <h3 className="service-card-title">Diseño Gráfico</h3>
              <p className="service-card-desc">Creamos identidades visuales que comunican tu esencia.</p>
            </div>

            <div className="service-card-new">
              <div className="service-icon-circle bg-yellow-soft">
                <Printer size={24} className="text-yellow" />
              </div>
              <h3 className="service-card-title">Producción</h3>
              <p className="service-card-desc">Impresión de gran formato, acabados y más.</p>
            </div>

            <div className="service-card-new">
              <div className="service-icon-circle bg-blue-soft">
                <Wrench size={24} className="text-blue" />
              </div>
              <h3 className="service-card-title">Instalaciones</h3>
              <p className="service-card-desc">Montaje profesional para que tu marca destaque.</p>
            </div>

            <div className="service-card-new">
              <div className="service-icon-circle bg-yellow-soft">
                <Megaphone size={24} className="text-yellow" />
              </div>
              <h3 className="service-card-title">Publicidad</h3>
              <p className="service-card-desc">Estrategias visuales que impulsan tu negocio.</p>
            </div>
          </div>
        </div>
      </section>


      {/* SECTION 4: CATALOG SHOWCASE */}
      <section id="catalogo" className="landing-section landing-catalog-section">
        <div className="landing-slide-inner">
          <div className="landing-catalog-header">
            <h2 className="landing-section-title">
              Catálogo por <span className="landing-section-title-accent">categorías</span>
            </h2>
            <p className="landing-section-description">
              Explora nuestros proyectos y trabajos agrupados por especialidad. Selecciona una o varias categorías para filtrar las opciones.
            </p>

            {/* Multi-select category filter tabs */}
            <div className="landing-category-filter-tabs">
              <button
                type="button"
                className={`category-filter-tab ${selectedCategorySlugs.includes('todos') ? 'active' : ''}`}
                onClick={() => setSelectedCategorySlugs(['todos'])}
              >
                Todos
              </button>
              {backendCategories.map((cat) => {
                const isSelected = !selectedCategorySlugs.includes('todos') && selectedCategorySlugs.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-filter-tab ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleCategoryFilter(cat.slug)}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="landing-categories-showcase-grid">
            {displayedCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>

          {backendCategories.length === 0 && (
            <div className="catalog-empty-state">
              <p className="empty-state-text">Cargando categorías del catálogo...</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: CONTACT / CTA */}
      <footer id="contacto" className="landing-footer">
        <div className="landing-footer-left">
          <p className="landing-footer-brand">LUXES — Diseño y Publicidad</p>
          <p className="landing-footer-copy">© {new Date().getFullYear()} LUXES · Todos los derechos reservados</p>
        </div>
        <div className="landing-footer-socials">
          {social.facebook && (
            <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="landing-social-link" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
          )}
          {social.instagram && (
            <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="landing-social-link" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
          )}
          {social.tiktok && (
            <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="landing-social-link" aria-label="TikTok">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          )}
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
};
