const STAFF_KEY = "bingo-staff-v2";

export const initialStaff = [];

export function loadStaffRoster() {
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(
        (p) =>
          p &&
          p.id &&
          p.id !== "DRV-001" &&
          p.id !== "DRV-002" &&
          p.name !== "Juan Dela Cruz" &&
          p.name !== "Pedro Reyes"
      );
      return clean;
    }
  } catch {}
  return initialStaff;
}

export function saveStaffRoster(staff) {
  try {
    window.localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  } catch {}
}
