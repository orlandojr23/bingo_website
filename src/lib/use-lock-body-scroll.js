"use client";

import { useEffect } from "react";

// Locks background scrolling while an overlay sheet/form is open — MOBILE
// ONLY (below the Tailwind `sm` breakpoint). On desktop the form is a side
// panel with the page visible beside it, so background scrolling stays
// enabled there. Ref-counted so overlapping sheets (e.g. dispatch assignment
// + truck sheets, or a sheet plus a confirm dialog) only restore scrolling
// once every lock is released.
let lockCount = 0;
let savedOverflow = null;
let mobileMq = null;
let listening = false;

// Modern browsers (including all current mobile ones) support
// `overscroll-behavior: contain`, which quarantines scroll chaining purely
// in the compositor with zero layout cost. Only fall back to toggling body
// overflow — a full-page reflow that hitches open/close animations — where
// it is unsupported.
const SUPPORTS_OVERSCROLL =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("overscroll-behavior", "contain");

// Matches Tailwind's `sm` breakpoint: mobile is anything below 640px.
function mobileQuery() {
  if (typeof window === "undefined") return null;
  if (!mobileMq) mobileMq = window.matchMedia("(max-width: 639.98px)");
  return mobileMq;
}

function syncLock() {
  if (typeof document === "undefined") return;
  const mq = mobileQuery();
  const shouldLock = lockCount > 0 && (!mq || mq.matches) && !SUPPORTS_OVERSCROLL;
  const body = document.body;
  const doc = document.documentElement;
  if (shouldLock) {
    if (body.style.overflow !== "hidden") {
      savedOverflow = { body: body.style.overflow, doc: doc.style.overflow };
      body.style.overflow = "hidden";
      doc.style.overflow = "hidden";
    }
  } else if (savedOverflow) {
    body.style.overflow = savedOverflow.body;
    doc.style.overflow = savedOverflow.doc;
    savedOverflow = null;
  }
}

function ensureBreakpointListener() {
  const mq = mobileQuery();
  if (!mq || listening) return;
  listening = true;
  // Re-sync when crossing the breakpoint (e.g. rotating a tablet or resizing
  // the browser) while a sheet is open.
  const onChange = () => syncLock();
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
  else mq.addListener(onChange);
}

export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return;
    ensureBreakpointListener();
    lockCount += 1;
    syncLock();
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      syncLock();
    };
  }, [locked]);
}
