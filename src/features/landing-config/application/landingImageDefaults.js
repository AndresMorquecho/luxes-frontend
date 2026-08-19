export const HERO_DEFAULT_IMAGES = {
  'hero-1': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=90',
  'hero-2': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=90',
  'hero-3': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=90',
  'hero-4': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=90',
};

export const LANDING_IMAGE_SECTIONS = [
  {
    key: 'hero',
    title: 'Carrusel principal',
    description: 'Imágenes del carrusel en la sección de inicio.',
    items: [
      { id: 'hero-1', label: 'Banner Principal 1', defaultSrc: HERO_DEFAULT_IMAGES['hero-1'] },
      { id: 'hero-2', label: 'Banner Principal 2', defaultSrc: HERO_DEFAULT_IMAGES['hero-2'] },
      { id: 'hero-3', label: 'Banner Principal 3', defaultSrc: HERO_DEFAULT_IMAGES['hero-3'] },
      { id: 'hero-4', label: 'Banner Principal 4', defaultSrc: HERO_DEFAULT_IMAGES['hero-4'] },
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
