import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createBooking,
  isSlotTaken,
  countBookingsForDate,
} from "@/lib/db/bookings";
import { getClinicSettings } from "@/lib/db/settings";
import { addQueueEntry, getNextTokenNumber } from "@/lib/db/queue";
import { createNotification } from "@/lib/db/notifications";
import { isBookingClosedForDate, timeToMinutes, parseHHMM } from "@/lib/slots";
import type { Booking } from "@/lib/types";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = req.nextUrl.searchParams.get('date');
  const limitParam = req.nextUrl.searchParams.get('limit');
  const parsedLimit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 2000;
  const { getAllBookings, getAllBookingsForDate } = await import("@/lib/db/bookings");
  const list = dateParam ? await getAllBookingsForDate(dateParam) : await getAllBookings(parsedLimit);

  // Auto-sync pending payment links with Razorpay directly on poll
  try {
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      const db = await getDb();
      // Find all bookings with pending payment links (ignore mock links)
      const pendingBookings = list.filter((b: Booking) => 
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

                // Update database
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
                  source: booking.source || 'online',
                  bookingId: booking.id,
                  status: 'waiting',
                  estimatedWaitMinutes: 0,
                  scheduledTime: booking.time,
                  createdAt: new Date().toISOString(),
                });

                // Create notification
                await createNotification(
                  'payment_received',
                  'Online Payment Verified (Auto)',
                  `${booking.name} paid Rs. ${payData.amount_paid / 100} online. Video link generated.${tokenNumber ? ` Token #${tokenNumber}` : ''}`
                );

                // Update in-memory list for immediate return
                const match = list.find((b: Booking) => b.id === booking.id);
                if (match) {
                  match.paymentStatus = 'paid';
                  match.status = 'confirmed';
                  match.tokenNumber = tokenNumber;
                  match.amountPaid = payData.amount_paid / 100;
                  match.meetingLink = `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`;
                  match.meetingPassword = roomPass;
                  match.paidAt = paidTime;
                }
              }
            }
          } catch (err) {
            console.error(`Auto-sync failed for booking ${booking.id}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error during auto-sync of payment links:', err);
  }

  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  };

  if (session.role === "staff") {
    // Sanitize bookings for staff: delete sensitive clinical fields
    const sanitized = list.map((b: Booking) => {
      const {
        message,
        skinType,
        problemDescription,
        previousMedication,
        images,
        appointmentNotes,
        ...rest
      } = b;
      return rest;
    });
    return NextResponse.json(sanitized, { headers });
  }

  return NextResponse.json(list, { headers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      service,
      date,
      time,
      message,
      payOnline,
      bookingType = "online", // 'online' | 'offline'
      gender,
      age,
      address,
      skinType,
      problemDescription,
      previousMedication,
      images = [],
      appointmentNotes,
    } = body;

    if (!name || !phone || !date || !time) {
      return NextResponse.json(
        { error: "Name, phone, date and time slot are required" },
        { status: 400 },
      );
    }

    const settings = await getClinicSettings();

    // 2. Verify closing cut-off
    if (isBookingClosedForDate(date, settings)) {
      return NextResponse.json(
        {
          error: `Online booking for today is closed (cutoff ${settings.bookingCutoffHour}:${String(settings.bookingCutoffMinute || 0).padStart(2, "0")}).`,
        },
        { status: 403 },
      );
    }

    // 3. Verify weekday and holiday availability
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });
    const onlineDays = settings.onlineDays || settings.availableDays;
    if (!onlineDays.includes(dayOfWeek)) {
      return NextResponse.json(
        { error: "Clinic is closed for online bookings on this day." },
        { status: 403 },
      );
    }
    if (
      settings.holidays?.includes(date) ||
      settings.onlineHolidayExceptions?.includes(date)
    ) {
      return NextResponse.json(
        { error: "Selected date is a clinic holiday." },
        { status: 403 },
      );
    }



    // 5. Verify blocked slot
    const blocked = settings.blockedSlots?.some((s) => {
      if (s.date !== date) return false;
      const slotMin = timeToMinutes(time);
      if (s.time.includes('-')) {
        const [start, end] = s.time.split('-').map(t => t.trim());
        const startMin = parseHHMM(start);
        const endMin = parseHHMM(end);
        return slotMin >= startMin && slotMin <= endMin;
      }
      const blockedMin = s.time.includes('AM') || s.time.includes('PM') || s.time.includes('am') || s.time.includes('pm')
        ? timeToMinutes(s.time)
        : parseHHMM(s.time);
      return slotMin === blockedMin;
    });
    if (blocked) {
      return NextResponse.json(
        { error: "This slot is blocked by the doctor." },
        { status: 403 },
      );
    }

    // 6. Verify slot availability (IRCTC-style atomic hold check)
    if (await isSlotTaken(date, time)) {
      return NextResponse.json(
        {
          error: "This time slot was just reserved by another patient. Please select another slot.",
          code: "SLOT_UNAVAILABLE",
          slotTaken: true,
        },
        { status: 409 },
      );
    }

    const uniqueId = Math.floor(10000 + Math.random() * 90000);
    const appointmentId = `SKNHB-${uniqueId}`;

    const fee = bookingType === 'online'
      ? (settings.onlineConsultationFee || settings.consultationFee || 600)
      : (settings.offlineConsultationFee || settings.consultationFee || 700);

    // Determine if upfront payment checkout is required
    const requiresPayment = bookingType === 'online' && !!settings.onlinePaymentMandatory;

    // Initial booking status transitions
    // All public bookings (online or offline type) start as 'pending' and require admin approval
    let initialStatus = "pending";
    let paymentStatus = "unpaid";

    if (requiresPayment) {
      paymentStatus = "pending";
    }

    // Assign 15-minute temporary hold timer for online payment checkouts
    const holdExpiresAt = requiresPayment
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : undefined;

    const newBooking: Booking = {
      id: appointmentId,
      name,
      phone,
      email: email || "",
      service: service || "General Consultation",
      date,
      time,
      message: message || "",
      payOnline: !!requiresPayment,
      bookingType,
      status: initialStatus as any,
      source: "online",
      paymentStatus: paymentStatus as any,
      createdAt: new Date().toISOString(),
      holdExpiresAt,
      gender,
      age: age ? Number(age) : undefined,
      address,
      skinType: bookingType === 'online' ? skinType : undefined,
      problemDescription,
      previousMedication,
      images,
      appointmentNotes,
      amount: fee,
    };

    await createBooking(newBooking);

    if (initialStatus === "confirmed") {
      await addQueueEntry({
        date,
        name,
        phone,
        source: "online",
        bookingId: appointmentId,
        status: "waiting",
        estimatedWaitMinutes: 0,
        createdAt: new Date().toISOString(),
      });
    }

    // Log notification
    await createNotification(
      "booking_new",
      bookingType === "offline"
        ? "New Clinic Visit Request"
        : requiresPayment
          ? "Pending Payment Booking (15-min hold active)"
          : "Confirmed Booking",
      `${name} - Slot: ${time} (${service})`,
    );

    const waText = `*${settings.clinicName} — Booking ${initialStatus === "pending" ? "Requested" : "Confirmed"}*
    Reference: ${appointmentId}
    Name: ${name}
    Phone: ${phone}
    Service: ${service}
    Date: ${date} at ${time}
    Booking Type: ${bookingType === "offline" ? "Clinic Visit" : "Online Consultation"}
    Fee: Rs. ${fee}
    Status: ${initialStatus}

    Please arrive 5 minutes before your slot.`;

    const whatsappUrl = `https://wa.me/${settings.clinicPhone.replace(/[^0-9]/g, "") || "919827042111"}?text=${encodeURIComponent(waText)}`;

    if (email) {
      const { sendAutomatedEmail } = await import("@/lib/email");
      if (initialStatus === "confirmed" || initialStatus === "booked") {
        await sendAutomatedEmail(email, "confirmed", {
          name,
          date,
          time,
          token: "—",
          id: appointmentId,
        }).catch((err) => console.error("Failed to send email:", err));
      } else {
        await sendAutomatedEmail(email, "booked", {
          name,
          date,
          time,
          id: appointmentId,
        }).catch((err) => console.error("Failed to send email:", err));
      }
    }

    return NextResponse.json({
      success: true,
      appointmentId,
      tokenNumber: undefined,
      whatsappUrl,
      status: initialStatus,
      requiresPayment,
      holdExpiresAt,
      fee,
    });
  } catch (err: unknown) {
    console.error('Error in POST /api/appointments:', err);
    const message = err instanceof Error ? err.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
