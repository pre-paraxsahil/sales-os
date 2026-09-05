import { NextRequest, NextResponse } from 'next/server';
import { getNextBestAction } from '@/lib/schedule/nextBestActionService';
import { EnergyLevel } from '@/lib/schedule/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const energy = (searchParams.get('energy') as EnergyLevel) || 'NORMAL';
    const overrideLunch = searchParams.get('overrideLunch') === 'true';

    const nextAction = await getNextBestAction({
      energy,
      overrideLunch,
    });

    return NextResponse.json({
      success: true,
      data: nextAction,
    });
  } catch (error: any) {
    console.error('Error in /api/today/next-action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate next best action.', details: error?.message },
      { status: 500 }
    );
  }
}
