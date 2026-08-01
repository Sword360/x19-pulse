import { NextResponse } from 'next/server';

// DELETE: Remove a registered agent server node from database (Admin permission required)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostname = searchParams.get('hostname');
    const requesterRole = searchParams.get('requesterRole');

    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied: Only Admin users can remove server nodes from the database' }, { status: 403 });
    }

    if (!hostname) {
      return NextResponse.json({ error: 'Hostname is required' }, { status: 400 });
    }

    const serverStore = globalThis._serverStore;
    const metricsHistory = globalThis._metricsHistory;

    if (serverStore && serverStore.has(hostname)) {
      serverStore.delete(hostname);
    }
    if (metricsHistory && metricsHistory.has(hostname)) {
      metricsHistory.delete(hostname);
    }

    return NextResponse.json({ status: 'success', message: `Server node ${hostname} removed from database` });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to remove server node' }, { status: 500 });
  }
}
