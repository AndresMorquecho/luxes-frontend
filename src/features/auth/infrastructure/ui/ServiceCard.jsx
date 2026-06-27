import React from 'react';
import { Palette, Printer, Wrench, Briefcase, Sparkles, Lightbulb } from 'lucide-react';

const SERVICE_ICONS = {
  palette: <Palette size={20} strokeWidth={2.2} />,
  printer: <Printer size={20} strokeWidth={2.2} />,
  wrench: <Wrench size={20} strokeWidth={2.2} />,
  briefcase: <Briefcase size={20} strokeWidth={2.2} />,
  sparkles: <Sparkles size={20} strokeWidth={2.2} />,
  lightbulb: <Lightbulb size={20} strokeWidth={2.2} />,
};

export const ServiceCard = ({ index, title, description, icon, accent, tags }) => {
  const iconNode = SERVICE_ICONS[icon] ?? SERVICE_ICONS.lightbulb;
  const formattedIndex = String(index).padStart(2, '0');

  return (
    <article
      className="landing-service-card"
      style={{ '--service-accent': accent }}
    >
      <div className="landing-service-card-accent" aria-hidden="true" />
      <span className="landing-service-card-index">{formattedIndex}</span>
      <div className="landing-service-card-icon">
        {iconNode}
      </div>
      <h3 className="landing-service-card-title">{title}</h3>
      <p className="landing-service-card-description">{description}</p>
      {tags?.length > 0 && (
        <ul className="landing-service-card-tags">
          {tags.map((tag) => (
            <li key={tag} className="landing-service-card-tag">{tag}</li>
          ))}
        </ul>
      )}
    </article>
  );
};
