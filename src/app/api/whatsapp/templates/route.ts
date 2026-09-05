import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTemplatesSeeded } from '@/lib/whatsapp/templateService';

export async function GET(request: Request) {
  try {
    // Seed defaults if empty
    await ensureDefaultTemplatesSeeded();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const whereClause: any = { isActive: true };
    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    const templates = await prisma.whatsAppTemplate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category = 'UTILITY', content, variables } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: 'Template name and content are required.' },
        { status: 400 }
      );
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        name: name.trim(),
        category,
        language: 'en',
        content: content.trim(),
        variables: variables ? JSON.stringify(variables) : '[]',
        isApproved: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create template.' },
      { status: 500 }
    );
  }
}
