let categories = loadData("categories");


const defaultCategories = [

{
name:"Personal",
color:"#22c55e"
},

{
name:"Work",
color:"#ef4444"
},

{
name:"Church",
color:"#9333ea"
},

{
name:"Health",
color:"#2563eb"
},

{
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

name:name,

color:color

});



saveData(
"categories",
categories
);



updateCategoryMenus();



document.getElementById(
"categoryName"
).value="";


}



function removeCategory(name){


categories =
categories.filter(
category =>
category.name !== name
);



saveData(
"categories",
categories
);



updateCategoryMenus();


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
category.name;



option.textContent =
"● " + category.name;

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

    <button onclick="removeCategory('${category.name}')">
        Delete
    </button>

</div>


`;

});


}




Aegis.register("categories", {

    version: "1.1.5",

    init() {

        categories = loadData("categories");

        if(categories.length === 0){

            categories = defaultCategories;

            saveData(
                "categories",
                categories
            );

        }

        updateCategoryMenus();

        displayCategories();

        console.log("Categories initialized.");

    },

    refresh() {

        categories = loadData("categories");

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