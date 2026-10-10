declare module 'nspell' {
  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): { correct: boolean; forbidden: boolean; warn: boolean };
    add(word: string): NSpell;
    remove(word: string): NSpell;
    wordCharacters(): string;
    dictionary(dic: string): NSpell;
    personal(dic: string): NSpell;
  }

  function nspell(aff: string, dic: string): NSpell;

  export = nspell;
}
