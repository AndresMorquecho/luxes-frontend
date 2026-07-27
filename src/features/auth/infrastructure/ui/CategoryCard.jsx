import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';

export const CategoryCard = ({ category }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Best practice for performance: Limit preview slideshow to top 3 images only
  const previewImages = useMemo(() => {
    return (category.images || []).slice(0, 3);
  }, [category.images]);

  const hasImages = previewImages.length > 0;

  useEffect(() => {
    if (previewImages.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % previewImages.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [previewImages.length, isHovered]);

  const handleNavigate = () => {
    navigate(`/catalogo/${category.slug}`);
  };

  return (
    <div
      className="landing-category-card"
      onClick={handleNavigate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Container */}
      <div className="landing-cat-card-image-wrap">
        {hasImages ? (
          previewImages.map((img, idx) => (
            <img
              key={img.id || idx}
              src={img.imageUrl}
              alt={img.title || category.name}
              className={`landing-cat-card-img ${idx === currentIndex ? 'active' : ''}`}
              loading="lazy"
            />
          ))
        ) : (
          <div className="landing-cat-card-placeholder">
            <ImageIcon size={40} className="cat-placeholder-icon" />
            <span>Próximamente más proyectos</span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="landing-cat-card-body">
        <h3 className="landing-cat-card-title">{category.name}</h3>
        
        <div className="landing-cat-card-footer">
          <span className="landing-cat-card-action-text">
            Ver más ejemplos
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </div>
  );
};
