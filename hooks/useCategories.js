"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_CATEGORIES = [
  { name: "Housing", emoji: "🏠" },
  { name: "Food", emoji: "🍕" },
  { name: "Electricity", emoji: "⚡" },
  { name: "Health", emoji: "❤️" },
  { name: "Shopping", emoji: "🛍️" },
  { name: "Studying", emoji: "📚" },
  { name: "Miscellaneous", emoji: "📦" },
];

const CATEGORY_COLOR_PALETTE = [
  "bg-blue-100 text-blue-600",
  "bg-orange-100 text-orange-600",
  "bg-yellow-100 text-yellow-600",
  "bg-rose-100 text-rose-600",
  "bg-purple-100 text-purple-600",
  "bg-indigo-100 text-indigo-600",
  "bg-slate-100 text-slate-600",
  "bg-emerald-100 text-emerald-600",
  "bg-cyan-100 text-cyan-600",
  "bg-amber-100 text-amber-600",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-600",
  "bg-lime-100 text-lime-600",
  "bg-fuchsia-100 text-fuchsia-600",
  "bg-sky-100 text-sky-600",
  "bg-violet-100 text-violet-600",
];

export const EMOJI_OPTIONS = [
  "🏠", "🍕", "⚡", "❤️", "🛍️", "📚", "📦",
  "🚗", "✈️", "🎮", "🎵", "🐱", "🌿", "💼",
  "🏋️", "☕", "🎬", "💊", "📱", "🎁",
  "🍔", "🏖️", "🧹", "💡", "🎨", "👕",
  "🏥", "🎓", "🔧", "💰",
];

export function useCategories() {
  const { supabase, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) {
        const rows = DEFAULT_CATEGORIES.map((cat) => ({
          user_id: user.id,
          name: cat.name,
          emoji: cat.emoji,
        }));
        const { data: seeded } = await supabase
          .from("categories")
          .insert(rows)
          .select("*");
        setCategories(seeded || []);
      } else {
        // Deduplicate by name — keep the oldest entry for each name
        const seen = new Map();
        const dupeIds = [];
        for (const cat of data) {
          if (seen.has(cat.name)) {
            dupeIds.push(cat.id);
          } else {
            seen.set(cat.name, cat);
          }
        }
        // Clean up duplicates from DB in background
        if (dupeIds.length > 0) {
          supabase
            .from("categories")
            .delete()
            .in("id", dupeIds)
            .then(() => {});
        }
        setCategories(Array.from(seen.values()));
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function addCategory(name, emoji) {
    if (!user || !name.trim() || !emoji) return { data: null, error: "Missing fields" };
    if (categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase()))
      return { data: null, error: "Category already exists" };

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: name.trim(), emoji })
        .select("*")
        .single();

      if (error) {
        console.error("Add category error:", error);
        return { data: null, error: error.message };
      }

      setCategories((prev) => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      console.error("Add category exception:", err);
      return { data: null, error: "Failed to add category" };
    }
  }

  async function deleteCategory(categoryId) {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (!error) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      }
    } catch {
      // Silent fail
    }
  }

  function getCategoryColor(categoryName) {
    const idx = categories.findIndex((c) => c.name === categoryName);
    if (idx === -1) return "bg-slate-100 text-slate-600";
    return CATEGORY_COLOR_PALETTE[idx % CATEGORY_COLOR_PALETTE.length];
  }

  function getCategoryEmoji(categoryName) {
    const cat = categories.find((c) => c.name === categoryName);
    return cat?.emoji || "📦";
  }

  return {
    categories,
    loading,
    addCategory,
    deleteCategory,
    getCategoryColor,
    getCategoryEmoji,
    refetch: fetchCategories,
  };
}
