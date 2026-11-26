function saveData(key,value){

localStorage.setItem(
key,
JSON.stringify(value)
);

}



function loadData(key){

const data =
localStorage.getItem(key);


return data
?
JSON.parse(data)
:
[];

}

const ProgressStorage = {
    keys: {
        aegisHabits: habit => habit?.id,
        aegisFocusSessions: session => session?.startedAt,
        aegisAchievements: id => id,
        petSettings: setting => setting?.id,
        themeSettings: setting => setting?.id,
        aegisPrayerJournal: prayer => prayer?.id
    },
    legacySettings: {
        petSettings: ["aegisPetFestive", "aegisPetSeasonalEvents", "aegisPetMeals"],
        themeSettings: ["aegisTheme", "aegisThemeCustom", "aegisThemeMain"]
    },
    userId: null,

    storageKey(key, userId = this.userId) {
        return userId ? `${key}:account:${userId}` : key;
    },

    state(key, userId = this.userId) {
        try {
            const stored = JSON.parse(localStorage.getItem(this.storageKey(key, userId)));
            if (userId && Array.isArray(stored?.items) && stored.pending) return stored;
            if (!userId && Array.isArray(stored)) return { items: stored, pending: {} };
            if (!userId && key === "aegisPrayerJournal" && Array.isArray(stored?.prayers)) {
                return { items: stored.prayers, pending: {} };
            }
        } catch (error) {
            console.warn("Could not read progress", error);
        }
        return { items: [], pending: {} };
    },

    read(key, userId = this.userId) {
        return this.state(key, userId).items;
    },

    getSetting(collection, id) {
        if (!this.userId) return localStorage.getItem(id);
        return this.read(collection).find(setting => setting.id === id)?.value ?? null;
    },

    setSetting(collection, id, value) {
        if (!this.userId) {
            if (value === null) localStorage.removeItem(id);
            else localStorage.setItem(id, value);
            return;
        }
        const items = this.read(collection).filter(setting => setting.id !== id);
        if (value !== null) items.push({ id, value });
        this.save(collection, items);
    },

    index(key, items) {
        const identify = this.keys[key];
        return new Map(items.flatMap(item => {
            const id = identify(item);
            return typeof id === "string" && id ? [[id, item]] : [];
        }));
    },

    revision() {
        return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    },

    save(key, items, userId = this.userId) {
        if (!userId) {
            saveData(key, items);
            return;
        }

        const state = this.state(key, userId);
        const pending = Object.assign(Object.create(null), state.pending);
        const previous = this.index(key, state.items);
        const next = this.index(key, items);
        for (const id of new Set([...previous.keys(), ...next.keys()])) {
            const value = next.get(id) ?? null;
            if (JSON.stringify(value) !== JSON.stringify(previous.get(id) ?? null)) {
                pending[id] = { value, revision: this.revision() };
            }
        }
        saveData(this.storageKey(key, userId), { items, pending });
        if (userId === this.userId) Aegis.getModule("cloud")?.api?.scheduleProgressSync();
    },

    useAccount(userId) {
        if (this.userId === userId) return false;

        if (userId) {
            const ownerKey = "aegisProgressLegacyOwner";
            const owner = localStorage.getItem(ownerKey);
            if (!owner) localStorage.setItem(ownerKey, userId);
            if (!owner || owner === userId) {
                for (const key of Object.keys(this.keys)) {
                    const target = this.storageKey(key, userId);
                    if (localStorage.getItem(target) !== null) continue;
                    const settings = this.legacySettings[key];
                    const items = settings ? settings.flatMap(id => {
                        const value = localStorage.getItem(id);
                        return value === null ? [] : [{ id, value }];
                    }) : this.state(key, null).items;
                    const pending = Object.fromEntries([...this.index(key, items)].map(
                        ([id, value]) => [id, { value, revision: this.revision(), seed: true }]
                    ));
                    saveData(target, { items, pending });
                    if (key === "aegisPrayerJournal") localStorage.removeItem(key);
                }
            }
        }
        this.userId = userId;
        return true;
    },

    receive(key, userId, rows, uploaded) {
        const state = this.state(key, userId);
        const items = this.index(key, state.items);
        for (const [id, entry] of Object.entries(uploaded)) {
            if (state.pending[id]?.revision === entry.revision) delete state.pending[id];
        }
        for (const { item_id, value } of rows) {
            if (Object.hasOwn(state.pending, item_id)) continue;
            if (value === null) items.delete(item_id);
            else items.set(item_id, value);
        }
        const next = [...items.values()];
        if (key === "aegisFocusSessions") {
            next.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
        }
        const changed = JSON.stringify(next) !== JSON.stringify(state.items);
        saveData(this.storageKey(key, userId), { items: next, pending: state.pending });
        return changed;
    }
};
