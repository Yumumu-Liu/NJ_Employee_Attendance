import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, pin, type, photoData } = body

    // Validate inputs
    if (!employeeId || !pin || !type || !photoData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify employee and PIN
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.pin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Create attendance record
    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId,
        type, // "CHECK_IN" or "CHECK_OUT"
        photoUrl: photoData, // In a real app, you'd upload base64 to S3/Cloud and store URL
      }
    })

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 })
  }
}