const DragManager = {
    activeCard:null,
    placeholder:null,
    isDragging:false,

   

    init(){

        document
        .querySelectorAll(
            ".dashboard-card"
        )
        .forEach(card=>{


            card.addEventListener(
                "pointerdown",
                this.pointerDown
            );


            card.addEventListener(
                "pointermove",
                this.pointerMove
            );


            card.addEventListener(
                "pointerup",
                this.pointerUp
            );

            
            card.addEventListener(
                "pointercancel",
                this.pointerUp
            );

        });


    },



    dragged:null,



    dragStart(event){

        DragManager.dragged =
        this;


        this.style.opacity =
        "0.5";


    },



    dragOver(event){

        event.preventDefault();


    },



    drop(event){

        event.preventDefault();


        if(
            !DragManager.dragged ||
            DragManager.dragged === this
        ){

            return;

        }



        const grid =
        document.querySelector(
            ".dashboard-grid"
        );



        const cards =
        [...grid.children];



        const draggedIndex =
        cards.indexOf(
            DragManager.dragged
        );


        const targetIndex =
        cards.indexOf(
            this
        );



        if(
            draggedIndex <
            targetIndex
        ){

            this.after(
                DragManager.dragged
            );

        }

        else{

            this.before(
                DragManager.dragged
            );

        }



        DragManager.dragged.style.opacity =
        "1";



        DragManager.save();


    },
    save(){


        const layout =

        [
            ...document
            .querySelectorAll(
                ".dashboard-card"
            )
        ]

        .map(card=>card.id);



        localStorage.setItem(

            "aegisDashboardLayout",

            JSON.stringify(
                layout
            )

        );


        Dashboard.layout =
        layout;


        console.log(
            "Dashboard Layout Saved",
            layout
        );


    },
    pointerDown(event){


        if(!Dashboard.editMode){
            return;
        }


        event.preventDefault();


        DragManager.activeCard =
        this;
        DragManager.placeholder =
        document.createElement("div");


        DragManager.placeholder.className =
        "dashboard-placeholder " +
        this.className;


        this.parentNode.insertBefore(
            DragManager.placeholder,
            this
        );

        DragManager.isDragging =
        true;
        this.setPointerCapture(
            event.pointerId
        );

        this.classList.add(
            "dragging"
        );

        this.style.opacity =
        "0.35";
    },

    pointerMove(event){

        if(
            !DragManager.isDragging ||
            !DragManager.activeCard ||
            !DragManager.placeholder
        ){

            return;

        }


        event.preventDefault();


        const element =
        document.elementFromPoint(
            event.clientX,
            event.clientY
        );


        const target =
        element?.closest(
            ".dashboard-card"
        );


        if(
            !target ||
            target === DragManager.activeCard
        ){

            return;

        }


        const grid =
        document.querySelector(
            ".dashboard-grid"
        );


        const cards =
        [
            ...grid.children
        ];


        const placeholderIndex =
        cards.indexOf(
            DragManager.placeholder
        );


        const targetIndex =
        cards.indexOf(
            target
        );


        if(
            placeholderIndex < targetIndex
        ){

            target.after(
                DragManager.placeholder
            );

        }

        else{

            target.before(
                DragManager.placeholder
            );

        }

    },



    pointerUp(event){

        if(
            !DragManager.activeCard
        ){

            return;

        }


        const card =
        DragManager.activeCard;


        const placeholder =
        DragManager.placeholder;


        if(
            placeholder
        ){

            placeholder.replaceWith(
                card
            );

        }


        card.style.opacity =
        "1";


        card.style.visibility =
        "visible";


        card.classList.remove(
            "dragging"
        );


        DragManager.save();

        if(
            event?.pointerId
        ){

            this.releasePointerCapture(
                event.pointerId
            );

        }
        DragManager.activeCard =
        null;


        DragManager.placeholder =
        null;


        DragManager.isDragging =
        false;


    }

};
