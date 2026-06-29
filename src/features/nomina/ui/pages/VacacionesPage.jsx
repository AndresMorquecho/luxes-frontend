import React from 'react';
import { VacacionesTab } from '../components/VacacionesTab';

export const VacacionesPage = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 w-full animate-slide-up">
      <VacacionesTab />
    </div>
  );
};
