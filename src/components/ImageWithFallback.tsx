import { BookOpen } from 'lucide-react';
import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EFECE6] via-[#E5E1D8] to-[#DAD4C8] text-[#1F2937] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-8 h-8 text-[#0F4C3A] mb-2 opacity-80" strokeWidth={1.5} />
        <span className="text-sm font-medium text-[#111827] max-w-[200px] truncate">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
