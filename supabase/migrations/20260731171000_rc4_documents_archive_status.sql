-- RC4-5 follow-up: allow supplier_documents.status = archived (archive API).
-- Additive. Local-only apply in this slice.

begin;

alter table public.supplier_documents
  drop constraint if exists supplier_documents_status_check;

alter table public.supplier_documents
  add constraint supplier_documents_status_check
  check (status in ('active', 'superseded', 'deleted', 'archived'));

comment on constraint supplier_documents_status_check on public.supplier_documents is
  'RC4-5 archive uses status=archived with archived_at timestamp.';

commit;
