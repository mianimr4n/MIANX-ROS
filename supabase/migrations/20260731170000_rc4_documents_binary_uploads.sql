-- RC4-5 Documents & Binary Uploads
-- Private storage buckets + metadata columns + access audit.
-- Additive. No Production apply in this slice.

begin;

-- ---------------------------------------------------------------------------
-- 1) Private storage buckets (service-role writes; no public SELECT)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'supplier-documents',
    'supplier-documents',
    false,
    5242880,
    array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/csv'
    ]
  ),
  (
    'hr-employee-documents',
    'hr-employee-documents',
    false,
    5242880,
    array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/csv'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) supplier_documents — binary metadata
-- ---------------------------------------------------------------------------
alter table public.supplier_documents
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists checksum_sha256 text,
  add column if not exists original_filename text,
  add column if not exists archived_at timestamptz,
  add column if not exists replaced_document_id uuid references public.supplier_documents (id) on delete set null;

-- Allow URL-only legacy rows OR binary rows (storage_path set)
alter table public.supplier_documents alter column file_url drop not null;

alter table public.supplier_documents drop constraint if exists supplier_documents_payload_check;
alter table public.supplier_documents
  add constraint supplier_documents_payload_check check (
    (file_url is not null and length(trim(file_url)) > 0)
    or (storage_path is not null and storage_bucket is not null)
  );

comment on column public.supplier_documents.storage_path is
  'Safe generated object path. Never trust client filenames.';
comment on column public.supplier_documents.checksum_sha256 is
  'SHA-256 hex of uploaded bytes when binary upload used.';
comment on table public.supplier_documents is
  'Supplier document metadata. Binary via private supplier-documents bucket (RC4-5) or legacy URL reference.';

-- ---------------------------------------------------------------------------
-- 3) hr_employee_documents — binary metadata + expanded types
-- ---------------------------------------------------------------------------
alter table public.hr_employee_documents drop constraint if exists hr_employee_documents_document_type_check;
alter table public.hr_employee_documents
  add constraint hr_employee_documents_document_type_check check (
    document_type in ('CNIC', 'CONTRACT', 'CERTIFICATE', 'POLICY', 'OTHER')
  );

alter table public.hr_employee_documents
  add column if not exists mime_type text,
  add column if not exists file_size_bytes integer,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists checksum_sha256 text,
  add column if not exists original_filename text,
  add column if not exists title text,
  add column if not exists uploaded_by uuid references public.users (id) on delete set null,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'archived')),
  add column if not exists archived_at timestamptz;

alter table public.hr_employee_documents alter column file_url drop not null;

alter table public.hr_employee_documents drop constraint if exists hr_employee_documents_payload_check;
alter table public.hr_employee_documents
  add constraint hr_employee_documents_payload_check check (
    (file_url is not null and length(trim(file_url)) > 0)
    or (storage_path is not null and storage_bucket is not null)
  );

comment on table public.hr_employee_documents is
  'HR employee documents. Binary via private bucket or legacy URL reference.';

-- ---------------------------------------------------------------------------
-- 4) document_access_events — upload/download/replace/archive audit
-- ---------------------------------------------------------------------------
create table if not exists public.document_access_events (
  id uuid primary key default gen_random_uuid(),
  document_domain text not null check (document_domain in ('supplier', 'hr')),
  document_id uuid not null,
  action text not null check (
    action in ('upload', 'download', 'replace', 'archive', 'delete')
  ),
  actor_user_id uuid references public.users (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  employee_id uuid references public.hr_employees (id) on delete set null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_document_access_events_doc
  on public.document_access_events (document_domain, document_id, created_at desc);

create index if not exists idx_document_access_events_actor
  on public.document_access_events (actor_user_id, created_at desc);

alter table public.document_access_events enable row level security;

grant select, insert on public.document_access_events to service_role;
-- No authenticated grant — API service-role only

comment on table public.document_access_events is
  'RC4-5 audit for document upload/download/replace/archive. Includes request_id when available.';

commit;
