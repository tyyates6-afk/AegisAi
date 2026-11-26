/*======================================
        AEGIS CLOUD MODULE v1.0.0
======================================*/

const SUPABASE_URL =
"https://tgsrvnbzxufwsskuerhv.supabase.co";


const SUPABASE_KEY =
"sb_publishable_R2wr2I-2lLboaE0zc9In5g_SzmrTACw";


const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);



let cloudConnected = false;



Aegis.register("cloud", {


    version:"1.0.0",

    async syncProfile(profile){

        const user =
        this.user;


        if(!user){

            console.log(
                "No cloud account."
            );

            return;

        }


        const {data,error} =
        await supabaseClient
        .from("profiles")
        .upsert({

            id:user.id,

            name:profile.name,

            city:profile.city,

            state:profile.state,

            country:profile.country,

            temperature:profile.temperature,

            bible:profile.bible,

            style:profile.style

        });



        if(error){

            console.error(
                "Profile sync failed:",
                error
            );

            return false;

        }


        console.log(
            "Profile synced:",
            data
        );


        return true;

    },

    async loadProfileFromCloud(){

        const user =
        this.user;


        if(!user){

            console.log(
                "No cloud user. Cannot load profile."
            );

            return null;

        }



        const {
            data,
            error
        } =
        await supabaseClient
        .from("profiles")
        .select("*")
        .eq(
            "id",
            user.id
        )
        .single();



        if(error){

            console.error(
                "Cloud profile load failed:",
                error
            );

            return null;

        }



        console.log(
            "Cloud profile loaded:",
            data
        );


        return data;

    },
    async init(){

        console.log(
            "Cloud system initialized."
        );

        await this.loadSession();

        supabaseClient.auth.onAuthStateChange(
            (event, session)=>{

                this.user =
                session?.user || null;

                console.log(
                    "Auth State:",
                    event
                );

                Aegis.broadcast(
                    "cloudUpdated"
                );

                this.useProgressAccount();
                if (this.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
                    const userId = this.user.id;
                    setTimeout(() => {
                        if (this.user?.id === userId) void this.initialSync();
                    }, 0);
                }

            }
        );

        window.addEventListener("online", () => this.scheduleProgressSync(0));
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) this.scheduleProgressSync(0);
        });
        setInterval(() => {
            if (!document.hidden) this.scheduleProgressSync(0);
        }, 60000);
        await this.testConnection();

    },
    async testConnection(){

        const {
            data,
            error
        } =
        await supabaseClient
        .from("profiles")
         .select("*")
         .limit(1);


          if(error){

               console.error(
                 "Supabase connection failed:",
                    error
              );

              return false;

           }


            console.log(
                "Supabase connected:",
                data
            );


            return true;

        },

    async createAccount(email, password){


        const {
            data,
            error
        } =
        await supabaseClient.auth.signUp({

            email:email,

            password:password

        });



        if(error){

            console.error(
                "Account creation failed:",
                error
            );

            return false;

        }



        console.log(
            "AEGIS account created:",
            data
        );



        this.user =
        data.user;



        Aegis.broadcast(
            "cloudUpdated"
        );


        return true;

    },


    async remove(table,id){

        if(!this.user){

            return false;

        }

        const {
            error
        } =
        await supabaseClient
        .from(table)
        .delete()
        .eq("id",id)
        .eq("user_id",this.user.id);


        if(error){

            console.error(
                `Cloud delete failed (${table})`,
                error
            );

            return false;

        }

        return true;

    },

    async delete(table, id){

    if(!this.user){

        return false;

    }

    const { error } =
    await supabaseClient
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", this.user.id);

    if(error){

        console.error(
            `Cloud delete failed (${table})`,
            error
        );

        return false;

    }

    return true;

},

    async login(email,password){

        const {
            data,
            error
        } =
        await supabaseClient
        .auth
        .signInWithPassword({

            email,
            password

        });

        if(error){

            console.error(
                "AEGIS login failed:",
                error
            );

            return false;

        }

        this.user =
        data.user;

        console.log(
            "AEGIS login successful:",
            this.user
        );

        // Initialize push notifications after login
        if(window.AegisPush){

            await AegisPush.init();

        }

        Aegis.broadcast(
            "cloudUpdated"
        );

        return true;

    },

    async logout(){

        await supabaseClient
        .auth
        .signOut();

        this.user = null;

        Aegis.broadcast(
            "cloudUpdated"
        );

    },

    
    async loadSession(){

        const {
            data
        } =
        await supabaseClient
        .auth
        .getSession();

        if(data.session){

            this.user =
            data.session.user;

            console.log(
                "Supabase session restored:",
                this.user
            );

            

            Aegis.broadcast(
                "cloudUpdated"
            );
            if(window.AegisPush){
                await AegisPush.init();
            }
                
            await this.initialSync();

        }

    },
    async initialSync(){

        console.log(
            "Beginning cloud sync..."
        );

        this.useProgressAccount();
        this.scheduleProgressSync(0);

        try{

            if(window.loadCloudProfile){

                await loadCloudProfile();

            }

            if(window.loadCategoriesFromCloud){

                await loadCategoriesFromCloud();

            }

            if(window.loadEventsFromCloud){

                await loadEventsFromCloud();

            }

            if(window.loadRemindersFromCloud){

                await loadRemindersFromCloud();

            }

            if(window.loadNotificationStates){

                await loadNotificationStates();

            }

            Aegis.broadcast(
                "cloudSyncComplete"
            );

            console.log(
                "Cloud sync complete."
            );

        }
        catch(error){

            console.error(
                "Cloud sync failed:",
                error
            );

        }

    },
    useProgressAccount() {
        if (ProgressStorage.useAccount(this.user?.id ?? null)) {
            for (const collection of Object.keys(ProgressStorage.keys)) {
                this.refreshProgress(collection);
            }
        }
    },

    refreshProgress(collection) {
        const modules = {
            aegisHabits: ["habits", "refresh"],
            aegisFocusSessions: ["focustracker", "refresh"],
            aegisAchievements: ["achievements", "refresh"],
            petSettings: ["pet", "reloadSettings"],
            themeSettings: ["themes", "reloadSettings"]
        };
        const [name, method] = modules[collection];
        Aegis.getModule(name)?.api?.[method]?.();
    },

    scheduleProgressSync(delay = 300) {
        if (!this.user) return;
        clearTimeout(this.progressTimer);
        this.progressTimer = setTimeout(() => void this.syncProgress(), delay);
    },

    async syncProgress() {
        const userId = this.user?.id;
        if (!userId || ProgressStorage.userId !== userId) return;
        if (this.progressSyncRunning) {
            this.progressSyncAgain = true;
            return;
        }
        this.progressSyncRunning = true;
        try {
            for (const collection of Object.keys(ProgressStorage.keys)) {
                if (this.user?.id !== userId) break;
                const { pending } = ProgressStorage.state(collection, userId);
                const entries = Object.entries(pending);
                for (const seed of [true, false]) {
                    const writes = entries.filter(([, entry]) => Boolean(entry.seed) === seed);
                    for (let offset = 0; offset < writes.length; offset += 200) {
                        if (this.user?.id !== userId) return;
                        const rows = writes.slice(offset, offset + 200).map(([item_id, entry]) => ({
                            user_id: userId, collection, item_id, value: entry.value
                        }));
                        const { error } = await supabaseClient.from("progress_items").upsert(rows, {
                            onConflict: "user_id,collection,item_id", ignoreDuplicates: seed
                        });
                        if (error) throw error;
                    }
                }

                const rows = [];
                let cursor = null;
                while (this.user?.id === userId) {
                    let query = supabaseClient.from("progress_items").select("item_id,value")
                        .eq("user_id", userId).eq("collection", collection).order("item_id").limit(200);
                    if (cursor !== null) query = query.gt("item_id", cursor);
                    const { data, error } = await query;
                    if (error) throw error;
                    rows.push(...data);
                    if (data.length < 200) break;
                    cursor = data.at(-1).item_id;
                }
                if (this.user?.id === userId && ProgressStorage.receive(collection, userId, rows, pending)) {
                    this.refreshProgress(collection);
                }
            }
        } catch (error) {
            console.warn("Progress sync will retry", error);
        } finally {
            this.progressSyncRunning = false;
            if (this.progressSyncAgain) {
                this.progressSyncAgain = false;
                this.scheduleProgressSync(0);
            }
        }
    },

    async save(table,data){


        if(!this.user){

            console.error(
                "No cloud user."
            );

            return false;

        }

       if(table === "events"){

        if(data.categoryId){

            data.category_id =
            data.categoryId;

            delete data.categoryId;

        }


        if(data.category){

            data.category_id =
            data.category;

            delete data.category;

        }

    }

        const upload = {

            ...data,

            user_id:
            this.user.id,

            updated_at:
            new Date()

        };


        const {
            error
        } =
        await supabaseClient
        .from(table)
        .upsert(
            upload
        );


        if(error){

            console.log(error);
            console.log(JSON.stringify(error, null, 2));
                        return false;

        }


        return true;

    },

    async load(table){

        if(!this.user){

            return [];

        }

        const {
            data,
            error
        } =
        await supabaseClient
        .from(table)
        .select("*")
        .eq(
            "user_id",
            this.user.id
        );

        if(error){

            console.error(
                `Cloud load failed (${table})`,
                error
            );

            return [];

        }

        return data;

    },

    async saveNotificationState(notificationId, changes){

        if(!this.user){

            console.log(
                "No cloud user. Notification state not synced."
            );

            return false;

        }


        const upload = {

            user_id:
                this.user.id,

            notification_id:
                notificationId,

            ...changes,

            updated_at:
                new Date().toISOString()

        };


        const {
            error
        } =
        await supabaseClient
            .from("notification_states")
            .upsert(
                upload,
                {
                    onConflict:
                        "user_id,notification_id"
                }
            );


        if(error){

            console.error(
                "Notification state sync failed:",
                error
            );

            return false;

        }


        return true;

    },


    async loadNotificationStates(){

        if(!this.user){

            return [];

        }


        const {
            data,
            error
        } =
        await supabaseClient
            .from("notification_states")
            .select("*")
            .eq(
                "user_id",
                this.user.id
            );


        if(error){

            console.error(
                "Notification states load failed:",
                error
            );

            return [];

        }


        return data || [];

    },

    getUser(){

        return this.user || null;

    },


    isConnected(){


        return cloudConnected;


    },



    status(){


        return {


            online:true,


            version:this.version,


            connected:
            cloudConnected,


            user:
            cloudUser


        };


    }



});
