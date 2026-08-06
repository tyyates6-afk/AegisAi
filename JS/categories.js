let categories = loadData("categories");

async function loadCategoriesFromCloud(){

    const cloud =
    Aegis
    .getModule("cloud")
    .api;

    const cloudCategories =
    await cloud.load(
        "categories"
    );


    if(
        cloudCategories.length === 0
    ){

        return;

    }


    categories =
    cloudCategories.map(category=>({

        id:category.id,

        name:category.name,

        color:category.color

    }));


    saveData(
        "categories",
        categories
    );


    updateCategoryMenus();

    displayCategories();

    Aegis.broadcast("categoriesUpdated");

    console.log(
        "Categories loaded from cloud."
    );

}

async function removeCategory(id){

    const cloud =
    Aegis
    .getModule("cloud")
    .api;

    await cloud.remove(
        "categories",
        id
    );

    categories =
    categories.filter(
        c => c.id !== id
    );

    saveData(
        "categories",
        categories
    );

    const removed =
    categories.find(
        c => c.name === name
    );

    if(removed){

        await cloud.delete(
            "categories",
            removed.id
        );

    }
    updateCategoryMenus();

}

async function syncCategoriesToCloud(){

    const cloud =
    Aegis
    .getModule("cloud")
    .api;

    for(const category of categories){

        await cloud.save(
            "categories",
            category
        );

    }

    console.log(
        "Categories synced."
    );

}
const defaultCategories = [

{
    id:"personal",
    name:"Personal",
    color:"#22c55e"
},

{
    id:"work",
    name:"Work",
    color:"#ef4444"
},

{
    id:"church",
    name:"Church",
    color:"#9333ea"
},

{
    id:"health",
    name:"Health",
    color:"#2563eb"
},

{
    id:"other",
    name:"Other",
    color:"#6b7280"
}

];



if(categories.length === 0){

categories = defaultCategories;

saveData(
"categories",
categories
);

syncCategoriesToCloud();
}




function addCategory(){


const name =
document.getElementById(
"categoryName"
).value;



const color =
document.getElementById(
"categoryColor"
).value;



if(!name){

alert(
"Category name required."
);

return;

}



categories.push({

    id:crypto.randomUUID(),

    name:name,

    color:color

});



saveData(
"categories",
categories
);

syncCategoriesToCloud();



updateCategoryMenus();



document.getElementById(
"categoryName"
).value="";


}







function updateCategoryMenus(){


const menu =
document.getElementById(
"eventCategory"
);



if(!menu)
return;



menu.innerHTML="";



categories.forEach(category=>{


let option =
document.createElement(
"option"
);



option.value =
category.id;



option.textContent =
"● " + category.id;

option.style.color =
category.color;



menu.appendChild(
option
);



});


displayCategories();

}



function displayCategories(){


const list =
document.getElementById(
"categoryList"
);



if(!list)
return;



list.innerHTML="";



categories.forEach(category=>{


list.innerHTML += `

<div class="category-item">

    <span>${category.name}</span>

   <button onclick="removeCategory('${category.id}')">
    Delete
    </button>
    

</div>


`;

});


}




Aegis.register("categories", {

    version: "1.1.5",

    async init() {

        categories = loadData("categories");

        updateCategoryMenus();

        displayCategories();

        await loadCategoriesFromCloud();

        updateCategoryMenus();

        displayCategories();

        Aegis.broadcast("categoriesUpdated");

        console.log("Categories initialized.");

    },

    

    refresh(){

        categories =
        loadData("categories");

        updateCategoryMenus();

        displayCategories();

    },

    shutdown() {},

    status() {

        return {

            online: true,

            version: this.version

        };

    }

});