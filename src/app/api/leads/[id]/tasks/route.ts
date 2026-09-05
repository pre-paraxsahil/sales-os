import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const { title, description, priority, dueDate } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task title is required.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          leadId,
          userId: lead.userId,
          title: title.trim(),
          description: description?.trim() || null,
          priority: priority || 'MEDIUM',
          status: 'PENDING',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      await tx.activity.create({
        data: {
          userId: lead.userId,
          leadId,
          type: 'NOTE_ADDED',
          title: `Task Added: ${task.title}`,
          description: description ? `Priority: ${priority || 'MEDIUM'}. Details: ${description}` : `Task created`,
        },
      });

      return task;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ success: false, error: 'Failed to create task.' }, { status: 500 });
  }
}
