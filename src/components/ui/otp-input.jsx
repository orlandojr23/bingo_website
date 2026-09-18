"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// Native-style OTP input: one box per digit with auto-advance,
// backspace navigation, and paste-to-fill support.
export default function OtpInput({ value = "", onChange, length = 6, hasError = false, autoFocus = true }) {
  const refs = useRef([]);

  const focusBox = (i) => refs.current[i]?.focus();

  const handleChange = (i, raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      const arr = value.split("");
      arr[i] = "";
      onChange?.(arr.join("").slice(0, length));
      return;
    }
    const digit = digits.slice(-1);
    let next = "";
    for (let k = 0; k < length; k++) {
      next += k === i ? digit : value[k] || "";
    }
    onChange?.(next);
    if (i < length - 1) {
      requestAnimationFrame(() => focusBox(i + 1));
    } else {
      refs.current[i]?.blur();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    onChange?.(text);
    requestAnimationFrame(() => focusBox(Math.min(text.length, length - 1)));
  };

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-14 w-full rounded-2xl border bg-card text-center text-xl font-semibold text-foreground outline-none transition-colors",
            hasError
              ? "border-rose-300 focus:border-rose-400"
              : "border-border/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          )}
        />
      ))}
    </div>
  );
}
