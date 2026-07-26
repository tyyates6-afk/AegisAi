const DragManager = {
    activeCard:null,

    isDragging:false,

    touchStartY:0,

    init(){


        document
        .querySelectorAll(
            ".dashboard-card"
        )
        .forEach(card=>{


            card.draggable = true;


            card.addEventListener(
                "dragstart",
                this.dragStart
            );


            card.addEventListener(
                "dragover",
                this.dragOver
            );


            card.addEventListener(
                "drop",
                this.drop
            );

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
    touchStart(event){


        if(!Dashboard.editMode){
            return;
        }


        event.preventDefault();


        DragManager.touchCard =
        this;


        this.classList.add(
            "dragging"
        );


        this.style.opacity =
        "0.6";


    },



    touchMove(event){


        if(!DragManager.touchCard){
            return;
        }


        event.preventDefault();


        const touch =
        event.touches[0];


        const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        );


        const card =
        target.closest(
            ".dashboard-card"
        );


        if(
            card &&
            card !== DragManager.touchCard
        ){


            const grid =
            document.querySelector(
                ".dashboard-grid"
            );


            const cards =
            [...grid.children];


            const from =
            cards.indexOf(
                DragManager.touchCard
            );


            const to =
            cards.indexOf(
                card
            );


            if(from < to){

                card.after(
                    DragManager.touchCard
                );

            }
            else{

                card.before(
                    DragManager.touchCard
                );

            }

        }


    },



    touchEnd(){


        if(!DragManager.touchCard){
            return;
        }


        DragManager.touchCard.classList.remove(
            "dragging"
        );


        DragManager.touchCard.style.opacity =
        "1";


        DragManager.save();


        DragManager.touchCard =
        null;


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


        DragManager.isDragging =
        true;


        this.setPointerCapture(
            event.pointerId
        );


        this.classList.add(
            "dragging"
        );


    },



    pointerMove(event){


        if(
            !DragManager.isDragging ||
            !DragManager.activeCard
        ){
            return;
        }


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
            target &&
            target !== DragManager.activeCard
        ){


            const cards =
            [
                ...document.querySelectorAll(
                    ".dashboard-card"
                )
            ];


            const from =
            cards.indexOf(
                DragManager.activeCard
            );


            const to =
            cards.indexOf(
                target
            );


            if(from < to){

                target.after(
                    DragManager.activeCard
                );

            }
            else{

                target.before(
                    DragManager.activeCard
                );

            }

        }

    },



    pointerUp(){


        if(
            !DragManager.activeCard
        ){
            return;
        }


        DragManager.activeCard.classList.remove(
            "dragging"
        );


        DragManager.save();


        DragManager.activeCard =
        null;


        DragManager.isDragging =
        false;


    }

};