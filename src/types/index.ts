// ============================================================
// SHARED APPLICATION TYPES
// Single source of truth for all TypeScript interfaces.
// Import from here, never redefine inline.
// ============================================================

// ------------------------------------------------------------
// AUTH / SERVER ACTION RESPONSES
// Used to pass error/success state back from Server Actions
// to Client Components via useActionState.
// ------------------------------------------------------------
export interface ActionState {
  error?: string;
  success?: string;
}

// ------------------------------------------------------------
// DATABASE ROW TYPES
// These mirror the Supabase schema exactly.
// Use these for typing query results.
// ------------------------------------------------------------
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentalHealthContext {
  id: string;
  user_id: string
  conditions: string[];
  medication_notes: string | null;
  avg_sleep_hours: number | null;
  daily_caffeine_mg: number | null;
  condition_other_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalingSession {
  id: string;
  user_id: string;
  content: string;
  word_count: number;
  duration_secs: number;
  status: "draft" | "submitted";
  started_at: string;
  submitted_at: string | null;
}

export interface KeystrokeMetrics {
  id: string;
  session_id: string;
  user_id: string;
  wpm: number | null;
  avg_dwell_time_ms: number | null;
  avg_flight_time_ms: number | null;
  pause_count: number;
  avg_pause_duration_ms: number | null;
  backspace_count: number;
  delete_count: number;
  error_rate: number | null;
  burst_count: number;
  avg_burst_length: number | null;
  total_idle_ms: number;
  total_keystrokes: number;
  focus_loss_count: number;
  paste_count: number;
  productive_keystroke_ratio: number | null;
  created_at: string;
}

export interface SelfReport {
  id: string;
  session_id: string;
  user_id: string;
  mood_score: number;
  stress_score: number;
  anxiety_score: number;
  focus_score: number;
  fatigue_score: number;
  created_at: string;
}

export interface Reflection {
  id: string;
  session_id: string;
  user_id: string;
  what_happened: string | null;
  major_stressors: string | null;
  sleep_quality: number | null;
  created_at: string;
}

// ------------------------------------------------------------
// MENTAL HEALTH CONDITIONS
// Typed union instead of raw strings — prevents typos and
// keeps the onboarding form and DB values in sync.
// ------------------------------------------------------------
export type MentalHealthCondition =
  | "anxiety"
  | "depression"
  | "burnout"
  | "adhd"
  | "insomnia"
  | "none"
  | "prefer_not_to_say"
  | "other";