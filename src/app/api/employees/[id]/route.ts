import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, pin, workType, workTime } = body

    if (!name || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        pin,
        workType: workType || 'full',
        workTime: workTime || null
      }
    })

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Error updating employee:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const employee = await prisma.employee.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Employee deleted', employee })
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
