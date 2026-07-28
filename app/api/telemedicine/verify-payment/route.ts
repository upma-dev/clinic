import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPatientSession } from '@/lib/patientAuth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { TelemedicineAppointment } from '@/lib/db/telemedicine';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentData, questionnaireData, isMock } = body;

    const db = await getDb();
    let patientId = session.phone; 

    if (isMock || (!RAZORPAY_KEY_SECRET && razorpay_order_id.startsWith('mock_order_'))) {
      const appointment: TelemedicineAppointment = {
        ...appointmentData,
        patientId,
        status: 'pending',
        paymentStatus: 'paid',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: 'mock_payment_' + Date.now(),
        amountPaid: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await db.collection(COLLECTIONS.telemedicine_appointments).insertOne(appointment as any);
      const newApptId = result.insertedId.toString();

      if (questionnaireData) {
        await db.collection(COLLECTIONS.telemedicine_questionnaires).insertOne({
          ...questionnaireData,
          appointmentId: newApptId,
          patientId,
          createdAt: new Date().toISOString(),
        });
      }
      return NextResponse.json({ success: true, appointmentId: newApptId, isMock: true });
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

    const appointment: TelemedicineAppointment = {
      ...appointmentData,
      patientId,
      status: 'pending',
      paymentStatus: 'paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: 500, // ₹500
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTIONS.telemedicine_appointments).insertOne(appointment as any);
    const newApptId = result.insertedId.toString();

    if (questionnaireData) {
      await db.collection(COLLECTIONS.telemedicine_questionnaires).insertOne({
        ...questionnaireData,
        appointmentId: newApptId,
        patientId,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, appointmentId: newApptId });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
