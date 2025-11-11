// /app/kmap/page.tsx
'use client';
import React, { useMemo, useState } from 'react';
import { FaCopy } from 'react-icons/fa';
import { FaCopyright } from 'react-icons/fa';

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
  const [isRunning, setIsRunning] = useState(false);

  const inputCommon =
    'w-full rounded-xl border border-neutral-700 bg-neutral-900/70 px-3 py-2 text-neutral-100 placeholder-neutral-400 ' +
    'shadow-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-600/50';

  const labelCommon = 'text-sm text-neutral-300 mb-1 block';

  const run = async () => {
    setError(null);
    setResult(null);
    setIsRunning(true);
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
    } finally {
      setIsRunning(false);
    }
  };

  const submit: React.FormEventHandler = (e) => {
    e.preventDefault();
    run();
  };

  const numInputOptions = useMemo(() => [2, 3, 4, 5, 6], []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">K-Map (SOP) Solver</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Enter minterms / don&apos;t cares and solve for a simplified SOP expression. Supports 2–6 inputs.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-lg shadow-black/30">
          <form onSubmit={submit} className="space-y-5">
            {/* Number of Inputs (Dropdown) */}
            <div>
              <label className={labelCommon}>Number of inputs (A, B, C, D, E, F)</label>
              <div className="relative">
                <select
                  value={numInputs}
                  onChange={(e) => setNumInputs(parseInt(e.target.value, 10))}
                  className={inputCommon + ' appearance-none pr-10 cursor-pointer'}
                >
                  {numInputOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
                  ▾
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Choose from 2 to 6 variables.</p>
            </div>

            {/* Minterms */}
            <div>
              <label className={labelCommon}>Minterms (comma-separated)</label>
              <input
                type="text"
                value={minterms}
                onChange={(e) => setMinterms(e.target.value)}
                placeholder="e.g. 0,2,5,7,8,10,13,15"
                className={inputCommon}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-neutral-500">Ensure proper amount of minterms are used given number of inputs</p>
            </div>

            {/* Don't cares */}
            <div>
              <label className={labelCommon}>Don&apos;t cares (optional, comma-separated)</label>
              <input
                type="text"
                value={dontCares}
                onChange={(e) => setDontCares(e.target.value)}
                placeholder="e.g. 1,9"
                className={inputCommon}
                autoComplete="off"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isRunning}
                className={[
                  'rounded-xl bg-neutral-200 px-4 py-2 font-medium text-neutral-950 transition',
                  'hover:bg-neutral-300 active:bg-neutral-400',
                  'disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer',
                ].join(' ')}
              >
                {isRunning ? 'Solving…' : 'Solve'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-200 transition hover:bg-neutral-800 cursor-pointer"
              >
                Clear Output
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-red-300">
              <div className="font-medium">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-neutral-200">Expression</strong>
                  <button
                    onClick={() => copy(result.expression)}
                    className="text-xs text-neutral-300 underline-offset-2 hover:underline cursor-pointer "
                  >
                    <FaCopy />
                  </button>
                </div>
                <code className="block whitespace-pre-wrap wrap-break-word font-mono text-sm text-neutral-100">
                  {result.expression}
                </code>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-neutral-200">LaTeX</strong>
                  <button
                    onClick={() => copy(result.latex)}
                    className="text-xs text-neutral-300 underline-offset-2 hover:underline cursor-pointer"
                  >
                    <FaCopy />
                  </button>
                </div>
                <code className="block whitespace-pre-wrap wrap-break-word font-mono text-sm text-neutral-100">
                  {result.latex}
                </code>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <strong className="text-neutral-200">Selected Implicants</strong>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-neutral-300">
                  {result.selectedImplicants.map((imp, i) => (
                    <li key={i}>
                      <code className="font-mono text-neutral-100">{imp.bits}</code>{' '}
                      <span className="text-neutral-400">→</span> covers {imp.covered.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footnote */}
        
      </div>
       <footer className="fixed bottom-0 left-0 w-full py-3 text-center text-sm text-neutral-500 bg-neutral-950 border-t border-neutral-800">
          <div>Karnaugh Map Solver</div>
          <div>Alexander Nickita 2025</div>
        </footer>
    </div>
    
  );
}

function parseList(s: string): number[] {
  if (!s.trim()) return [];
  return s
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => Number.isFinite(x));
}
