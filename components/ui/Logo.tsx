import React from 'react';
import Link from 'next/link';

interface LogoProps {
  variant?: 'full' | 'icon' | 'reversed';
  className?: string;
}

export default function Logo({ variant = 'full', className = '' }: LogoProps) {
  // Trust Blue Theme Colors
  const primaryColor = variant === 'reversed' ? '#FFFFFF' : '#1B4B66';
  const textColor = variant === 'reversed' ? '#FFFFFF' : '#16232B';
  const tagColor = variant === 'reversed' ? '#EAECEE' : '#64748B'; // muted

  // Icon: a minimal circular droplet-within-a-circle suggesting care/skin
  const IconMark = () => (
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="14" stroke={primaryColor} strokeWidth="2.5" />
      <path 
        d="M16 8C16 8 10 13.5 10 18C10 21.3137 12.6863 24 16 24C19.3137 24 22 21.3137 22 18C22 13.5 16 8 16 8Z" 
        fill={primaryColor} 
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <IconMark />
      </div>
    );
  }

  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <IconMark />
      <div className="flex flex-col justify-center">
        <span 
          className="font-headline font-semibold text-lg tracking-tight leading-none"
          style={{ color: textColor }}
        >
          Skin Hub
        </span>
        <span 
          className="font-sans text-[9px] font-bold tracking-widest uppercase mt-0.5"
          style={{ color: tagColor }}
        >
          SKIN & COSMETOLOGY
        </span>
      </div>
    </Link>
  );
}
