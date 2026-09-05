import { NextRequest, NextResponse } from 'next/server';
import { getWorkHoursConfig, saveWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await getWorkHoursConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    console.error('Error fetching schedule settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule settings.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Fetch single user
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    const updated = await saveWorkHoursConfig(user.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error saving schedule settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save schedule settings.', details: error?.message },
      { status: 500 }
    );
  }
}
