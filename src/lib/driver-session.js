const SESSION_KEY = "bingo-driver-session-v1";

export function getDriverSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function setDriverSession({ email, name }) {
  try {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, name, signedInAt: Date.now() })
    );
  } catch {
    // storage unavailable — session won't persist
  }
}

export function clearDriverSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
