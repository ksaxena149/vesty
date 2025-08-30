import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause
    const where: any = { userId };
    if (type && ['USER', 'OUTFIT', 'RESULT'].includes(type)) {
      where.type = type;
    }

    // Get images with pagination
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.image.count({ where }),
    ]);

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('❌ Error fetching images:', error);
    return new NextResponse(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { type, url, filename, fileSize, mimeType } = body;

    // Validate required fields
    if (!type || !url) {
      return new NextResponse('Missing required fields: type, url', { status: 400 });
    }

    if (!['USER', 'OUTFIT', 'RESULT'].includes(type)) {
      return new NextResponse('Invalid image type', { status: 400 });
    }

    // Create image record
    const image = await prisma.image.create({
      data: {
        userId,
        type,
        url,
        filename,
        fileSize,
        mimeType,
      },
    });

    return NextResponse.json(image);

  } catch (error) {
    console.error('❌ Error creating image:', error);
    return new NextResponse(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
