// Supabase Configuration
const SUPABASE_URL = 'https://dpopxtljjdkkzcnxwyfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb3B4dGxqamRra3pjbnh3eWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyMjIsImV4cCI6MjA2OTY1NjIyMn0.udAGcJa2CjZfKec34_QL-uBymgu2g9x9mWRrelwr11I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Function to load tasks from Supabase
async function loadTasks() {
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Clear existing tasks
        document.getElementById("tasks").innerHTML = '';

        tasks.forEach(function(task) {
            var item = document.createElement("li");
            item.dataset.taskId = task.id; // Store task ID for updates/deletes
            item.innerHTML = '<input type="button" class="done" onclick="markDone(this.parentNode)"  value="&#x2713;" /> ' + 
                             '<input type="button" class="remove" onclick="remove(this.parentNode)" value="&#x2715;" /> ' + 
                             '<span class="task-content"><strong>' + task.user_name + ':</strong> ' + task.task_text + '</span>';

            // Mark task as done if applicable
            if (task.is_done) {
                item.classList.add("finished");
            }

            document.getElementById("tasks").appendChild(item);
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
        // Fallback to localStorage if Supabase fails
        loadTasksFromLocalStorage();
    }
}

// Fallback function to load from localStorage
function loadTasksFromLocalStorage() {
    var tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.forEach(function(task) {
        var item = document.createElement("li");
        item.innerHTML = '<input type="button" class="done" onclick="markDone(this.parentNode)"  value="&#x2713;" /> ' + 
                         '<input type="button" class="remove" onclick="remove(this.parentNode)" value="&#x2715;" /> ' + 
                         '<span class="task-content">' + task.text + '</span>';

        if (task.done) {
            item.classList.add("finished");
        }

        document.getElementById("tasks").appendChild(item);
    });
}

// Function to save task to Supabase
async function saveTaskToSupabase(userName, taskText) {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert([
                {
                    user_name: userName,
                    task_text: taskText,
                    is_done: false
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error saving task:', error);
        throw error;
    }
}

// Function to update task status in Supabase
async function updateTaskStatus(taskId, isDone) {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({ is_done: isDone })
            .eq('id', taskId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Function to delete task from Supabase
async function deleteTaskFromSupabase(taskId) {
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// User adding task to the to-do list
async function addTask() {
    var nameInput = document.getElementById("nameInput");
    var taskInput = document.getElementById("input");
    var userName = nameInput.value.trim();
    var newTask = taskInput.value.trim();

    // Validate inputs
    if (userName === "" || newTask === "") {
        alert("Please enter both your name and a task!");
        return;
    }

    try {
        // Save to Supabase
        const savedTask = await saveTaskToSupabase(userName, newTask);

        // Create new HTML list item
        var item = document.createElement("li");
        item.dataset.taskId = savedTask.id; // Store task ID
        item.innerHTML = '<input type="button" class="done" onclick="markDone(this.parentNode)"  value="&#x2713;" /> ' + 
                         '<input type="button" class="remove" onclick="remove(this.parentNode)" value="&#x2715;" /> ' + 
                         '<span class="task-content"><strong>' + userName + ':</strong> ' + newTask + '</span>';

        // Add new item to the list
        document.getElementById("tasks").appendChild(item);

        // Clear inputs
        nameInput.value = '';
        taskInput.value = '';
        taskInput.placeholder = 'enter next task...';

    } catch (error) {
        console.error('Failed to save task:', error);
        alert('Failed to save task. Please try again.');
    }
}

// Make keyboard enter/return equivalent to add button
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("input").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            addTask();
        }
    });

    document.getElementById("nameInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            document.getElementById("input").focus();
        }
    });

    // Message board keyboard events
    document.getElementById("messageInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            postMessage();
        }
    });

    document.getElementById("messageNameInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            document.getElementById("messageInput").focus();
        }
    });
});

// Cross out after done task
async function markDone(item) {
    item.classList.toggle("finished");
    const isDone = item.classList.contains("finished");
    const taskId = item.dataset.taskId;

    if (taskId) {
        await updateTaskStatus(taskId, isDone);
    }

    showAffirmation();
}

// Delete to remove tasks
async function remove(item) {
    const taskId = item.dataset.taskId;
    
    if (taskId) {
        await deleteTaskFromSupabase(taskId);
    }
    
    item.remove();
}

