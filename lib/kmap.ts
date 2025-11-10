// /lib/kmap.ts
// Next.js-ready TypeScript K-Map solver (SOP) with optional don't-cares.
// Adds proper LaTeX output using \overline{} for complemented literals.

export type Implicant = {
  bits: string;           // e.g., '10-1'
  covered: number[];      // minterms covered
};

export type SolveOptions = {
  numInputs: number;          // 2..6
  minterms: number[];         // required 1-cells
  dontCares?: number[];       // optional X-cells
  vars?: string[];            // optional var symbols (default ['A','B','C','D','E','F'])
};

export type SolveResult = {
  numInputs: number;
  primeImplicants: Implicant[];
  essentialPrimeImplicants: Implicant[];
  selectedImplicants: Implicant[];
  expression: string;        // e.g., A'B + C D'
  latex: string;             // e.g., $F = A \overline{B} + C \overline{D}$
};

const DEFAULT_VARS = ['A','B','C','D','E','F'] as const;

export function toBinary(n: number, width: number): string {
  let s = n.toString(2).padStart(width, '0');
  return s;
}

export function countOnes(s: string): number {
  let c = 0;
  for (const ch of s) if (ch === '1') c++;
  return c;
}

export function combine(a: string, b: string): string | null {
  // Combine two implicants if they differ in exactly one position (ignoring '-')
  let diff = 0;
  let out = '';
  for (let i = 0; i < a.length; i++) {
    const ca = a[i], cb = b[i];
    if (ca === cb) {
      out += ca;
    } else if (ca !== '-' && cb !== '-') {
      diff++;
      out += '-';
    } else {
      return null;
    }
    if (diff > 1) return null;
  }
  return diff === 1 ? out : null;
}

function uniqueByBits(imps: Implicant[]): Implicant[] {
  const seen = new Set<string>();
  const res: Implicant[] = [];
  for (const imp of imps) {
    if (!seen.has(imp.bits)) {
      seen.add(imp.bits);
      res.push(imp);
    }
  }
  return res;
}

function coveredBy(bits: string, m: number, width: number): boolean {
  const b = toBinary(m, width);
  for (let i = 0; i < width; i++) {
    if (bits[i] === '-') continue;
    if (bits[i] !== b[i]) return false;
  }
  return true;
}

function expandCoverage(bits: string, universe: number[], width: number): number[] {
  return universe.filter(m => coveredBy(bits, m, width));
}

function formatImplicant(bits: string, vars: string[]): string {
  let out: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '-') continue;
    if (bits[i] === '1') out.push(vars[i]);
    else out.push(vars[i] + "'");
  }
  if (out.length === 0) return '1';
  return out.join('');
}

function formatImplicantLatex(bits: string, vars: string[]): string {
  // Build a TeX term using \overline for complemented literals, space-separated.
  // e.g., '1-0-' with vars ['A','B','C','D'] -> A \overline{B} \overline{D}
  const out: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    const ch = bits[i];
    if (ch === '-') continue;
    if (ch === '1') out.push(vars[i]);
    else out.push(`\\overline{${vars[i]}}`);
  }
  return out.length ? out.join(' ') : '1';
}

function petricksMethod(coverSets: number[][]): number[] {
  // coverSets: for each uncovered minterm, a list of implicant indices that can cover it.
  // Return a minimal set of implicant indices that cover all minterms.
  let solutions: number[][] = [[]]; // start with empty product

  for (const choices of coverSets) {
    const next: number[][] = [];
    for (const sol of solutions) {
      for (const c of choices) {
        const merged = Array.from(new Set([...sol, c])).sort((a,b)=>a-b);
        next.push(merged);
      }
    }
    solutions = minimizeSets(next);
  }

  // Minimal by number of implicants; tie-break handled upstream if needed
  solutions.sort((a,b)=>a.length-b.length);
  return solutions.length ? solutions[0] : [];
}

function minimizeSets(sets: number[][]): number[][] {
  const unique: number[][] = [];
  const key = (arr: number[]) => arr.join(',');
  const seen = new Set<string>();
  sets.sort((a,b)=>a.length-b.length);
  for (const s of sets) {
    const k = key(s);
    if (seen.has(k)) continue;
    let dominated = false;
    for (let i = 0; i < unique.length; i++) {
      if (isSubset(unique[i], s)) { dominated = true; break; }
      if (isSubset(s, unique[i])) { unique.splice(i,1); i--; }
    }
    if (!dominated) {
      unique.push(s);
      seen.add(k);
    }
  }
  return unique;
}

