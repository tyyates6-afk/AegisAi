create table public.progress_items (
    user_id uuid not null references auth.users (id) on delete cascade,
    collection text not null check (collection in (
        'aegisHabits', 'aegisFocusSessions', 'aegisAchievements', 'petSettings', 'themeSettings'
    )),
    item_id text not null check (length(item_id) between 1 and 256),
    value jsonb,
    primary key (user_id, collection, item_id)
);

alter table public.progress_items enable row level security;
revoke all on public.progress_items from anon, authenticated;
grant select, insert, update on public.progress_items to authenticated;

create policy "Read own progress" on public.progress_items
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own progress" on public.progress_items
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own progress" on public.progress_items
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
