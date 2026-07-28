import { NextRequest, NextResponse } from 'next/server';
import { getBookingById } from '@/lib/db/bookings';
import { getClinicSettings } from '@/lib/db/settings';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return new NextResponse('Missing ID parameter', { status: 400 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return new NextResponse('Booking not found', { status: 404 });
    }

    const settings = await getClinicSettings();

    const clinicName = settings.clinicName || 'Skin Hub Clinic';
    const logoUrl = settings.clinicLogo || '/logo.png';
    const address = settings.clinicAddress || '123 Dermatologist Lane, Medical Center';
    const phone = settings.clinicPhone || '+91 98270 42111';
    const email = settings.clinicEmail || 'contact@skinhub.com';

    const clientName = booking.name;
    const clientPhone = booking.phone;
    const clientEmail = booking.email || 'N/A';
    const clientAge = booking.age ? `${booking.age} yrs` : 'N/A';
    const clientGender = booking.gender || 'N/A';

    const payStatus = booking.paymentStatus || 'Pending';
    const bookStatus = booking.status || 'Pending';
    const amt = booking.amountPaid || (payStatus === 'Paid' ? 500 : 0);
    const orderId = booking.razorpayOrderId || 'N/A';
    const paymentId = booking.razorpayPaymentId || 'N/A';
    const paidAtStr = booking.paidAt ? new Date(booking.paidAt).toLocaleString() : 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${booking.id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      background: #f9fafb;
      margin: 0;
      padding: 40px 20px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    .logo-section h1 {
      margin: 0;
      font-size: 24px;
      color: #1b4f72;
      font-weight: 800;
    }
    .logo-section p {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }
    .clinic-details {
      text-align: right;
      font-size: 11px;
      color: #4b5563;
      line-height: 1.6;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 10px 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 35px;
    }
    .meta-box h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
      margin: 0 0 8px 0;
    }
    .meta-box p {
      margin: 4px 0;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
    .meta-box span {
      font-weight: normal;
      color: #6b7280;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .receipt-table th {
      background: #f8fafc;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .receipt-table td {
      padding: 16px;
      font-size: 12px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
    }
    .receipt-table td.amount-col {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }
    .receipt-table th.amount-col {
      text-align: right;
    }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .summary-box {
      width: 250px;
      font-size: 12px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      color: #475569;
    }
    .summary-row.total {
      border-top: 2px solid #e2e8f0;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      padding-top: 12px;
    }
    .footer {
      border-top: 1px solid #f3f4f6;
      padding-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      background: #1b4f72;
      color: #fff;
      padding: 10px 20px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 20px;
      text-decoration: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #153e5a;
    }
    .button-container {
      max-width: 800px;
      margin: 0 auto 10px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-paid {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-pending {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-failed {
      background: #fdf2f2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
    }
    .badge-refunded {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>

  <div class="button-container">
    <button onclick="window.print()" class="print-btn">🖨️ Print / Save as PDF</button>
    <a href="/patient" class="print-btn" style="background:#4b5563;">Back to Portal</a>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="logo-section">
        <h1>${clinicName}</h1>
        <p>Premium Skincare & Dermato-Cosmetology</p>
      </div>
      <div class="clinic-details">
        <strong>Clinic Location</strong><br>
        ${address}<br>
        Phone: ${phone}<br>
        Email: ${email}
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h3>Invoice Details</h3>
        <p>Invoice No: <span>INV-${booking.id.toUpperCase()}</span></p>
        <p>Dated: <span>${booking.date} at ${booking.time}</span></p>
        <p>Payment: <span class="status-badge badge-${payStatus.toLowerCase().replace(' ', '')}">${payStatus}</span></p>
        <p>Booking Status: <span>${bookStatus}</span></p>
      </div>
      <div class="meta-box">
        <h3>Billed To (Patient)</h3>
        <p>Name: <span>${clientName}</span></p>
        <p>Contact: <span>${clientPhone}</span></p>
        <p>Email: <span>${clientEmail}</span></p>
        <p>Age / Gender: <span>${clientAge} / ${clientGender}</span></p>
      </div>
    </div>

    <div class="meta-grid" style="margin-top: -15px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div class="meta-box" style="margin-bottom: 0;">
        <h3>Razorpay Order Details</h3>
        <p>Order ID: <span style="font-family: monospace; font-size: 11px;">${orderId}</span></p>
        <p>Payment ID: <span style="font-family: monospace; font-size: 11px;">${paymentId}</span></p>
      </div>
      <div class="meta-box" style="margin-bottom: 0;">
        <h3>Transaction Metadata</h3>
        <p>Paid Time: <span>${paidAtStr}</span></p>
        <p>Mode: <span>Razorpay Secure Online Checkout</span></p>
      </div>
    </div>

    <table class="receipt-table" style="margin-top: 25px;">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th class="amount-col">Consultation Fee</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Dermatologist Consultation Service</strong><br>
            <span style="font-size:10px; color:#64748b;">Specialist clinical analysis for skin concerns and prescription formulation</span>
          </td>
          <td>1</td>
          <td class="amount-col">₹${amt}.00</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>₹${amt}.00</span>
        </div>
        <div class="summary-row">
          <span>Tax (GST 0%)</span>
          <span>₹0.00</span>
        </div>
        <div class="summary-row total">
          <span>Amount Paid</span>
          <span>₹${amt}.00</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing ${clinicName} for your skincare journey.</p>
      <p>This is a computer-generated transaction receipt and does not require a physical signature.</p>
      <p style="font-size: 9px; margin-top: 10px;">&copy; ${new Date().getFullYear()} ${clinicName}. All rights reserved.</p>
    </div>
  </div>

</body>
</html>
    `;

    return new NextResponse(htmlContent, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
