/* const backgrounds = [
    "url('images/background1.png')",
    "url('images/background2.png')",
    "url('images/background3.png')",
    "url('images/background4.png')",
    "url('images/background5.png')"
];

// Function to set a random background
function setRandomBackground() {
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    document.body.style.backgroundImage = backgrounds[randomIndex];
}

// Run the function when the page loads
window.onload = setRandomBackground; */

function setRandomBackground() {
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    document.body.style.backgroundImage = backgrounds[randomIndex];
    document.body.style.backgroundColor = "#000";  // Add fallback in case images don't load
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
}

// Run the function when the page loads
window.onload = setRandomBackground;

function addTask () {
    var input = document.getElementById("input");
    // get current text from input field
    var newTask = input.value;
    // only add new item to list if some text was entered 
    if (newTask != "") {
        // create new HTML list item
        var item = document.createElement("li");
        // add HTML for buttons and new task text
        // Note, need to use '' because of "" in HTML
        item.innerHTML = '<input type="button" class="done" onclick="markDone(this.parentNode)"  value="&#x2713;" /> ' + '<input type="button" class="remove" onclick="remove(this.parentNode)" value="&#x2715;" /> ' + newTask;

        // add new item as part of existing list
        document.getElementById("tasks").appendChild(item); 

      
  input.value='';
  input.placeholder='enter next task...'
    }
}

// cross out after done task
function markDone (item) {
    item.classList.toggle("finished");
}

//delete to remove tasks
function remove (item) {
    // remove item completely from document
    item.remove();
}

