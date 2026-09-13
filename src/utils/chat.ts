export function chatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const day = (x: Date) => x.getFullYear() * 1000 + Math.floor((x.getMonth() * 31 + x.getDate()));
  const diff = day(now) - day(d);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function sameChatList(a: { id: string }[], b: { id: string }[]): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  return a[a.length - 1]?.id === b[b.length - 1]?.id && a[0]?.id === b[0]?.id;
}

export function splitQuote(text: string): { quote?: string; body: string } {
  if (!text.startsWith("> ")) return { body: text };
  const lines = text.split("\n");
  const quoteLines: string[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    if (lines[i].startsWith("> ")) quoteLines.push(lines[i].slice(2));
    else break;
  }
  return { quote: quoteLines.join("\n"), body: lines.slice(i).join("\n").replace(/^\n+/, "") };
}

export function splitQuoteName(quote: string): { name?: string; text: string } {
  const m = quote.match(/^([^:\n]{1,32}):\s([\s\S]*)$/);
  return m ? { name: m[1], text: m[2] } : { text: quote };
}

export function dedupeChat<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

export function loadSeen(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSeen(key: string, map: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

export function countSince<T extends { timestamp: string; sender: string }>(
  list: T[],
  sinceIso: string | undefined,
  excludeSender?: string
): number {
  if (!sinceIso) return 0;
  const since = new Date(sinceIso).getTime();
  if (isNaN(since)) return 0;
  let n = 0;
  for (const m of list) {
    if (excludeSender && m.sender === excludeSender) continue;
    const t = new Date(m.timestamp).getTime();
    if (!isNaN(t) && t > since) n++;
  }
  return n;
}
