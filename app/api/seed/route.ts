import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { todayISO } from '@/lib/slots';

export async function GET() {
  return seedDatabase();
}

export async function POST() {
  return seedDatabase();
}

async function seedDatabase() {
  try {
    const db = await getDb();

    const today = todayISO() || new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 1. Safe Seeding (deleteMany disabled to protect user data)
    /*
    await Promise.all([
      db.collection(COLLECTIONS.settings).deleteMany({}),
      db.collection(COLLECTIONS.cms).deleteMany({}),
      db.collection(COLLECTIONS.blogs).deleteMany({}),
      db.collection(COLLECTIONS.patients).deleteMany({}),
      db.collection(COLLECTIONS.bookings).deleteMany({}),
      db.collection(COLLECTIONS.dailyQueue).deleteMany({}),
      db.collection(COLLECTIONS.queue).deleteMany({}),
      db.collection(COLLECTIONS.telemedicine_appointments).deleteMany({}),
      db.collection(COLLECTIONS.telemedicine_consultations).deleteMany({}),
      db.collection(COLLECTIONS.notifications).deleteMany({}),
      db.collection(COLLECTIONS.walkin_requests).deleteMany({}),
    ]);
    */

    // 2. Clinic Settings
    const settings = {
      clinicName: 'Skin Hub Dermatology & Aesthetics',
      doctorName: 'Dr. Somya Sharma',
      clinicAddress: '102 Medical Hub, Park Road, Civil Lines, New Delhi - 110054',
      clinicPhone: '+91 98765 43210',
      clinicEmail: 'contact@skinhubclinic.com',
      morningStart: '09:00',
      morningEnd: '14:00',
      eveningStart: '17:00',
      eveningEnd: '21:00',
      lunchStart: '14:00',
      lunchEnd: '17:00',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      holidays: [],
      consultationFee: 700,
      onlineConsultationFee: 600,
      offlineConsultationFee: 700,
      emergencyFee: 1200,
      maxPatientsPerHour: 4,
      maxOnlineSlots: 15,
      maxOfflineSlots: 25,
      slotDurationMinutes: 15,
      reminderTimeMinutes: 60,
      maxBookingsPerDay: 40,
      bookingCutoffHour: 20,
      bookingCutoffMinute: 0,
      blockedSlots: [],
      enableOnlineBooking: true,
      onlineDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      onlineStart: '09:00',
      onlineEnd: '18:00',
      onlineSlotDuration: 20,
      onlineBreakStart: '14:00',
      onlineBreakEnd: '15:00',
      onlineMaxDailyBooking: 15,
      bookingBufferHours: 1,
      onlineHolidayExceptions: [],
      onlinePaymentMandatory: false,
      onlineRequiresApproval: false,
      emailTemplates: {
        booked: 'Dear {patient_name}, your appointment is booked for {date} at {time}.',
        confirmed: 'Dear {patient_name}, your appointment has been confirmed by Skin Hub.',
        paymentSuccess: 'Payment of ₹{amount} received successfully for booking #{id}.',
        paymentFailed: 'Payment attempt failed for booking #{id}. Please retry.',
        cancelled: 'Your appointment for {date} has been cancelled.',
        rescheduled: 'Your appointment has been rescheduled to {date} at {time}.',
        doctorDelayed: 'Doctor is running ~15 mins delayed today. Thank you for your patience.',
        reminderBefore: 'Reminder: You have an upcoming appointment today at {time}.',
        followUp: 'Hope you are recovering well! Please book your follow-up visit.',
        prescriptionReady: 'Your prescription is ready to download in your portal.',
      },
    };
    await db.collection(COLLECTIONS.settings).insertOne(settings);

    // 3. CMS Data
    const cmsData = {
      bannerText: '✨ Special Summer Glow Offer: Flat 20% Off on HydraFacial & Chemical Peels!',
      bannerLink: '/services',
      bannerEnabled: true,
      heroTitleLine1: 'Advanced Skin & Laser Care',
      heroTitleLine2: 'For Radiant, Healthy Skin',
      heroSubtitle: 'Personalized Clinical Treatments by Board Certified Dermatologist',
      heroDescription: 'State-of-the-art US-FDA approved technologies for Acne, Hyperpigmentation, Hair Loss & Anti-Aging.',
      heroBadge1: '★ 4.9 Star Patient Reviews',
      heroBadge2: '✓ 10,000+ Treatments Done',
      heroExperienceBadge: '12+ Years Experience',
      heroImageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
      heroExperienceText: 'Dr. Somya Sharma, MD Dermatology',
      aboutTitle: 'About Skin Hub Clinic',
      aboutSubtitle: 'Excellence in Aesthetic & Medical Dermatology',
      aboutDescription: 'Skin Hub is a premiere dermatology and skin aesthetics center dedicated to delivering science-backed skin treatments.',
      aboutStats: [
        { value: '10,000+', label: 'Satisfied Patients' },
        { value: '12+', label: 'Years Experience' },
        { value: '99%', label: 'Clinical Efficacy' },
        { value: '15+', label: 'Advanced Lasers' },
      ],
      aboutCredentials: [
        'MD Dermatology, Venereology & Leprosy',
        'Member of Indian Association of Dermatologists (IADVL)',
        'Certified Aesthetic Laser Practitioner (Germany)',
      ],
      aboutDoctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
      services: [
        {
          id: 'acne-care',
          name: 'Acne & Scar Rejuvenation',
          description: 'Custom chemical peels, subcision, and RF Microneedling for deep acne scar reduction.',
          price: '₹1,500 - ₹3,500',
          imageUrl: 'https://images.unsplash.com/photo-1512290900673-4923f5e557b6?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'laser-hair',
          name: 'Painless Laser Hair Reduction',
          description: 'FDA approved US-FDA Triple Wavelength Diode Laser for permanent hair reduction.',
          price: '₹2,000 - ₹5,000',
          imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'hydrafacial',
          name: 'HydraFacial & Medifacials',
          description: 'Deep pore extraction, exfoliation, antioxidant serum infusion for instant red-carpet glow.',
          price: '₹2,500 - ₹4,500',
          imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'prp-hair',
          name: 'GFC & PRP Hair Regrowth Therapy',
          description: 'Concentrated growth factor concentrate injections to reverse hair thinning and boost density.',
          price: '₹3,000 - ₹6,000',
          imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
        },
      ],
      faqs: [
        { question: 'Is a consultation required before starting laser treatment?', answer: 'Yes, Dr. Somya evaluates your skin tone, patch test, and medical history first.' },
        { question: 'How long does a HydraFacial session take?', answer: 'Each session takes approximately 45 to 60 minutes with zero downtime.' },
      ],
      testimonials: [
        { name: 'Ritu Kapoor', rating: 5, role: 'IT Professional', text: 'Dr. Somya cleared my cystic acne in 3 months! Best skin clinic in town.', imageUrl: '' },
        { name: 'Karan Mehra', rating: 5, role: 'Business Owner', text: 'Extremely professional staff and zero queue waiting time with their digital system.', imageUrl: '' },
      ],
      gallery: [],
      contactAddress: '102 Medical Hub, Park Road, Civil Lines, New Delhi - 110054',
      contactPhone: '+91 98765 43210',
      contactWhatsapp: '+91 98765 43210',
      contactEmail: 'contact@skinhubclinic.com',
      contactTimings: 'Mon - Sat: 9:00 AM - 2:00 PM & 5:00 PM - 9:00 PM | Sun: Closed',
      googleMapsEmbed: '',
      instagramUrl: 'https://instagram.com',
      facebookUrl: 'https://facebook.com',
      youtubeUrl: 'https://youtube.com',
      twitterUrl: 'https://twitter.com',
      footerText: 'Skin Hub Dermatology & Aesthetic Clinic — Your trusted skin health partner.',
      copyrightText: '© 2026 Skin Hub Clinic. All Rights Reserved.',
      clinicPhotos: [],
    };
    await db.collection(COLLECTIONS.cms).insertOne(cmsData);

    // 4. Patients
    const patients = [
      { id: 'pat_1', name: 'Rahul Sharma', phone: '+919876543210', createdAt: new Date().toISOString() },
      { id: 'pat_2', name: 'Ananya Verma', phone: '+919812345678', createdAt: new Date().toISOString() },
      { id: 'pat_3', name: 'Vikram Malhotra', phone: '+919899887766', createdAt: new Date().toISOString() },
      { id: 'pat_4', name: 'Priya Patel', phone: '+919711223344', createdAt: new Date().toISOString() },
      { id: 'pat_5', name: 'Amit Singh', phone: '+919655443322', createdAt: new Date().toISOString() },
      { id: 'pat_6', name: 'Sneha Kapoor', phone: '+919544332211', createdAt: new Date().toISOString() },
    ];
    await db.collection(COLLECTIONS.patients).insertMany(patients);

    // 5. Bookings
    const bookings = [
      {
        id: 'bk_101',
        name: 'Rahul Sharma',
        phone: '+919876543210',
        email: 'rahul.s@example.com',
        service: 'Acne & Scar Rejuvenation',
        date: today,
        time: '09:30 AM',
        status: 'completed',
        source: 'online',
        payOnline: true,
        paymentStatus: 'Paid',
        amountPaid: 700,
        paidAt: new Date().toISOString(),
        tokenNumber: 1,
        createdAt: new Date().toISOString(),
        age: 26,
        gender: 'Male',
        skinType: 'Oily / Acne Prone',
        problemDescription: 'Acne breakouts on forehead and cheeks for 4 months.',
      },
      {
        id: 'bk_102',
        name: 'Ananya Verma',
        phone: '+919812345678',
        email: 'ananya.v@example.com',
        service: 'HydraFacial & Medifacials',
        date: today,
        time: '10:00 AM',
        status: 'arrived',
        source: 'walk-in',
        payOnline: false,
        paymentStatus: 'Paid',
        amountPaid: 700,
        paidAt: new Date().toISOString(),
        tokenNumber: 2,
        createdAt: new Date().toISOString(),
        age: 29,
        gender: 'Female',
        skinType: 'Combination',
        problemDescription: 'Dull skin and blackheads around nose.',
      },
      {
        id: 'bk_103',
        name: 'Vikram Malhotra',
        phone: '+919899887766',
        email: 'vikram.m@example.com',
        service: 'GFC & PRP Hair Regrowth Therapy',
        date: today,
        time: '10:30 AM',
        status: 'confirmed',
        source: 'online',
        payOnline: true,
        paymentStatus: 'Paid',
        amountPaid: 600,
        paidAt: new Date().toISOString(),
        tokenNumber: 3,
        createdAt: new Date().toISOString(),
        age: 34,
        gender: 'Male',
        skinType: 'Normal',
        problemDescription: 'Hair thinning at crown area and hairline recession.',
      },
      {
        id: 'bk_104',
        name: 'Priya Patel',
        phone: '+919711223344',
        email: 'priya.p@example.com',
        service: 'Painless Laser Hair Reduction',
        date: today,
        time: '11:00 AM',
        status: 'confirmed',
        source: 'online',
        payOnline: false,
        paymentStatus: 'Pending',
        tokenNumber: 4,
        createdAt: new Date().toISOString(),
        age: 24,
        gender: 'Female',
        skinType: 'Sensitive',
        problemDescription: 'Laser hair removal consultation for full face.',
      },
      {
        id: 'bk_105',
        name: 'Amit Singh',
        phone: '+919655443322',
        email: 'amit.s@example.com',
        service: 'General Dermatology',
        date: today,
        time: '05:30 PM',
        status: 'pending',
        source: 'walk-in',
        payOnline: false,
        paymentStatus: 'Pending',
        tokenNumber: 5,
        createdAt: new Date().toISOString(),
        age: 38,
        gender: 'Male',
        skinType: 'Dry',
        problemDescription: 'Eczema patch on right elbow.',
      },
      {
        id: 'bk_201',
        name: 'Sneha Kapoor',
        phone: '+919544332211',
        email: 'sneha.k@example.com',
        service: 'Acne & Scar Rejuvenation',
        date: tomorrow,
        time: '09:45 AM',
        status: 'confirmed',
        source: 'online',
        payOnline: true,
        paymentStatus: 'Paid',
        amountPaid: 700,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bk_202',
        name: 'Kavita Roy',
        phone: '+919433221100',
        email: 'kavita.r@example.com',
        service: 'Anti-Aging & Botox',
        date: tomorrow,
        time: '11:30 AM',
        status: 'confirmed',
        source: 'online',
        payOnline: true,
        paymentStatus: 'Paid',
        amountPaid: 700,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bk_001',
        name: 'Rajesh Gupta',
        phone: '+919322110099',
        email: 'rajesh.g@example.com',
        service: 'General Dermatology',
        date: yesterday,
        time: '10:15 AM',
        status: 'completed',
        source: 'walk-in',
        payOnline: false,
        paymentStatus: 'Paid',
        amountPaid: 700,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    await db.collection(COLLECTIONS.bookings).insertMany(bookings);

    // 6. Daily Queue & Queue Entries (for Live Queue Management in Admin)
    const dailyQueue = {
      date: today,
      currentToken: 2,
      totalPatientsToday: 4,
      estimatedWaitMinutes: 20,
      congestion: 'yellow',
      message: 'Dr. Somya is currently consulting Patient #2 (Ananya Verma).',
      nextPatientName: 'Vikram Malhotra',
      status: 'active',
      lastUpdated: new Date().toISOString(),
    };
    await db.collection(COLLECTIONS.dailyQueue).insertOne(dailyQueue);

    const queueEntries = [
      {
        date: today,
        bookingId: 'bk_101',
        name: 'Rahul Sharma',
        phone: '+919876543210',
        source: 'online',
        status: 'done',
        priority: 0,
        estimatedWaitMinutes: 0,
        scheduledTime: '09:30 AM',
        createdAt: new Date().toISOString(),
      },
      {
        date: today,
        bookingId: 'bk_102',
        name: 'Ananya Verma',
        phone: '+919812345678',
        source: 'walk-in',
        status: 'serving',
        priority: 0,
        estimatedWaitMinutes: 0,
        scheduledTime: '10:00 AM',
        createdAt: new Date().toISOString(),
      },
      {
        date: today,
        bookingId: 'bk_103',
        name: 'Vikram Malhotra',
        phone: '+919899887766',
        source: 'online',
        status: 'waiting',
        priority: 0,
        estimatedWaitMinutes: 15,
        scheduledTime: '10:30 AM',
        createdAt: new Date().toISOString(),
      },
      {
        date: meTodayDate(today, 'bk_104'),
        bookingId: 'bk_104',
        name: 'Priya Patel',
        phone: '+919711223344',
        source: 'online',
        status: 'waiting',
        priority: 1,
        estimatedWaitMinutes: 30,
        scheduledTime: '11:00 AM',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.collection(COLLECTIONS.queue).insertMany(
      queueEntries.map((e) => ({ ...e, date: today }))
    );

    // 7. Telemedicine Appointments & Questionnaires
    const teleAppointments = [
      {
        patientId: 'pat_6',
        name: 'Sneha Kapoor',
        phone: '+919544332211',
        email: 'sneha.k@example.com',
        age: '25',
        gender: 'Female',
        city: 'Mumbai',
        state: 'Maharashtra',
        preferredDate: today,
        preferredTimeSlot: '04:00 PM',
        chiefComplaint: 'Severe Cystic Acne flare up after travel',
        symptomsDuration: '2 weeks',
        previousMedicalHistory: 'PCOS history',
        currentMedicines: 'None',
        knownAllergies: 'Sulfonamides',
        preferredLanguage: 'English / Hindi',
        status: 'confirmed',
        paymentStatus: 'paid',
        amountPaid: 600,
        meetingProvider: 'Jitsi',
        meetingUrl: 'https://meet.jit.si/SkinHub-Consult-SnehaKapoor-sneha2026',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        patientId: 'pat_3',
        name: 'Vikram Malhotra',
        phone: '+919899887766',
        email: 'vikram.m@example.com',
        age: '34',
        gender: 'Male',
        city: 'Chandigarh',
        state: 'Punjab',
        preferredDate: tomorrow,
        preferredTimeSlot: '05:00 PM',
        chiefComplaint: 'Hair loss and scalp itching',
        symptomsDuration: '3 months',
        previousMedicalHistory: 'Thyroid within normal limits',
        preferredLanguage: 'Hindi',
        status: 'pending',
        paymentStatus: 'paid',
        amountPaid: 600,
        meetingProvider: 'Jitsi',
        meetingUrl: 'https://meet.jit.si/SkinHub-Consult-VikramMalhotra-vikram2026',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const teleResult = await db.collection(COLLECTIONS.telemedicine_appointments).insertMany(teleAppointments);
    const snehaAptId = teleResult.insertedIds[0].toString();
    const vikramAptId = teleResult.insertedIds[1].toString();

    // Clear and Seed Questionnaires
    await db.collection(COLLECTIONS.telemedicine_questionnaires).deleteMany({});
    await db.collection(COLLECTIONS.telemedicine_questionnaires).insertMany([
      {
        appointmentId: snehaAptId,
        patientId: 'pat_6',
        currentSymptoms: 'Severe Cystic Acne breakouts on cheeks and chin, redness and painful inflammation',
        durationOfSymptoms: '3 weeks',
        severityLevel: 'Severe',
        previousTreatments: 'Salicylic Acid 2% wash, OTC Benzoyl Peroxide gel',
        currentMedicines: 'Multivitamins daily',
        knownAllergies: 'Sulfonamides',
        medicalConditions: 'PCOS diagnosed 2 years ago',
        additionalSkinPhotos: [
          'https://images.unsplash.com/photo-1512290900673-4923f5e557b6?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80'
        ],
        additionalNotes: 'Breakouts increased significantly after recent travel and stress.',
        consentGiven: true,
        status: 'completed',
        completedAt: new Date().toISOString()
      },
      {
        appointmentId: vikramAptId,
        patientId: 'pat_3',
        currentSymptoms: 'Hair thinning at vertex/crown and hairline recession with scalp itching',
        durationOfSymptoms: '3 months',
        severityLevel: 'Moderate',
        previousTreatments: 'Minoxidil 5% topical solution for 1 month',
        currentMedicines: 'Biotin supplements',
        knownAllergies: 'None',
        medicalConditions: 'None',
        additionalNotes: 'Family history of male pattern baldness.',
        consentGiven: true,
        status: 'completed',
        completedAt: new Date().toISOString()
      }
    ]);

    // 8. Notifications
    const notifications = [
      {
        id: 'notif_1',
        type: 'booking_new',
        title: 'New Online Booking',
        message: 'Vikram Malhotra booked Hair Regrowth consultation for today at 10:30 AM.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_2',
        type: 'patient_arrived',
        title: 'Patient Checked In',
        message: 'Ananya Verma arrived at clinic for HydraFacial consultation.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_3',
        type: 'payment_received',
        title: 'Payment Received ₹600',
        message: 'Telemedicine consultation fee paid by Sneha Kapoor via Razorpay.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_4',
        type: 'queue_update',
        title: 'Queue Live Status',
        message: '4 total patients registered for today. Current serving: Token #2.',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ];
    await db.collection(COLLECTIONS.notifications).insertMany(notifications);

    // 9. Walk-in Requests
    const walkins = [
      {
        name: 'Neha Gupta',
        phone: '+919811002233',
        age: 28,
        service: 'Allergy Consultation',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.collection(COLLECTIONS.walkin_requests).insertMany(walkins);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with clean, realistic clinical data!',
      details: {
        settings: 1,
        cms: 1,
        patients: patients.length,
        bookings: bookings.length,
        queueEntries: queueEntries.length,
        telemedicineAppointments: teleAppointments.length,
        notifications: notifications.length,
      },
    });
  } catch (error: any) {
    console.error('Database seed error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed database' },
      { status: 500 }
    );
  }
}

function meTodayDate(today: string, _id: string) {
  return today;
}
