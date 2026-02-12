"use client";

import { useState, useCallback } from "react";

interface UseResizeResult {
  size: number;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useResize(
  defaultSize: number,
  min: number,
  max: number,
  direction: "right" | "left"
): UseResizeResult {
  const [size, setSize] = useState(defaultSize);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startSize = size;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        let newSize = startSize;

        if (direction === "right") {
          newSize = startSize + delta;
        } else {
          newSize = startSize - delta;
        }

        newSize = Math.max(min, Math.min(max, newSize));
        setSize(newSize);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [size, min, max, direction]
  );

  return { size, handleMouseDown };
}
