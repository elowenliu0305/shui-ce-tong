import { createHash } from "node:crypto";

export interface KnowledgeChunkDraft {
  ordinal: number;
  headingPath: string[];
  paragraphStart: number;
  paragraphEnd: number;
  charStart: number;
  charEnd: number;
  content: string;
  contentHash: string;
  searchTokens: string[];
}

interface TextUnit {
  text: string;
  paragraph: number;
  start: number;
  end: number;
  headingPath: string[];
}

export interface ChunkOptions {
  targetMin: number;
  targetMax: number;
  overlapMin: number;
  overlapMax: number;
}

const defaults: ChunkOptions = { targetMin: 450, targetMax: 800, overlapMin: 80, overlapMax: 120 };

function headingLevel(value: string): number | null {
  if (/^第[一二三四五六七八九十百千万\d]+章/.test(value)) return 1;
  if (/^第[一二三四五六七八九十百千万\d]+节/.test(value)) return 2;
  if (/^第[一二三四五六七八九十百千万\d]+条/.test(value)) return 3;
  if (/^[一二三四五六七八九十百]+、/.test(value)) return 2;
  if (/^[（(][一二三四五六七八九十\d]+[）)]/.test(value)) return 3;
  return null;
}

function splitParagraph(text: string, paragraph: number, start: number, headingPath: string[], max: number): TextUnit[] {
  if (text.length <= max) return [{ text, paragraph, start, end: start + text.length, headingPath: [...headingPath] }];
  const units: TextUnit[] = [];
  const sentencePattern = /[^。！？；\n]+[。！？；]?/g;
  let current = "";
  let currentStart = start;
  for (const match of text.matchAll(sentencePattern)) {
    const sentence = match[0];
    if (current && current.length + sentence.length > max) {
      units.push({ text: current, paragraph, start: currentStart, end: currentStart + current.length, headingPath: [...headingPath] });
      current = "";
    }
    if (!current) currentStart = start + (match.index ?? 0);
    current += sentence;
    while (current.length > max) {
      const part = current.slice(0, max);
      units.push({ text: part, paragraph, start: currentStart, end: currentStart + part.length, headingPath: [...headingPath] });
      current = current.slice(max);
      currentStart += max;
    }
  }
  if (current) units.push({ text: current, paragraph, start: currentStart, end: currentStart + current.length, headingPath: [...headingPath] });
  return units;
}

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
  return [...tokens].slice(0, 4_000);
}

function textUnits(text: string, max: number): TextUnit[] {
  const units: TextUnit[] = [];
  const headings: string[] = [];
  let paragraph = 0;
  for (const match of text.matchAll(/[^\n]+/g)) {
    const value = match[0].trim();
    if (!value) continue;
    const start = (match.index ?? 0) + match[0].indexOf(value);
    const level = headingLevel(value);
    if (level) {
      headings.splice(level - 1);
      headings[level - 1] = value.slice(0, 120);
      headings.splice(level);
    }
    units.push(...splitParagraph(value, paragraph, start, headings, max));
    paragraph += 1;
  }
  return units;
}

export function chunkKnowledgeDocument(text: string, options: Partial<ChunkOptions> = {}): KnowledgeChunkDraft[] {
  const config = { ...defaults, ...options };
  if (config.targetMin <= 0 || config.targetMax < config.targetMin || config.overlapMin < 0 || config.overlapMax < config.overlapMin) {
    throw new Error("invalid_chunk_options");
  }
  const units = textUnits(text, config.targetMax);
  const chunks: KnowledgeChunkDraft[] = [];
  let start = 0;
  while (start < units.length) {
    let end = start;
    let length = 0;
    while (end < units.length) {
      const added = units[end].text.length + (end > start ? 1 : 0);
      if (length >= config.targetMin && length + added > config.targetMax) break;
      if (length && length + added > config.targetMax) break;
      length += added;
      end += 1;
    }
    if (end === start) end += 1;
    const selected = units.slice(start, end);
    const content = selected.map((unit) => unit.text).join("\n");
    chunks.push({
      ordinal: chunks.length,
      headingPath: selected[0].headingPath,
      paragraphStart: selected[0].paragraph,
      paragraphEnd: selected[selected.length - 1].paragraph,
      charStart: selected[0].start,
      charEnd: selected[selected.length - 1].end,
      content,
      contentHash: createHash("sha256").update(content).digest("hex"),
      searchTokens: tokenizeChineseSearch(content),
    });
    if (end >= units.length) break;
    let nextStart = end;
    let overlap = 0;
    while (nextStart > start + 1) {
      const previousLength = units[nextStart - 1].text.length;
      if (overlap + previousLength > config.overlapMax) break;
      overlap += previousLength;
      nextStart -= 1;
      if (overlap >= config.overlapMin) break;
    }
    start = nextStart === start ? end : nextStart;
  }
  return chunks;
}

export interface EmbeddingRow {
  chunkId: string;
  values: number[];
}

export function validateEmbeddingGeneration(chunkIds: string[], rows: EmbeddingRow[], dimension = 1024) {
  const expected = new Set(chunkIds);
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const row of rows) {
    if (!expected.has(row.chunkId)) errors.push(`unexpected:${row.chunkId}`);
    if (seen.has(row.chunkId)) errors.push(`duplicate:${row.chunkId}`);
    seen.add(row.chunkId);
    if (row.values.length !== dimension || row.values.some((value) => !Number.isFinite(value))) errors.push(`dimension:${row.chunkId}`);
  }
  for (const chunkId of expected) if (!seen.has(chunkId)) errors.push(`missing:${chunkId}`);
  return { valid: errors.length === 0, chunkCount: expected.size, embeddingCount: rows.length, dimension, errors };
}
