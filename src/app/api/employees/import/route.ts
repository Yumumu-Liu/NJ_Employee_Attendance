import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    const errors: string[] = []
    let imported = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const name = row['Employee Name'] || row['员工姓名'] || row.name
        const pin = String(row['PIN'] || row.pin || '').trim()
        const workType = (row['Work Type'] || row['工作类型'] || row.workType || 'full').toLowerCase()
        const workTime = row['Work Start Time'] || row['打卡开始时间'] || row.workTime || null

        if (!name || !pin) {
          errors.push(`Row ${i + 2}: Missing name or PIN`)
          continue
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          errors.push(`Row ${i + 2}: PIN must be 4 digits`)
          continue
        }

        if (!['full', 'part'].includes(workType)) {
          errors.push(`Row ${i + 2}: Work type must be 'full' or 'part'`)
          continue
        }

        await prisma.employee.create({
          data: {
            name,
            pin,
            workType: workType === 'part' ? 'part' : 'full',
            workTime: workTime || null
          }
        })
        imported++
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`)
      }
    }

    return NextResponse.json({
      imported,
      errors,
      total: data.length,
      message: `Imported ${imported} employees. ${errors.length > 0 ? `${errors.length} errors.` : ''}`
    })
  } catch (error) {
    console.error('Error importing employees:', error)
    return NextResponse.json({ error: 'Failed to import employees' }, { status: 500 })
  }
}
