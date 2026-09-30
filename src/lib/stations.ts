let cached: string[] | null = null

export async function loadStationNames(): Promise<string[]> {
  if (cached) return cached
  const res = await fetch('/stations.txt')
  const text = await res.text()
  const names = text
    .split(/\r?\n/)
    .map((line) => line.split('\t')[0]?.trim() ?? '')
    .filter(Boolean)
  cached = ['', ...names]
  return cached
}
