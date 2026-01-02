import { NextResponse } from 'next/server';
import { validateKindeToken, getKindeUserProfile } from '@/app/lib/kinde';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : undefined;
    const body = await req.json().catch(() => ({}));
    const token = tokenFromHeader || body.token;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = await validateKindeToken(token);
    let profile = null;
    try {
      profile = await getKindeUserProfile(token);
    } catch (e) {
      // non-fatal; payload is still useful
    }

    return NextResponse.json({ ok: true, payload, profile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 401 });
  }
}
