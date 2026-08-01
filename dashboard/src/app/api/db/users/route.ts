import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPrisma } from '@/lib/db';

declare global {
  var _dbUsers: any[] | undefined;
}

if (!globalThis._dbUsers) {
  globalThis._dbUsers = [
    {
      id: "1",
      name: "System Administrator",
      email: "admin@pulseops.io",
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "ADMIN",
      createdAt: "2026-08-01"
    },
    {
      id: "2",
      name: "Monitor User",
      email: "user@pulseops.io",
      passwordHash: bcrypt.hashSync("user123", 10),
      role: "VIEWER",
      createdAt: "2026-08-01"
    }
  ];
}

const dbUsers = globalThis._dbUsers;

// GET: Fetch all users from Supabase / Memory
export async function GET() {
  const prisma = getPrisma();
  try {
    if (prisma) {
      const dbUsersFromSupabase = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });
      return NextResponse.json(dbUsersFromSupabase);
    }
  } catch (e) {
    console.error("Supabase query fallback:", e);
  }

  const safeUsers = dbUsers.map(({ passwordHash, ...u }) => u);
  return NextResponse.json(safeUsers);
}

// POST: Create a new user account (Admin permission required)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, requesterRole } = body;

    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied: Only Admin users can modify the database' }, { status: 403 });
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, Email, and Password are required' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const prisma = getPrisma();
    if (prisma) {
      try {
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: role === 'ADMIN' ? 'ADMIN' : 'VIEWER'
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        });
        return NextResponse.json({ status: 'success', user: newUser });
      } catch (err: any) {
        if (err.code === 'P2002') {
          return NextResponse.json({ error: 'User with this email already exists in Supabase' }, { status: 400 });
        }
      }
    }

    // In-memory fallback
    const existing = dbUsers.find(u => u.email === email);
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      passwordHash,
      role: role || 'VIEWER',
      createdAt: new Date().toISOString().split('T')[0]
    };

    dbUsers.push(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return NextResponse.json({ status: 'success', user: safeUser });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// DELETE: Remove a user account (Admin permission required)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requesterRole = searchParams.get('requesterRole');

    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied: Only Admin users can modify database records' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ status: 'success', message: 'User removed from Supabase Database' });
      } catch (err) {}
    }

    const index = dbUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      const removed = dbUsers.splice(index, 1);
      return NextResponse.json({ status: 'success', removedUser: removed[0] });
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
