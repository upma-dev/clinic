import { getDb, COLLECTIONS } from '../mongodb';
import type { CMSContent } from '../types';

const DEFAULT_CMS: CMSContent = {
  bannerText: "Best Dermatologist in Ujjain — Book online to skip the queue",
  bannerLink: "/booking",
  bannerEnabled: true,

  heroTitleLine1: "Best Dermatologist in Ujjain",
  heroTitleLine2: "Skin, Hair & Laser Clinic",
  heroSubtitle: "Dr. Prateek Tiwari — Best Dermatologist & Hair Specialist in Rishi Nagar, Ujjain",
  heroDescription: "Advanced medical dermatology, PRP hair growth therapy, chemical yellow peels & US-FDA approved laser treatments by Dr. Prateek Tiwari (MBBS, DVD) in Rishi Nagar, Ujjain.",
  heroBadge1: "4.8★ TOP DERMATOLOGIST IN UJJAIN",
  heroBadge2: "RISHI NAGAR SKIN & LASER CLINIC",
  heroExperienceBadge: "12+ Years",
  heroImageUrl: "/assets/doctor.png",
  heroExperienceText: "EXPERIENCE",

  aboutTitle: "Dr. Prateek Tiwari",
  aboutSubtitle: "MBBS, DVD (Dermatology)",
  aboutDescription: "With over 12 years of dedicated practice in dermatology and cosmetology, Dr. Prateek Tiwari has helped thousands of patients across Ujjain and Madhya Pradesh achieve healthier skin and restored confidence. His patient-first philosophy combines evidence-based medicine with modern aesthetic science.",
  aboutStats: [
    { value: '12+', label: 'Years Experience' },
    { value: '5,000+', label: 'Patients Treated' },
    { value: '4.8★', label: 'Google Rating' },
    { value: '15+', label: 'Treatments' }
  ],
  aboutCredentials: [
    'MBBS — Bachelor of Medicine and Surgery',
    'DVD — Diploma in Venereology & Dermatology',
    'Specialist in PRP Hair Therapy & Chemical Peels',
    'Advanced Training in Aesthetic Cosmetology',
    'Registered Medical Practitioner, Madhya Pradesh'
  ],
  aboutDoctorImage: "/assets/doctor.png",

  services: [
    {
      id: "acne",
      name: "Acne & Scar Treatment",
      description: "Comprehensive medical-grade procedures including Salicylic Peels, Microneedling and customized prescription schemas for active acne.",
      price: "From ₹800/session",
      imageUrl: "https://picsum.photos/seed/acne/800/500"
    },
    {
      id: "hair",
      name: "Hair Regrowth & PRP Therapy",
      description: "Advanced Platelet-Rich Plasma (PRP) growth factor therapy and hair follicle nourishment models to restore scalp vitality.",
      price: "From ₹2,500/session",
      imageUrl: "https://picsum.photos/seed/hair/800/500"
    },
    {
      id: "whitening",
      name: "Skin Brightening & Yellow Peels",
      description: "Premium pigmentation therapy utilizing specialized Glutathione formulas, Vitamin C therapy, and high-precision Yellow Peels.",
      price: "From ₹1,500/session",
      imageUrl: "https://picsum.photos/seed/yellow/800/500"
    },
    {
      id: "antiageing",
      name: "Anti-Ageing & Botox",
      description: "Dermal filler designs, Botox line corrections, and non-surgical aesthetic facelifts conducted with extreme scientific rigor.",
      price: "Varies - consult first",
      imageUrl: "https://picsum.photos/seed/antiaging/800/500"
    }
  ],

  faqs: [
    { question: "What are your consultation timings?", answer: "We are open Monday to Saturday, 09:00 AM to 02:00 PM and 05:00 PM to 09:00 PM. Sundays we are closed." },
    { question: "Do you offer online consultations?", answer: "Yes, you can schedule an online video consultation from our booking section, and consult from the comfort of your home." },
    { question: "How do I check my queue status?", answer: "You can check the live token status in real-time under our Portals section using your phone number." }
  ],

  testimonials: [
    { name: "Rahul Sharma", text: "Dr. Prateek is outstanding. My acne issues of 5 years were resolved in just 3 months of customized treatment. Highly recommended!", rating: 5, role: "Acne Patient" },
    { name: "Aditi Vyas", text: "Best PRP hair treatment in Ujjain. The results are visible after just 3 sessions. Staff is polite and professional.", rating: 5, role: "PRP Patient" },
    { name: "Vijay Patidar", text: "Very professional clinic. Online queue management is very helpful. I registered online and got served on time.", rating: 5, role: "Skin Checkup" }
  ],

  gallery: [
    { id: "g1", title: "Main Clinic Entrance", imageUrl: "/assets/clinic-entrance.jpg", category: "Clinic" },
    { id: "g2", title: "Consultation Room", imageUrl: "/assets/clinic-consultation.jpg", category: "Clinic" },
    { id: "g3", title: "PRP Session In Progress", imageUrl: "/assets/clinic-treatment.jpg", category: "Treatment" }
  ],

  contactAddress: "Skin Hub & Physio Centre, Rishi Nagar, Ujjain, Madhya Pradesh 456010",
  contactPhone: "+91 98270 42111",
  contactWhatsapp: "919827042111",
  contactEmail: "contact@skinhubujjain.com",
  contactTimings: "Monday - Saturday: 09:00 AM - 02:00 PM | 05:00 PM - 09:00 PM (Sunday Closed)",
  googleMapsEmbed: "https://www.google.com/maps?q=Rishi+Nagar+Ujjain+Madhya+Pradesh&output=embed",

  instagramUrl: "https://www.instagram.com/skinhub_ujjain/",
  facebookUrl: "https://facebook.com",
  youtubeUrl: "https://youtube.com",
  twitterUrl: "https://twitter.com",

  footerText: "Premium, board-certified medical dermatology clinic led by senior consultant Dr. Prateek Tiwari. Restoring skin confidence and vitality through clinical excellence in Ujjain.",
  copyrightText: "Skin Hub Clinic. All rights reserved globally in Ujjain, India.",
  clinicPhotos: [
    "/assets/clinic-entrance.jpg",
    "/assets/clinic-consultation.jpg",
    "/assets/clinic-treatment.jpg"
  ]
};

export async function getCmsSettings(): Promise<CMSContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CMSContent>(COLLECTIONS.cms).findOne({});
    if (!doc) {
      const { _id, ...defaults } = DEFAULT_CMS;
      await db.collection(COLLECTIONS.cms).insertOne(defaults);
      return DEFAULT_CMS;
    }
    const { _id, ...rest } = doc;
    return { ...DEFAULT_CMS, ...rest };
  } catch {
    return DEFAULT_CMS;
  }
}

export async function updateCmsSettings(patch: Partial<CMSContent>): Promise<CMSContent> {
  const db = await getDb();
  await db.collection(COLLECTIONS.cms).updateOne(
    {},
    { $set: patch },
    { upsert: true }
  );
  return getCmsSettings();
}
