export function countWords(lines: string[]) {
  return lines
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function extractKeywords(lines: string[]) {
  const stopWords = new Set([
    'the',
    'and',
    'that',
    'with',
    'have',
    'because',
    'there',
    'about',
    'would',
    'which',
    'their',
    'really',
    'during',
    'people',
  ]);

  const counts = new Map<string, number>();

  lines
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4 && !stopWords.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);
}
