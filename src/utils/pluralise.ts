export function pluraliseTerm(term: string, count: number): string {
  if (count === 1) {
    return term;
  }

  if (term.endsWith('s') || term.endsWith('S')) {
    return term;
  }

  return `${term}s`;
}

export function termInSentence(
  term: string,
  count: number,
  atSentenceStart: boolean,
): string {
  const word = pluraliseTerm(term, count);
  return atSentenceStart ? word : word.toLowerCase();
}
