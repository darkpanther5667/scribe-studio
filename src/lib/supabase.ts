import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Slide, GridStyle } from "../types/whiteboard";

export interface CloudDrawingRecord {
  id: string;
  user_id: string;
  title: string;
  slides: Slide[];
  grid_style: GridStyle;
  is_finite_mode: boolean;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY_URL = "tapboard_supabase_url";
const STORAGE_KEY_ANON = "tapboard_supabase_anon_key";

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const localUrl = (localStorage.getItem(STORAGE_KEY_URL) || "").trim();
  const localKey = (localStorage.getItem(STORAGE_KEY_ANON) || "").trim();

  return {
    url: envUrl || localUrl,
    anonKey: envKey || localKey,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  if (anonKey) localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  supabaseInstance = null; // Re-create client with new credentials
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith("https://"));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey || !url.startsWith("https://")) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

// ── Auth APIs ─────────────────────────────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured. Please enter your project credentials.");
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured. Please enter your project credentials.");
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
}

// ── Cloud Database APIs ───────────────────────────────────────────────────────

export async function saveDrawingToCloud(payload: {
  id?: string;
  title: string;
  slides: Slide[];
  gridStyle: GridStyle;
  isFiniteMode: boolean;
  thumbnail?: string;
}): Promise<CloudDrawingRecord> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to save to Supabase Cloud.");

  const rowData = {
    user_id: user.id,
    title: payload.title || "Untitled Lecture",
    slides: payload.slides,
    grid_style: payload.gridStyle,
    is_finite_mode: payload.isFiniteMode,
    thumbnail: payload.thumbnail || null,
  };

  if (payload.id) {
    // Update existing row
    const { data, error } = await client
      .from("drawings")
      .update(rowData)
      .eq("id", payload.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("public.drawings")) {
        throw new Error("Database table 'drawings' has not been created yet in your Supabase project. Please run the provided supabase_schema.sql in your Supabase SQL Editor.");
      }
      throw error;
    }
    return data;
  } else {
    // Insert new row
    const { data, error } = await client
      .from("drawings")
      .insert([rowData])
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("public.drawings")) {
        throw new Error("Database table 'drawings' has not been created yet in your Supabase project. Please run the provided supabase_schema.sql in your Supabase SQL Editor.");
      }
      throw error;
    }
    return data;
  }
}

export async function fetchUserDrawings(): Promise<CloudDrawingRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await client
    .from("drawings")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Tapboard Supabase] Error fetching user drawings:", error);
    if (error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("public.drawings")) {
      throw new Error("Database table 'drawings' has not been created yet in your Supabase project. Please run the provided supabase_schema.sql in your Supabase SQL Editor.");
    }
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    slides: Array.isArray(row.slides) ? row.slides : [],
    grid_style: row.grid_style || "dots",
    is_finite_mode: Boolean(row.is_finite_mode),
    thumbnail: row.thumbnail || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function deleteUserDrawing(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  const { error } = await client.from("drawings").delete().eq("id", id);
  if (error) throw error;
}
