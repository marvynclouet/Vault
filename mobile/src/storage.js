import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./lib/supabase";

// ── Streak ──

const STREAK_COUNT_KEY = "vault_streak_count";
const STREAK_DATE_KEY = "vault_streak_date";

export async function getStreak() {
  const [count, date] = await Promise.all([
    AsyncStorage.getItem(STREAK_COUNT_KEY),
    AsyncStorage.getItem(STREAK_DATE_KEY),
  ]);
  return { count: parseInt(count || "0", 10), lastDate: date };
}

export async function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const { count, lastDate } = await getStreak();
  if (lastDate === today) return count;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCount = lastDate === yesterday ? count + 1 : 1;
  await AsyncStorage.setItem(STREAK_COUNT_KEY, String(newCount));
  await AsyncStorage.setItem(STREAK_DATE_KEY, today);
  return newCount;
}

// ── Weekly goals ──

function getWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `vault_goals_${d.getFullYear()}_w${week}`;
}

export async function getWeeklyGoals() {
  const raw = await AsyncStorage.getItem(getWeekKey());
  return raw ? JSON.parse(raw) : [];
}

export async function saveWeeklyGoals(goals) {
  await AsyncStorage.setItem(getWeekKey(), JSON.stringify(goals));
}

// ── Projects ──

export async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapProjectFromDb);
}

export async function addProject(project) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      project_name: project.project_name,
      summary: project.summary,
      transcript: project.transcript,
      review: project.review || null,
      tasks: project.tasks || [],
      synced_to: project.synced_to || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapProjectFromDb(data);
}

export async function updateProject(id, updates) {
  const dbUpdates = {};
  if (updates.project_name !== undefined) dbUpdates.project_name = updates.project_name;
  if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
  if (updates.tasks !== undefined) dbUpdates.tasks = updates.tasks;
  if (updates.synced_to !== undefined) dbUpdates.synced_to = updates.synced_to;
  if (updates.review !== undefined) dbUpdates.review = updates.review;

  const { error } = await supabase
    .from("projects")
    .update(dbUpdates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapProjectFromDb(data);
}

// ── Messages ──

export async function loadMessages(projectId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.created_at,
    hasUpdates: m.has_updates,
  }));
}

export async function saveMessage(projectId, msg) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("messages").insert({
    project_id: projectId,
    user_id: user.id,
    role: msg.role,
    content: msg.content,
    has_updates: msg.hasUpdates || false,
  });

  if (error) throw error;
}

// ── Profile ──

export async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    const newProfile = {
      id: user.id,
      username: user.email.split("@")[0],
      display_name: user.email.split("@")[0],
      avatar_url: "",
      bio: "",
    };
    await supabase.from("profiles").insert(newProfile);
    return newProfile;
  }

  if (error) throw error;
  return data;
}

export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw error;
}

// ── Quick notes ──

export async function loadQuickNotes() {
  const { data, error } = await supabase
    .from("quick_notes")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    content: r.content,
    status: r.status,
    converted_to_project: r.converted_to_project,
    created_at: r.created_at,
  }));
}

export async function addQuickNote(content) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("quick_notes")
    .insert({ user_id: user.id, content: content.trim(), status: "pending" })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, content: data.content, status: data.status, created_at: data.created_at };
}

export async function updateQuickNote(id, updates) {
  const { error } = await supabase.from("quick_notes").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteQuickNote(id) {
  const { error } = await supabase.from("quick_notes").delete().eq("id", id);
  if (error) throw error;
}

// ── Helpers ──

function normalizeTask(t, i) {
  return {
    ...t,
    status: t.status || "todo",
    due_date: t.due_date ?? null,
    completed_at: t.completed_at ?? null,
    order: t.order ?? i,
  };
}

function mapProjectFromDb(row) {
  const tasks = (row.tasks || []).map(normalizeTask);
  return {
    id: row.id,
    user_id: row.user_id,
    project_name: row.project_name,
    summary: row.summary,
    transcript: row.transcript,
    review: row.review,
    tasks,
    synced_to: row.synced_to,
    created_at: row.created_at,
  };
}
