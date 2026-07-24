import heroImage1 from '../../../assets/images/LadingPage/header/1.webp';
import heroImage2 from '../../../assets/images/LadingPage/header/2.webp';
import heroImage3 from '../../../assets/images/LadingPage/header/3.webp';
import heroImage4 from '../../../assets/images/LadingPage/header/4.webp';

export const LANDING_IMAGE_SECTIONS = [
  {
    key: 'hero',
    title: 'Carrusel principal',
    description: 'Imágenes del carrusel en la sección de inicio.',
    items: [
      { id: 'hero-1', label: 'Imagen 1', defaultSrc: heroImage1 },
      { id: 'hero-2', label: 'Imagen 2', defaultSrc: heroImage2 },
      { id: 'hero-3', label: 'Imagen 3', defaultSrc: heroImage3 },
      { id: 'hero-4', label: 'Imagen 4', defaultSrc: heroImage4 },
    ],
  },
];


export function mergeLandingImageOverrides(overrides = {}) {
  const merged = {};

  LANDING_IMAGE_SECTIONS.forEach((section) => {
    merged[section.key] = {};
    section.items.forEach((item) => {
      merged[section.key][item.id] = overrides?.[section.key]?.[item.id] ?? item.defaultSrc;
    });
  });

  return merged;
}

export function resolveImageSrc(overrides, section, itemId, defaultSrc) {
  return overrides?.[section]?.[itemId] ?? defaultSrc;
}
