import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
