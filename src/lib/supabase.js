// Mock Supabase client to bypass backend calls and allow smooth offline local navigation
const mockSupabase = {
  auth: {
    getSession: async () => {
      // Simulate an active admin session by default so the user is pre-authenticated
      return {
        data: {
          session: {
            user: {
              id: "mock-admin-id",
              email: "admin@bingo.com",
              user_metadata: {
                role: "admin",
                full_name: "Mock Admin"
              }
            }
          }
        },
        error: null
      };
    },
    onAuthStateChange: (callback) => {
      const session = {
        user: {
          id: "mock-admin-id",
          email: "admin@bingo.com",
          user_metadata: {
            role: "admin",
            full_name: "Mock Admin"
          }
        }
      };
      // Trigger initial login event
      setTimeout(() => callback("SIGNED_IN", session), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signUp: async ({ email, password, options }) => {
      console.log("Mock SignUp: Citizen account created locally", { email, options });
      return {
        data: {
          user: {
            id: "mock-citizen-id",
            email,
            user_metadata: options?.data || {}
          }
        },
        error: null
      };
    },
    signInWithPassword: async ({ email, password }) => {
      console.log("Mock SignIn: Success", { email });
      const mockUser = {
        id: "mock-admin-id",
        email: "admin@bingo.com",
        user_metadata: {
          role: "admin",
          full_name: "Mock Admin"
        }
      };
      return {
        data: {
          user: mockUser,
          session: {
            user: mockUser
          }
        },
        error: null
      };
    },
    signOut: async () => {
      console.log("Mock SignOut: User signed out locally");
      return { error: null };
    }
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
      update: (data) => {
        console.log(`Mock DB update in ${tableName}:`, data);
        return {
          eq: async (column, value) => {
            console.log(`Mock DB update filter eq(${column}, ${value})`);
            return { data, error: null };
          }
        };
      },
      delete: () => {
        return {
          eq: async (column, value) => {
            console.log(`Mock DB delete filter eq(${column}, ${value})`);
            return { error: null };
          }
        };
      }
    };
    return chain;
  }
};

export const supabase = mockSupabase;
