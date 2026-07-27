const defaultDashboardLayout = [

    "card-greeting",
    "card-events",
    "card-verse",
    "card-reminders",
    "card-actions",
    "card-weather",
    "card-profile",
    "card-notifications",
    "card-status"

];
const Dashboard = {
    
    widgets: {},
    listeners: {},
    layout: [],
    editMode:false,
    widgetSettings:{},

    getDefaultWidgetSettings(id){

        return {

            size:"small-card",

            locked:false,

            hidden:false

        };

    },

    saveWidgetSettings(){

        localStorage.setItem(

            "aegisWidgetSettings",

            JSON.stringify(

                this.widgetSettings

            )

        );


        console.log(
            "Widget settings saved",
            this.widgetSettings
        );

    },
    
    loadWidgetSettings(){

        const saved =

        JSON.parse(

            localStorage.getItem(
                "aegisWidgetSettings"
            )

        );


        if(saved){

            this.widgetSettings =
            saved;

        }


        Object.values(this.widgets)
        .forEach(widget=>{


            if(!this.widgetSettings[widget.id]){

                this.widgetSettings[widget.id] =
                this.getDefaultWidgetSettings(
                    widget.id
                );

            }


        });


    },

    applyWidgetSettings(){

        Object.entries(
            this.widgetSettings
        )
        .forEach(([id,settings])=>{


            const widget =
            this.getWidget(id);


            const card =
            document.querySelector(
                `[data-widget="${id}"]`
            );


            if(!widget || !card){

                return;

            }



            // Apply size

            card.classList.remove(

                "small-card",

                "medium-card",

                "full-card"

            );


            card.classList.add(

                settings.size

            );



            // Apply lock

            widget.locked =
            settings.locked;



            // Apply hidden

            widget.hidden =
            settings.hidden;


            if(settings.hidden){

                card.style.display =
                "none";

            }
            else{

                card.style.display =
                "";

            }



        });


        console.log(
            "Widget settings applied"
        );

    },

    openWidgetGallery(){

        let gallery =
        document.querySelector(
            ".widget-gallery"
        );


        if(gallery){

            gallery.remove();

            return;

        }


        gallery =
        document.createElement("div");


        gallery.className =
        "widget-gallery";


        gallery.innerHTML = `

            <h3>
                Widget Gallery
            </h3>

            <div class="gallery-list"></div>

        `;


        document
        .querySelector("#dashboard")
        .appendChild(gallery);



        const list =
        gallery.querySelector(
            ".gallery-list"
        );



        Object.values(this.widgets)
        .forEach(widget=>{


            if(widget.hidden){


                const item =
                document.createElement(
                    "div"
                );


                item.className =
                "gallery-item";


                item.innerHTML = `

                    <div class="gallery-icon">

                        ${widget.icon}

                    </div>


                    <div class="gallery-info">

                        <h4>
                            ${widget.name}
                        </h4>


                        <p>
                            ${widget.description}
                        </p>


                        <small>
                            ${widget.category}
                        </small>

                    </div>


                    <button>
                        Restore
                    </button>


                `;


                item
                .querySelector("button")
                .onclick = ()=>{


                    this.restoreWidget(
                        widget.id
                    );


                    gallery.remove();


                };


                list.appendChild(
                    item
                );


            }


        });


        if(!list.children.length){

            list.innerHTML = `

                <p>
                    No hidden widgets
                </p>

            `;

        }


    },

    renderLayout(){

            const grid = document.querySelector(".dashboard-grid");

            if(!grid) return;

            this.layout.forEach(id => {

                const card =
                document.getElementById(id);

                if(card){

                    this.createToolbar(card);

                    grid.appendChild(card);

                }

            });

        },
        createToolbar(card){

        if(
            card.querySelector(
                ".widget-toolbar"
            )
        ){

            return;

        }


        const toolbar =
        document.createElement("div");

        toolbar.className =
        "widget-toolbar";


        toolbar.innerHTML = `

            <button class="widget-tool resize-tool" title="Resize">

                📏

            </button>

            <button class="widget-tool lock-tool" title="Lock">

                🔒

            </button>

            <button class="widget-tool settings-tool" title="Settings">

                ⚙

            </button>

            <button class="widget-tool hide-tool" title="Hide">

                ✖

            </button>

        `;
        toolbar.addEventListener(
            "pointerdown",
            event=>{

                event.stopPropagation();

            }
        );
        toolbar
        .querySelector(".resize-tool")
        .addEventListener(
            "click",
            (event)=>{

                event.stopPropagation();

                event.preventDefault();


                const widgetId =
                card.dataset.widget;


                this.resizeWidget(
                    widgetId
                );

            }
        );

        toolbar
        .querySelector(".lock-tool")
        .addEventListener(
            "click",
            (event)=>{

                event.stopPropagation();

                event.preventDefault();


                this.toggleWidgetLock(

                    card.dataset.widget

                );

            }
        );

        toolbar
        .querySelector(".hide-tool")
        .addEventListener(
            "click",
            (event)=>{

                event.stopPropagation();

                event.preventDefault();


                this.hideWidget(

                    card.dataset.widget

                );

            }
        );

        card.prepend(
            toolbar
        );

    },

    loadLayout(){

        const saved =
        localStorage.getItem(
            "aegisDashboardLayout"
        );


        if(saved){

            this.layout =
            JSON.parse(saved);

        }
        else{

            this.layout =
            [...defaultDashboardLayout];

        }

    },

    saveLayout(){

        localStorage.setItem(

            "aegisDashboardLayout",

            JSON.stringify(
                this.layout
            )

        );

    },

    toggleEditMode(){

    this.editMode =
    !this.editMode;
        document
    .querySelectorAll(
        ".dashboard-card"
    )
    .forEach(card=>{


        if(this.editMode){

            card.style.touchAction =
            "none";

        }
        else{

            card.style.touchAction =
            "pan-y";

        }


    });

    document
    .querySelectorAll(
        ".dashboard-card"
    )
    .forEach(card=>{

        if(this.editMode){

            card.classList.add(
                "edit-mode"
            );

        }
        else{

            card.classList.remove(
                "edit-mode"
            );

        }

    });


    console.log(
            "Dashboard Edit Mode:",
            this.editMode
        );

    },

   register(name, widget) {

        this.widgets[name] = {

        id:name,

        name:
            widget.title || name,


        icon:
            widget.icon || "◻️",


        description:
            widget.description ||
            "AEGIS Widget",


        category:
            widget.category ||
            "general",


        size:
            widget.size ||
            "small-card",


        movable:
            widget.movable ?? true,


        removable:
            widget.removable ?? true,


        resizable:
            widget.resizable ?? true,


        locked:false,

        hidden:false,


        api:widget,


        status:"REGISTERED"

    };


        console.log(

            `✓ Dashboard Widget: ${name} REGISTERED`

        );

    },

    getWidget(id) {

        return this.widgets[id] || null;

    },

    getWidgets() {

        return Object.values(this.widgets);

    },

    resizeWidget(id){

        const widget =
        this.getWidget(id);

        if(!widget){

            return;

        }

        const card =
        document.querySelector(

            `[data-widget="${id}"]`

        );

        if(!card){

            return;

        }

        const sizes = [

            "small-card",

            "medium-card",

            "large-card",

            "full-card"

        ];

        let currentIndex =

            sizes.findIndex(size =>

                card.classList.contains(size)

            );

        if(currentIndex === -1){

            currentIndex = 0;

        }

        card.classList.remove(

            ...sizes

        );

        const nextIndex =

            (currentIndex + 1) %

            sizes.length;

        card.classList.add(

            sizes[nextIndex]

        );

        widget.size =
        sizes[nextIndex];


        this.widgetSettings[id].size =
        sizes[nextIndex];


        this.saveWidgetSettings();
    },

    

    

    toggleWidgetLock(id){

        const widget =
        this.getWidget(id);


        if(!widget){

            return;

        }


        widget.locked =
        !widget.locked;


        this.widgetSettings[id].locked =
        widget.locked;


        this.saveWidgetSettings();


        console.log(
            "Widget lock:",
            id,
            widget.locked
        );

    },

    

    
    hideWidget(id){

        const widget =
        this.getWidget(id);


        const card =
        document.querySelector(
            `[data-widget="${id}"]`
        );


        if(!widget || !card){

            return;

        }


        widget.hidden =
        true;


        this.widgetSettings[id].hidden =
        true;


        card.style.display =
        "none";


        this.saveWidgetSettings();


        console.log(
            "Widget hidden:",
            id
        );

    },


    

    restoreWidget(id){

        const widget =
        this.getWidget(id);


        const card =
        document.querySelector(
            `[data-widget="${id}"]`
        );


        if(!widget || !card){

            console.error(
                "Restore failed:",
                id
            );

            return;

        }


        widget.hidden = false;


        this.widgetSettings[id].hidden =
        false;


        card.style.display =
        "";


        // Make sure it returns to the dashboard layout

        const grid =
        document.querySelector(
            ".dashboard-grid"
        );


        if(grid){

            grid.appendChild(card);

        }


        this.saveWidgetSettings();


        console.log(
            "Widget restored:",
            id
        );

    },

    listen(eventName, widgetName) {

        if (!this.listeners[eventName]) {

            this.listeners[eventName] = [];

        }

        this.listeners[eventName].push(widgetName);

    },

    broadcast(eventName) {

        if (!this.listeners[eventName]) return;

        this.listeners[eventName].forEach(widgetName => {

            this.refresh(widgetName);

        });

    },

    init() {

        console.log("==========");
        console.log("Initializing DashboardManager...");
        console.log("==========");
        
        this.loadLayout();

        this.renderLayout();

        this.loadWidgetSettings();

        this.applyWidgetSettings();

        DragManager.init();

        Object.values(this.widgets).forEach(widget => {

            console.log(`Initializing ${widget.name}...`);

            try {

                if (typeof widget.api.onInit === "function") {

                    widget.api.onInit();

                }

                if (typeof widget.api.init === "function") {

                    widget.api.init();

                }

                if (typeof widget.api.onReady === "function") {

                    widget.api.onReady();

                }

                widget.status = "ONLINE";

                console.log(`🟢 ${widget.name} ONLINE`);

            } catch (error) {

                widget.status = "ERROR";

                console.error(`🔴 ${widget.name} ERROR`, error);

            }

        });

    },

    refresh(name) {

        const widget = this.widgets[name];

        if (!widget) return;

        if (typeof widget.api.onRefresh === "function") {

            widget.api.onRefresh();

        }

        if (typeof widget.api.refresh === "function") {

            widget.api.refresh();

        }

    },

    refreshAll() {

        Object.values(this.widgets).forEach(widget => {

            if (typeof widget.api.onRefresh === "function") {

                widget.api.onRefresh();

            }

            if (typeof widget.api.refresh === "function") {

                widget.api.refresh();

            }

        });

    },

    shutdown() {

        Object.values(this.widgets).forEach(widget => {

            if (typeof widget.api.onShutdown === "function") {

                widget.api.onShutdown();

            }

            if (typeof widget.api.shutdown === "function") {

                widget.api.shutdown();

            }

        });

    }

};

window.addEventListener(
    "eventsUpdated",
    () => {

        Dashboard.broadcast(
            "eventsUpdated"
        );

    }
);


window.addEventListener(
    "remindersUpdated",
    () => {

        Dashboard.broadcast(
            "remindersUpdated"
        );

    }
);


window.addEventListener(
    "verseUpdated",
    () => {

        Dashboard.broadcast(
            "verseUpdated"
        );

    }
);

window.addEventListener(
    "notificationsUpdated",
    () => {

        Dashboard.broadcast(
            "notificationsUpdated"
        );

    }
);

window.addEventListener(
    "profileUpdated",
    () => {

        Dashboard.broadcast(
            "profileUpdated"
        );

    }
);


window.addEventListener(
    "weatherUpdated",
    () => {

        Dashboard.broadcast(
            "weatherUpdated"
        );

    }
);
