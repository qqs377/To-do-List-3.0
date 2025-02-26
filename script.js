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

// make keyboard enter/return equivalent to add button

document.getElementById("input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {  // Check if Enter key is pressed
        addTask();
    }
});

// cross out after done task
function markDone(item) {
    item.classList.toggle("finished");
    showAffirmation(); // Call the showAffirmation function when a task is marked as done
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



// List of affirmation words
const affirmations = [
    "Leah becomes a well-known artist!",
    "Jordan is living her awesome life",
    "Is that Yejun?",
    "Jennifer earned her 1M dollars",
    "Link is a millionaire now",
    "Hans just got his greencard",
    "Ammon has received a promotion!",
    "Holly adopt a capybara",
    "Julian becomes professional violinist",
    "Tingyo is piloting an Airbus A330"
];

// Function to get a random affirmation
function getRandomAffirmation() {
    const randomIndex = Math.floor(Math.random() * affirmations.length);
    return affirmations[randomIndex];
}

// Display affirmation message
function showAffirmation() {
    const affirmationText = getRandomAffirmation();
    
    // Create the affirmation element
    const affirmationElement = document.createElement('div');
    affirmationElement.classList.add('affirmation');
    affirmationElement.textContent = affirmationText;

    // Add the affirmation to the body (or a specific container)
    document.body.appendChild(affirmationElement);

    // Set a timeout to remove the affirmation after 2 seconds
    setTimeout(() => {
        affirmationElement.classList.add('fadeOut'); // Trigger fade-out animation
        setTimeout(() => {
            affirmationElement.remove(); // Remove element after fade-out
        }, 1000); // Time for the fade-out effect
    }, 2000); // Time before the affirmation disappears (2 seconds)
}



