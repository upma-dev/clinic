import { NextResponse } from 'next/server';
import { getPatientSession } from '@/lib/patientAuth';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// ₹500 fixed fee for telemedicine
const CONSULTATION_FEE_INR = 500; 

export async function POST(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json({
        isMock: true,
        orderId: `mock_order_${Date.now()}`,
        amount: 50000,
        currency: 'INR',
        keyId: 'mock_key',
      });
    }

    const body = await req.json();
    const { receipt } = body; 

    const orderPayload = {
      amount: CONSULTATION_FEE_INR * 100, // in paise
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Razorpay order creation failed:', errorData);
      return NextResponse.json({ error: 'Payment gateway error' }, { status: 500 });
    }

    const order = await response.json();

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID, 
    });
  } catch (error) {
    console.error('Error creating razorpay order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
