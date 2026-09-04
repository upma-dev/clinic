import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateBookingPayment, getBookingById, updateBookingStatus, isSlotTaken } from '@/lib/db/bookings';
import { getClinicSettings } from '@/lib/db/settings';
import { createNotification } from '@/lib/db/notifications';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, isMock, paymentStatus } = body;

    const settings = await getClinicSettings();
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let fee = booking.amount || (booking.bookingType === 'online' || booking.source === 'online'
      ? (settings.onlineConsultationFee || settings.consultationFee || 500)
      : (settings.offlineConsultationFee || settings.consultationFee || 200));

    // Handle explicit failure notification
    if (paymentStatus === 'failed') {
      await updateBookingPayment(bookingId, {
        paymentStatus: 'failed',
      });
      await updateBookingStatus(bookingId, 'pending');

      await createNotification(
        'booking_cancelled',
        'Online Payment Failed',
        `${booking.name}'s payment failed for appointment on ${booking.date}.`
      );

      if (booking.email) {
        const { sendAutomatedEmail } = await import('@/lib/email');
        await sendAutomatedEmail(booking.email, 'paymentFailed', {
          name: booking.name,
          amount: fee,
          date: booking.date,
          id: bookingId,
        }).catch(err => console.error('Failed to send paymentFailed email:', err));
      }

      return NextResponse.json({ success: true, paymentStatus: 'failed' });
    }

    const nextStatus = 'confirmed';

    // Helper to handle edge-case where slot expired and was claimed by another patient before payment arrived
    const handleSlotConflict = async (orderId: string, payId: string, amt: number) => {
      let refundId = 'mock_ref_' + Date.now();
      let refundStatus = 'mock_refunded';
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && payId && !payId.startsWith('mock_')) {
        try {
          const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
          const refundRes = await fetch(`https://api.razorpay.com/v1/payments/${payId}/refund`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authStr}`,
            },
            body: JSON.stringify({
              amount: Math.round(amt * 100),
              notes: {
                reason: 'Auto-refund: Slot conflict due to expired hold',
                bookingId: bookingId,
              },
            }),
          });
          if (refundRes.ok) {
            const refundData = await refundRes.json();
            refundId = refundData.id;
            refundStatus = 'processed';
          } else {
            console.error('Razorpay auto-refund API error:', await refundRes.text());
            refundStatus = 'pending_manual_review';
          }
        } catch (refErr) {
          console.error('Razorpay auto-refund fetch error:', refErr);
          refundStatus = 'pending_manual_review';
        }
      }

      const db = await getDb();
      await db.collection(COLLECTIONS.bookings).updateOne(
        { id: bookingId },
        {
          $set: {
            paymentStatus: 'paid',
            status: 'cancelled',
            slotConflict: true,
            cancellationReason: 'Slot conflict: Payment received after 15-minute hold expired. Slot was claimed by another patient.',
            razorpayOrderId: orderId,
            razorpayPaymentId: payId,
            amountPaid: amt,
            refundId,
            refundStatus,
            refundedAt: new Date().toISOString(),
          },
          $unset: { holdExpiresAt: "" }
        }
      );

      await createNotification(
        'booking_cancelled',
        '⚠️ Slot Conflict - Auto-Refund Triggered',
        `${booking.name}'s payment of ₹${amt} was received after slot timeout (${booking.time} on ${booking.date}). Slot already occupied. Refund status: ${refundStatus}.`
      );

      return {
        success: false,
        conflict: true,
        refundInitiated: true,
        refundId,
        refundStatus,
        message: 'Payment received, but your 15-minute slot reservation had expired and this slot was allotted to another patient. A 100% full refund has been initiated to your source account.',
      };
    };

    // Helper to complete post-payment transitions (status, queue tokens, notifications)
    const completePaymentTransition = async (orderId: string, payId: string, amt: number) => {
      // 1. Update payment details
      await updateBookingPayment(bookingId, {
        paymentStatus: 'paid',
        razorpayOrderId: orderId,
        razorpayPaymentId: payId,
        amountPaid: amt,
      });

      // 2. Update booking status and release holdExpiresAt
      await updateBookingStatus(bookingId, nextStatus);
      const db = await getDb();
      await db.collection(COLLECTIONS.bookings).updateOne(
        { id: bookingId },
        { $unset: { holdExpiresAt: "" } }
      );

      // Generate meeting details for online consultations if confirmed
      if (booking.bookingType === 'online' && nextStatus === 'confirmed') {
        const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: bookingId },
          { 
            $set: { 
              meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${bookingId}`, 
              meetingPassword: roomPass 
            } 
          }
        );
      }

      let tokenNumber = undefined;

      // 3. Issue queue token and add entry to live queue
      if (nextStatus === 'confirmed') {
        const { getNextTokenNumber, addQueueEntry } = await import('@/lib/db/queue');
        tokenNumber = await getNextTokenNumber(booking.date);
        
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: bookingId },
          { $set: { tokenNumber } }
        );

        await addQueueEntry({
          date: booking.date,
          tokenNumber,
          name: booking.name,
          phone: booking.phone,
          source: booking.source || 'online',
          bookingId: bookingId,
          status: 'waiting',
          estimatedWaitMinutes: 0,
          scheduledTime: booking.time,
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Log notification
      await createNotification(
        'payment_received',
        'Online Payment Verified',
        `${booking.name} paid Rs. ${amt} online. Status: ${nextStatus}.${tokenNumber ? ` Token #${tokenNumber}` : ''}`
      );

      if (booking.email) {
        const { sendAutomatedEmail } = await import('@/lib/email');
        await sendAutomatedEmail(booking.email, 'paymentSuccess', {
          name: booking.name,
          amount: amt,
          date: booking.date,
          id: bookingId,
        }).catch(err => console.error('Failed to send paymentSuccess email:', err));

        if (nextStatus === 'confirmed') {
          await sendAutomatedEmail(booking.email, 'confirmed', {
            name: booking.name,
            date: booking.date,
            time: booking.time,
            token: tokenNumber || '—',
            id: bookingId,
          }).catch(err => console.error('Failed to send confirmed email:', err));
        }
      }

      return tokenNumber;
    };

    // Accept mock payment
    if (isMock || (!RAZORPAY_KEY_SECRET && razorpay_order_id?.startsWith('mock_order_'))) {
      const orderId = razorpay_order_id || 'mock_order_' + Date.now();
      const payId = 'mock_payment_' + Date.now();

      // Concurrency check before completing transition
      const isConflict = await isSlotTaken(booking.date, booking.time, bookingId);
      if (isConflict) {
        const conflictRes = await handleSlotConflict(orderId, payId, fee);
        return NextResponse.json(conflictRes, { status: 409 });
      }

      const token = await completePaymentTransition(orderId, payId, fee);
      return NextResponse.json({ success: true, isMock: true, tokenNumber: token, status: nextStatus });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Concurrency check before completing transition
    const isConflict = await isSlotTaken(booking.date, booking.time, bookingId);
    if (isConflict) {
      const conflictRes = await handleSlotConflict(razorpay_order_id, razorpay_payment_id, fee);
      return NextResponse.json(conflictRes, { status: 409 });
    }

    const token = await completePaymentTransition(
      razorpay_order_id,
      razorpay_payment_id,
      fee
    );

    return NextResponse.json({ success: true, tokenNumber: token, status: nextStatus });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
