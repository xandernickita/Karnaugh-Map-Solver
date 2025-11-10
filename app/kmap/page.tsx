// /app/kmap/page.tsx
'use client';
import React, { useState } from 'react';

type Result = {
  expression: string;
  latex: string;
  selectedImplicants: { bits: string; covered: number[] }[];
};

export default function KMapPage() {
  const [numInputs, setNumInputs] = useState(4);
  const [minterms, setMinterms] = useState('0,2,5,7,8,10,13,15');
  const [dontCares, setDontCares] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/kmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numInputs,
          minterms: parseList(minterms),
          dontCares: parseList(dontCares),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setResult(json as Result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">K‑Map (SOP) Solver</h1>

      <label className="block">
        <span className="text-sm">Number of inputs (2–6)</span>
        <input type="number" min={2} max={6} value={numInputs}
          onChange={e=>setNumInputs(parseInt(e.target.value||'4',10))}
          className="border rounded p-2 w-full" />
      </label>

      <label className="block">
        <span className="text-sm">Minterms (comma-separated)</span>
        <input type="text" value={minterms} onChange={e=>setMinterms(e.target.value)} className="border rounded p-2 w-full" />
      </label>

      <label className="block">
        <span className="text-sm">Don&apos;t cares (optional, comma-separated)</span>
        <input type="text" value={dontCares} onChange={e=>setDontCares(e.target.value)} className="border rounded p-2 w-full" />
      </label>

      <button onClick={run} className="px-4 py-2 rounded bg-black text-white">Solve</button>

      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="border rounded p-4 space-y-2">
          <div><strong>Expression:</strong> {result.expression}</div>
          <div><strong>LaTeX:</strong> {result.latex}</div>
          <div>
            <strong>Selected Implicants:</strong>
            <ul className="list-disc ml-6">
              {result.selectedImplicants.map((imp, i)=>(
                <li key={i}><code>{imp.bits}</code> → covers {imp.covered.join(', ')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function parseList(s: string): number[] {
  if (!s.trim()) return [];
  return s.split(',').map(x=>parseInt(x.trim(),10)).filter(x=>!Number.isNaN(x));
}
