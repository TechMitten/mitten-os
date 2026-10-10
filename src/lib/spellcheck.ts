import nspell from 'nspell';

type Speller = ReturnType<typeof nspell>;

let speller: Speller | null = null;
let loadPromise: Promise<Speller | null> | null = null;
const listeners = new Set<() => void>();

export function isSpellcheckReady(): boolean {
  return speller !== null;
}

export function onSpellcheckReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadSpellcheck(): Promise<Speller | null> {
  if (speller) return Promise.resolve(speller);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const [affRes, dicRes] = await Promise.all([
        fetch('/spellcheck/en-us.aff'),
        fetch('/spellcheck/en-us.dic'),
      ]);
      if (!affRes.ok || !dicRes.ok) return null;
      const [aff, dic] = await Promise.all([affRes.text(), dicRes.text()]);
      speller = nspell(aff, dic);
      listeners.forEach((listener) => listener());
      return speller;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

const WORD_RE = /^[A-Za-z][A-Za-z'’-]*$/;

function normalize(raw: string): string {
  return raw.replace(/[’]/g, "'").replace(/^['-]+|['-]+$/g, '');
}

// Words that only differ from a dictionary entry by capitalisation (e.g.
// "url" vs "URL", "oman" vs "Oman") are not spelling mistakes, and nspell
// would otherwise suggest the word back to itself.
function hasCaseVariant(word: string): boolean {
  if (!speller) return false;
  const lower = word.toLowerCase();
  return speller.suggest(word).some((suggestion) => suggestion.toLowerCase() === lower);
}

export function isMisspelled(raw: string): boolean {
  if (!speller) return false;
  const word = normalize(raw);
  if (word.length < 3 || !WORD_RE.test(word)) return false;
  if (speller.correct(word)) return false;
  if (speller.correct(word.toLowerCase())) return false;
  if (hasCaseVariant(word)) return false;
  return true;
}

export function getSuggestions(raw: string, limit = 8): string[] {
  if (!speller) return [];
  const word = normalize(raw);
  if (!word || !WORD_RE.test(word)) return [];
  const lower = word.toLowerCase();
  const seen = new Set<string>();
  const results: string[] = [];
  for (const suggestion of speller.suggest(word)) {
    const key = suggestion.toLowerCase();
    if (key === lower || seen.has(key)) continue;
    seen.add(key);
    results.push(suggestion);
    if (results.length >= limit) break;
  }
  return results;
}

export function addToDictionary(raw: string): void {
  if (!speller) return;
  const word = normalize(raw);
  if (word && WORD_RE.test(word)) speller.add(word);
}