function isSubset(a: number[], b: number[]): boolean {
  const sb = new Set(b);
  for (const x of a) if (!sb.has(x)) return false;
  return true;
}

export function minimizeKMapJS(opts: SolveOptions): SolveResult {
  const width = opts.numInputs;
  if (width < 2 || width > 6) {
    throw new Error("numInputs must be between 2 and 6.");
  }
  const vars = (opts.vars && opts.vars.length>=width ? opts.vars : DEFAULT_VARS.slice(0,width)) as string[];
  const minterms = Array.from(new Set(opts.minterms)).sort((a,b)=>a-b);
  const dontCares = Array.from(new Set(opts.dontCares ?? [])).sort((a,b)=>a-b);
  const universe = Array.from(new Set([...minterms, ...dontCares])).sort((a,b)=>a-b);

  // 1) Initialize implicant groups by ones count
  const groups: Map<number, Implicant[]> = new Map();
  for (const m of universe) {
    const bits = toBinary(m, width);
    const ones = countOnes(bits);
    const imp: Implicant = { bits, covered: [m] };
    const arr = groups.get(ones) ?? [];
    arr.push(imp);
    groups.set(ones, arr);
  }

  // 2) Iteratively combine
  const allPrime: Implicant[] = [];
  let currentGroups = groups;
  while (true) {
    const nextGroups: Map<number, Implicant[]> = new Map();
    const taken = new Set<string>();
    const keys = Array.from(currentGroups.keys()).sort((a,b)=>a-b);
    let anyCombined = false;

    for (let gi = 0; gi < keys.length-1; gi++) {
      const gA = currentGroups.get(keys[gi]) ?? [];
      const gB = currentGroups.get(keys[gi+1]) ?? [];
      for (const a of gA) {
        for (const b of gB) {
          const comb = combine(a.bits, b.bits);
          if (comb) {
            anyCombined = true;
            const ones = countOnes(comb.replace(/-/g,''));
            const imp: Implicant = {
              bits: comb,
              covered: Array.from(new Set([...a.covered, ...b.covered])).sort((x,y)=>x-y),
            };
            const arr = nextGroups.get(ones) ?? [];
            if (!arr.find(x => x.bits === imp.bits)) arr.push(imp);
            nextGroups.set(ones, arr);
            taken.add(a.bits);
            taken.add(b.bits);
          }
        }
      }
    }

    for (const [, arr] of currentGroups) {
      for (const imp of arr) if (!taken.has(imp.bits)) {
        if (!allPrime.find(x => x.bits === imp.bits)) allPrime.push(imp);
      }
    }

    if (!anyCombined) break;
    currentGroups = nextGroups;
  }

  // 3) Prime implicant chart (only on required minterms)
  const primes = uniqueByBits(allPrime).map(imp => ({
    bits: imp.bits,
    covered: expandCoverage(imp.bits, minterms, width),
  }));

  // minterm -> implicant indices
  const mToImps: Map<number, number[]> = new Map();
  for (let i = 0; i < primes.length; i++) {
    for (const m of primes[i].covered) {
      const arr = mToImps.get(m) ?? [];
      arr.push(i);
      mToImps.set(m, arr);
    }
  }

  // Essential implicants
  const essential: Set<number> = new Set();
  const coveredMinterms: Set<number> = new Set();
  for (const m of minterms) {
    const imps = mToImps.get(m) ?? [];
    if (imps.length === 1) essential.add(imps[0]);
  }
  for (const ei of essential) for (const m of primes[ei].covered) coveredMinterms.add(m);

  // Petrick for the rest
  const remaining = minterms.filter(m => !coveredMinterms.has(m));
  let chosen: Set<number> = new Set(essential);
  if (remaining.length > 0) {
    const coverSets: number[][] = remaining.map(m => mToImps.get(m) ?? []);
    const pick = petricksMethod(coverSets);
    for (const i of pick) chosen.add(i);
  }

  const selected = Array.from(chosen).sort((a,b)=>a-b).map(i => primes[i]);
  const exprTerms = selected.map(imp => formatImplicant(imp.bits, vars));
  const expression = exprTerms.join(' + ') || '0';

  const latexTerms = selected.map(imp => formatImplicantLatex(imp.bits, vars));
  const latex = `$F = ${latexTerms.join(' + ')}$`;

  return {
    numInputs: width,
    primeImplicants: primes,
    essentialPrimeImplicants: Array.from(essential).sort((a,b)=>a-b).map(i => primes[i]),
    selectedImplicants: selected,
    expression,
    latex,
  };
}
