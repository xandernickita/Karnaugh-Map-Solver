// /app/api/kmap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { minimizeKMapJS } from '@/lib/kmap'; // adjust path if you place the file differently

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numInputs, minterms, dontCares, vars } = body ?? {};
    if (typeof numInputs !== 'number' || !Array.isArray(minterms)) {
      return NextResponse.json({ error: 'numInputs (number) and minterms (number[]) are required.' }, { status: 400 });
    }
    const result = minimizeKMapJS({ numInputs, minterms, dontCares, vars });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
