create or replace function public.set_public_comment_receipt_subject()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.subject := 'AIインタビューの控え';
  return new;
end;
$$;

drop trigger if exists public_comment_receipt_subject on public.public_comment_receipts;
create trigger public_comment_receipt_subject
before insert on public.public_comment_receipts
for each row execute function public.set_public_comment_receipt_subject();

revoke all on function public.set_public_comment_receipt_subject()
from public, anon, authenticated;
