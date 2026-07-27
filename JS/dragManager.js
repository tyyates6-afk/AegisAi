const DragManager = {
    activeCard:null,
    placeholder:null,
    isDragging:false,
    dragStarted:false,

    startX:0,

    startY:0,
   

    init(){


        document
        .querySelectorAll(
            ".dashboard-card"
        )
        .forEach(card=>{


            card.addEventListener(
                "pointerdown",
                event=>{


                    if(!Dashboard.editMode){

                        return;

                    }


                    DragManager.pointerDown.call(
                        card,
                        event
                    );


                }
            );


            card.addEventListener(
                "pointermove",
                event=>{


                    if(!Dashboard.editMode){

                        return;

                    }


                    DragManager.pointerMove.call(
                        card,
                        event
                    );


                }
            );


            card.addEventListener(
                "pointerup",
                event=>{


                    if(!Dashboard.editMode){

                        return;

                    }


                    DragManager.pointerUp.call(
                        card,
                        event
                    );


                }
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

        const widget =
        Dashboard.getWidget(
            this.dataset.widget
        );

        if(
            !widget ||
            widget.locked
        ){
            return;
        }

        DragManager.activeCard =
        this;

        DragManager.startX =
        event.clientX;

        DragManager.startY =
        event.clientY;

        DragManager.dragStarted =
        false;

    },

    pointerMove(event){


        if(
            !Dashboard.editMode ||
            !DragManager.activeCard
        ){
            return;
        }

        const widget =
        Dashboard.getWidget(
            DragManager.activeCard.dataset.widget
        );

        if(
            !widget ||
            widget.locked
        ){
            return;
        }



        const distance = Math.sqrt(

            Math.pow(
                event.clientX -
                DragManager.startX,
                2
            )

            +

            Math.pow(
                event.clientY -
                DragManager.startY,
                2
            )

        );



        if(
            distance < 10
        ){

            return;

        }



        if(
            !DragManager.dragStarted
        ){

            event.preventDefault();


            DragManager.isDragging =
            true;


            DragManager.dragStarted =
            true;


            DragManager.activeCard
            .classList.add(
                "dragging"
            );

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

            if(
                target.compareDocumentPosition(
                    DragManager.activeCard
                )
                &
                Node.DOCUMENT_POSITION_FOLLOWING
            ){

                target.before(
                    DragManager.activeCard
                );

            }
            else{

                target.after(
                    DragManager.activeCard
                );

            }

        }

    },



    pointerUp(event){

        if(
            !DragManager.activeCard
        ){

            return;

        }
        DragManager.activeCard
        .classList.remove(
            "dragging"
        );


        if(
            DragManager.dragStarted
        ){

            DragManager.save();

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
