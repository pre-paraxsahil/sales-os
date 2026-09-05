import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface SearchResultItem {
  id: string;
  leadId: string;
  title: string;
  subtitle: string;
  matchType: 'LEAD' | 'BUSINESS' | 'CONTACT' | 'MEMORY' | 'NOTE' | 'CALL';
  matchDetail: string;
  temperature?: string;
  status?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // Parallel searches across core customer entities
    const [leads, businesses, contacts, memories, notes, calls] = await Promise.all([
      // 1. Leads by title or notes
      prisma.lead.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { contact: true, business: true },
        take: 8,
      }),

      // 2. Businesses by name or industry
      prisma.business.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { industry: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          leads: {
            include: { contact: true },
            take: 3,
          },
        },
        take: 5,
      }),

      // 3. Contacts by name, phone, email
      prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          leads: {
            include: { business: true },
            take: 3,
          },
        },
        take: 6,
      }),

      // 4. CustomerMemory by key or value (requirements, pain points, etc.)
      prisma.customerMemory.findMany({
        where: {
          OR: [
            { key: { contains: q, mode: 'insensitive' } },
            { value: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          lead: {
            include: { contact: true, business: true },
          },
        },
        take: 8,
      }),

      // 5. Notes by title or content
      prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          lead: {
            include: { contact: true, business: true },
          },
        },
        take: 5,
      }),

      // 6. Calls by notes or nextAction
      prisma.call.findMany({
        where: {
          OR: [
            { notes: { contains: q, mode: 'insensitive' } },
            { nextAction: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          lead: {
            include: { contact: true, business: true },
          },
        },
        take: 5,
      }),
    ]);

    const results: SearchResultItem[] = [];
    const seenLeadIds = new Set<string>();

    // Add direct lead matches
    for (const lead of leads) {
      seenLeadIds.add(lead.id);
      results.push({
        id: `lead-${lead.id}`,
        leadId: lead.id,
        title: lead.title,
        subtitle: `${lead.contact?.name || 'Customer'} • ${lead.business?.name || 'Business'}`,
        matchType: 'LEAD',
        matchDetail: lead.notes?.toLowerCase().includes(q.toLowerCase())
          ? `Matched in notes: "${lead.notes.substring(0, 70)}..."`
          : `Matched lead name: ${lead.title}`,
        temperature: lead.temperature,
        status: lead.status,
      });
    }

    // Add Memory matches
    for (const mem of memories) {
      if (!mem.lead) continue;
      results.push({
        id: `memory-${mem.id}`,
        leadId: mem.lead.id,
        title: mem.lead.title,
        subtitle: `${mem.lead.contact?.name || 'Customer'} • ${mem.lead.business?.name || 'Business'}`,
        matchType: 'MEMORY',
        matchDetail: `Matched memory [${mem.category}]: ${mem.key} -> "${mem.value.substring(0, 60)}"`,
        temperature: mem.lead.temperature,
        status: mem.lead.status,
      });
    }

    // Add contact matches
    for (const contact of contacts) {
      for (const l of contact.leads) {
        if (!seenLeadIds.has(l.id)) {
          seenLeadIds.add(l.id);
          results.push({
            id: `contact-${contact.id}-${l.id}`,
            leadId: l.id,
            title: l.title,
            subtitle: `${contact.name} • ${contact.phone || contact.email || 'Contact'}`,
            matchType: 'CONTACT',
            matchDetail: `Matched contact: ${contact.name} (${contact.phone || contact.email || ''})`,
            temperature: l.temperature,
            status: l.status,
          });
        }
      }
    }

    // Add business matches
    for (const biz of businesses) {
      for (const l of biz.leads) {
        if (!seenLeadIds.has(l.id)) {
          seenLeadIds.add(l.id);
          results.push({
            id: `biz-${biz.id}-${l.id}`,
            leadId: l.id,
            title: l.title,
            subtitle: `${biz.name} • ${biz.industry || 'Industry'}`,
            matchType: 'BUSINESS',
            matchDetail: `Matched business: ${biz.name} (${biz.industry || 'Sector'})`,
            temperature: l.temperature,
            status: l.status,
          });
        }
      }
    }

    // Add Notes matches
    for (const n of notes) {
      if (!n.lead) continue;
      results.push({
        id: `note-${n.id}`,
        leadId: n.lead.id,
        title: n.lead.title,
        subtitle: `${n.lead.contact?.name || 'Customer'} • Note: ${n.title || 'Sales Note'}`,
        matchType: 'NOTE',
        matchDetail: `Matched note text: "${n.content.substring(0, 70)}..."`,
        temperature: n.lead.temperature,
        status: n.lead.status,
      });
    }

    // Add Call matches
    for (const c of calls) {
      if (!c.lead) continue;
      results.push({
        id: `call-${c.id}`,
        leadId: c.lead.id,
        title: c.lead.title,
        subtitle: `${c.lead.contact?.name || 'Customer'} • Call (${c.outcome})`,
        matchType: 'CALL',
        matchDetail: c.nextAction?.toLowerCase().includes(q.toLowerCase())
          ? `Matched next action: "${c.nextAction}"`
          : `Matched call note: "${(c.notes || '').substring(0, 60)}"`,
        temperature: c.lead.temperature,
        status: c.lead.status,
      });
    }

    return NextResponse.json({
      success: true,
      data: results.slice(0, 20),
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error executing global search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform search.', details: error?.message },
      { status: 500 }
    );
  }
}
