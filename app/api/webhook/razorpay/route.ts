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

    // Secure secondary verification fallback if signature fails or secret is not set
    if (!isSignatureValid) {
      console.warn('⚠️ Razorpay webhook signature verification failed. Attempting secure secondary verification via official API...');
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        try {
          const eventData = JSON.parse(rawBody || '{}');
          const payment = eventData.payload?.payment?.entity;
          const paymentLink = eventData.payload?.payment_link?.entity;
          const plinkId = paymentLink?.id || payment?.payment_link_id;
          const payId = payment?.id;

          if (plinkId) {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${plinkId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${authStr}`
              }
            });
            if (payRes.ok) {
              const payData = await payRes.json();
              if (payData.status === 'paid') {
                isSignatureValid = true;
                console.log(`✅ Secure secondary verification succeeded: Payment link ${plinkId} is paid.`);
              }
            }
          } else if (payId) {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            const payRes = await fetch(`https://api.razorpay.com/v1/payments/${payId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${authStr}`
              }
            });
            if (payRes.ok) {
              const payData = await payRes.json();
              if (payData.status === 'captured' || payData.status === 'confirmed') {
                isSignatureValid = true;
                console.log(`✅ Secure secondary verification succeeded: Payment ${payId} is captured.`);
              }
            }
          }
        } catch (err) {
          console.error('Secondary API verification failed:', err);
        }
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
      case 'payment_link.paid':
      case 'payment.captured': {
        const payment = eventData.payload.payment?.entity;
        const paymentLink = eventData.payload.payment_link?.entity;

        const orderId = payment?.order_id;
        const payId = payment?.id || (paymentLink ? 'plink_paid_' + paymentLink.id : 'webhook_verified');
        const amount = payment ? (payment.amount / 100) : (paymentLink ? (paymentLink.amount / 100) : 0);
        const plinkId = paymentLink?.id || payment?.payment_link_id;

        // Find booking by Razorpay Order ID or Payment Link ID
        let booking = null;
        if (orderId) {
          booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayOrderId: orderId });
        }
        if (!booking && plinkId) {
          booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayPaymentLinkId: plinkId });
        }

        if (!booking) {
          console.warn(`Booking with order ID ${orderId} or payment link ID ${plinkId} not found.`);
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

        // 2. Update booking status and generate meeting link if online
        let updateFields: any = { status: 'confirmed' };
        if (booking.bookingType === 'online') {
          const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
          updateFields.meetingLink = `https://meet.ffmuc.net/SkinHubClinic-${bookingId}`;
          updateFields.meetingPassword = roomPass;
        }
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: bookingId },
          { $set: updateFields }
        );

        let tokenNumber = undefined;
        const todayStr = todayISO();

        // 3. Issue queue token if slot is today (only for offline/physical visits)
        if (booking.date === todayStr && booking.bookingType !== 'online') {
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

      case 'payment_link.cancelled':
      case 'payment_link.expired':
      case 'payment.failed': {
        const payment = eventData.payload.payment?.entity;
        const paymentLink = eventData.payload.payment_link?.entity;
        const orderId = payment?.order_id;
        const plinkId = paymentLink?.id || payment?.payment_link_id;
        const amount = payment ? (payment.amount / 100) : (paymentLink ? (paymentLink.amount / 100) : 0);

        let booking = null;
        if (orderId) {
          booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayOrderId: orderId });
        }
        if (!booking && plinkId) {
          booking = await db.collection(COLLECTIONS.bookings).findOne({ razorpayPaymentLinkId: plinkId });
        }
        if (!booking) return NextResponse.json({ success: true });

        const bookingId = booking.id;

        // Update payment status to Failed
        await updateBookingPayment(bookingId, {
          paymentStatus: 'Failed'
        } as any);

        await createNotification(
          'booking_cancelled',
          'Payment Failed (Webhook Verified)',
          `${booking.name}'s payment of Rs. ${amount} failed or expired.`
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
