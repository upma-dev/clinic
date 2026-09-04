// import { NextResponse } from 'next/server';
// import { getDb, COLLECTIONS } from '@/lib/mongodb';
// import { ObjectId } from 'mongodb';
// import { MeetingService } from '@/lib/services/MeetingService';
// import { NotificationService } from '@/lib/services/NotificationService';
// import { getClinicSettings } from '@/lib/db/settings';
// import { buildWhatsAppUrl } from '@/lib/whatsapp';

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const status = searchParams.get('status') || 'pending';

//     const db = await getDb();

//     // 1. Fetch from telemedicine_appointments
//     const teleQuery = status === 'all'
//       ? {}
//       : status === 'pending'
//         ? { status: { $in: ['pending', 'pending_staff_review'] } }
//         : { status };

//     const rawTele = await db.collection(COLLECTIONS.telemedicine_appointments)
//       .find(teleQuery)
//       .toArray();

//     const teleAppointments = rawTele.map(a => ({
//       ...a,
//       _id: a._id.toString(),
//       sourceCollection: 'telemedicine_appointments',
//       createdAt: a.createdAt
//     }));

//     // 2. Fetch from bookings where bookingType === 'online'
//     const bookingQuery: any = {
//       bookingType: 'online',
//       source: { $ne: 'walk-in' }
//     };

//     if (status !== 'all') {
//       bookingQuery.status = status;
//     }

//     const rawBookings = await db.collection(COLLECTIONS.bookings)
//       .find(bookingQuery)
//       .toArray();

//     // Auto-sync pending payment links for bookings
//     try {
//       const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
//       const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();
//       if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
//         const pendingBookings = rawBookings.filter(b => 
//           (b.paymentStatus === 'pending' || b.paymentStatus === 'unpaid') && 
//           b.razorpayPaymentLinkId && 
//           !b.razorpayPaymentLinkId.startsWith('mock_') && 
//           b.status !== 'cancelled' && 
//           b.status !== 'completed'
//         );

//         if (pendingBookings.length > 0) {
//           const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
//           const { createNotification } = await import('@/lib/db/notifications');

//           for (const booking of pendingBookings) {
//             try {
//               const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${booking.razorpayPaymentLinkId}`, {
//                 headers: { 'Authorization': `Basic ${authStr}` }
//               });
//               if (payRes.ok) {
//                 const payData = await payRes.json();
//                 if (payData.status === 'paid') {
//                   const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
//                   const paidTime = new Date().toISOString();

//                   await db.collection(COLLECTIONS.bookings).updateOne(
//                     { id: booking.id },
//                     { 
//                       $set: { 
//                         paymentStatus: 'paid',
//                         status: 'confirmed',
//                         razorpayPaymentId: payData.payments?.[0]?.payment_id || 'auto_verify',
//                         amountPaid: payData.amount_paid / 100,
//                         paidAt: paidTime,
//                         meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
//                         meetingPassword: roomPass,
//                         updatedAt: paidTime
//                       } 
//                     }
//                   );

//                   await createNotification(
//                     'payment_received',
//                     'Online Payment Verified (Auto)',
//                     `${booking.name} paid Rs. ${payData.amount_paid / 100} online. Video link generated.`
//                   );

//                   // Update in memory object
//                   booking.paymentStatus = 'paid';
//                   booking.status = 'confirmed';
//                   booking.razorpayPaymentId = payData.payments?.[0]?.payment_id || 'auto_verify';
//                   booking.amountPaid = payData.amount_paid / 100;
//                   booking.paidAt = paidTime;
//                   booking.meetingLink = `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`;
//                   booking.meetingPassword = roomPass;
//                 }
//               }
//             } catch (err) {
//               console.error(`Auto-sync failed for telemedicine booking ${booking.id}:`, err);
//             }
//           }
//         }
//       }
//     } catch (err) {
//       console.error('Error during auto-sync of telemedicine payment links:', err);
//     }

