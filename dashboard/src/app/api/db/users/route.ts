import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
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

// GET: Fetch all users from Supabase REST API / Memory
export async function GET() {
  try {
    const { data: supaUsers, error } = await supabase.from('users').select('id, name, email, role, created_at');
    if (!error && supaUsers && supaUsers.length > 0) {
      return NextResponse.json(supaUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at || "2026-08-01"
      })));
    }
  } catch (e) {
    console.error("Supabase REST API fallback:", e);
  }

  const prisma = getPrisma();
  if (prisma) {
    try {
      const dbUsersFromPrisma = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      });
      if (dbUsersFromPrisma.length > 0) {
        return NextResponse.json(dbUsersFromPrisma);
      }
    } catch (e) {}
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

    // Save to Supabase Cloud Database via REST API
    try {
      const { data, error } = await supabase.from('users').insert([
        {
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: role === 'ADMIN' ? 'ADMIN' : 'VIEWER'
        }
      ]).select('id, name, email, role, created_at').single();

      if (!error && data) {
        return NextResponse.json({ status: 'success', user: data });
      }
    } catch (e) {
      console.error("Supabase insert error:", e);
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

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) {
        return NextResponse.json({ status: 'success', message: 'User removed from Supabase Database' });
      }
    } catch (e) {}

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
