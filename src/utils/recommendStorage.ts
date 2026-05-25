const STORAGE_KEY = 'holo:recommended-posts';

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Safari 프라이빗 모드 등: 무시
  }
}

export function getRecommendedSet(): Set<string> {
  return readSet();
}

export function hasRecommended(postId: string): boolean {
  return readSet().has(postId);
}

export function addRecommended(postId: string): void {
  const set = readSet();
  set.add(postId);
  writeSet(set);
}

export function removeRecommended(postId: string): void {
  const set = readSet();
  set.delete(postId);
  writeSet(set);
}