//     const bookingAppointments = rawBookings.map(b => ({
//       _id: b.id, // Use string ID for frontend consistency
//       id: b.id,
//       name: b.name,
//       phone: b.phone,
//       email: b.email,
//       age: b.age?.toString() || '',
//       gender: b.gender || '',
//       city: b.address || '',
//       state: '',
//       preferredDate: b.date,
//       preferredTimeSlot: b.time,
//       chiefComplaint: b.problemDescription || b.message || 'Online Video Consultation',
//       symptomsDuration: '',
//       previousMedicalHistory: b.previousMedication || '',
//       status: b.status,
//       paymentStatus: b.paymentStatus,
//       amountPaid: b.amountPaid,
//       meetingUrl: b.meetingLink,
//       meetingPassword: b.meetingPassword,
//       meetingLinkSent: b.meetingLinkSent,
//       razorpayPaymentLinkId: b.razorpayPaymentLinkId,
//       sourceCollection: 'bookings',
//       createdAt: b.createdAt,
//       service: b.service
//     }));

//     // Combine and sort by createdAt descending
//     const appointments = [...teleAppointments, ...bookingAppointments]
//       .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

//     return NextResponse.json({ appointments });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const data = await req.json();
//     const { action, appointmentId, patientName, email, date, time } = data;

//     const db = await getDb();
//     const isOPD = String(appointmentId).startsWith('SKNHB-');

//     if (action === 'mark-link-sent') {
//       if (isOPD) {
//         await db.collection(COLLECTIONS.bookings).updateOne(
//           { id: appointmentId },
//           { $set: { meetingLinkSent: true, updatedAt: new Date().toISOString() } }
//         );
//       } else {
//         await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
//           { _id: new ObjectId(appointmentId) },
//           { $set: { meetingLinkSent: true, updatedAt: new Date().toISOString() } }
//         );
//       }
//       return NextResponse.json({ success: true });
//     }

//     if (isOPD) {
//       // ─── BOOKINGS COLLECTION HANDLERS ───
//       const booking = await db.collection(COLLECTIONS.bookings).findOne({ id: appointmentId });
//       if (!booking) {
//         return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
//       }

//       if (action === 'confirm') {
//         const confirmSettings = await getClinicSettings();

//         let paymentLinkUrl = booking.razorpayPaymentLink;
//         let paymentLinkId = booking.razorpayPaymentLinkId;

//         if (!paymentLinkUrl || !paymentLinkId) {
//           const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
//           const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

//           if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
//             const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
//             const fee = confirmSettings.onlineConsultationFee || confirmSettings.consultationFee || 500;

//             try {
//               const payRes = await fetch('https://api.razorpay.com/v1/payment_links', {
//                 method: 'POST',
//                 headers: {
//                   'Content-Type': 'application/json',
//                   'Authorization': `Basic ${authStr}`
//                 },
//                 body: JSON.stringify({
//                   amount: fee * 100, // in paise
//                   currency: 'INR',
//                   accept_partial: false,
//                   reference_id: `${booking.id}_${Date.now()}`,
//                   description: `${confirmSettings.clinicName} Online Consultation Fee - ${booking.name}`,
//                   customer: {
//                     name: booking.name,
//                     contact: booking.phone.replace(/\D/g, '').slice(-10),
//                     email: booking.email || undefined
//                   },
//                   notify: { sms: false, email: false }
//                 })
//               });

//               const payData = await payRes.json();
//               if (payRes.ok) {
//                 paymentLinkUrl = payData.short_url;
//                 paymentLinkId = payData.id;
//               } else {
//                 throw new Error(payData.error?.description || 'Failed to create payment link');
//               }
//             } catch (err: any) {
//               return NextResponse.json({ error: err.message || 'Payment link creation failed' }, { status: 500 });
//             }
//           } else {
//             paymentLinkId = 'mock_plink_' + Date.now();
//             paymentLinkUrl = `${new URL(req.url).origin}/telemedicine/pay-mock?bookingId=${booking.id}`;
//           }

//           await db.collection(COLLECTIONS.bookings).updateOne(
//             { id: appointmentId },
//             { 
//               $set: { 
//                 paymentStatus: 'pending', 
//                 razorpayPaymentLink: paymentLinkUrl,
//                 razorpayPaymentLinkId: paymentLinkId,
//                 payOnline: true,
//                 updatedAt: new Date().toISOString()
//               } 
//             }
//           );
//         }

