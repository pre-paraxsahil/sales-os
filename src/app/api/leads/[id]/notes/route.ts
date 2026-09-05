import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const { title, content, category } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Note content is required.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          leadId,
          userId: lead.userId,
          title: title?.trim() || 'General Note',
          content: content.trim(),
          category: category?.trim() || 'General',
        },
      });

      await tx.activity.create({
        data: {
          userId: lead.userId,
          leadId,
          type: 'NOTE_ADDED',
          title: `Note Added: ${note.title}`,
          description: content.substring(0, 100),
        },
      });

      return note;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding note:', error);
    return NextResponse.json({ success: false, error: 'Failed to add note.' }, { status: 500 });
  }
}
