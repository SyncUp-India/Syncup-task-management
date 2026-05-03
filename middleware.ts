import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, AUTH_COOKIE } from './lib/auth'

const AUTH_PAGES = ['/login', '/forgot-password', '/reset-password', '/setup']
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/cron', '/api/github-webhook']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isAuthPage = AUTH_PAGES.some(p => pathname.startsWith(p))
  const isPublicApi = PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))

  if (isPublicApi) return NextResponse.next()

  const token = request.cookies.get(AUTH_COOKIE)?.value
  const user = token ? await verifyToken(token) : null

  // Redirect already-logged-in users away from auth pages
  if (isAuthPage) {
    if (user) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  // Require auth for everything else
  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only paths
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  if (isAdminPath && user.role !== 'admin') {
    if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
