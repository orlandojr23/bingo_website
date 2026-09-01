const STAFF_KEY = "bingo-staff-v1";

export const initialStaff = [
  { id: "DRV-001", name: "Juan Dela Cruz", role: "Driver", username: "juan.driver", status: "Active" },
  { id: "DRV-002", name: "Pedro Reyes", role: "Driver", username: "pedro.driver", status: "Active" },
];

export function loadStaffRoster() {
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((p) => p && p.id)) {
      return parsed;
    }
  } catch {}
  return initialStaff;
}

export function saveStaffRoster(staff) {
  try {
    window.localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  } catch {}
}