//         const payMsg = `*🌟 ${confirmSettings.clinicName} — Online Consultation Payment Request 💳*\n\nNamaste *${booking.name}*! 🙏\n\nAapki online consultation request review ho gayi hai. Niche diye gaye secure link par click karke payment complete karein aur apna slot confirm karein:\n\n🔗 *Payment Link:* ${paymentLinkUrl}\n\n*📋 Booking Details:*\n• *Booking ID:* #${booking.id}\n• *Service:* ${booking.service}\n• *Date:* ${booking.date}\n• *Time:* ${booking.time}\n\n*⚠️ Note:* Payment complete hote hi aapka slot officially book ho jayega aur video meeting link share kiya jayega.\n\nAapki skin health hamari priority hai! 💖\nDhanyawad! 🙏`;
//         const whatsappUrl = `https://wa.me/${booking.phone.replace(/\D/g, '')}?text=${encodeURIComponent(payMsg)}`;

//         return NextResponse.json({ success: true, whatsappUrl });
//       }

//       if (action === 'check-payment-db') {
//         const isPaidInDb = booking.paymentStatus === 'paid' || booking.paymentStatus === 'Paid';
//         if (isPaidInDb) {
//           return NextResponse.json({ success: true, paid: true, paymentStatus: booking.paymentStatus, status: booking.status });
//         }

//         if (booking.razorpayPaymentLinkId) {
//           const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
//           const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

//           if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
//             const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
//             try {
//               const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${booking.razorpayPaymentLinkId}`, {
//                 method: 'GET',
//                 headers: { 'Authorization': `Basic ${authStr}` }
//               });

//               if (payRes.ok) {
//                 const payData = await payRes.json();
//                 if (payData.status === 'paid') {
//                   const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
//                   await db.collection(COLLECTIONS.bookings).updateOne(
//                     { id: booking.id },
//                     { 
//                       $set: { 
//                         paymentStatus: 'paid',
//                         status: 'confirmed',
//                         razorpayPaymentId: payData.payments?.[0]?.payment_id || 'manual_verify',
//                         amountPaid: payData.amount_paid / 100,
//                         paidAt: new Date().toISOString(),
//                         meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
//                         meetingPassword: roomPass,
//                         updatedAt: new Date().toISOString()
//                       } 
//                     }
//                   );
//                   return NextResponse.json({ success: true, paid: true, paymentStatus: 'paid', status: 'confirmed' });
//                 }
//               }
//             } catch (err) {
//               console.error('Failed to sync status with Razorpay:', err);
//             }
//           } else if (booking.razorpayPaymentLinkId.startsWith('mock_plink_')) {
//             const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
//             const confirmSettings = await getClinicSettings();
//             const fee = confirmSettings.onlineConsultationFee || confirmSettings.consultationFee || 500;
//             await db.collection(COLLECTIONS.bookings).updateOne(
//               { id: booking.id },
//               { 
//                 $set: { 
//                   paymentStatus: 'paid',
//                   status: 'confirmed',
//                   razorpayPaymentId: 'mock_payment_' + Date.now(),
//                   amountPaid: fee,
//                   paidAt: new Date().toISOString(),
//                   meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
//                   meetingPassword: roomPass,
//                   updatedAt: new Date().toISOString()
//                 } 
//               }
//             );
//             return NextResponse.json({ success: true, paid: true, paymentStatus: 'paid', status: 'confirmed' });
//           }
//         }
//         return NextResponse.json({ success: true, paid: false, paymentStatus: booking.paymentStatus, status: booking.status });
//       }

//       if (action === 'complete') {
//         await db.collection(COLLECTIONS.bookings).updateOne(
//           { id: appointmentId },
//           { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
//         );
//         return NextResponse.json({ success: true });
//       }

