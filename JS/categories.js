let categories =
loadData("categories");


const defaultCategories = [

{
name:"Personal",
color:"green"
},

{
name:"Work",
color:"blue"
},

{
name:"Faith",
color:"purple"
},

{
name:"Health",
color:"red"
},

{
name:"Other",
color:"gray"
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
category.name;



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

<div>

${category.name}

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

        console.log("Categories initialized.");

    },

    refresh() {

        loadCategories();

    },

    shutdown() {},

    status() {

        return {

            online: true,

            version: this.version

        };

    }

});