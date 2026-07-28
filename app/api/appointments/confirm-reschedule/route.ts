import { NextRequest, NextResponse } from 'next/server';
import { getDb as mongoDb, COLLECTIONS } from '@/lib/mongodb';
import { updateBookingStatus } from '@/lib/db/bookings';
import { getNextTokenNumber, addQueueEntry } from '@/lib/db/queue';
import { createNotification } from '@/lib/db/notifications';

export async function GET(req: NextRequest) {
  try {
    const bookingId = req.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
      return new NextResponse('Missing bookingId parameter', { status: 400 });
    }

    const db = await mongoDb();
    const booking = await db.collection(COLLECTIONS.bookings).findOne({ id: bookingId });
    if (!booking) {
      return new NextResponse('Appointment booking not found', { status: 404 });
    }

    // Update status to confirmed
    await updateBookingStatus(bookingId, 'confirmed');

    // If rescheduled date is today, assign queue token and add entry
    const todayStr = new Date().toISOString().split('T')[0];
    let tokenNumber = booking.tokenNumber;

    if (booking.date === todayStr && !tokenNumber) {
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

    await createNotification(
      'booking_new',
      'Reschedule Confirmed by Patient',
      `${booking.name} confirmed their rescheduled appointment for ${booking.date} at ${booking.time}.${tokenNumber ? ` Issued Token #${tokenNumber}.` : ''}`
    );

    // Return a beautiful HTML confirmation landing page
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reschedule Confirmed - Skin Hub Clinic</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #F4F6F8;
            color: #1F2937;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .card {
            background-color: #ffffff;
            border-radius: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            max-width: 480px;
            width: 100%;
            padding: 40px;
            text-align: center;
            box-sizing: border-box;
          }
          .icon-container {
            width: 80px;
            height: 80px;
            background-color: #ECFDF5;
            color: #059669;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          }
          h1 {
            font-size: 24px;
            font-weight: 800;
            color: #111827;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
          }
          p {
            font-size: 15px;
            color: #4B5563;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .details {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 30px;
            text-align: left;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 8px;
          }
          .details-row:last-child {
            margin-bottom: 0;
          }
          .details-label {
            color: #6B7280;
            font-weight: 500;
          }
          .details-value {
            color: #111827;
            font-weight: 700;
          }
          .btn {
            display: inline-block;
            background-color: #0D9488;
            color: #ffffff;
            font-weight: 700;
            font-size: 14px;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 12px;
            transition: background-color 0.2s;
            cursor: pointer;
          }
          .btn:hover {
            background-color: #0F766E;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h1>Reschedule Confirmed!</h1>
          <p>Thank you for confirming your updated appointment slot. Your details have been synchronized with the clinic lobby board.</p>
          
          <div class="details">
            <div class="details-row">
              <span class="details-label">Patient Name</span>
              <span class="details-value">${booking.name}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Confirmed Date</span>
              <span class="details-value">${booking.date}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Time Window</span>
              <span class="details-value">${booking.time}</span>
            </div>
            ${tokenNumber ? `
            <div class="details-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E5E7EB;">
              <span class="details-label" style="color: #0D9488;">Lobby Queue Token</span>
              <span class="details-value" style="color: #0D9488; font-size: 16px;">#${tokenNumber}</span>
            </div>
            ` : ''}
          </div>

          <a href="/" class="btn">Back to Website</a>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error confirming reschedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
