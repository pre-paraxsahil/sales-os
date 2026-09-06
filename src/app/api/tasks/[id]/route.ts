import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, title, description, priority, dueDate } = body;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      data.priority = priority as TaskPriority;
    }
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (status) {
      const normStatus = status.toUpperCase();
      if (['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'CANCELLED'].includes(normStatus)) {
        data.status = normStatus as TaskStatus;
        if (normStatus === 'COMPLETED') {
          data.completedAt = new Date();
        } else if (normStatus === 'PENDING' || normStatus === 'IN_PROGRESS') {
          data.completedAt = null;
        }
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        lead: {
          include: {
            contact: true,
            business: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task', details: error?.message },
      { status: 500 }
    );
  }
}
