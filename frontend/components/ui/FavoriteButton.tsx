'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  candidateId: string;
  /** 'icon' — just a heart icon (for table rows), 'button' — full pill button */
  variant?: 'icon' | 'button';
  className?: string;
}

export default function FavoriteButton({
  candidateId,
  variant = 'icon',
  className = '',
}: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(candidateId);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation when inside a clickable row/link
    e.preventDefault();
    e.stopPropagation();
    toggle(candidateId);
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        title={active ? 'Remove from favorites' : 'Add to favorites'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          active
            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
        } ${className}`}
      >
        <Heart
          className={`w-3.5 h-3.5 ${active ? 'fill-rose-500 stroke-rose-500' : 'stroke-current'}`}
        />
        {active ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`p-1 rounded-md transition-all ${
        active
          ? 'text-rose-500'
          : 'text-gray-300 hover:text-gray-400'
      } ${className}`}
    >
      <Heart
        className={`w-3.5 h-3.5 transition-all ${
          active ? 'fill-rose-500 stroke-rose-500' : ''
        }`}
      />
    </button>
  );
}
