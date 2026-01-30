import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // Redirect from blind-code.vlx.dk and www.blind-code.vlx.dk to www.blind-code.work
  if (hostname === 'blind-code.vlx.dk' || hostname === 'www.blind-code.vlx.dk') {
    const url = request.nextUrl.clone()
    url.host = 'www.blind-code.work'
    url.protocol = 'https:'

    return NextResponse.redirect(url, 301) // 301 = permanent redirect
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all routes including root
  matcher: [
    '/',
    '/:path*',
  ],
}
