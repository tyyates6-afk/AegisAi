Dashboard.register("profileWidget", {


    init(){

        this.refresh();

    },


    refresh(){

        const container =
        document.getElementById(
            "profileWidget"
        );


        if(!container) return;



        const profileModule =
        Aegis.getModule("profile");



        if(!profileModule){

            container.innerHTML = `
                <h3>👤 Profile</h3>
                <p>Profile unavailable.</p>
            `;

            return;

        }



        const profile =
        profileModule.api.getProfile();



        container.innerHTML = `

            <div class="widget-header">

                <h3>
                👤 Profile
                </h3>

            </div>


            <div class="widget-body">


                <div class="widget-item">

                    <strong>
                    Name:
                    </strong>

                    ${profile.name}

                </div>



                <div class="widget-item">

                    <strong>
                    Bible:
                    </strong>

                    ${profile.bibleVersion || profile.bible}

                </div>



                <div class="widget-item">

                    <strong>
                    Style:
                    </strong>

                    ${profile.assistantStyle || profile.style}

                </div>


            </div>

        `;


    },


    shutdown(){


    }


});



Dashboard.listen(
    "profileUpdated",
    "profileWidget"
);