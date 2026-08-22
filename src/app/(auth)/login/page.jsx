"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate network request
    setTimeout(() => {
      // Hardcoded admin credentials for demo purposes
      if (username === "admin" && password === "admin123") {
        // Set a secure cookie (for the middleware to read)
        Cookies.set("admin_session", "true", { expires: 1 });
        router.push("/dashboard");
      } else {
        setError("Invalid username or password");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
          Admin Login
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-white py-6 px-4 sm:px-10 border border-zinc-200 rounded-2xl">
          <form className="space-y-6 mt-2" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-bold text-zinc-700"
              >
                Username
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium transition-colors"
                  placeholder="Enter admin username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-zinc-700"
              >
                Password
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <EyeOff 
                    className={`absolute h-5 w-5 transition-all duration-300 transform ${
                      !showPassword ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                    }`}
                  />
                  <Eye 
                    className={`absolute h-5 w-5 transition-all duration-300 transform ${
                      showPassword ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-zinc-500">
                Demo Credentials: <span className="font-mono font-bold bg-zinc-100 px-1 rounded">admin</span> / <span className="font-mono font-bold bg-zinc-100 px-1 rounded">admin123</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
