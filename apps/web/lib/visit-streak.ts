export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisit: string; // ISO date YYYY-MM-DD
  totalVisits: number;
}

const STORAGE_KEY = 'tc-visit-streak';
const FIRST_VISIT_KEY = 'tc-first-visit';

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const msA = new Date(a + 'T00:00:00').getTime();
  const msB = new Date(b + 'T00:00:00').getTime();
  return Math.round((msB - msA) / 86400000);
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StreakData;
  } catch { /* ignore */ }
  return { currentStreak: 0, longestStreak: 0, lastVisit: '', totalVisits: 0 };
}

function saveStreak(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function recordVisit(): StreakData {
  const today = getToday();
  const data = loadStreak();

  // Ensure first-visit is set
  try {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, today);
    }
  } catch { /* ignore */ }

  if (data.lastVisit === today) {
    // Same day — no change
    return data;
  }

  const diff = data.lastVisit ? daysBetween(data.lastVisit, today) : -1;

  if (diff === 1) {
    // Yesterday → continue streak
    data.currentStreak += 1;
  } else {
    // Older or first visit → reset
    data.currentStreak = 1;
  }

  data.totalVisits += 1;
  data.lastVisit = today;
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }

  saveStreak(data);
  return data;
}

export function getStreak(): StreakData {
  return loadStreak();
}
