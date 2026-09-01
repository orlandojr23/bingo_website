import { useCallback, useRef } from "react";

// Vertical-swipe toggle for bottom-sheet peek areas. Small movements are
// ignored so regular taps/clicks inside the area still work.
export function useSwipeToggle(onSwipeUp, onSwipeDown, threshold = 40) {
  const startY = useRef(null);

  const onPointerDown = useCallback(
    (e) => {
      startY.current = e.clientY;
      const end = (ev) => {
        window.removeEventListener("pointerup", end);
        const start = startY.current;
        startY.current = null;
        if (start == null) return;
        const dy = ev.clientY - start;
        if (dy < -threshold) onSwipeUp?.();
        else if (dy > threshold) onSwipeDown?.();
      };
      window.addEventListener("pointerup", end);
    },
    [onSwipeUp, onSwipeDown, threshold]
  );

  return { onPointerDown };
}
