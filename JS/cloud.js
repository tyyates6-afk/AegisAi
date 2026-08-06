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


        this.loadSession();


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
        await supabaseClient.auth.signInWithPassword({

            email:email,

            password:password

        });



        if(error){

            console.error(
                "Login failed:",
                error
            );

            return false;

        }



        console.log(
            "AEGIS login successful:",
            data
        );



        this.user =
        data.user;



        Aegis.broadcast(
            "cloudUpdated"
        );



        setTimeout(()=>{

            loadCloudProfile();

        },500);


        return true;

    },

    async logout(){


        await supabaseClient.auth.signOut();


        this.user =
        null;


        Aegis.broadcast(
            "cloudUpdated"
        );


    },

    async loadSession(){

    const {
    data
    } =
    await supabaseClient.auth.getSession();


    if(
    data.session
    ){

    this.user =
    data.session.user;


    console.log(
    "Supabase session restored:",
    this.user
    );

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

    async remove(table,id){

        const {
            error
        } =
        await supabaseClient
        .from(table)
        .delete()
        .eq("id",id);

        if(error){

            console.error(
                `Cloud delete failed (${table})`,
                error
            );

        }

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