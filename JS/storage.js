function saveData(key,value){

localStorage.setItem(
key,
JSON.stringify(value)
);

}



function loadData(key){

const data =
localStorage.getItem(key);


return data
?
JSON.parse(data)
:
[];

}