import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateBookingPayment, getBookingById, updateBookingStatus } from '@/lib/db/bookings';
import { getClinicSettings } from '@/lib/db/settings';
import { createNotification } from '@/lib/db/notifications';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, isMock, paymentStatus } = body;

    const settings = await getClinicSettings();
    const fee = settings.onlineConsultationFee || settings.consultationFee || 200;

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

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

    const nextStatus = settings.onlineRequiresApproval ? 'pending' : 'confirmed';

    // Helper to complete post-payment transitions (status, queue tokens, notifications)
    const completePaymentTransition = async (orderId: string, payId: string, amt: number) => {
      // 1. Update payment details
      await updateBookingPayment(bookingId, {
        paymentStatus: 'paid',
        razorpayOrderId: orderId,
        razorpayPaymentId: payId,
        amountPaid: amt,
      });

      // 2. Update booking status
      await updateBookingStatus(bookingId, nextStatus);

      let tokenNumber = undefined;

      // 3. Issue queue token if auto-confirmed
      if (nextStatus === 'confirmed') {
        const { getNextTokenNumber, addQueueEntry } = await import('@/lib/db/queue');
        tokenNumber = await getNextTokenNumber(booking.date);
        
        const db = await getDb();
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
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Log notification
      await createNotification(
        'payment_received',
        'Online Payment Verified',
        `${booking.name} paid Rs. ${amt} online. Status: ${nextStatus}. ${tokenNumber ? `Token #${tokenNumber}` : 'Requires Approval'}`
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
      const token = await completePaymentTransition(
        razorpay_order_id || 'mock_order_' + Date.now(),
        'mock_payment_' + Date.now(),
        fee
      );

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
