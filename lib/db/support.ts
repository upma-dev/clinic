import { getDb, COLLECTIONS } from '../mongodb';
import type { SupportTicket } from '../types';

export async function getSupportTickets(limit = 100): Promise<SupportTicket[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<SupportTicket>(COLLECTIONS.support_tickets)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(({ _id, ...ticket }) => ({ ...ticket, _id: _id?.toString() }));
  } catch (e) {
    console.error('Error fetching support tickets:', e);
    return [];
  }
}

export async function createSupportTicket(
  ticketData: Omit<SupportTicket, 'id' | 'ticketId' | 'status' | 'createdAt'>
): Promise<SupportTicket> {
  try {
    const db = await getDb();
    const ticketId = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket: SupportTicket = {
      ...ticketData,
      id: `sup-${Math.floor(100000 + Math.random() * 900000)}`,
      ticketId,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const { _id: _unused, ...doc } = ticket;
    await db.collection(COLLECTIONS.support_tickets).insertOne(doc);
    return ticket;
  } catch (e) {
    console.error('Error creating support ticket:', e);
    throw e;
  }
}

export async function updateSupportTicketStatus(
  id: string,
  status: SupportTicket['status'],
  reply?: string
): Promise<boolean> {
  try {
    const db = await getDb();
    const updateData: Partial<SupportTicket> = { status };
    if (reply) {
      updateData.reply = reply;
      updateData.repliedAt = new Date().toISOString();
    }
    const result = await db
      .collection(COLLECTIONS.support_tickets)
      .updateOne({ id }, { $set: updateData });
    return result.modifiedCount > 0;
  } catch (e) {
    console.error('Error updating support ticket:', e);
    return false;
  }
}
