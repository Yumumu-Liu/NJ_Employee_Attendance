import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date') // Expected format: YYYY-MM-DD
  
  try {
    let whereClause = {}
    
    // If date is provided, filter records for that specific day
    if (dateStr) {
      const startDate = new Date(dateStr)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      
      whereClause = {
        timestamp: {
          gte: startDate,
          lt: endDate
        }
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })
    
    // We'll process the records on the client side to group them by employee and day
    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching records:', error)
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
}