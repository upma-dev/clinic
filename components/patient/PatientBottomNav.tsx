'use client';

import React from 'react';
import { Home, CalendarCheck, CalendarPlus, BookOpen, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const TABS = [
  { name: 'Home', href: '/users', icon: Home },
  { name: 'Routine', href: '/users/routine', icon: CalendarCheck, hasDot: true }, // hasDot depends on data, mocking it for design
  { name: 'Book', href: '/users/booking', icon: CalendarPlus },
  { name: 'Learn', href: '/users/learn', icon: BookOpen },
  { name: 'Profile', href: '/users/profile', icon: User, hasDot: true },
];

export default function PatientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-[#FFFFFF] border-t border-[#8A9490]/20 pt-2 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-none md:hidden">
      <ul className="flex justify-between items-center max-w-md mx-auto relative">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          
          return (
            <li key={tab.name} className="flex-1">
              <Link
                href={tab.href}
                className="relative flex flex-col items-center justify-center gap-1 w-full h-full py-1"
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <div className="relative">
                  <Icon 
                    size={24}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={clsx(
                      "transition-colors duration-150 ease-in-out",
                      isActive ? "text-[#2F5D50]" : "text-[#8A9490]"
                    )}
                    fill={isActive ? "currentColor" : "none"}
                  />
                  {tab.hasDot && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#E8A15D] border-2 border-white rounded-full" />
                  )}
                </div>
                <span 
                  className={clsx(
                    "text-[11px] font-medium transition-colors duration-150 ease-in-out font-sans",
                    isActive ? "text-[#2F5D50]" : "text-[#8A9490]"
                  )}
                >
                  {tab.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