//       if (action === 'cancel') {
//         await db.collection(COLLECTIONS.bookings).updateOne(
//           { id: appointmentId },
//           { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
//         );
//         return NextResponse.json({ success: true });
//       }
//     } else {
//       // ─── TELEMEDICINE COLLECTION HANDLERS ───
//       if (action === 'confirm') {
//         const meeting = MeetingService.generateMeeting(appointmentId, patientName);
//         await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
//           { _id: new ObjectId(appointmentId) },
//           { 
//             $set: { 
//               status: 'confirmed',
//               meetingProvider: meeting.provider,
//               meetingId: meeting.roomId,
//               meetingUrl: meeting.meetingUrl,
//               updatedAt: new Date().toISOString()
//             } 
//           }
//         );
//         await NotificationService.sendAppointmentConfirmed(email, patientName, date, time, meeting.meetingUrl);
//         return NextResponse.json({ success: true, meeting });
//       }

//       if (action === 'check-payment-db') {
//         const apt = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ _id: new ObjectId(appointmentId) });
//         const isPaid = apt?.paymentStatus === 'paid' || apt?.paymentStatus === 'Paid';
//         return NextResponse.json({ success: true, paid: isPaid, paymentStatus: apt?.paymentStatus || 'unpaid', status: apt?.status });
//       }

//       if (action === 'cancel') {
//         await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
//           { _id: new ObjectId(appointmentId) },
//           { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
//         );
//         return NextResponse.json({ success: true });
//       }

//       if (action === 'complete') {
//         await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
//           { _id: new ObjectId(appointmentId) },
//           { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
//         );
//         return NextResponse.json({ success: true });
//       }
//     }

//     return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ error: 'Action failed' }, { status: 500 });
//   }
// }




