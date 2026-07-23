import { useState, useEffect } from 'react';
import { getLandingConfig } from './landingConfigService';
import { mergeLandingImageOverrides } from './landingImageDefaults';

const DEFAULT_WHATSAPP = {
  phone: '593968982380',
  message: 'Hola, me interesa conocer más sobre los servicios de LUXES.',
};

const DEFAULT_SOCIAL = {
  facebook: 'https://www.facebook.com',
  instagram: 'https://www.instagram.com',
  tiktok: 'https://www.tiktok.com',
};

export function useLandingConfig() {
  const [images, setImages] = useState(() => mergeLandingImageOverrides());
  const [whatsapp, setWhatsapp] = useState(DEFAULT_WHATSAPP);
  const [social, setSocial] = useState(DEFAULT_SOCIAL);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const config = await getLandingConfig();
        if (cancelled) return;

        if (config.imageOverrides) {
          setImages(mergeLandingImageOverrides(config.imageOverrides));
        }
        if (config.whatsapp) {
          setWhatsapp(config.whatsapp);
        }
        if (config.social) {
          setSocial(config.social);
        }
        if (Array.isArray(config.categories)) {
          setCategories(config.categories);
        }
      } catch (error) {
        console.error('No se pudo cargar la configuración del landing:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return { images, whatsapp, social, categories, loading };
}

// Alias de compatibilidad para código existente
export function useLandingImages() {
  const { images, loading } = useLandingConfig();
  return { images, loading };
}
