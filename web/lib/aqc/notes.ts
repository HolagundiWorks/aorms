export const NOTE_COLS = "id, body, x, y, status, author_id, resolved_by_id, resolved_at, created_at, updated_at, profiles!drawing_notes_author_id_fkey(full_name)";

export type NoteRow = { id: string; body: string; x: number; y: number; status: string; author_id: string; resolved_by_id: string | null; resolved_at: string | null; created_at: string; updated_at: string; profiles: { full_name: string | null } | { full_name: string | null }[] | null };
export const noteJson = (n: NoteRow) => {
  const p = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles;
  return { id: n.id, body: n.body, x: n.x, y: n.y, status: n.status, authorId: n.author_id, author: p?.full_name ?? null, resolvedAt: n.resolved_at, createdAt: n.created_at, updatedAt: n.updated_at };
};

