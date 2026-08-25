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
      const normalizedUsername = username.trim().toLowerCase();
      
      // Hardcoded credentials for demo purposes
      if (normalizedUsername === "driver" && password === "driver123") {
        try { Cookies.set("driver_session", "true", { expires: 1 }); } catch (err) {}
        try { router.push("/driver/route"); } catch (navErr) { window.location.href = "/driver/route"; }
      } else {
        setError("Invalid driver credentials");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('/footer-bg.svg')] bg-cover bg-center relative">

      <div className="mx-auto w-full max-w-sm relative z-10">
        <h2 className="text-center text-3xl font-black tracking-tight text-white mb-6">
          Driver Portal
        </h2>
      </div>

      <div className="mt-8 mx-auto w-full max-w-sm relative z-10">
        <div className="bg-white/10 backdrop-blur-md py-8 px-4 sm:px-10 border border-white/20 rounded-3xl shadow-2xl">
          <form className="space-y-6 mt-2" onSubmit={handleLogin}>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-bold text-zinc-300"
              >
                Driver ID
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="appearance-none block w-full pl-11 pr-3 py-3 bg-zinc-900/50 border border-white/10 rounded-xl shadow-sm placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium transition-colors"
                  placeholder="Enter driver ID"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-zinc-300"
              >
                Passcode
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-11 pr-11 py-3 bg-zinc-900/50 border border-white/10 rounded-xl shadow-sm placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-medium transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors"
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

            {error && (
              <div className="text-center">
                <p className="text-sm font-medium text-rose-400">
                  {error}
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-900/50 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Start Shift"
                )}
              </button>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-zinc-400/80">
                Demo access: <span className="font-mono text-emerald-400">driver</span> / <span className="font-mono text-emerald-400">driver123</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
