/* function setRandomBackground() {
    const backgrounds = [
        "url('images/background1.png')",
        "url('images/background2.png')",
        "url('images/background3.png')",
        "url('images/background4.png')",
        "url('images/background5.png')"
    ];

    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBackground = backgrounds[randomIndex];

    document.body.style.backgroundImage = selectedBackground;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";

    console.log("Background set to:", selectedBackground);
}

// Run the function when the page loads
window.onload = setRandomBackground; */

const backgrounds = [
    "images/background1.png",
    "images/background2.png",
    "images/background3.png",
    "images/background4.png",
    "images/background5.png"
];

// Function to determine brightness of an image
function getImageBrightness(imageSrc, callback) {
    let img = document.createElement("img");
    img.crossOrigin = "Anonymous"; // Avoid CORS issues
    img.src = imageSrc;
    img.onload = function () {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        let imageData = ctx.getImageData(0, 0, img.width, img.height);
        let pixels = imageData.data;
        let brightness = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];
            brightness += (r + g + b) / 3; // Average RGB
        }

        brightness /= pixels.length / 4; // Get average brightness
        callback(brightness);
    };
}

// Function to set a random background and adjust text color
function setRandomBackground() {
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBackground = backgrounds[randomIndex];
    document.body.style.backgroundImage = `url('${selectedBackground}')`;

    // Check brightness of the image and set text color accordingly
    getImageBrightness(selectedBackground, (brightness) => {
        if (brightness < 128) {
            // Dark background → White text
            document.body.style.color = "white";
            document.querySelectorAll("li, input, button").forEach(el => el.style.color = "white");
        } else {
            // Light background → Black text
            document.body.style.color = "black";
            document.querySelectorAll("li, input, button").forEach(el => el.style.color = "black");
        }
    });
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

