// Front-end-only mock Supabase client. Sessions are persisted in localStorage so
// the admin dashboard requires signing in through /admin-login first.

const SESSION_KEY = "bingo_admin_session";

const DEMO_ADMIN = {
  email: "admin@bingo.com",
  password: "admin123",
  user: {
    id: "mock-admin-id",
    email: "admin@bingo.com",
    user_metadata: {
      role: "admin",
      full_name: "Officer Maria Santos",
    },
  },
};

const authListeners = new Set();

const readSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeSession = (session) => {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
};

const notifyListeners = (event, session) => {
  authListeners.forEach((callback) => callback(event, session));
};

const mockSupabase = {
  auth: {
    getSession: async () => ({
      data: { session: readSession() },
      error: null,
    }),
    onAuthStateChange: (callback) => {
      authListeners.add(callback);
      // Emit the current state to the new subscriber
      setTimeout(() => {
        const session = readSession();
        callback(session ? "SIGNED_IN" : "SIGNED_OUT", session);
      }, 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
    signUp: async ({ email, options }) => {
      console.log("Mock SignUp: Citizen account created locally", { email, options });
      return {
        data: {
          user: {
            id: "mock-citizen-id",
            email,
            user_metadata: options?.data || {},
          },
        },
        error: null,
      };
    },
    signInWithPassword: async ({ email, password }) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      if (
        normalizedEmail === DEMO_ADMIN.email &&
        password === DEMO_ADMIN.password
      ) {
        const session = { user: DEMO_ADMIN.user };
        writeSession(session);
        notifyListeners("SIGNED_IN", session);
        return { data: { user: DEMO_ADMIN.user, session }, error: null };
      }
      return {
        data: { user: null, session: null },
        error: { message: "Invalid email or password. Please try again." },
      };
    },
    signOut: async () => {
      writeSession(null);
      notifyListeners("SIGNED_OUT", null);
      return { error: null };
    },
  },
  // Local CRUD mock operations
  from: (tableName) => {
    console.log(`Mock DB operation triggered on: ${tableName}`);
    const chain = {
      select: async () => {
        // Return empty dataset to trigger local fallback states in pages
        return { data: [], error: null };
      },
      insert: async (data) => {
        console.log(`Mock DB insert into ${tableName}:`, data);
        return { data, error: null };
      },
      update: async (data) => {
        return {
          eq: async (column, value) => {
            console.log(`Mock DB update filter eq(${column}, ${value})`);
            return { data, error: null };
          },
        };
      },
      delete: () => {
        return {
          eq: async (column, value) => {
            console.log(`Mock DB delete filter eq(${column}, ${value})`);
            return { error: null };
          },
        };
      },
    };
    return chain;
  },
};

export const supabase = mockSupabase;
