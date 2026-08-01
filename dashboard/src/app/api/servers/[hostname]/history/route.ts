import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hostname: string }> }
) {
  const { hostname } = await params;
  const metricsHistory = globalThis._metricsHistory || new Map();
  const history = metricsHistory.get(hostname) || [];
  return NextResponse.json(history);
}
