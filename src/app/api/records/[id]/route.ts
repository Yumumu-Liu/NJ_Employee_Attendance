import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { type, timestamp } = body

    if (!type || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['CHECK_IN', 'CHECK_OUT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const record = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        type,
        timestamp: new Date(timestamp)
      },
      include: {
        employee: {
          select: {
            name: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json(record)
  } catch (error: any) {
    console.error('Error updating record:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.attendanceRecord.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Record deleted' })
  } catch (error: any) {
    console.error('Error deleting record:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