// Function to load messages from Supabase
async function loadMessages() {
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Clear existing messages
        const messagesCanvas = document.getElementById("messagesCanvas");
        messagesCanvas.innerHTML = '';

        messages.forEach(function(message) {
            createMessageElement(message);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Function to create a message element
function createMessageElement(message) {
    const messagesCanvas = document.getElementById("messagesCanvas");
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-item');
    messageDiv.dataset.messageId = message.id;
    
    // Random position for canvas-like effect
    const randomX = Math.random() * 80; // 0-80% to keep within bounds
    const randomY = Math.random() * 80; // 0-80% to keep within bounds
    
    messageDiv.style.position = 'absolute';
    messageDiv.style.left = randomX + '%';
    messageDiv.style.top = randomY + '%';
    
    // Random colors for visual variety
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    messageDiv.innerHTML = `
        <div class="message-content" style="background-color: ${randomColor};">
            <div class="message-author">${message.user_name}</div>
            <div class="message-text">${message.message_text}</div>
            <div class="message-time">${new Date(message.created_at).toLocaleString()}</div>
            <button class="delete-message" onclick="deleteMessage('${message.id}', this.parentNode.parentNode)">×</button>
        </div>
    `;
    
    messagesCanvas.appendChild(messageDiv);
}

// Function to save message to Supabase
async function saveMessageToSupabase(userName, messageText) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    user_name: userName,
                    message_text: messageText
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

// Function to delete message from Supabase
async function deleteMessageFromSupabase(messageId) {
    try {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting message:', error);
    }
}

// Function to post a new message
async function postMessage() {
    const nameInput = document.getElementById("messageNameInput");
    const messageInput = document.getElementById("messageInput");
    const userName = nameInput.value.trim();
    const messageText = messageInput.value.trim();

    // Validate inputs
    if (userName === "" || messageText === "") {
        alert("Please enter both your name and a message!");
        return;
    }

    // Check message length
    if (messageText.length > 200) {
        alert("Message too long! Please keep it under 200 characters.");
        return;
    }

    try {
        // Save to Supabase
        const savedMessage = await saveMessageToSupabase(userName, messageText);

        // Create and display the message
        createMessageElement(savedMessage);

        // Clear inputs
        messageInput.value = '';
        messageInput.placeholder = 'leave another message...';

    } catch (error) {
        console.error('Failed to post message:', error);
        alert('Failed to post message. Please try again.');
    }
}

// Function to delete a message
async function deleteMessage(messageId, messageElement) {
    if (confirm('Delete this message?')) {
        await deleteMessageFromSupabase(messageId);
        messageElement.remove();
    }
}

// Run both functions when the page loads
window.onload = function() {
    setRandomBackground();
    loadTasks();
    loadMessages(); // Load messages on page load
};

// Pomodoro Timer
let pomodoroTimer;
let isRunning = false;
let remainingTime = 25 * 60;
let isBreakTime = false;

function updateTimerDisplay() {
    let minutes = Math.floor(remainingTime / 60);
    let seconds = remainingTime % 60;
    document.getElementById("timerDisplay").textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
}

function startPomodoro() {
    if (isRunning) return;

    isRunning = true;
    pomodoroTimer = setInterval(function() {
        remainingTime--;
        updateTimerDisplay();

        if (remainingTime <= 0) {
            clearInterval(pomodoroTimer);
            isRunning = false;
            isBreakTime = !isBreakTime;
            remainingTime = isBreakTime ? 5 * 60 : 25 * 60;
            alert(isBreakTime ? "Take a break!" : "Back to work!");
            startPomodoro();
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
    remainingTime = 25 * 60;
    updateTimerDisplay();
}

// Affirmations
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

function getRandomAffirmation() {
    const randomIndex = Math.floor(Math.random() * affirmations.length);
    return affirmations[randomIndex];
}

function showAffirmation() {
    const affirmationText = getRandomAffirmation();
    
    const affirmationElement = document.createElement('div');
    affirmationElement.classList.add('affirmation');
    affirmationElement.textContent = affirmationText;

    document.body.appendChild(affirmationElement);

    setTimeout(() => {
        affirmationElement.classList.add('fadeOut');
        setTimeout(() => {
            affirmationElement.remove();
        }, 1000);
    }, 2000);
}

// Music Player with FFT Visualization
const musicFiles = [
    "music/404_患者_byLinkFu.mp3",
    "music/Computers_have_taken_over_the_world_byLinkFu.mp3",
    "music/Corporate_Slave_byLinkFu.mp3",
    "music/Final_Project_for_EGMT_byLinkFu.mp3",
    "music/Iron_Heart_Demo_byLinkFu.mp3",
    "music/Midnight_Drive_byLinkFu.mp3",
    "music/The_fall_of_the_god_of_all_liars_byLinkFu.mp3",
    "music/compressed_tomorrow_byLinkFu.mp3",
    "music/Itai_byLinkFu.mp3",
    "music/rawr_byLinkFu.mp3"
];

// Music player setup (when DOM is loaded)
document.addEventListener('DOMContentLoaded', function() {
    const randomSong = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    const audioPlayer = document.getElementById("audioPlayer");
    
    if (audioPlayer) {
        audioPlayer.src = randomSong;
        audioPlayer.load();
        
        // FFT Visualization setup
        const canvas = document.getElementById("fftCanvas");
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = 150;

            window.addEventListener('resize', () => {
                canvas.width = window.innerWidth;
            });

            const ctx = canvas.getContext("2d");
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audioPlayer);
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function drawFFT() {
                requestAnimationFrame(drawFFT);
                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const barWidth = (canvas.width / bufferLength) * 2.5;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = dataArray[i] / 2;
                    
                    ctx.fillStyle = "white";
                    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, canvas.height - barHeight, barWidth, barHeight);

                    x += barWidth + 1;
                }
            }

            audioPlayer.onplay = () => {
                audioContext.resume();
                drawFFT();
            };
        }
    }
});
