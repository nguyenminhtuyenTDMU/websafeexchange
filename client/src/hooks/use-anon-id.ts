const LS_KEY = "safeexchange_anon_id";

function getOrCreateAnonToken(): string {
  let token = localStorage.getItem(LS_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(LS_KEY, token);
  }
  return token;
}

// Returns the first 12 chars of the browser's persistent anon UUID.
// Stable per browser, not linkable across different posts without more data.
export function useAnonId(): string {
  return getOrCreateAnonToken().slice(0, 12);
}

// ─── Per-post anon identity coloring ─────────────────────────────────────────

const ANON_COLORS = [
  { bg: "bg-blue-500",   ring: "ring-blue-400",   label: "text-blue-700 dark:text-blue-300"   },
  { bg: "bg-green-500",  ring: "ring-green-400",  label: "text-green-700 dark:text-green-300"  },
  { bg: "bg-yellow-500", ring: "ring-yellow-400", label: "text-yellow-700 dark:text-yellow-300" },
  { bg: "bg-red-500",    ring: "ring-red-400",    label: "text-red-700 dark:text-red-300"    },
  { bg: "bg-purple-500", ring: "ring-purple-400", label: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-orange-500", ring: "ring-orange-400", label: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-teal-500",   ring: "ring-teal-400",   label: "text-teal-700 dark:text-teal-300"   },
  { bg: "bg-pink-500",   ring: "ring-pink-400",   label: "text-pink-700 dark:text-pink-300"   },
];

export type AnonColorEntry = typeof ANON_COLORS[number] & { index: number };

// Given a list of anonIds (in order of comment creation), returns a map
// anonId → { index (1-based), color }. Named users (anonId = null) are skipped.
export function buildAnonColorMap(
  anonIds: (string | null | undefined)[]
): Map<string, AnonColorEntry> {
  const map = new Map<string, AnonColorEntry>();
  let counter = 0;
  for (const id of anonIds) {
    if (!id || map.has(id)) continue;
    const color = ANON_COLORS[counter % ANON_COLORS.length];
    map.set(id, { ...color, index: counter + 1 });
    counter++;
  }
  return map;
}
