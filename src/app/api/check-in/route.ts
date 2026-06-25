import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_KEY || ''
  if (!url || !key) return null
  return createClient(url, key)
}

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

    // Upload photo to Supabase Storage
    let photoUrl = photoData
    try {
      const supabase = getSupabaseClient()
      if (supabase && photoData.startsWith('data:image')) {
        const base64Data = photoData.split(',')[1]
        const fileName = `${employeeId}-${type}-${Date.now()}.jpg`
        const folderPath = `attendance-photos/${fileName}`

        const { data, error } = await supabase.storage
          .from('attendance')
          .upload(folderPath, Buffer.from(base64Data, 'base64'), {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          })

        if (error) {
          console.error('Upload error:', error)
          photoUrl = photoData
        } else {
          const { data: publicData } = supabase.storage
            .from('attendance')
            .getPublicUrl(folderPath)
          photoUrl = publicData.publicUrl
        }
      }
    } catch (uploadError) {
      console.error('Photo upload failed:', uploadError)
    }

    // Create attendance record
    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId,
        type,
        photoUrl,
      },
      include: {
        employee: {
          select: { name: true, avatarUrl: true }
        }
      }
    })

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 })
  }
}