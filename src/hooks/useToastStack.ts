"use client";

import { useState, useCallback } from "react";
import type { ToastItem } from "@/components/ui/ToastStack";

// Provides a simple API for managing a stack of toasts from any component.
// Usage:
//   const { toasts, showToast, dismissToast } = useToastStack();
//   showToast({ message: "Done!", subtext: "42 words" });
export function useToastStack() {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const showToast = useCallback((item: Omit<ToastItem, "id">) => {
		const id = `toast-${Date.now()}-${Math.random()}`;
		setToasts((prev) => [...prev, { ...item, id }]);
	}, []);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return { toasts, showToast, dismissToast };
}
