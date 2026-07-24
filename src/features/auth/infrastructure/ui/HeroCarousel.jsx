import React, { useState, useEffect, useCallback } from 'react';
import heroImage1 from '../../../../assets/images/LadingPage/header/1.webp';
import heroImage2 from '../../../../assets/images/LadingPage/header/2.webp';
import heroImage3 from '../../../../assets/images/LadingPage/header/3.webp';
import heroImage4 from '../../../../assets/images/LadingPage/header/4.webp';
import './HeroCarousel.css';

const DEFAULT_HERO_IMAGES = [
  { id: 'hero-1', src: heroImage1, alt: 'Proyecto Luxes 1' },
  { id: 'hero-2', src: heroImage2, alt: 'Proyecto Luxes 2' },
  { id: 'hero-3', src: heroImage3, alt: 'Proyecto Luxes 3' },
  { id: 'hero-4', src: heroImage4, alt: 'Proyecto Luxes 4' },
];

const AUTO_PLAY_MS = 5000;

export const HeroCarousel = ({ heroImages }) => {
  const images = heroImages?.length
    ? heroImages
    : DEFAULT_HERO_IMAGES.map((image) => ({ ...image }));

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback((index) => {
    setActiveIndex((index + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    setActiveIndex((prev) => (prev >= images.length ? 0 : prev));
  }, [images.length]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isPaused || prefersReducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, images.length]);

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carrusel"
      aria-label="Galería de proyectos Luxes"
    >
      <div className="hero-carousel-track">
        {images.map((image, index) => (
          <div
            key={image.id ?? image.alt}
            className={`hero-carousel-slide ${index === activeIndex ? 'active' : ''}`}
            aria-hidden={index !== activeIndex}
          >
            {/* Fondo difuminado para llenar el contenedor sin recortar la imagen principal */}
            <img src={image.src} alt="" className="hero-carousel-image-blur" aria-hidden="true" />
            
            {/* Imagen principal completa */}
            <img src={image.src} alt={image.alt} className="hero-carousel-image" />
          </div>
        ))}
      </div>
    </div>
  );
};
