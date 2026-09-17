import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isRootPage = request.nextUrl.pathname === '/'
  const isDashboardPage = ['/alunos', '/checkin', '/cursos', '/matriculas', '/operadores', '/historico', '/relatorios'].some(path => request.nextUrl.pathname.startsWith(path))

  if (user) {
    if (isAuthPage || isRootPage) {
      // User is logged in, do not show login or empty root page. Redirect to Check-in (Frequências)
      return NextResponse.redirect(new URL('/checkin', request.url))
    }
  } else {
    if (isDashboardPage || isRootPage) {
      // User is NOT logged in, protect dashboard and root page
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

