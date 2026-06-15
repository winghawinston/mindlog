"use client";

// Recharts uses window.ResizeObserver internally, which doesn't exist
// on the server. This wrapper ensures chart components are only mounted
// in the browser, preventing SSR hydration mismatches and the
// resize-loop hang that occurs when ResponsiveContainer can't measure.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export function withClientOnly<T extends object>(
  Component: ComponentType<T>
): ComponentType<T> {
  // dynamic(..., { ssr: false }) tells Next.js: skip this component
  // entirely during server rendering, mount it only on the client.
  // The `loading` function shows nothing while the JS loads — you
  // could add a skeleton here if needed.
  return dynamic(() => Promise.resolve(Component), {
    ssr: false,
    loading: () => (
      <div
        className="bg-linen dark:bg-dark-raised rounded-xl animate-pulse"
        style={{ height: 256 }}
      />
    ),
  }) as ComponentType<T>;
}