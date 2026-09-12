import { NextResponse } from 'next/server';
import { getSupportTickets, createSupportTicket, updateSupportTicketStatus } from '@/lib/db/support';
import { createNotification } from '@/lib/db/notifications';

export async function GET() {
  try {
    const tickets = await getSupportTickets();
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('API GET /api/support error:', error);
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, category, subject, message } = body;

    if (!name || !phone || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, Phone, Subject, and Message are required' },
        { status: 400 }
      );
    }

    const ticket = await createSupportTicket({
      name,
      phone,
      email: email || '',
      category: category || 'general',
      subject,
      message,
    });

    // Create trigger notification for Admin & Staff Dashboard
    await createNotification(
      'support_ticket',
      `🆘 New Support Ticket: ${ticket.ticketId}`,
      `${name} (${phone}): ${subject}`
    );

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('API POST /api/support error:', error);
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, reply } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Ticket ID and Status are required' }, { status: 400 });
    }

    const updated = await updateSupportTicketStatus(id, status, reply);
    if (!updated) {
      return NextResponse.json({ error: 'Ticket not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API PATCH /api/support error:', error);
    return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 });
  }
}