import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { MeetingService } from '@/lib/services/MeetingService';
import { NotificationService } from '@/lib/services/NotificationService';
import { getClinicSettings } from '@/lib/db/settings';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const db = await getDb();

    // 1. Fetch from telemedicine_appointments
    const teleQuery = status === 'all'
      ? {}
      : status === 'pending'
        ? { status: { $in: ['pending', 'pending_staff_review'] } }
        : { status };

    const rawTele = await db.collection(COLLECTIONS.telemedicine_appointments)
      .find(teleQuery)
      .toArray();

    const teleAppointments = rawTele.map(a => ({
      ...a,
      _id: a._id.toString(),
      sourceCollection: 'telemedicine_appointments',
      createdAt: a.createdAt,
      hasCaseFile: Boolean(
        a.hasCaseFile === true ||
        a.prescriptionSent === true ||
        a.caseFileSent === true ||
        (a.prescriptionPdfBase64 && String(a.prescriptionPdfBase64).length > 50) ||
        (a.prescriptionData && (
          (typeof a.prescriptionData.medicines === 'string' && a.prescriptionData.medicines.trim().length > 0) ||
          (typeof a.prescriptionData.advice === 'string' && a.prescriptionData.advice.trim().length > 0)
        ))
      )
    }));

    // 2. Fetch from bookings where bookingType === 'online'
    const bookingQuery: any = {
      bookingType: 'online',
      source: { $ne: 'walk-in' }
    };

    if (status !== 'all') {
      bookingQuery.status = status;
    }

    const rawBookings = await db.collection(COLLECTIONS.bookings)
      .find(bookingQuery)
      .toArray();

    // Auto-sync pending payment links for bookings
    try {
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();
      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        const pendingBookings = rawBookings.filter(b =>
          (b.paymentStatus === 'pending' || b.paymentStatus === 'unpaid') &&
          b.razorpayPaymentLinkId &&
          !b.razorpayPaymentLinkId.startsWith('mock_') &&
          b.status !== 'cancelled' &&
          b.status !== 'completed'
        );

        if (pendingBookings.length > 0) {
          const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
          const { createNotification } = await import('@/lib/db/notifications');

          for (const booking of pendingBookings) {
            try {
              const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${booking.razorpayPaymentLinkId}`, {
                headers: { 'Authorization': `Basic ${authStr}` }
              });
              if (payRes.ok) {
                const payData = await payRes.json();
                if (payData.status === 'paid') {
                  const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
                  const paidTime = new Date().toISOString();
                  const { addQueueEntry, getNextTokenNumber } = await import('@/lib/db/queue');
                  const tokenNumber = await getNextTokenNumber(booking.date);

                  await db.collection(COLLECTIONS.bookings).updateOne(
                    { id: booking.id },
                    {
                      $set: {
                        paymentStatus: 'paid',
                        status: 'confirmed',
                        tokenNumber,
                        razorpayPaymentId: payData.payments?.[0]?.payment_id || 'auto_verify',
                        amountPaid: payData.amount_paid / 100,
                        paidAt: paidTime,
                        meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
                        meetingPassword: roomPass,
                        updatedAt: paidTime
                      }
                    }
                  );

                  await addQueueEntry({
                    date: booking.date,
                    tokenNumber,
                    name: booking.name,
                    phone: booking.phone,
                    source: 'online',
                    bookingId: booking.id,
                    status: 'waiting',
                    estimatedWaitMinutes: 0,
                    scheduledTime: booking.time,
                    createdAt: new Date().toISOString(),
                  });

                  await createNotification(
                    'payment_received',
                    'Online Payment Verified (Auto)',
                    `${booking.name} paid Rs. ${payData.amount_paid / 100} online. Video link generated.${tokenNumber ? ` Token #${tokenNumber}` : ''}`
                  );

                  // Update in memory object
                  booking.paymentStatus = 'paid';
                  booking.status = 'confirmed';
                  booking.tokenNumber = tokenNumber;
                  booking.razorpayPaymentId = payData.payments?.[0]?.payment_id || 'auto_verify';
                  booking.amountPaid = payData.amount_paid / 100;
                  booking.paidAt = paidTime;
                  booking.meetingLink = `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`;
                  booking.meetingPassword = roomPass;
                }
              }
            } catch (err) {
              console.error(`Auto-sync failed for telemedicine booking ${booking.id}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during auto-sync of telemedicine payment links:', err);
    }

    const bookingAppointments = rawBookings.map(b => ({
      _id: b.id, // Use string ID for frontend consistency
      id: b.id,
      name: b.name,
      phone: b.phone,
      email: b.email,
      age: b.age?.toString() || '',
      gender: b.gender || '',
      city: b.address || '',
      state: '',
      preferredDate: b.date,
      preferredTimeSlot: b.time,
      chiefComplaint: b.problemDescription || b.message || 'Online Video Consultation',
      symptomsDuration: '',
      previousMedicalHistory: b.previousMedication || '',
      status: b.status,
      paymentStatus: b.paymentStatus,
      amountPaid: b.amountPaid,
      meetingUrl: b.meetingLink,
      meetingPassword: b.meetingPassword,
      meetingLinkSent: b.meetingLinkSent,
      razorpayPaymentLinkId: b.razorpayPaymentLinkId,
      sourceCollection: 'bookings',
      createdAt: b.createdAt,
      service: b.service,
      hasCaseFile: Boolean(
        b.hasCaseFile === true ||
        b.prescriptionSent === true ||
        b.caseFileSent === true ||
        (b.prescriptionPdfBase64 && String(b.prescriptionPdfBase64).length > 50) ||
        (b.prescriptionData && (
          (typeof b.prescriptionData.medicines === 'string' && b.prescriptionData.medicines.trim().length > 0) ||
          (typeof b.prescriptionData.advice === 'string' && b.prescriptionData.advice.trim().length > 0)
        ))
      ),
      prescriptionSent: Boolean(b.prescriptionSent),
      caseFileSent: Boolean(b.caseFileSent),
      prescriptionPdfBase64: b.prescriptionPdfBase64 || null,
      prescriptionData: b.prescriptionData || null
    }));

    // Combine and sort by createdAt descending
    const appointments = [...teleAppointments, ...bookingAppointments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { action, appointmentId, patientName, email, date, time } = data;

    const db = await getDb();
    const isOPD = String(appointmentId).startsWith('SKNHB-');

    if (action === 'notify-doctor') {
      const { createNotification } = await import('@/lib/db/notifications');
      await createNotification(
        'doctor-call',
        '👨‍⚕️ Telemedicine Patient Ready for Call',
        `Patient ${patientName} is ready and waiting for video call (${date} at ${time}). Meeting link sent by staff.`
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'mark-link-sent') {
      if (isOPD) {
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: appointmentId },
          { $set: { meetingLinkSent: true, updatedAt: new Date().toISOString() } }
        );
      } else {
        await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
          { _id: new ObjectId(appointmentId) },
          { $set: { meetingLinkSent: true, updatedAt: new Date().toISOString() } }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (isOPD) {
      // ─── BOOKINGS COLLECTION HANDLERS ───
      const booking = await db.collection(COLLECTIONS.bookings).findOne({ id: appointmentId });
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      if (action === 'confirm') {
        const confirmSettings = await getClinicSettings();

        let paymentLinkUrl = booking.razorpayPaymentLink;
        let paymentLinkId = booking.razorpayPaymentLinkId;

        if (!paymentLinkUrl || !paymentLinkId) {
          const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
          const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

          if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            const fee = confirmSettings.onlineConsultationFee || confirmSettings.consultationFee || 500;

            try {
              const payRes = await fetch('https://api.razorpay.com/v1/payment_links', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${authStr}`
                },
                body: JSON.stringify({
                  amount: fee * 100, // in paise
                  currency: 'INR',
                  accept_partial: false,
                  reference_id: `${booking.id}_${Date.now()}`,
                  description: `${confirmSettings.clinicName} Online Consultation Fee - ${booking.name}`,
                  customer: {
                    name: booking.name,
                    contact: booking.phone.replace(/\D/g, '').slice(-10),
                    email: booking.email || undefined
                  },
                  notify: { sms: false, email: false }
                })
              });

              const payData = await payRes.json();
              if (payRes.ok) {
                paymentLinkUrl = payData.short_url;
                paymentLinkId = payData.id;
              } else {
                console.error('Razorpay payment link creation failed:', payData);
                return NextResponse.json({ 
                  error: `Razorpay API Error: ${payData.error?.description || 'Failed to create payment link'}` 
                }, { status: 400 });
              }
            } catch (err: any) {
              console.error('Razorpay payment link API error:', err);
              return NextResponse.json({ 
                error: `Razorpay Connection Error: ${err.message || 'API connection failed'}` 
              }, { status: 500 });
            }
          } else {
            paymentLinkId = 'mock_plink_' + Date.now();
            paymentLinkUrl = `${new URL(req.url).origin}/telemedicine/pay-mock?bookingId=${booking.id}`;
          }


          await db.collection(COLLECTIONS.bookings).updateOne(
            { id: appointmentId },
            {
              $set: {
                paymentStatus: 'pending',
                razorpayPaymentLink: paymentLinkUrl,
                razorpayPaymentLinkId: paymentLinkId,
                payOnline: true,
                updatedAt: new Date().toISOString()
              }
            }
          );
        }

        const payMsg = `*🌟 ${confirmSettings.clinicName} — Online Consultation Payment Request 💳*\n\nNamaste *${booking.name}*! 🙏\n\nAapki online consultation request review ho gayi hai. Niche diye gaye secure link par click karke payment complete karein aur apna slot confirm karein:\n\n🔗 *Payment Link:* ${paymentLinkUrl}\n\n*📋 Booking Details:*\n• *Booking ID:* #${booking.id}\n• *Service:* ${booking.service}\n• *Date:* ${booking.date}\n• *Time:* ${booking.time}\n\n*⚠️ Note:* Payment complete hote hi aapka slot officially book ho jayega aur video meeting link share kiya jayega.\n\nAapki skin health hamari priority hai! 💖\nDhanyawad! 🙏`;
        const whatsappUrl = `https://wa.me/${booking.phone.replace(/\D/g, '')}?text=${encodeURIComponent(payMsg)}`;

        return NextResponse.json({ success: true, whatsappUrl });
      }

      if (action === 'check-payment-db') {
        const isPaidInDb = booking.paymentStatus === 'paid' || booking.paymentStatus === 'Paid';
        if (isPaidInDb) {
          return NextResponse.json({ success: true, paid: true, paymentStatus: booking.paymentStatus, status: booking.status });
        }

        if (booking.razorpayPaymentLinkId) {
          const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
          const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

          if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            try {
              const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${booking.razorpayPaymentLinkId}`, {
                method: 'GET',
                headers: { 'Authorization': `Basic ${authStr}` }
              });

              if (payRes.ok) {
                const payData = await payRes.json();
                if (payData.status === 'paid') {
                  const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
                  const { addQueueEntry, getNextTokenNumber } = await import('@/lib/db/queue');
                  const tokenNumber = await getNextTokenNumber(booking.date);
                  await db.collection(COLLECTIONS.bookings).updateOne(
                    { id: booking.id },
                    {
                      $set: {
                        paymentStatus: 'paid',
                        status: 'confirmed',
                        tokenNumber,
                        razorpayPaymentId: payData.payments?.[0]?.payment_id || 'manual_verify',
                        amountPaid: payData.amount_paid / 100,
                        paidAt: new Date().toISOString(),
                        meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
                        meetingPassword: roomPass,
                        updatedAt: new Date().toISOString()
                      }
                    }
                  );

                  await addQueueEntry({
                    date: booking.date,
                    tokenNumber,
                    name: booking.name,
                    phone: booking.phone,
                    source: 'online',
                    bookingId: booking.id,
                    status: 'waiting',
                    estimatedWaitMinutes: 0,
                    scheduledTime: booking.time,
                    createdAt: new Date().toISOString(),
                  });

                  return NextResponse.json({ success: true, paid: true, paymentStatus: 'paid', status: 'confirmed', tokenNumber });
                }
              }
            } catch (err) {
              console.error('Failed to sync status with Razorpay:', err);
            }
          } else if (booking.razorpayPaymentLinkId.startsWith('mock_plink_')) {
            const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
            const confirmSettings = await getClinicSettings();
            const fee = confirmSettings.onlineConsultationFee || confirmSettings.consultationFee || 500;
            const { addQueueEntry, getNextTokenNumber } = await import('@/lib/db/queue');
            const tokenNumber = await getNextTokenNumber(booking.date);

            await db.collection(COLLECTIONS.bookings).updateOne(
              { id: booking.id },
              {
                $set: {
                  paymentStatus: 'paid',
                  status: 'confirmed',
                  tokenNumber,
                  razorpayPaymentId: 'mock_payment_' + Date.now(),
                  amountPaid: fee,
                  paidAt: new Date().toISOString(),
                  meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
                  meetingPassword: roomPass,
                  updatedAt: new Date().toISOString()
                }
              }
            );

            await addQueueEntry({
              date: booking.date,
              tokenNumber,
              name: booking.name,
              phone: booking.phone,
              source: 'online',
              bookingId: booking.id,
              status: 'waiting',
              estimatedWaitMinutes: 0,
              scheduledTime: booking.time,
              createdAt: new Date().toISOString(),
            });

            return NextResponse.json({ success: true, paid: true, paymentStatus: 'paid', status: 'confirmed', tokenNumber });
          }
        }
        return NextResponse.json({ success: true, paid: false, paymentStatus: booking.paymentStatus, status: booking.status });
      }

      if (action === 'complete') {
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: appointmentId },
          { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
        );
        return NextResponse.json({ success: true });
      }

      if (action === 'cancel') {
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: appointmentId },
          { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
        );
        return NextResponse.json({ success: true });
      }
    } else {
      // ─── TELEMEDICINE COLLECTION HANDLERS ───
      if (action === 'confirm') {
        const meeting = MeetingService.generateMeeting(appointmentId, patientName);
        await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
          { _id: new ObjectId(appointmentId) },
          {
            $set: {
              status: 'confirmed',
              meetingProvider: meeting.provider,
              meetingId: meeting.roomId,
              meetingUrl: meeting.meetingUrl,
              updatedAt: new Date().toISOString()
            }
          }
        );
        await NotificationService.sendAppointmentConfirmed(email, patientName, date, time, meeting.meetingUrl);
        return NextResponse.json({ success: true, meeting });
      }

      if (action === 'check-payment-db') {
        const apt = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ _id: new ObjectId(appointmentId) });
        const isPaid = apt?.paymentStatus === 'paid' || apt?.paymentStatus === 'Paid';
        return NextResponse.json({ success: true, paid: isPaid, paymentStatus: apt?.paymentStatus || 'unpaid', status: apt?.status });
      }

      if (action === 'cancel') {
        await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
          { _id: new ObjectId(appointmentId) },
          { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
        );
        return NextResponse.json({ success: true });
      }

      if (action === 'complete') {
        await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
          { _id: new ObjectId(appointmentId) },
          { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
        );
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}