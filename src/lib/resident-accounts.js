const ACCOUNTS_KEY = "bingo-resident-accounts-v1";

function readAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // storage unavailable — accounts won't persist
  }
}

export function getAccount(email) {
  if (typeof window === "undefined") return null;
  return readAccounts()[email.trim().toLowerCase()] || null;
}

export function createAccount({ name, email, password, sitio, address }) {
  const key = email.trim().toLowerCase();
  const accounts = readAccounts();
  accounts[key] = {
    name,
    email: key,
    password,
    sitio: sitio || null,
    address: address || null,
    resetCode: null,
    createdAt: Date.now(),
  };
  writeAccounts(accounts);
  return accounts[key];
}

// Returns true/false for known accounts, null when the email isn't registered
// (the demo login still allows unregistered emails).
export function verifyPassword(email, password) {
  const account = getAccount(email);
  if (!account) return null;
  return account.password === password;
}

export function issueResetCode(email) {
  const key = email.trim().toLowerCase();
  const accounts = readAccounts();
  const account = accounts[key];
  if (!account) return null;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  account.resetCode = code;
  writeAccounts(accounts);
  return code;
}

export function resetPassword(email, code, newPassword) {
  const key = email.trim().toLowerCase();
  const accounts = readAccounts();
  const account = accounts[key];
  if (!account || !account.resetCode || account.resetCode !== code.trim()) return false;
  account.password = newPassword;
  account.resetCode = null;
  writeAccounts(accounts);
  return true;
}
