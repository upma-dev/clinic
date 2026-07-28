import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getClinicSettings } from '@/lib/db/settings';
import { updateBookingPayment, updateBookingStatus } from '@/lib/db/bookings';
import { createNotification } from '@/lib/db/notifications';
import { todayISO } from '@/lib/slots';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature (with mock bypass for local sandbox simulations)
    let isSignatureValid = false;

    if (secret && signature) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');
      isSignatureValid = expectedSignature === signature;
    } else {
      // Mock sandbox verification fallback
      const parsedMock = JSON.parse(rawBody || '{}');
      if (parsedMock.isMock) {
        isSignatureValid = true;
      }
    }

    if (!isSignatureValid) {
      console.warn('⚠️ Razorpay webhook signature verification failed.');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    const event = eventData.event;
    console.log(`🔌 Razorpay Webhook Event Received: ${event}`);

    const db = await getDb();

    switch (event) {
      case 'payment.captured': {
        const payment = eventData.payload.payment.entity;
        const orderId = payment.order_id;
        const payId = payment.id;
        const amount = payment.amount / 100; // Razorpay sends in paise

        // Find booking by Razorpay Order ID
        const booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayOrderId: orderId });
        if (!booking) {
          console.warn(`Booking with order ID ${orderId} not found.`);
          return NextResponse.json({ success: true, message: 'No matching booking found' });
        }

        const bookingId = booking.id;
        const nextStatus = 'Confirmed';

        // 1. Update payment details
        await updateBookingPayment(bookingId, {
          paymentStatus: 'Paid',
          razorpayPaymentId: payId,
          amountPaid: amount,
          paidAt: new Date().toISOString()
        } as any);

        // 2. Update booking status
        await updateBookingStatus(bookingId, nextStatus as any);

        let tokenNumber = undefined;
        const todayStr = todayISO();

        // 3. Issue queue token if slot is today
        if (booking.date === todayStr) {
          const { getNextTokenNumber, addQueueEntry } = await import('@/lib/db/queue');
          tokenNumber = await getNextTokenNumber(todayStr);

          await db.collection(COLLECTIONS.bookings).updateOne(
            { id: bookingId },
            { $set: { tokenNumber } }
          );

          await addQueueEntry({
            date: todayStr,
            tokenNumber,
            name: booking.name,
            phone: booking.phone,
            source: booking.source || 'online',
            bookingId,
            status: 'waiting',
            estimatedWaitMinutes: 0,
            createdAt: new Date().toISOString(),
          });
        }

        // 4. Log notification
        await createNotification(
          'payment_received',
          'Payment Captured (Webhook Verified)',
          `${booking.name} paid Rs. ${amount} via Webhook. Status: ${nextStatus}.${tokenNumber ? ` Issued Token #${tokenNumber}.` : ''}`
        );

        // 5. Send automated emails
        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          await sendAutomatedEmail(booking.email, 'paymentSuccess', {
            name: booking.name,
            amount,
            date: booking.date,
            id: bookingId,
          }).catch(err => console.error('Webhook error sending paymentSuccess email:', err));

          await sendAutomatedEmail(booking.email, 'confirmed', {
            name: booking.name,
            date: booking.date,
            time: booking.time,
            token: tokenNumber || '—',
            id: bookingId,
          }).catch(err => console.error('Webhook error sending confirmed email:', err));
        }
        break;
      }

      case 'payment.failed': {
        const payment = eventData.payload.payment.entity;
        const orderId = payment.order_id;
        const amount = payment.amount / 100;

        const booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayOrderId: orderId });
        if (!booking) return NextResponse.json({ success: true });

        const bookingId = booking.id;

        // Update payment status to Failed
        await updateBookingPayment(bookingId, {
          paymentStatus: 'Failed'
        } as any);

        await createNotification(
          'booking_cancelled',
          'Payment Failed (Webhook Verified)',
          `${booking.name}'s payment of Rs. ${amount} failed.`
        );

        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          await sendAutomatedEmail(booking.email, 'paymentFailed', {
            name: booking.name,
            amount,
            date: booking.date,
            id: bookingId,
          }).catch(err => console.error('Webhook error sending paymentFailed email:', err));
        }
        break;
      }

      case 'refund.processed': {
        const refund = eventData.payload.refund.entity;
        const payId = refund.payment_id;
        const refundAmount = refund.amount / 100;

        const booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayPaymentId: payId });
        if (!booking) return NextResponse.json({ success: true });

        const bookingId = booking.id;

        // Update payment to Refunded and booking status to Cancelled
        await updateBookingPayment(bookingId, {
          paymentStatus: 'Refunded'
        } as any);
        await updateBookingStatus(bookingId, 'Cancelled' as any);

        await createNotification(
          'booking_cancelled',
          'Refund Processed (Webhook Verified)',
          `Refund of Rs. ${refundAmount} verified for ${booking.name}. Appointment Cancelled.`
        );

        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          await sendAutomatedEmail(booking.email, 'cancelled', {
            name: booking.name,
            date: booking.date,
            time: booking.time,
            id: bookingId,
          }).catch(err => console.error('Webhook error sending cancelled email:', err));
        }
        break;
      }

      default:
        console.log(`Ignored unhandled event: ${event}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
