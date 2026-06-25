import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        workType: true,
        workTime: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, pin, workType = 'full', workTime } = body

    if (!name || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        pin,
        workType,
        workTime: workTime || null
      }
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}