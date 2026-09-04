import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateBookingStatus, deleteBooking, getBookingById, isSlotTaken } from '@/lib/db/bookings';
import { createNotification } from '@/lib/db/notifications';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getClinicSettings } from '@/lib/db/settings';
import { buildWhatsAppUrl, buildConfirmationMessage, buildRescheduleMessage, buildThankYouMessage } from '@/lib/whatsapp';

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
        const confirmSettings = await getClinicSettings();

        // Concurrency Check: Prevent double-booking on confirmation
        const isOccupied = await isSlotTaken(booking.date, booking.time, booking.id);
        if (isOccupied) {
          return NextResponse.json(
            { error: `Slot ${booking.time} on ${booking.date} is already confirmed for another patient. Please reschedule this patient to an available slot before confirming.` },
            { status: 409 }
          );
        }

        if (booking.bookingType === 'online') {
          const fee = confirmSettings.onlineConsultationFee || confirmSettings.consultationFee || 500;

          // If a payment link already exists and matches the current fee, reuse it
          const isSameAmount = booking.amount === fee;
          if (booking.razorpayPaymentLink && booking.razorpayPaymentLinkId && isSameAmount) {
            const payMsg = `*🌟 ${confirmSettings.clinicName} — Online Consultation Payment Request 💳*\n\nNamaste *${booking.name}*! 🙏\n\nAapki online consultation request review ho gayi hai. Niche diye gaye secure link par click karke payment complete karein aur apna slot confirm karein:\n\n🔗 *Payment Link:* ${booking.razorpayPaymentLink}\n\n*📋 Booking Details:*\n• *Booking ID:* #${booking.id}\n• *Service:* ${booking.service}\n• *Date:* ${booking.date}\n• *Time:* ${booking.time}\n\n*⚠️ Note:* Payment complete hote hi aapka slot officially book ho jayega aur video meeting link share kiya jayega.\n\nAapki skin health hamari priority hai! 💖\nDhanyawad! 🙏`;
            whatsappUrl = buildWhatsAppUrl(booking.phone, payMsg);
            break;
          }

          // ONLINE CONSULTATION: Generate Razorpay Payment Link
          const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
          const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

          let paymentLinkUrl = '';
          let paymentLinkId = '';

          if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            
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
                  reference_id: `${booking.id}_${Date.now()}`, // Append unique timestamp to prevent duplicate reference_id error
                  description: `${confirmSettings.clinicName} Online Consultation Fee - ${booking.name}`,
                  customer: {
                    name: booking.name,
                    contact: booking.phone.replace(/\D/g, '').slice(-10),
                    email: booking.email || undefined
                  },
                  notify: {
                    sms: false,
                    email: false
                  }
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
            paymentLinkUrl = `${req.nextUrl.origin}/telemedicine/pay-mock?bookingId=${booking.id}`;
          }


          const db = await getDb();
          await db.collection(COLLECTIONS.bookings).updateOne(
            { id },
            { 
              $set: { 
                paymentStatus: 'pending', 
                razorpayPaymentLink: paymentLinkUrl,
                razorpayPaymentLinkId: paymentLinkId,
                payOnline: true,
                amount: fee
              } 
            }
          );

          const payMsg = `*🌟 ${confirmSettings.clinicName} — Online Consultation Payment Request 💳*\n\nNamaste *${booking.name}*! 🙏\n\nAapki online consultation request review ho gayi hai. Niche diye gaye secure link par click karke payment complete karein aur apna slot confirm karein:\n\n🔗 *Payment Link:* ${paymentLinkUrl}\n\n*📋 Booking Details:*\n• *Booking ID:* #${booking.id}\n• *Service:* ${booking.service}\n• *Date:* ${booking.date}\n• *Time:* ${booking.time}\n\n*⚠️ Note:* Payment complete hote hi aapka slot officially book ho jayega aur video meeting link share kiya jayega.\n\nAapki skin health hamari priority hai! 💖\nDhanyawad! 🙏`;
          whatsappUrl = buildWhatsAppUrl(booking.phone, payMsg);
        } else {
          // OFFLINE CONSULTATION: Confirm immediately
          await updateBookingStatus(id, 'confirmed');
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
            `${booking.name} - Slot: ${booking.time} (Confirmed)`
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
        }
        break;
      }

      case 'reschedule': {
        const { newDate, newTime, reason } = body;
        if (!newDate || !newTime) {
          return NextResponse.json({ error: 'Missing newDate or newTime' }, { status: 400 });
        }

        // Validate that target slot is not already booked by another patient
        const isOccupied = await isSlotTaken(newDate, newTime, id);
        if (isOccupied) {
          return NextResponse.json(
            { error: `Slot ${newTime} on ${newDate} is already booked or reserved. Please choose a different time.` },
            { status: 409 }
          );
        }
        
        const dbResched = await getDb();

        // If date changed, remove old queue entry for the previous date
        if (booking.date !== newDate) {
          await dbResched.collection(COLLECTIONS.queue).deleteOne({ bookingId: id });
        }

        const updateDoc: Record<string, any> = {
          date: newDate,
          time: newTime,
          rescheduleReason: reason || 'Patient requested reschedule',
          rescheduledAt: new Date().toISOString(),
        };

        if (body.name) updateDoc.name = body.name;
        if (body.phone) updateDoc.phone = body.phone;
        if (body.email !== undefined) updateDoc.email = body.email;
        if (body.service) updateDoc.service = body.service;
        if (body.gender) updateDoc.gender = body.gender;
        if (body.age !== undefined && body.age !== '') updateDoc.age = Number(body.age);
        if (body.address !== undefined) updateDoc.address = body.address;
        if (body.skinType) updateDoc.skinType = body.skinType;
        if (body.problemDescription !== undefined) updateDoc.problemDescription = body.problemDescription;
        if (body.previousMedication !== undefined) updateDoc.previousMedication = body.previousMedication;
        if (body.appointmentNotes !== undefined) updateDoc.appointmentNotes = body.appointmentNotes;
        if (body.bookingType) updateDoc.bookingType = body.bookingType;

        // Keep status confirmed if it was already confirmed or paid, otherwise keep current status
        if (body.status) {
          updateDoc.status = body.status;
        } else if (booking.status === 'confirmed' || booking.paymentStatus === 'paid' || session.role === 'staff' || session.role === 'doctor') {
          updateDoc.status = 'confirmed';
        } else {
          updateDoc.status = 'pending';
        }

        await dbResched.collection(COLLECTIONS.bookings).updateOne(
          { id },
          { 
            $set: updateDoc,
            $unset: { holdExpiresAt: "" }
          }
        );

        // Sync queue collection entry: re-activate as waiting with newDate
        await dbResched.collection(COLLECTIONS.queue).updateOne(
          { bookingId: id },
          { $set: { status: 'waiting', date: newDate, estimatedWaitMinutes: 15 } }
        );

        await createNotification(
          'booking_new',
          'Appointment Rescheduled',
          `${booking.name} - Slot: ${newTime} (Rescheduled)`
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
        await dbCancel.collection(COLLECTIONS.queue).deleteOne({ bookingId: id });

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

        const cancelSettings = await getClinicSettings();
        const cancelMsg = `*🌟 ${cancelSettings.clinicName} — Appointment Cancellation Notice* ❌\n\nNamaste *${booking.name}*! 🙏\n\nAapka appointment (ID: #${booking.id}) scheduled for *${booking.date}* at *${booking.time}* cancel kar diya gaya hai.\n\nAgar aap naya slot book karna chahte hain to kripya hamari website par visit karein ya clinic desk par call karein: ${cancelSettings.clinicPhone}.\n\nAapki skin health hamari priority hai! 💖\nDhanyawad!\n*Team Skin Hub* 🙏`;
        whatsappUrl = buildWhatsAppUrl(booking.phone, cancelMsg);
        break;
      }

      case 'arrived':
      case 'checked-in': {
        const dbArr = await getDb();
        const updateFields: any = { status: 'arrived' };
        if (paymentMethod) {
          const settings = await getClinicSettings();
          const fee = booking.bookingType === 'online'
            ? (settings.onlineConsultationFee || settings.consultationFee || 600)
            : (settings.offlineConsultationFee || settings.consultationFee || 700);
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

      case 'mark-link-sent': {
        const dbLink = await getDb();
        await dbLink.collection(COLLECTIONS.bookings).updateOne(
          { id },
          { $set: { meetingLinkSent: true, updatedAt: new Date().toISOString() } }
        );
        break;
      }

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
              doctorName: 'Dr. Prateek Tiwari',
              address: settings.clinicAddress,
              notes: 'Please review your skincare checklist on the patient portal.'
            }).catch(err => console.error('Failed to send follow-up email:', err));
          }
        }

        const completeSettings = await getClinicSettings();
        const thankYouMsg = buildThankYouMessage({
          clinicName: completeSettings.clinicName,
          patientName: booking.name,
          appointmentId: booking.id,
          service: booking.service,
          doctorName: 'Dr. Prateek Tiwari',
          nextScheduleDate: nextScheduleDate || undefined,
        });
        whatsappUrl = buildWhatsAppUrl(booking.phone, thankYouMsg);

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
          const fee = booking.amount || (booking.bookingType === 'online'
            ? (settings.onlineConsultationFee || settings.consultationFee || 600)
            : (settings.offlineConsultationFee || settings.consultationFee || 700));
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

      case 'mark-waiting': {
        // Prevent re-adding if original slot is taken or in the past
        const isTaken = await isSlotTaken(booking.date, booking.time, id);
        if (isTaken) {
          return NextResponse.json({
            error: `Slot ${booking.time} on ${booking.date} is already booked by another patient. You must reschedule this skipped patient to an available slot.`,
            requiresReschedule: true,
          }, { status: 409 });
        }
        await updateBookingStatus(id, 'confirmed');
        const dbWait = await getDb();
        await dbWait.collection(COLLECTIONS.queue).updateOne(
          { bookingId: id },
          { $set: { status: 'waiting', date: booking.date } }
        );
        await createNotification(
          'queue_update',
          'Patient Returned to Queue',
          `${booking.name} was moved back to waiting queue.`
        );
        break;
      }

      case 'verify-payment-link': {
        const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
        const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

        if (!booking.razorpayPaymentLinkId) {
          return NextResponse.json({ error: 'No payment link associated with this booking' }, { status: 400 });
        }

        if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
          const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
          try {
            const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${booking.razorpayPaymentLinkId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${authStr}`
              }
            });

            const payData = await payRes.json();
            if (!payRes.ok) {
              throw new Error(payData.error?.description || 'Failed to fetch payment link status');
            }

            if (payData.status === 'paid') {
              const db = await getDb();
              
              // Generate meeting credentials
              const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
              
              await db.collection(COLLECTIONS.bookings).updateOne(
                { id: booking.id },
                { 
                  $set: { 
                    paymentStatus: 'paid',
                    status: 'confirmed',
                    razorpayPaymentId: payData.payments?.[0]?.payment_id || 'manual_verify',
                    amountPaid: payData.amount_paid / 100,
                    paidAt: new Date().toISOString(),
                    meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
                    meetingPassword: roomPass
                  } 
                }
              );

              await createNotification(
                'payment_received',
                'Payment Verified Manually',
                `${booking.name}'s payment verified as Paid. Slot confirmed and video link generated.`
              );

              return NextResponse.json({ success: true, paid: true, status: 'confirmed' });
            } else {
              return NextResponse.json({ success: true, paid: false, paymentLinkStatus: payData.status });
            }
          } catch (err: any) {
            console.error('Verify payment link API error:', err);
            return NextResponse.json({ error: err.message || 'Verification query failed' }, { status: 500 });
          }
        } else {
          // If keys are not set, check if it's mock
          if (booking.razorpayPaymentLinkId.startsWith('mock_plink_')) {
            const db = await getDb();
            const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            await db.collection(COLLECTIONS.bookings).updateOne(
              { id: booking.id },
              { 
                $set: { 
                  paymentStatus: 'paid',
                  status: 'confirmed',
                  razorpayPaymentId: 'mock_payment_' + Date.now(),
                  amountPaid: 500,
                  paidAt: new Date().toISOString(),
                  meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${booking.id}`,
                  meetingPassword: roomPass
                } 
              }
            );

            return NextResponse.json({ success: true, paid: true, status: 'confirmed' });
          }
          return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
        }
      }


      case 'check-payment-db': {
        const db = await getDb();
        const freshBooking = await db.collection(COLLECTIONS.bookings).findOne({ id });
        if (!freshBooking) {
          return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 1. If already marked paid in DB, return success immediately
        const isPaidInDb = freshBooking.paymentStatus === 'paid' || freshBooking.paymentStatus === 'Paid';
        if (isPaidInDb) {
          return NextResponse.json({
            success: true,
            paymentStatus: freshBooking.paymentStatus,
            status: freshBooking.status,
            paid: true
          });
        }

        // 2. If not paid in DB, but has a payment link, verify with Razorpay API directly to sync
        if (freshBooking.razorpayPaymentLinkId) {
          const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
          const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

          if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
            const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            try {
              const payRes = await fetch(`https://api.razorpay.com/v1/payment_links/${freshBooking.razorpayPaymentLinkId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Basic ${authStr}`
                }
              });

              if (payRes.ok) {
                const payData = await payRes.json();
                if (payData.status === 'paid') {
                  const roomPass = Math.random().toString(36).substring(2, 8).toUpperCase();
                  const { addQueueEntry, getNextTokenNumber } = await import('@/lib/db/queue');
                  const tokenNumber = await getNextTokenNumber(freshBooking.date);
                  
                  // Update database status
                  await db.collection(COLLECTIONS.bookings).updateOne(
                    { id: freshBooking.id },
                    { 
                      $set: { 
                        paymentStatus: 'paid',
                        status: 'confirmed',
                        tokenNumber,
                        razorpayPaymentId: payData.payments?.[0]?.payment_id || 'manual_verify',
                        amountPaid: payData.amount_paid / 100,
                        paidAt: new Date().toISOString(),
                        meetingLink: `https://meet.ffmuc.net/SkinHubClinic-${freshBooking.id}`,
                        meetingPassword: roomPass
                      } 
                    }
                  );

                  await addQueueEntry({
                    date: freshBooking.date,
                    tokenNumber,
                    name: freshBooking.name,
                    phone: freshBooking.phone,
                    source: freshBooking.source || 'online',
                    bookingId: freshBooking.id,
                    status: 'waiting',
                    estimatedWaitMinutes: 0,
                    scheduledTime: freshBooking.time,
                    createdAt: new Date().toISOString(),
                  });

                  await createNotification(
                    'payment_received',
                    'Payment Verified via Sync Check',
                    `${freshBooking.name}'s payment synced as Paid. Slot confirmed and video link generated.${tokenNumber ? ` Token #${tokenNumber}` : ''}`
                  );

                  return NextResponse.json({
                    success: true,
                    paymentStatus: 'paid',
                    status: 'confirmed',
                    tokenNumber,
                    paid: true
                  });
                }
              }
            } catch (err) {
              console.error('Failed to sync status with Razorpay:', err);
            }
          }
        }

        return NextResponse.json({
          success: true,
          paymentStatus: freshBooking.paymentStatus,
          status: freshBooking.status,
          paid: false
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, whatsappUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
