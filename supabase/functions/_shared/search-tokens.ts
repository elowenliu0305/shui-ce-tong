export function tokenizeChineseSearch(value: string): string[] {
  const normalized = value.toLocaleLowerCase("zh-CN").normalize("NFKC");
  const tokens = new Set<string>();
  for (const word of normalized.match(/[a-z0-9][a-z0-9._-]{1,31}/g) ?? []) tokens.add(word);
  for (const sequence of normalized.match(/[\u3400-\u9fff]{2,}/g) ?? []) {
    for (let index = 0; index < sequence.length; index += 1) {
      tokens.add(sequence[index]);
      if (index + 1 < sequence.length) tokens.add(sequence.slice(index, index + 2));
    }
  }
  return [...tokens].slice(0, 128);
}
