/**
 * @file config/site.ts
 * @description Centralized configuration for the Skin Hub website. 
 * Contains clinic metadata, contact details, social links, and service definitions 
 * used across various components for consistency.
 */

export const siteConfig = {
  // Brand and Clinician Identity
  clinicName: "Dr. Prateek Tiwari's Skin Hub Derma, Hair & Laser Clinic",
  doctorName: "Dr. Prateek Tiwari",
  credentials: "MBBS, DVD (Dermatology)",
  
  // Physical and Contact coordinates
  location: "Skin Hub & Physio Centre, Rishi Nagar, Ujjain, Madhya Pradesh 456010",
  whatsapp: "919827042111", // Format: [CountryCode][Number] without '+'
  phone: "+91 98270 42111",
  email: "contact@skinhubujjain.com",
  instagramUrl: "https://www.instagram.com/skinhub_ujjain/",
  
  // Operational Hours for patients
  timings: "Monday - Saturday: 09:00 AM - 02:00 PM | 05:00 PM - 09:00 PM (Sunday Closed)",
  fee: "Rs. 200",
  
  /**
   * Primary Clinical Services Array
   * Each object contains clinical descriptions and price indicators used in Service sections.
   */
  services: [
    {
      id: "acne",
      name: "Acne & Scar Treatment",
      description: "Comprehensive medical-grade procedures including Salicylic Peels, Microneedling and customized prescription schemas for active acne.",
      price: "From ₹800/session"
    },
    {
      id: "hair",
      name: "Hair Regrowth & PRP Therapy",
      description: "Advanced Platelet-Rich Plasma (PRP) growth factor therapy and hair follicle nourishment models to restore scalp vitality.",
      price: "From ₹2,500/session"
    },
    {
      id: "whitening",
      name: "Skin Brightening & Yellow Peels",
      description: "Premium pigmentation therapy utilizing specialized Glutathione formulas, Vitamin C therapy, and high-precision Yellow Peels.",
      price: "From ₹1,500/session"
    },
    {
      id: "antiageing",
      name: "Anti-Ageing & Botox",
      description: "Dermal filler designs, Botox line corrections, and non-surgical aesthetic facelifts conducted with extreme scientific rigor.",
      price: "Varies - consult first"
    }
  ]
};

