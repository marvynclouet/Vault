import { supabase } from "./lib/supabase";

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

// ── Helpers ──

function mapProjectFromDb(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    project_name: row.project_name,
    summary: row.summary,
    transcript: row.transcript,
    review: row.review,
    tasks: row.tasks || [],
    synced_to: row.synced_to,
    created_at: row.created_at,
  };
}
