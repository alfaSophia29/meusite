
import React from 'react';
import { AdCampaign } from '../types';

interface AdCardProps {
  ad: AdCampaign;
  rank?: number;
}

const AdCard: React.FC<AdCardProps> = ({ ad }) => (
  <div className="bg-white dark:bg-darkcard p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">Patrocinado</span>
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{ad.professorName}</span>
    </div>
    {ad.imageUrl && (
      <img src={ad.imageUrl} alt={ad.title} className="w-full aspect-video object-cover rounded-2xl" />
    )}
    <div>
      <h3 className="font-black text-sm uppercase text-gray-900 dark:text-white line-clamp-1">{ad.title}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
    </div>
    {ad.linkUrl && (
      <a 
        href={ad.linkUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full py-3 bg-gray-900 dark:bg-white dark:text-black text-white text-center rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-gray-200 transition-colors"
      >
        {ad.ctaText || 'Ver Mais'}
      </a>
    )}
  </div>
);

export default AdCard;
