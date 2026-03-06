import { Platform } from "react-native";

const API_BASE =
  Platform.OS === "web"
    ? "http://localhost:8000"
    : "https://vault-nu-five.vercel.app";

function buildFormData(audioUri, audioBlob) {
  const formData = new FormData();
  if (Platform.OS === "web") {
    formData.append("file", audioBlob, "recording.webm");
  } else {
    formData.append("file", {
      uri: audioUri,
      type: "audio/m4a",
      name: "recording.m4a",
    });
  }
  return formData;
}

export async function transcribeChunk(audioUri, audioBlob) {
  const formData = buildFormData(audioUri, audioBlob);
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: formData,
    ...(Platform.OS !== "web" && {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.transcript || "";
}

export async function transcribeAudioFull(audioUri, audioBlob) {
  const formData = buildFormData(audioUri, audioBlob);
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: formData,
    ...(Platform.OS !== "web" && {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur transcription (${res.status})`);
  }
  const data = await res.json();
  return data.transcript || "";
}

export async function analyzeAudio(audioUri, audioBlob) {
  const formData = buildFormData(audioUri, audioBlob);
  const res = await fetch(`${API_BASE}/api/analyze/audio`, {
    method: "POST",
    body: formData,
    ...(Platform.OS !== "web" && {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err.detail) ? err.detail[0]?.msg || err.detail[0] : err.detail;
    throw new Error(detail || `Erreur serveur (${res.status})`);
  }
  return res.json();
}

export async function updateProjectFromTranscript(project, transcript) {
  const res = await fetch(`${API_BASE}/api/update-project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, transcript }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur serveur (${res.status})`);
  }
  return res.json();
}

export async function analyzeText(transcript) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur serveur (${res.status})`);
  }
  return res.json();
}

export async function pushToTrello(project) {
  const res = await fetch(`${API_BASE}/api/push/trello`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur serveur (${res.status})`);
  }
  return res.json();
}

export async function chatWithPM(project, messages, userMessage) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project,
      messages,
      user_message: userMessage,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur serveur (${res.status})`);
  }
  return res.json();
}

export async function fetchTrelloBoards() {
  const res = await fetch(`${API_BASE}/api/trello/boards`);
  if (!res.ok) throw new Error("Impossible de charger les boards Trello");
  return res.json();
}

export async function fetchTrelloLists(boardId) {
  const res = await fetch(`${API_BASE}/api/trello/boards/${boardId}/lists`);
  if (!res.ok) throw new Error("Impossible de charger les listes Trello");
  return res.json();
}
