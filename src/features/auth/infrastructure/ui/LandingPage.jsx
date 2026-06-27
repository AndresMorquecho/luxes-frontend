import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceCard } from './ServiceCard';
import { LANDING_SERVICES } from './landingServices';
import { MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import { toast } from '../../../../shared/ui/components/Toast';
import './LandingPage.css';

const HERO_STATS = [
  { value: '360°', label: 'Gestión integral' },
  { value: '24/7', label: 'Acceso al portal' },
  { value: '6+', label: 'Líneas de servicio' },
  { value: '100%', label: 'Seguimiento' },
];

const CATALOG_ITEMS = [
  {
    id: 'letrero-3d',
    title: 'Letrero 3D Retroiluminado',
    category: 'letreros',
    description: 'Letras corporativas volumétricas en acrílico y metal con iluminación LED posterior indirecta.',
    image: '/mock_letrero.png',
    tags: ['Iluminación LED', 'Fachada comercial', 'Acrílico difusor']
  },
  {
    id: 'caja-luz-ext',
    title: 'Caja de Luz LED Extraplana',
    category: 'letreros',
    description: 'Bastidor de aluminio anodizado con cambio rápido de lona backlite y panel LED difusor.',
    image: '/mock_letras.png',
    tags: ['Extraplana', 'Fácil cambio', 'Bajo consumo']
  },
  {
    id: 'vinilo-esm',
    title: 'Vinilo Esmerilado Premium',
    category: 'rotulacion',
    description: 'Película decorativa de privacidad esmerilada con cortes geométricos y logotipos calados.',
    image: '/vinilo_esmerilado.png',
    tags: ['Privacidad', 'Oficinas', 'Vidrio templado']
  },
  {
    id: 'rotulacion-vehicular',
    title: 'Rotulación Vehicular Comercial',
    category: 'rotulacion',
    description: 'Gráficas en vinilo fundido de alta durabilidad para flotas vehiculares comerciales y corporativas.',
    image: '/mock_instalacion.png',
    tags: ['Durabilidad 3M', 'Protección UV', 'Sin burbujas']
  },
  {
    id: 'stand-publicitario',
    title: 'Stand de Exhibición Custom',
    category: 'stands',
    description: 'Estructuras modulares creativas para convenciones con mostradores, displays e iluminación LED.',
    image: '/stand_publicitario.png',
    tags: ['Eventos', 'Estructura modular', 'Mostrador']
  },
  {
    id: 'senaletica-corporativa',
    title: 'Señalética Arquitectónica',
    category: 'senaletica',
    description: 'Placas informativas directorios fabricados en acrílico cristal y soportes de acero inoxidable.',
    image: '/bank_completed.png',
    tags: ['Acrílico pulido', 'Soportes de acero', 'Wayfinding']
  }
];

const CATALOG_CATEGORIES = [
  { key: 'todos', label: 'Todos' },
  { key: 'letreros', label: 'Letreros' },
  { key: 'rotulacion', label: 'Rotulación' },
  { key: 'stands', label: 'Stands' },
  { key: 'senaletica', label: 'Señalética' }
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('inicio');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const filteredCatalog = useMemo(() => {
    if (selectedCategory === 'todos') return CATALOG_ITEMS;
    return CATALOG_ITEMS.filter(item => item.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    const sections = ['inicio', 'servicios', 'catalogo', 'contacto'];
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

  const handleContactSubmit = (e) => {
    e.preventDefault();
    toast.success('¡Mensaje enviado! Nos contactaremos contigo lo antes posible.');
    e.target.reset();
  };

  return (
    <div className="landing-page-container">

      {/* FIXED HEADER WITH BLUR EFFECT */}
      <header className="landing-header">
        <div className="landing-logo-group">
          <img src="/Logo.jpg" alt="Luxes" className="landing-logo" />
          <span className="landing-brand-name">LUXES</span>
        </div>

        <nav className="landing-nav">
          <a href="#inicio" className={`landing-nav-link ${activeSection === 'inicio' ? 'active' : ''}`}>Inicio</a>
          <a href="#servicios" className={`landing-nav-link ${activeSection === 'servicios' ? 'active' : ''}`}>Servicios</a>
          <a href="#catalogo" className={`landing-nav-link ${activeSection === 'catalogo' ? 'active' : ''}`}>Catálogo</a>
          <a href="#contacto" className={`landing-nav-link ${activeSection === 'contacto' ? 'active' : ''}`}>Contacto</a>
          <button
            type="button"
            className="landing-header-login-btn"
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>
        </nav>
      </header>

      {/* SECTION 1: HERO */}
      <section id="inicio" className="landing-section landing-hero-section">
        <div className="landing-slide-inner">
          <div className="landing-hero">
            <div className="landing-hero-content">
              <span className="landing-badge">
                <span className="landing-badge-dot" aria-hidden="true" />
                Portal empresarial 2026
              </span>
              <h1 className="landing-hero-title">
                Damos vida a tus ideas,
                <span className="landing-hero-highlight"> impulsamos tu marca.</span>
              </h1>
              <p className="landing-hero-description">
                Soluciones creativas, producción e instalaciones para empresas que buscan
                destacar. Gestiona todo tu flujo desde nuestro portal.
              </p>
              <div className="landing-hero-actions">
                <a href="#catalogo" className="landing-cta-primary">
                  Ver catálogo
                  <ArrowRight size={18} style={{ marginLeft: '6px' }} />
                </a>
              </div>
            </div>

            <div className="landing-hero-visual">
              <div className="landing-highlight-card">
                <span className="landing-highlight-icon">L</span>
                <div>
                  <p className="landing-highlight-title">Creatividad · Producción · Resultados</p>
                  <p className="landing-highlight-subtitle">Diseño y publicidad integral</p>
                </div>
              </div>
              <div className="landing-stats-grid">
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="landing-stat-card">
                    <span className="landing-stat-number">{stat.value}</span>
                    <span className="landing-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SERVICES */}
      <section id="servicios" className="landing-section landing-services-section">
        <div className="landing-slide-inner">
          <div className="landing-services-header">
            <span className="landing-section-badge">Lo que hacemos</span>
            <h2 className="landing-section-title">Nuestros servicios</h2>
            <p className="landing-section-description">
              Soluciones integrales para potenciar la presencia visual de tu marca.
            </p>
          </div>

          <div className="landing-services-grid">
            {LANDING_SERVICES.map((service, index) => (
              <ServiceCard
                key={service.id}
                index={index + 1}
                {...service}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: CATALOG */}
      <section id="catalogo" className="landing-section landing-catalog-section">
        <div className="landing-slide-inner">
          <div className="landing-catalog-header">
            <span className="landing-section-badge">Nuestra galería</span>
            <h2 className="landing-section-title">Catálogo de productos</h2>
            <p className="landing-section-description">
              Explora algunos de nuestros proyectos más destacados e instalaciones reales.
            </p>
          </div>

          {/* Filter Categories */}
          <div className="landing-catalog-filters">
            {CATALOG_CATEGORIES.map(category => (
              <button
                key={category.key}
                type="button"
                className={`landing-catalog-filter-btn ${selectedCategory === category.key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="landing-catalog-grid">
            {filteredCatalog.map(item => (
              <article key={item.id} className="landing-catalog-card">
                <div className="landing-catalog-img-box">
                  <img src={item.image} alt={item.title} className="landing-catalog-img" />
                  <span className="landing-catalog-category-tag">{item.category}</span>
                </div>
                <div className="landing-catalog-info">
                  <h3 className="landing-catalog-item-title">{item.title}</h3>
                  <p className="landing-catalog-item-desc">{item.description}</p>
                  <ul className="landing-catalog-tags">
                    {item.tags.map(tag => (
                      <li key={tag} className="landing-catalog-tag">{tag}</li>
                    ))}
                  </ul>
                  <a href="#contacto" className="landing-catalog-btn-quote">
                    Cotizar producto
                    <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: CONTACT */}
      <section id="contacto" className="landing-section landing-contact-section">
        <div className="landing-slide-inner">
          <div className="landing-contact-header">
            <span className="landing-section-badge">Contacto</span>
            <h2 className="landing-section-title">Hablemos de tu proyecto</h2>
            <p className="landing-section-description">
              Ponte en contacto con nuestro equipo y cotiza de forma directa.
            </p>
          </div>

          <div className="landing-contact-grid">
            <div className="landing-contact-info-panel">
              <h3 className="landing-contact-subtitle">Información de contacto</h3>
              <p className="landing-contact-text">
                Estamos listos para asesorarte y llevar tu marca al siguiente nivel.
              </p>

              <div className="landing-contact-details">
                <div className="landing-contact-detail-item">
                  <Phone size={18} className="text-blue-600 shrink-0" />
                  <span>+593 99 999 9999</span>
                </div>
                <div className="landing-contact-detail-item">
                  <Mail size={18} className="text-blue-600 shrink-0" />
                  <span>contacto@luxes.com</span>
                </div>
                <div className="landing-contact-detail-item">
                  <MapPin size={18} className="text-blue-600 shrink-0" />
                  <span>Av. Francisco de Orellana, Guayaquil, Ecuador</span>
                </div>
                <div className="landing-contact-detail-item">
                  <Clock size={18} className="text-blue-600 shrink-0" />
                  <span>Lunes a Viernes: 8:00 AM - 6:00 PM</span>
                </div>
              </div>
            </div>

            <div className="landing-contact-form-panel">
              <form className="landing-contact-form" onSubmit={handleContactSubmit}>
                <div className="landing-contact-form-row">
                  <div className="landing-contact-field">
                    <label className="landing-contact-label">Nombre</label>
                    <input type="text" placeholder="Tu nombre" className="landing-contact-input" required />
                  </div>
                  <div className="landing-contact-field">
                    <label className="landing-contact-label">Correo</label>
                    <input type="email" placeholder="Tu correo electrónico" className="landing-contact-input" required />
                  </div>
                </div>
                <div className="landing-contact-field">
                  <label className="landing-contact-label">Mensaje</label>
                  <textarea placeholder="Cuéntanos sobre tu idea o proyecto..." rows="4" className="landing-contact-input" required />
                </div>
                <button type="submit" className="landing-contact-btn-submit">Enviar mensaje</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-brand">LUXES — Diseño y Publicidad</p>
        <p className="landing-footer-copy">© {new Date().getFullYear()} · Todos los derechos reservados</p>
      </footer>
    </div>
  );
};
