function setRandomBackground() {
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

// pomodoro

let pomodoroTimer;
let isRunning = false;
let remainingTime = 25 * 60; // 25 minutes in seconds
let isBreakTime = false; // Switch between work and break

function updateTimerDisplay() {
    let minutes = Math.floor(remainingTime / 60);
    let seconds = remainingTime % 60;
    document.getElementById("timerDisplay").textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
}

function startPomodoro() {
    if (isRunning) return; // If already running, do nothing

    isRunning = true;
    pomodoroTimer = setInterval(function() {
        remainingTime--;
        updateTimerDisplay();

        if (remainingTime <= 0) {
            clearInterval(pomodoroTimer);
            isRunning = false;
            isBreakTime = !isBreakTime; // Switch between work and break
            remainingTime = isBreakTime ? 5 * 60 : 25 * 60; // 5 minutes break or 25 minutes work
            alert(isBreakTime ? "Take a break!" : "Back to work!");
            startPomodoro(); // Start next session (work/break)
        }
    }, 1000);
}

function pausePomodoro() {
    clearInterval(pomodoroTimer);
    isRunning = false;
}

function resetPomodoro() {
    clearInterval(pomodoroTimer);
    isRunning = false;
    remainingTime = 25 * 60; // Reset to 25 minutes work time
    updateTimerDisplay();
}


