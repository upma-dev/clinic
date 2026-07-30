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
import { isBookingClosedForDate } from "@/lib/slots";
import type { Booking } from "@/lib/types";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { getAllBookings } = await import("@/lib/db/bookings");
  const list = await getAllBookings();
  return NextResponse.json(list);
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

    // 1. Verify online booking toggle
    if (!settings.enableOnlineBooking) {
      return NextResponse.json(
        {
          error:
            "Online booking is temporarily disabled. Please contact the clinic.",
        },
        { status: 403 },
      );
    }

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

    // 4. Verify daily capacity limit
    const total = await countBookingsForDate(date);
    const maxLimit =
      settings.onlineMaxDailyBooking || settings.maxBookingsPerDay;
    if (total >= maxLimit) {
      return NextResponse.json(
        { error: "Fully booked for this day. Please choose another date." },
        { status: 403 },
      );
    }

    // 5. Verify blocked slot
    const blocked = settings.blockedSlots?.some(
      (s) => s.date === date && s.time === time,
    );
    if (blocked) {
      return NextResponse.json(
        { error: "This slot is blocked by the doctor." },
        { status: 403 },
      );
    }

    // 6. Verify slot availability
    if (await isSlotTaken(date, time)) {
      return NextResponse.json(
        { error: "This time slot is already booked. Please pick another." },
        { status: 409 },
      );
    }

    const uniqueId = Math.floor(10000 + Math.random() * 90000);
    const appointmentId = `SKNHB-${uniqueId}`;

    const fee =
      settings.onlineConsultationFee || settings.consultationFee || 200;

    // Determine if upfront payment checkout is required
    const requiresPayment = false;

    // Initial booking status transitions
    // All public bookings (online or offline type) start as 'pending' and require admin approval
    let initialStatus = "pending";
    let paymentStatus = "unpaid";

    if (requiresPayment) {
      paymentStatus = "pending";
    }

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
      gender,
      age: age ? Number(age) : undefined,
      address,
      skinType: skinType || 'Normal',
      problemDescription,
      previousMedication,
      images,
      appointmentNotes,
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
          ? "Pending Payment Booking"
          : "Confirmed Booking",
      `${name} booked a ${bookingType === "offline" ? "clinic visit" : "consultation"} on ${date} at ${time} for ${service}. Status: ${initialStatus}`,
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
      fee,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
