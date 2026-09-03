const SESSION_KEY = "bingo-resident-session-v1";

export function getResidentSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function setResidentSession({ email, name, sitio, address }) {
  try {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, name, sitio: sitio || null, address: address || null, signedInAt: Date.now() })
    );
  } catch {
    // storage unavailable — session won't persist
  }
}

export function clearResidentSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
