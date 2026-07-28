import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateBookingStatus, deleteBooking, getBookingById } from '@/lib/db/bookings';
import { createNotification } from '@/lib/db/notifications';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getClinicSettings } from '@/lib/db/settings';
import { buildWhatsAppUrl, buildConfirmationMessage, buildRescheduleMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action, nextScheduleDate, paymentMethod } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let whatsappUrl: string | undefined;

    switch (action) {
      case 'confirm': {
        await updateBookingStatus(id, 'confirmed');
        // Add to queue if confirming a pending booking
        const { addQueueEntry: addEntry } = await import('@/lib/db/queue');

        await addEntry({
          date: booking.date,
          name: booking.name,
          phone: booking.phone,
          source: booking.source || 'online',
          bookingId: booking.id,
          status: 'waiting',
          estimatedWaitMinutes: 0,
          createdAt: new Date().toISOString(),
        });
        
        await createNotification(
          'booking_new',
          'Booking Confirmed',
          `${booking.name}'s appointment on ${booking.date} at ${booking.time} is now confirmed.`
        );

        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          await sendAutomatedEmail(booking.email, 'confirmed', {
            name: booking.name,
            date: booking.date,
            time: booking.time,
            token: '—',
            id: booking.id
          }).catch(err => console.error('Failed to send confirmed email:', err));
        }

        // Build WhatsApp confirmation URL for admin to send to patient
        const confirmSettings = await getClinicSettings();
        const confirmMsg = buildConfirmationMessage({
          clinicName: confirmSettings.clinicName,
          patientName: booking.name,
          appointmentId: booking.id,
          date: booking.date,
          time: booking.time,
          service: booking.service,
          clinicAddress: confirmSettings.clinicAddress,
        });
        whatsappUrl = buildWhatsAppUrl(booking.phone, confirmMsg);
        break;
      }

      case 'reschedule': {
        const { newDate, newTime, reason } = body;
        if (!newDate || !newTime) {
          return NextResponse.json({ error: 'Missing newDate or newTime' }, { status: 400 });
        }
        
        const dbResched = await getDb();
        await dbResched.collection(COLLECTIONS.bookings).updateOne(
          { id },
          { $set: { date: newDate, time: newTime, status: 'pending', rescheduleReason: reason } }
        );

        await createNotification(
          'booking_new',
          'Appointment Rescheduled',
          `${booking.name}'s appointment has been rescheduled to ${newDate} at ${newTime} due to: ${reason || 'Crowded clinic'}.`
        );

        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          const reschedSettings = await getClinicSettings();
          const confirmUrl = `${req.nextUrl.origin}/api/appointments/confirm-reschedule?bookingId=${id}`;
          
          await sendAutomatedEmail(booking.email, 'rescheduled', {
            name: booking.name,
            newDate,
            newTime,
            reason: reason || 'Clinic congestion / high patient volume',
            confirmUrl
          }).catch(err => console.error('Failed to send reschedule email:', err));
        }

        // Build WhatsApp reschedule URL for admin to send to patient
        const rescheduleSettings = await getClinicSettings();
        const rescheduleMsg = buildRescheduleMessage({
          clinicName: rescheduleSettings.clinicName,
          patientName: booking.name,
          appointmentId: booking.id,
          oldDate: booking.date,
          oldTime: booking.time,
          newDate,
          newTime,
          reason: reason || 'Clinic congestion / high patient volume',
          clinicAddress: rescheduleSettings.clinicAddress,
        });
        whatsappUrl = buildWhatsAppUrl(booking.phone, rescheduleMsg);
        break;
      }

      case 'cancel': {
        await updateBookingStatus(id, 'cancelled');
        const dbCancel = await getDb();
        await dbCancel.collection(COLLECTIONS.queue).updateOne(
          { bookingId: id },
          { $set: { status: 'skipped' } }
        );

        await createNotification(
          'booking_cancelled',
          'Appointment Cancelled',
          `${booking.name}'s appointment on ${booking.date} at ${booking.time} has been cancelled.`
        );

        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          await sendAutomatedEmail(booking.email, 'cancelled', {
            name: booking.name,
            date: booking.date,
            time: booking.time,
            id: booking.id
          }).catch(err => console.error('Failed to send cancelled email:', err));
        }
        break;
      }

      case 'arrived':
      case 'checked-in': {
        const dbArr = await getDb();
        const updateFields: any = { status: 'arrived' };
        if (paymentMethod) {
          const settings = await getClinicSettings();
          const fee = settings.onlineConsultationFee || settings.consultationFee || 200;
          updateFields.paymentStatus = 'paid';
          updateFields.paymentMethod = paymentMethod;
          updateFields.amountPaid = fee;
          updateFields.paidAt = new Date().toISOString();
          updateFields.payOnline = paymentMethod === 'online';
        }
        
        await dbArr.collection(COLLECTIONS.bookings).updateOne(
          { id },
          { $set: updateFields }
        );
        
        const { addQueueEntry } = await import('@/lib/db/queue');

        const existingEntry = await dbArr.collection(COLLECTIONS.queue).findOne({ bookingId: id });
        if (!existingEntry) {
          await addQueueEntry({
            date: booking.date,
            name: booking.name,
            phone: booking.phone,
            source: booking.source || 'online',
            bookingId: booking.id,
            status: 'consulting',
            estimatedWaitMinutes: 0,
            createdAt: new Date().toISOString(),
          });
        } else {
          await dbArr.collection(COLLECTIONS.queue).updateOne(
            { bookingId: id },
            { $set: { status: 'consulting' } }
          );
        }

        await createNotification(
          'patient_arrived',
          'Patient Consultation Started',
          `${booking.name} is now being served.`
        );
        break;
      }

      case 'no-show':
        if (session.role !== 'staff' && session.role !== 'doctor') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        await updateBookingStatus(id, 'no-show');
        await createNotification(
          'booking_cancelled',
          'Patient No-Show',
          `${booking.name} was marked as a No-Show for their ${booking.time} slot.`
        );
        break;

      case 'complete':
      case 'completed': {
        await updateBookingStatus(id, 'completed');
        
        const dbComplete = await getDb();
        await dbComplete.collection(COLLECTIONS.queue).updateOne(
          { bookingId: id },
          { $set: { status: 'done' } }
        );
        
        if (nextScheduleDate) {
          await dbComplete.collection(COLLECTIONS.bookings).updateOne(
            { id },
            { $set: { nextScheduleDate } }
          );

          // Automatically send follow-up reminder email if patient email is present
          if (booking.email) {
            const { sendAutomatedEmail } = await import('@/lib/email');
            const settings = await getClinicSettings();
            await sendAutomatedEmail(booking.email, 'followUp', {
              name: booking.name,
              date: nextScheduleDate,
              doctorName: settings.doctorName || 'Dr. Prateek Tiwari',
              address: settings.clinicAddress,
              notes: 'Please review your skincare checklist on the patient portal.'
            }).catch(err => console.error('Failed to send follow-up email:', err));
          }
        }

        await createNotification(
          'payment_received',
          'Consultation Completed',
          `${booking.name}'s consultation is completed.${nextScheduleDate ? ` Next follow-up: ${nextScheduleDate}` : ''}`
        );
        break;
      }

      case 'refund': {
        if (session.role !== 'doctor') {
          return NextResponse.json({ error: 'Only doctor can refund payments' }, { status: 403 });
        }
        
        const payId = booking.razorpayPaymentId;
        const refundAmt = booking.amountPaid || 500;
        
        const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
        const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

        let refundId = 'mock_ref_' + Date.now();

        if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && payId && !payId.startsWith('mock_')) {
          try {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            const resRefund = await fetch('https://api.razorpay.com/v1/payments/' + payId + '/refund', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authStr}`
              },
              body: JSON.stringify({ amount: refundAmt * 100 })
            });
            const resRefundData = await resRefund.json();
            if (!resRefund.ok) {
              throw new Error(resRefundData.error?.description || 'Refund API failed');
            }
            refundId = resRefundData.id;
          } catch (err: any) {
            console.error('Razorpay Refund API error:', err);
            return NextResponse.json({ error: err.message || 'Refund failed' }, { status: 500 });
          }
        }

        const dbRefund = await getDb();
        await dbRefund.collection(COLLECTIONS.bookings).updateOne(
          { id },
          { 
            $set: { 
              paymentStatus: 'Refunded', 
              status: 'Cancelled',
              refundId,
              refundedAt: new Date().toISOString()
            } 
          }
        );

        await createNotification(
          'booking_cancelled',
          'Refund Completed',
          `Refund of Rs. ${refundAmt} processed for ${booking.name}. Appointment Cancelled.`
        );

        if (booking.email) {
          const { sendAutomatedEmail } = await import('@/lib/email');
          await sendAutomatedEmail(booking.email, 'cancelled', {
            name: booking.name,
            date: booking.date,
            time: booking.time,
            id
          }).catch(err => console.error('Failed to send refund cancel email:', err));
        }
        break;
      }

      case 'delete':
        if (session.role !== 'doctor') {
          return NextResponse.json({ error: 'Only doctor can delete records' }, { status: 403 });
        }
        await deleteBooking(id);
        break;

      case 'start-serving': {
        const dbArr = await getDb();
        const updateFields: any = { status: 'arrived' };
        if (paymentMethod) {
          const settings = await getClinicSettings();
          const fee = settings.onlineConsultationFee || settings.consultationFee || 200;
          updateFields.paymentStatus = 'paid';
          updateFields.paymentMethod = paymentMethod;
          updateFields.amountPaid = fee;
          updateFields.paidAt = new Date().toISOString();
          updateFields.payOnline = paymentMethod === 'online';
        }
        
        await dbArr.collection(COLLECTIONS.bookings).updateOne(
          { id },
          { $set: updateFields }
        );

        // Also update corresponding queue entry status to 'consulting'
        await dbArr.collection(COLLECTIONS.queue).updateOne(
          { bookingId: id },
          { $set: { status: 'consulting' } }
        );

        await createNotification(
          'queue_update',
          'Patient Being Served',
          `${booking.name} is now being served.`
        );
        break;
      }

      case 'skip': {
        // Mark as no-show / skipped — they go to end of queue
        await updateBookingStatus(id, 'no-show');
        await createNotification(
          'queue_update',
          'Patient Skipped',
          `${booking.name} was skipped (no-show for their ${booking.time} slot).`
        );
        break;
      }

      case 'mark-waiting':
        // Move back to confirmed/waiting state
        await updateBookingStatus(id, 'confirmed');
        await createNotification(
          'queue_update',
          'Patient Returned to Queue',
          `${booking.name} was moved back to waiting queue.`
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, whatsappUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
