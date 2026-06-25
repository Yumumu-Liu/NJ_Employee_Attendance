export const ADMIN_AUTH_KEY = 'admin_authenticated'

export function isAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true'
}

export function setAdminLoggedIn(loggedIn: boolean): void {
  if (typeof window === 'undefined') return
  if (loggedIn) {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true')
  } else {
    localStorage.removeItem(ADMIN_AUTH_KEY)
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    return res.ok
  } catch (err) {
    console.error('Password verification failed:', err)
    return false
  }
}
