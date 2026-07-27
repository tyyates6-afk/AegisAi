Dashboard.register("dailyVerse", {
    title:
    "Daily Verse",

    icon:
    "📖",

    description:
    "Your daily Bible verse",

    category:
    "spiritual",

    size:
    "medium-card",

    movable:
    true,

    removable:
    true,

    resizable:
    true,

    init() {

        this.refresh();

    },


    refresh() {


        const container =
            document.getElementById(
                "dailyVerse"
            );


        if (!container) return;



        const bibleModule =
            Aegis.getModule("bible");



        if (!bibleModule) {

            container.innerHTML = `

                <div class="widget-header">

                    <h3>📖 Verse of the Day</h3>

                </div>


                <p class="empty-state">
                    Bible unavailable.
                </p>

            `;

            return;

        }



        const verse =
            bibleModule.api.getDailyVerse();



        let html = `

            <div class="widget-header">

                <h3>
                    📖 Verse of the Day
                </h3>

            </div>


            <div class="widget-body">

        `;



        if (!verse) {


            html += `

                <p class="empty-state">
                    Loading verse...
                </p>

            `;


        } else {


            html += `

                <div class="widget-item">

                    <p>
                        "${verse.text}"
                    </p>


                    <small>
                        — ${verse.reference}
                    </small>

                </div>

            `;


        }



        html += `</div>`;


        container.innerHTML = html;


    },


    shutdown() {


        const container =
            document.getElementById(
                "dailyVerse"
            );


        if(container){

            container.innerHTML = "";

        }

    }


});

Dashboard.listen(
    "verseUpdated",
    "dailyVerse"
);