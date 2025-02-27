//randomly choose background from the following

function setRandomBackground() {
    const backgrounds = [
        "url('images/background1.png')",
        "url('images/background2.png')",
        "url('images/background3.png')",
        "url('images/background4.png')",
        "url('images/background5.png')",
        "url('images/background6.png')"
    ];

    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBackground = backgrounds[randomIndex];

    document.body.style.backgroundImage = selectedBackground;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";

    console.log("Background set to:", selectedBackground);
}

// Function to load tasks from localStorage
function loadTasks() {
    var tasks = JSON.parse(localStorage.getItem("tasks")) || []; // Get tasks or use empty array if nothing is saved
    tasks.forEach(function(task) {
        var item = document.createElement("li");
        item.innerHTML = '<input type="button" class="done" onclick="markDone(this.parentNode)"  value="&#x2713;" /> ' + 
                         '<input type="button" class="remove" onclick="remove(this.parentNode)" value="&#x2715;" /> ' + 
                         task.text;

        // Mark task as done if applicable
        if (task.done) {
            item.classList.add("finished"); // Add "finished" class if the task was marked as done
        }

        document.getElementById("tasks").appendChild(item);
    });
}

// Function to save tasks to localStorage
function saveTasks() {
    var tasks = [];
    var taskItems = document.querySelectorAll("#tasks li");
    taskItems.forEach(function(item) {
        var taskText = item.textContent.trim(); // Get task text, ignoring buttons
        var isDone = item.classList.contains("finished"); // Check if the task is marked as done

        tasks.push({ text: taskText, done: isDone }); // Save both text and state
    });
    localStorage.setItem("tasks", JSON.stringify(tasks)); // Save tasks array in localStorage
}


// User adding task to the to-do list

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

        
        // Save updated tasks list
        saveTasks();
        
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
    saveTasks(); // Save the updated tasks
}
//delete to remove tasks
function remove (item) {
    // remove item completely from document
    item.remove();
}


// Run both functions when the page loads
window.onload = function() {
    setRandomBackground();  // Set random background
    loadTasks();            // Load tasks from localStorage
};

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
    "Julian becomes a professional violinist",
    "Tingyo is piloting an Airbus A330",
    "Qianqian loves you all"
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

//music player with stft

// Music files stored in the GitHub folder "music/"
const musicFiles = [
    "music/song1.mp3",
    "music/song2.mp3",
    "music/song3.mp3",
    "music/song4.mp3"
];

// Select a random song
const randomSong = musicFiles[Math.floor(Math.random() * musicFiles.length)];

// Get the audio player element
const audioPlayer = document.getElementById("audioPlayer");
audioPlayer.src = randomSong;
audioPlayer.load(); // Load the song
audioPlayer.play(); // Auto-play when page loads


// --- FOURIER TRANSFORM VISUALIZATION ---
const canvas = document.getElementById("fftCanvas");
    canvas.width = window.innerWidth;  // Make the canvas span the full width
    canvas.height = 150; // Set a fixed height for the canvas (adjust as needed)

// Resize the canvas if the window size changes
    window.addEventListener('resize', () => {
    canvas.width = window.innerWidth; // Re-adjust the width
});

const ctx = canvas.getContext("2d");

// Web Audio API setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const source = audioContext.createMediaElementSource(audioPlayer);
source.connect(analyser);
analyser.connect(audioContext.destination);

// Configure analyser
analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Draw the frequency spectrum
function drawFFT() {
    requestAnimationFrame(drawFFT);
    analyser.getByteFrequencyData(dataArray);

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        
            // Set the fill color to black for the bars
            ctx.fillStyle = "white";
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            // Set the stroke color to white for the edges
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1; // Set the edge thickness
            ctx.strokeRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
    }
}

// Start visualization when audio plays
audioPlayer.onplay = () => {
    audioContext.resume();
    drawFFT();
};



