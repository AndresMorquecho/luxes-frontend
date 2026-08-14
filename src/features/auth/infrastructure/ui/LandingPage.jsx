// src/features/auth/infrastructure/ui/LandingPage.jsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, PhoneCall, Award, Building, ShieldCheck, Clock, 
  Users, PenTool, Wrench, CheckCircle, Shield, CheckCircle2, 
  MapPin, Phone, Mail, ChevronRight, Star, ExternalLink
} from 'lucide-react';
import { HeroCarousel } from './HeroCarousel';
import { WhatsAppFloat } from './WhatsAppFloat';
import { ALUX_DATA } from './aluxLandingData';
import aluxBannerLogo from '../../../../assets/aluxBanner1.png';
import './LandingPage.css';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('todos');

  const waPhone = ALUX_DATA.whatsappPhone;
  const defaultMessage = 'Hola ALUX, deseo cotizar un proyecto en aluminio/vidrio.';
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(defaultMessage)}`;

  // hero images
  const heroImages = useMemo(() => [
    { id: 'hero-1', src: '/assets/1.png', alt: 'Fachada Alucobond y Ventanería ALUX' },
    { id: 'hero-2', src: '/assets/2.png', alt: 'Mamparas de Vidrio Templado ALUX' },
    { id: 'hero-3', src: '/assets/3.png', alt: 'Pérgolas Modernas de Aluminio ALUX' },
  ], []);

  // Productos filtrados
  const productosFiltrados = useMemo(() => {
    if (activeCategory === 'todos') return ALUX_DATA.productos;
    return ALUX_DATA.productos.filter((p) => p.slug === activeCategory || p.id === activeCategory);
  }, [activeCategory]);

  return (
    <div className="landing-page-container">
      {/* HEADER PRINCIPAL BLUR */}
      <header className="alux-header">
        <a href="#inicio" className="alux-logo-group">
          <img src={aluxBannerLogo} alt="ALUX" className="alux-logo-img" />
          <div className="alux-logo-brand">
            <span className="alux-brand-title">{ALUX_DATA.brandName}</span>
            <span className="alux-brand-subtitle">ALUMINIO & VIDRIO</span>
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
          <button
            type="button"
            className="alux-btn-login"
            onClick={() => navigate('/login')}
          >
            Iniciar Sesión
          </button>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="alux-btn-wa"
          >
            <PhoneCall size={15} />
            Cotizar por WhatsApp
          </a>
        </div>
      </header>

      {/* SECCIÓN 1: HERO */}
      <section id="inicio" className="alux-hero-section">
        <div className="alux-hero-overlay-glow" />
        
        <div className="alux-hero-grid">
          <div>
            <div className="alux-badge-tag">
              <Star size={14} className="text-amber-400" />
              <span>Constructores en Aluminio & Vidrio • Milagro, Ecuador</span>
            </div>

            <h1 className="alux-hero-h1">
              DISEÑAMOS, FABRICAMOS E INSTALAMOS
              <span className="alux-hero-h1-gold">Soluciones que Duran.</span>
            </h1>

            <p className="alux-hero-subtitle">
              Especialistas en fachadas de Alucobond (ACM), ventanería de aluminio, mamparas comerciales y vidrio templado para hogares, negocios e industrias.
            </p>

            <div className="alux-hero-cta-box">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="alux-btn-primary-gold"
              >
                Cotiza tus Proyectos con Nosotros
                <ArrowRight size={18} />
              </a>

              <a href="#productos" className="alux-btn-secondary-glass">
                Ver Catálogo de Productos
              </a>
            </div>

            <div className="alux-hero-bullets">
              <div className="alux-bullet-item">
                <CheckCircle2 size={16} className="alux-bullet-icon" />
                <span>Materiales Certificados</span>
              </div>
              <div className="alux-bullet-item">
                <CheckCircle2 size={16} className="alux-bullet-icon" />
                <span>Diseños a la Medida</span>
              </div>
              <div className="alux-bullet-item">
                <CheckCircle2 size={16} className="alux-bullet-icon" />
                <span>Garantía en Obra</span>
              </div>
            </div>
          </div>

          {/* Carrusel Visual en Hero */}
          <div className="alux-hero-visual-card">
            <div className="alux-hero-visual-inner">
              <HeroCarousel heroImages={heroImages} />
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: BARRA DE ESTADÍSTICAS / MÉTRICAS */}
      <section className="alux-stats-bar">
        <div className="alux-stats-grid">
          {ALUX_DATA.stats.map((st, i) => (
            <div key={i} className="alux-stat-card">
              <div className="alux-stat-number">{st.number}</div>
              <div className="alux-stat-label">{st.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: NUESTROS PRODUCTOS Y SERVICIOS */}
      <section id="productos" className="alux-products-section">
        <div className="alux-section-header">
          <span className="alux-section-sub">NUESTROS PRODUCTOS</span>
          <h2 className="alux-section-title">
            Calidad y Estilo para Cada Espacio
          </h2>
          <p className="alux-section-desc">
            Trabajamos con aluminio extruido, vidrio templado y paneles de Alucobond para ofrecer soluciones duraderas, funcionales y de alto valor estético.
          </p>

          {/* Filtro rápido */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <button
              onClick={() => setActiveCategory('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'todos'
                  ? 'bg-slate-900 text-amber-400 shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos los Productos
            </button>
            {ALUX_DATA.productos.map((prod) => (
              <button
                key={prod.id}
                onClick={() => setActiveCategory(prod.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === prod.id
                    ? 'bg-slate-900 text-amber-400'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {prod.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Tarjetas de Producto */}
        <div className="alux-products-grid">
          {productosFiltrados.map((prod) => {
            const itemWaLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ALUX, me interesa cotizar ${prod.nombre}`)}`;

            return (
              <div key={prod.id} className="alux-product-card">
                <span className="alux-product-tag">{prod.tag}</span>
                <img
                  src={prod.image}
                  alt={prod.nombre}
                  className="alux-product-header-img"
                />

                <div className="alux-product-body">
                  <span className="alux-product-cat">{prod.categoria}</span>
                  <h3 className="alux-product-title">{prod.nombre}</h3>
                  <p className="alux-product-desc">{prod.desc}</p>

                  <div className="alux-product-bullets">
                    {prod.caracteristicas.map((car, idx) => (
                      <div key={idx} className="alux-product-bullet-li">
                        <CheckCircle size={14} />
                        <span>{car}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={itemWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="alux-product-cta-btn"
                  >
                    Cotizar este Producto
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 4: NUESTRO PROCESO (5 PASOS) */}
      <section id="proceso" className="alux-process-section">
        <div className="alux-section-header">
          <span className="alux-section-sub">NUESTRO PROCESO</span>
          <h2 className="alux-section-title">
            ¿Cómo Ejecutamos tu Proyecto?
          </h2>
          <p className="alux-section-desc">
            Seguimos una metodología rigurosa desde la primera consulta hasta la entrega de llaves en mano.
          </p>
        </div>

        <div className="alux-process-timeline">
          {ALUX_DATA.procesos.map((pr) => (
            <div key={pr.num} className="alux-process-card">
              <div className="alux-process-num-badge">{pr.num}</div>
              <h3 className="alux-process-card-title">{pr.titulo}</h3>
              <p className="alux-process-card-desc">{pr.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 5: POR QUÉ ELEGIR ALUX */}
      <section id="nosotros" className="alux-why-section">
        <div className="alux-section-header">
          <span className="alux-section-sub" style={{ color: '#e6b835' }}>
            CALIDAD QUE MARCA LA DIFERENCIA
          </span>
          <h2 className="alux-section-title" style={{ color: '#ffffff' }}>
            ¿Por Qué Elegir a ALUX?
          </h2>
          <p className="alux-section-desc" style={{ color: '#94a3b8' }}>
            Respaldamos cada proyecto con materiales certificados, acabados de primera y garantía directa.
          </p>
        </div>

        <div className="alux-why-grid">
          {ALUX_DATA.beneficios.map((ben, idx) => (
            <div key={idx} className="alux-why-card">
              <div className="alux-why-icon-box">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="alux-why-title">{ben.titulo}</h3>
              <p className="alux-why-desc">{ben.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER & CONTACTO */}
      <footer id="contacto" className="alux-footer">
        <div className="alux-footer-grid">
          <div>
            <h3 className="alux-footer-brand-title">{ALUX_DATA.brandName}</h3>
            <p className="alux-footer-desc">
              {ALUX_DATA.brandSubtitle}. Construimos espacios modernos con soluciones duraderas en aluminio, vidrio templado y fachadas de Alucobond.
            </p>
          </div>

          <div>
            <h4 className="alux-footer-h4">Contacto y Obra</h4>
            <ul className="alux-footer-info-list">
              <li className="alux-footer-info-item">
                <MapPin size={16} />
                <span>{ALUX_DATA.address} — {ALUX_DATA.city}</span>
              </li>
              <li className="alux-footer-info-item">
                <Phone size={16} />
                <span>WhatsApp: {ALUX_DATA.phone}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="alux-footer-h4">Redes Sociales</h4>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-white/10 hover:bg-amber-400 hover:text-slate-900 rounded-xl transition-all"
                title="Facebook @alux_ec"
              >
                <ExternalLink size={18} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-white/10 hover:bg-amber-400 hover:text-slate-900 rounded-xl transition-all"
                title="Instagram @alux_ec"
              >
                <ExternalLink size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="alux-footer-bottom">
          <p>© {new Date().getFullYear()} ALUX Constructores en Aluminio & Vidrio. Todos los derechos reservados.</p>
          <p>Milagro - Guayas - Ecuador</p>
        </div>
      </footer>

      {/* Botón Flotante de WhatsApp */}
      <WhatsAppFloat />
    </div>
  );
};
