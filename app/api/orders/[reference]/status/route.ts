import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const orderReference = params.reference;

    if (!orderReference) {
      return NextResponse.json(
        { error: 'Order reference required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { reference: orderReference },
      select: {
        status: true,
        total: true,
        createdAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('[Order Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order status' },
      { status: 500 }
    );
  }
}
