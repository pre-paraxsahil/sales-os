import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getTodayDateString, calculateOfficeStatus, getLocalTimeParts } from '@/lib/time/salesTimeEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    // Default to the first owner/active user if not specified
    let user = null;
    if (userIdParam) {
      user = await prisma.user.findUnique({ where: { id: userIdParam } });
    } else {
      user = await prisma.user.findFirst({ where: { role: 'OWNER' } }) || await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const config = await getWorkHoursConfig(user.id);
    const now = new Date();
    const todayDateStr = getTodayDateString(now, config.timezone);

    // Fetch all work sessions for today
    const sessions = await prisma.workSession.findMany({
      where: {
        userId: user.id,
        workDate: todayDateStr,
      },
      orderBy: { clockIn: 'desc' },
    });

    // Active session is one without clockOut
    const activeSession = sessions.find((s) => !s.clockOut) || null;

    // Calculate total duration completed so far + live active time
    let totalCompletedSeconds = 0;
    for (const s of sessions) {
      if (s.clockOut) {
        totalCompletedSeconds += s.durationSeconds;
      }
    }

    const officeStatus = calculateOfficeStatus(config, activeSession, now);

    return NextResponse.json({
      success: true,
      data: {
        workDate: todayDateStr,
        officeStatus,
        activeSession,
        sessions,
        totalCompletedSeconds,
        config,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance status', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId: userIdParam, notes } = body;

    let user = null;
    if (userIdParam) {
      user = await prisma.user.findUnique({ where: { id: userIdParam } });
    } else {
      user = await prisma.user.findFirst({ where: { role: 'OWNER' } }) || await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const config = await getWorkHoursConfig(user.id);
    const now = new Date();
    const todayDateStr = getTodayDateString(now, config.timezone);

    if (action === 'CLOCK_IN') {
      // Check if there is already an open active session
      const existingActive = await prisma.workSession.findFirst({
        where: {
          userId: user.id,
          workDate: todayDateStr,
          clockOut: null,
        },
      });

      if (existingActive) {
        const officeStatus = calculateOfficeStatus(config, existingActive, now);
        return NextResponse.json({
          success: true,
          message: 'Already clocked in',
          data: {
            activeSession: existingActive,
            officeStatus,
          },
        });
      }

      // Create new active session
      const newSession = await prisma.workSession.create({
        data: {
          userId: user.id,
          workDate: todayDateStr,
          clockIn: now,
          notes: notes || null,
        },
      });

      const officeStatus = calculateOfficeStatus(config, newSession, now);

      return NextResponse.json({
        success: true,
        message: 'Clocked in successfully',
        data: {
          activeSession: newSession,
          officeStatus,
        },
      });
    } else if (action === 'CLOCK_OUT') {
      // Find open active session
      const activeSession = await prisma.workSession.findFirst({
        where: {
          userId: user.id,
          clockOut: null,
        },
        orderBy: { clockIn: 'desc' },
      });

      if (!activeSession) {
        const officeStatus = calculateOfficeStatus(config, null, now);
        return NextResponse.json({
          success: true,
          message: 'No active clock-in session found',
          data: {
            activeSession: null,
            officeStatus,
          },
        });
      }

      // Calculate duration
      const durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(activeSession.clockIn).getTime()) / 1000)
      );

      const closedSession = await prisma.workSession.update({
        where: { id: activeSession.id },
        data: {
          clockOut: now,
          durationSeconds,
          notes: notes !== undefined ? notes : activeSession.notes,
        },
      });

      const officeStatus = calculateOfficeStatus(config, null, now);

      return NextResponse.json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          activeSession: null,
          closedSession,
          officeStatus,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Must be CLOCK_IN or CLOCK_OUT' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance', details: error?.message },
      { status: 500 }
    );
  }
}
