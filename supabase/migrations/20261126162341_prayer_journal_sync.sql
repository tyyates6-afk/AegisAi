alter table public.progress_items
    drop constraint progress_items_collection_check,
    add constraint progress_items_collection_check check (collection in (
        'aegisHabits', 'aegisFocusSessions', 'aegisAchievements',
        'petSettings', 'themeSettings', 'aegisPrayerJournal'
    ));
