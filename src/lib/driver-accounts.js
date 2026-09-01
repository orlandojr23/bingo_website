const ACCOUNTS_KEY = "bingo-driver-accounts-v1";

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

export function getDriverAccount(email) {
  if (typeof window === "undefined") return null;
  return readAccounts()[email.trim().toLowerCase()] || null;
}

export function saveDriverAccount({ name, email, password }) {
  const key = email.trim().toLowerCase();
  const accounts = readAccounts();
  accounts[key] = { name, email: key, password, createdAt: accounts[key]?.createdAt || Date.now() };
  writeAccounts(accounts);
  return accounts[key];
}

// Returns true/false for known accounts, null when the email isn't registered
// (the demo login still allows unregistered emails).
export function verifyDriverPassword(email, password) {
  const account = getDriverAccount(email);
  if (!account) return null;
  return account.password === password;
}

export function changeDriverPassword(email, currentPassword, newPassword) {
  const key = email.trim().toLowerCase();
  const accounts = readAccounts();
  const account = accounts[key];
  if (!account) return "no-account";
  if (account.password !== currentPassword) return "wrong-current";
  account.password = newPassword;
  writeAccounts(accounts);
  return true;
}

export function removeDriverAccount(email) {
  const key = email.trim().toLowerCase();
  const accounts = readAccounts();
  if (!(key in accounts)) return false;
  delete accounts[key];
  writeAccounts(accounts);
  return true;
}

// Moves an account to a new email key while keeping its password/history
export function renameDriverAccount(oldEmail, newEmail, name) {
  const oldKey = oldEmail.trim().toLowerCase();
  const newKey = newEmail.trim().toLowerCase();
  if (oldKey === newKey) return true;
  const accounts = readAccounts();
  const account = accounts[oldKey];
  if (!account) return false;
  delete accounts[oldKey];
  accounts[newKey] = { ...account, email: newKey, name: name ?? account.name };
  writeAccounts(accounts);
  return true;
}
