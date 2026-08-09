'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Smartphone, CheckCircle, Bell, Clock, ArrowRight, UserCheck } from 'lucide-react';

export default function HowToUse() {
  const handlePortalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const portalSection = document.getElementById('patient-portal');
    if (portalSection) {
      e.preventDefault();
      portalSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const steps = [
    {
      icon: <Smartphone className="w-8 h-8 text-white" />,
      title: "1. Access Patient Portal",
      desc: "Enter your mobile number in the Patient Portal above to securely access your account.",
      color: "from-blue-500 to-indigo-600",
      showButton: true
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-white" />,
      title: "2. Build Your Routine",
      desc: "Add your morning and night skincare items, medications, and treatments to your timeline.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: <Bell className="w-8 h-8 text-white" />,
      title: "3. Get Smart Reminders",
      desc: "Turn on notifications and we will remind you exactly when it's time for your treatment.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: <Clock className="w-8 h-8 text-white" />,
      title: "4. Live Queue Tracking",
      desc: "Check the live clinic waitlist and book an arrival window before you visit the clinic.",
      color: "from-purple-500 to-pink-600"
    }
  ];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-playfair text-3xl sm:text-4xl font-black text-gray-900 mb-4"
          >
            How to use the <span className="text-primary italic">Patient Portal</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-sans text-gray-600 max-w-2xl mx-auto mb-6"
          >
            A simple, 4-step guide to managing your skin health and clinic visits seamlessly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <Link
              href="/users"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg group cursor-pointer border border-primary/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>Go to Patient Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-surface rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
            >
              <div>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${step.color} opacity-10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />

                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} shadow-lg flex items-center justify-center mb-6 transform -rotate-3 group-hover:rotate-0 transition-transform`}>
                  {step.icon}
                </div>

                <h3 className="font-playfair text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="font-sans text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>

              {step.showButton && (
                <div className="mt-6 pt-4 border-t border-gray-200/60">
                  <Link
                    href="/users#patient-portal"
                    onClick={handlePortalClick}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition-colors group/link"
                  >
                    <span>Open Patient Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

