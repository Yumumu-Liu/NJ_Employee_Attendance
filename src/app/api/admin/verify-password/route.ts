import { NextResponse, NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const adminPassword = process.env.ADMIN_PASSWORD

    if (password === adminPassword) {
      return NextResponse.json({ success: true, token: 'valid' })
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch (error) {
    console.error('Error verifying password:', error)
    return NextResponse.json({ error: 'Failed to verify' }, { status: 500 })
  }
}
