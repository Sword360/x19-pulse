import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPrisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    let user: any = null;

    const prisma = getPrisma();
    if (prisma) {
      try {
        user = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });
      } catch (err) {
        console.error("Supabase auth query fallback:", err);
      }
    }

    if (!user) {
      const dbUsers = globalThis._dbUsers || [];
      user = dbUsers.find(u => u.email.toLowerCase() === cleanEmail);
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const match = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'success',
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
