'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Activity } from 'lucide-react';

interface GlobalLoaderContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export const useGlobalLoader = () => useContext(GlobalLoaderContext);

export function GlobalNavigationLoaderProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stop loader whenever pathname or searchParams change (navigation finished)
  useEffect(() => {
    setIsLoading(false);
    setProgress(100);
    const timer = setTimeout(() => setProgress(0), 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Smooth fake progress animation when loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgress(15);
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + Math.floor(Math.random() * 15 + 5)));
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => {
    setProgress(100);
    setTimeout(() => setIsLoading(false), 200);
  };

  // Global link click interceptor for instant navigation loader feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        const targetUrl = new URL(anchor.href, window.location.origin);
        const currentUrl = new URL(window.location.href);

        // If navigating to another internal page/route
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search) &&
          !anchor.target &&
          !e.ctrlKey &&
          !e.metaKey
        ) {
          setIsLoading(true);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <GlobalLoaderContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {/* Top Glowing Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none">
          <div
            className="h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 transition-all duration-200 ease-out shadow-[0_0_12px_rgba(20,184,166,0.9)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Fullscreen Custom Medical Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[99990] flex items-center justify-center bg-slate-950/30 backdrop-blur-md select-none pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl border border-teal-100 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-xs w-full text-center space-y-4 flex flex-col items-center"
            >
              <div className="relative flex items-center justify-center">
                {/* Outer spinning ring */}
                <div className="w-16 h-16 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
                {/* Center pulse icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-teal-600 animate-pulse" />
                </div>
              </div>

              <div>
                <p className="font-playfair text-base font-black text-gray-900 tracking-tight flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                  Skin Hub Clinic
                </p>
                <p className="font-sans text-xs text-teal-700 font-bold uppercase tracking-widest mt-1">
                  Loading Experience...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </GlobalLoaderContext.Provider>
  );
}
