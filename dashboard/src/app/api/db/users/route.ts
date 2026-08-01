import { NextResponse } from 'next/server';

// Global database store for user accounts
declare global {
  var _dbUsers: any[] | undefined;
}

if (!globalThis._dbUsers) {
  globalThis._dbUsers = [
    {
      id: "1",
      name: "System Administrator",
      email: "admin@pulseops.io",
      password: "admin123",
      role: "ADMIN",
      createdAt: "2026-08-01"
    },
    {
      id: "2",
      name: "Monitor User",
      email: "user@pulseops.io",
      password: "user123",
      role: "VIEWER",
      createdAt: "2026-08-01"
    }
  ];
}

const dbUsers = globalThis._dbUsers;

// GET: Fetch all user accounts
export async function GET() {
  const safeUsers = dbUsers.map(({ password, ...u }) => u);
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

    const existing = dbUsers.find(u => u.email === email);
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: role || 'VIEWER',
      createdAt: new Date().toISOString().split('T')[0]
    };

    dbUsers.push(newUser);
    return NextResponse.json({ status: 'success', user: newUser });
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
