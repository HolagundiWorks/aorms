-- Phase 4 — Drawings: DXF register with worker-derived takeoff metadata,
-- viewer calibration, a separate watermarked issue-set PDF, and revision
-- chaining via a self-referencing root_id. is_office_staff() RLS — plain
-- protectedProcedure in the current backend, per the Phase 4 audit.
--
-- NOT ported here: the upload path itself. registerDrawingUpload() is a raw
-- Fastify multipart route (content-hash de-dup, DXF/DWG/PDF sniffing,
-- rate-limited) that becomes a Next.js Route Handler, not a table — no DDL
-- involved, tracked as UI/route work, not schema work.
-- dxf_to_svg worker job (SVG conversion) still depends on Phase 6's
-- Redis-Streams/worker decision, same as Phase 3's PDF-render dependency —
-- the table ships regardless; svg_key just stays null until that lands.

create table public.drawings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  title text not null,
  file_name text not null,
  file_hash text not null,
  storage_key text not null,
  size_bytes bigint not null default 0,
  status text not null default 'PENDING',
  svg_key text,
  entity_count integer not null default 0,
  layers jsonb,
  bounds jsonb,
  scale_units_per_vb double precision,
  scale_unit text,
  issue_pdf_key text,
  issue_pdf_status text not null default 'NONE',
  error_text text,
  -- Revisions of one drawing share root_id (the first revision's own id, or
  -- null on the root row itself); only the latest revision is_current.
  rev_no integer not null default 1,
  root_id uuid references public.drawings (id),
  revision_note text,
  is_current boolean not null default true,
  -- QC/peer-review checkpoint (SOP-07/08) — advisory only, does not block
  -- issue_pdf.
  review_status text not null default 'PENDING_REVIEW',
  reviewed_by_id uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drawings enable row level security;
create policy "drawings: staff read" on public.drawings
  for select using (public.is_office_staff());
create policy "drawings: staff write" on public.drawings
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- Wire the deferred FK from 0006 now that drawings exists.
alter table public.transmittal_items
  add constraint transmittal_items_drawing_id_fkey
  foreign key (drawing_id) references public.drawings (id);
