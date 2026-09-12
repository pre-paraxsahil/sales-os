import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStartAndEndOfDay, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';
import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { Prisma, TaskPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter')?.toUpperCase() || 'ALL'; // ALL, PENDING, COMPLETED, TODAY, TOMORROW, OVERDUE
    const priority = searchParams.get('priority')?.toUpperCase();
    const leadId = searchParams.get('leadId');
    const userIdParam = searchParams.get('userId');

    const user = userIdParam
      ? await prisma.user.findUnique({ where: { id: userIdParam } })
      : (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());

    const config = await getWorkHoursConfig(user?.id);
    const tz = config.timezone || DEFAULT_TIMEZONE;
    const now = new Date();

    const where: Prisma.TaskWhereInput = {
      ...(user ? { userId: user.id } : {}),
      ...(leadId ? { leadId } : {}),
      ...(priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)
        ? { priority: priority as TaskPriority }
        : {}),
    };

    if (filter === 'PENDING') {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    } else if (filter === 'COMPLETED') {
      where.status = 'COMPLETED';
    } else if (filter === 'TODAY') {
      const { start, end } = getStartAndEndOfDay(now, tz);
      where.dueDate = { gte: start, lte: end };
    } else if (filter === 'TOMORROW') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { start, end } = getStartAndEndOfDay(tomorrow, tz);
      where.dueDate = { gte: start, lte: end };
    } else if (filter === 'OVERDUE') {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      where.dueDate = { lt: now };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: {
          include: {
            contact: true,
            business: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Counts summary
    const [totalCount, pendingCount, completedCount] = await Promise.all([
      prisma.task.count({ where: user ? { userId: user.id } : {} }),
      prisma.task.count({ where: { ...(user ? { userId: user.id } : {}), status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.task.count({ where: { ...(user ? { userId: user.id } : {}), status: 'COMPLETED' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        counts: {
          total: totalCount,
          pending: pendingCount,
          completed: completedCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, dueDate, leadId, userId: userIdParam } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task title is required.' },
        { status: 400 }
      );
    }

    const user = userIdParam
      ? await prisma.user.findUnique({ where: { id: userIdParam } })
      : (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority) ? priority : 'MEDIUM') as TaskPriority,
          status: 'PENDING',
          dueDate: dueDate ? new Date(dueDate) : null,
          userId: user?.id || null,
          leadId: leadId || null,
        },
        include: {
          lead: {
            include: {
              contact: true,
              business: true,
            },
          },
        },
      });

      if (dueDate) {
        const targetDate = new Date(dueDate);
        const remindAt = new Date(targetDate.getTime() - 10 * 60000);
        await tx.reminder.create({
          data: {
            userId: user?.id || null,
            leadId: leadId || null,
            title: `⏰ Task Reminder: ${createdTask.title}`,
            message: description?.trim() || `Task due at ${targetDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
            remindAt: remindAt > new Date() ? remindAt : new Date(Date.now() + 60000),
            entityId: createdTask.id,
            entityType: 'TASK',
            status: 'PENDING',
            isRead: false,
          },
        });
      }

      return createdTask;
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Task created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task', details: error?.message },
      { status: 500 }
    );
  }
}
