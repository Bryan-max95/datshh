import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];

  // Verifica si el origen es permitido
  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/*', // Aplica este middleware solo a las rutas de la API
};
