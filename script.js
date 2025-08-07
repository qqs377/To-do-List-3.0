// Supabase Configuration - Replace with your actual credentials
const SUPABASE_URL = 'https://dpopxtljjdkkzcnxwyfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb3B4dGxqamRra3pjbnh3eWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyMjIsImV4cCI6MjA2OTY1NjIyMn0.udAGcJa2CjZfKec34_QL-uBymgu2g9x9mWRrelwr11I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let pomodoroTimer;
let isRunning = false;
let remainingTime = 25 * 60;
let isBreakTime = false;
let audioContext;
let analyser;
let currentSongIndex = 0;
let currentTaskFilter = 'all';
let currentUserFilter = '';

// Music files list - you can expand this or make it dynamic
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
    "music/rawr_byLinkFu.mp3",
    "music/Bruch_Violin_Concerto_No.1_mvt.2_byYejunKim.mp3",
    "music/Chopin_Scherzo_no.1_op.20_byYejunKim.mp3",
    "music/Meditation_de_Thais_1_byYejunKim.mp3",
    "music/Wieniaski_Scherzo_Tarantella_byYejunKim.mp3"
];

// Affirmations list
const affirmations = [
    "Leah becomes a well-known artist!",
    "Jordan is living her awesome life",
    "Yejun bought a lake house",
    "Jennifer earned her 1M dollars",
    "Link is a millionaire now",
    "Hans just got his greencard",
    "Ammon has received a promotion!",
    "Holly adopt a capybara",
    "Julian becomes a professional violinist",
    "Tingyo is piloting an Airbus A330",
    "Qianqian loves you all"
];

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateTimerDisplay();
});

// Event listeners
function initializeEventListeners() {
    // Task input enter key
    document.getElementById('taskInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    // Message input enter key
    document.getElementById('messageInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            postMessage();
        }
    });

    // Auth input enter keys
    document.getElementById('authName').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const passwordSection = document.getElementById('authPasswordSection');
            if (passwordSection.style.display === 'none') {
                handleAuth();
            } else {
                document.getElementById('authPassword').focus();
            }
        }
    });

    document.getElementById('authPassword').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const confirmSection = document.getElementById('confirmPasswordSection');
            if (confirmSection.style.display === 'none') {
                handleAuth();
            } else {
                document.getElementById('authConfirmPassword').focus();
            }
        }
    });

    document.getElementById('authConfirmPassword').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handleAuth();
        }
    });

    // Leaderboard period buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('period-btn')) {
            const type = e.target.dataset.type;
            const period = e.target.dataset.period;
            
            // Update active button
            document.querySelectorAll(`.period-btn[data-type="${type}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Update leaderboard
            loadLeaderboards();
        }
    });

    // Task filter buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-btn')) {
            currentTaskFilter = e.target.dataset.filter;
            currentUserFilter = '';
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Reset user filter dropdown
            document.getElementById('userFilter').value = '';
            
            // Filter tasks
            filterTasks();
        }
    });

    // User filter dropdown
    document.getElementById('userFilter').addEventListener('change', function(e) {
        currentUserFilter = e.target.value;
        currentTaskFilter = 'user';
        
        // Reset filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        filterTasks();
    });
}

// Authentication functions
async function handleAuth() {
    const name = document.getElementById('authName').value.trim();
    const password = document.getElementById('authPassword').value;
    const confirmPassword = document.getElementById('authConfirmPassword').value;
    const errorElement = document.getElementById('authError');

    if (!name) {
        errorElement.textContent = 'Please enter your name';
        return;
    }

    try {
        // Check if user exists
        const { data: existingUser, error } = await supabase
            .from('users_v3')
            .select('*')
            .eq('username', name)
            .single();

        if (existingUser) {
            // User exists, verify password
            if (!password) {
                showPasswordInput();
                return;
            }

            if (existingUser.password === password) {
                // Update last login time
                await supabase
                    .from('users_v3')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', existingUser.id);
                
                // Login successful - set current user with updated last_login
                currentUser = { ...existingUser, last_login: new Date().toISOString() };
                
                // Check for calendar-based resets (affects all users)
//                await checkCalendarResets(); //supabase does not have this function, need to fix
                
                showMainApp();
            } else {
                errorElement.textContent = 'Incorrect password';
            }
        } else {
            // New user, create account
            if (!password) {
                showPasswordCreation();
                return;
            }

            if (password !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match';
                return;
            }

            if (password.length < 4) {
                errorElement.textContent = 'Password must be at least 4 characters';
                return;
            }

            // Create new user
            const { data: newUser, error: createError } = await supabase
                .from('users_v3')
                .insert([{
                    username: name,
                    password: password,
                    pomodoro_count: 0,
                    tasks_completed: 0,
                    week_count_pomodoro: 0,
                    day_count_pomodoro: 0,
                    week_count_task: 0,
                    day_count_task: 0,
                    last_login: new Date().toISOString()
                }])
                .select()
                .single();

            if (createError) throw createError;

            currentUser = newUser;

            // Check for calendar-based resets (affects all users)
            await checkCalendarResets();
            
            showMainApp();
        }
    } catch (error) {
        console.error('Auth error:', error);
        errorElement.textContent = 'Authentication failed. Please try again.';
    }
}

function showPasswordInput() {
    document.getElementById('authPasswordSection').style.display = 'block';
    document.getElementById('authPassword').focus();
    document.getElementById('authSubmit').textContent = 'Login';
}

function showPasswordCreation() {
    document.getElementById('authPasswordSection').style.display = 'block';
    document.getElementById('confirmPasswordSection').style.display = 'block';
    document.getElementById('authPassword').placeholder = 'Create password (min 4 chars)';
    document.getElementById('authPassword').focus();
    document.getElementById('authSubmit').textContent = 'Create Account';
}

function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = currentUser.username;
    
    // Initialize app
    setRandomBackground();
    loadTasks();
    loadMessages();
    loadLeaderboards();
    loadStudyingWith();
    loadUserFilter();
    initializeMusicPlayer();
    updateTimerDisplay();
}

function logout() {
    currentUser = null;
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Reset form
    document.getElementById('authName').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authConfirmPassword').value = '';
    document.getElementById('authPasswordSection').style.display = 'none';
    document.getElementById('confirmPasswordSection').style.display = 'none';
    document.getElementById('authSubmit').textContent = 'Continue';
    document.getElementById('authError').textContent = '';
}

// Background functions
function setRandomBackground() {
    const backgrounds = [
        "url('images/background1.png')",
        "url('images/background2.png')",
        "url('images/background3.png')",
        "url('images/background4.png')",
        "url('images/background5.png')",
        "url('images/background6.png')",
        "url('images/wlop0.png')",
        "url('images/wlop1.png')",
        "url('images/wlop2.png')",
        "url('images/wlop3.png')",
        "url('images/wlop4.png')",
        "url('images/wlop5.png')",
        "url('images/wlop6.png')",
        "url('images/wlop7.png')",
        "url('images/wlop8.png')",
        "url('images/wlop9.png')",
        "url('images/wlop10.png')"
    ];

    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBackground = backgrounds[randomIndex];

    document.body.style.backgroundImage = selectedBackground;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";

    console.log("Background set to:", selectedBackground);
}

// Studying with functionality
async function loadStudyingWith() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: users, error } = await supabase
            .from('users_v3')
            .select('username, last_login')
            .gte('last_login', today.toISOString())
            .neq('id', currentUser.id);

        if (error) throw error;

        const studyingWithElement = document.getElementById('studyingWith');
        
        if (users && users.length > 0) {
            const usernames = users.map(user => user.username).join(', ');
            studyingWithElement.textContent = `${usernames} ${users.length === 1 ? 'is' : 'are'} locking in with you!`;
        } else {
            studyingWithElement.textContent = "You're ahead of everyone!";
        }
    } catch (error) {
        console.error('Error loading studying with:', error);
        document.getElementById('studyingWith').textContent = "You're ahead of everyone!";
    }
}

// Task functions
async function loadTasks() {
    try {
        const { data: tasks, error } = await supabase
            .from('tasks_v3')
            .select('*, users_v3(username)')
            .order('created_at', { ascending: true });

        if (error) throw error;

        window.allTasks = tasks; // Store for filtering
        filterTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function loadUserFilter() {
    try {
        const { data: users, error } = await supabase
            .from('users_v3')
            .select('username')
            .order('username');

        if (error) throw error;

        const userSelect = document.getElementById('userFilter');
        userSelect.innerHTML = '<option value="">Filter by tech...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading user filter:', error);
    }
}

function filterTasks() {
    if (!window.allTasks) return;
    
    let filteredTasks = window.allTasks;
    
    switch (currentTaskFilter) {
        case 'my':
            filteredTasks = window.allTasks.filter(task => task.user_id === currentUser.id);
            break;
        case 'others':
            filteredTasks = window.allTasks.filter(task => task.user_id !== currentUser.id);
            break;
        case 'user':
            if (currentUserFilter) {
                filteredTasks = window.allTasks.filter(task => task.users_v3.username === currentUserFilter);
            }
            break;
        case 'all':
        default:
            filteredTasks = window.allTasks;
            break;
    }
    
    displayTasks(filteredTasks);
}

function displayTasks(tasks) {
    const tasksList = document.getElementById('tasks');
    tasksList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        
        const canModify = currentUser && task.user_id === currentUser.id;
        
        li.innerHTML = `
            ${canModify ? `<button class="done" onclick="markDone(this.parentNode)">✓</button>` : ''}
            ${canModify ? `<button class="remove" onclick="removeTask(this.parentNode)">✕</button>` : ''}
            <span class="task-content">${task.task_text}</span>
            <span class="task-owner">by ${task.users_v3.username}</span>
        `;

        if (task.is_done) {
            li.classList.add('finished');
        }

        // Add double-click event listener for editing (only for user's own tasks)
        if (canModify) {
            const taskContentSpan = li.querySelector('.task-content');
            taskContentSpan.addEventListener('dblclick', function() {
                editTask(li, task.id, task.task_text);
            });
            taskContentSpan.style.cursor = 'pointer';
            taskContentSpan.title = 'Double-click to edit';
        }

        tasksList.appendChild(li);
    });
}

// New function to handle task editing
async function editTask(taskElement, taskId, currentText) {
    const taskContentSpan = taskElement.querySelector('.task-content');
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'task-edit-input';
    
    // Style the input to match the span
    input.style.border = '1px solid #ccc';
    input.style.padding = '2px 4px';
    input.style.fontSize = 'inherit';
    input.style.fontFamily = 'inherit';
    input.style.width = '200px';
    input.style.backgroundColor = '#fff';
    
    // Replace span with input
    taskContentSpan.style.display = 'none';
    taskElement.insertBefore(input, taskContentSpan);
    
    // Focus and select all text
    input.focus();
    input.select();
    
    // Function to save changes
    const saveEdit = async () => {
        const newText = input.value.trim();
        
        if (!newText) {
            alert('Task cannot be empty!');
            input.focus();
            return;
        }
        
        if (newText === currentText) {
            // No changes made, just cancel
            cancelEdit();
            return;
        }
        
        try {
            const { error } = await supabase
                .from('tasks_v3')
                .update({ task_text: newText })
                .eq('id', taskId);

            if (error) throw error;

            // Update the display
            taskContentSpan.textContent = newText;
            cancelEdit();
            
            // Optionally reload tasks to ensure consistency
            // loadTasks();
            
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again.');
            input.focus();
        }
    };
    
    // Function to cancel editing
    const cancelEdit = () => {
        taskElement.removeChild(input);
        taskContentSpan.style.display = '';
        input.removeEventListener('blur', handleBlur);
        input.removeEventListener('keydown', handleKeydown);
    };
    
    // Handle blur (clicking outside)
    const handleBlur = (e) => {
        // Small delay to allow click events to process first
        setTimeout(() => {
            if (document.contains(input)) {
                saveEdit();
            }
        }, 100);
    };
    
    // Handle keyboard events
    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };
    
    // Add event listeners
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeydown);
}


async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();

    if (!taskText) {
        alert('Please enter a task!');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('tasks_v3')
            .insert([{
                user_id: currentUser.id,
                task_text: taskText,
                is_done: false
            }])
            .select();

        if (error) throw error;

        taskInput.value = '';
        loadTasks();
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
    }
}

async function markDone(taskElement) {
    const taskId = taskElement.dataset.taskId;
    const isDone = !taskElement.classList.contains('finished');

    try {
        const { error } = await supabase
            .from('tasks_v3')
            .update({ is_done: isDone })
            .eq('id', taskId);

        if (error) throw error;

        if (isDone) {
            // Increment task completion count
            await supabase
                .from('users_v3')
                .update({ 
                    tasks_completed: currentUser.tasks_completed + 1,
                    week_count_task: currentUser.week_count_task + 1,
                    day_count_task: currentUser.day_count_task + 1
                })
                .eq('id', currentUser.id);
            
            currentUser.tasks_completed++;
            currentUser.week_count_task++;
            currentUser.day_count_task++;
            showAffirmation();
        }

        loadTasks();
        loadLeaderboards();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function removeTask(taskElement) {
    const taskId = taskElement.dataset.taskId;

    try {
        const { error } = await supabase
            .from('tasks_v3')
            .delete()
            .eq('id', taskId);

        if (error) throw error;

        loadTasks();
    } catch (error) {
        console.error('Error removing task:', error);
    }
}

// Message functions
async function loadMessages() {
    try {
        const { data: messages, error } = await supabase
            .from('messages_v3')
            .select(`
                id,
                message_text,
                created_at,
                user_id,
                likes_count,
                users_v3 (
                    username
                )
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const canvas = document.getElementById('messagesCanvas');
        canvas.innerHTML = '';

        messages.forEach(message => {
            createMessageElement(message);
        });
        
        // IMPORTANT: Check which messages the current user has liked
        await checkUserLikes();
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function createMessageElement(message) {
    const canvas = document.getElementById('messagesCanvas');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-item');
    messageDiv.dataset.messageId = message.id;

    const randomX = Math.random() * 70;
    const randomY = Math.random() * 70;
    
    messageDiv.style.left = randomX + '%';
    messageDiv.style.top = randomY + '%';

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const canDelete = currentUser && message.user_id === currentUser.id;

    messageDiv.innerHTML = `
        <div class="message-content" style="background-color: ${randomColor};">
            <div class="message-author">${message.users_v3.username}</div>
            <div class="message-text">${message.message_text}</div>
            <div class="message-time">${new Date(message.created_at).toLocaleString()}</div>
            <div class="message-actions">
                <button class="thumbs-up-btn" onclick="toggleLike('${message.id}', this)" data-liked="false">
                    <svg class="thumbs-up-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="likes-count">${message.likes_count || 0}</span>
                </button>
            ${canDelete ? `<button class="delete-message" onclick="deleteMessage('${message.id}', this.parentNode.parentNode)">×</button>` : ''}
        </div>
    </div>
    `;
    canvas.appendChild(messageDiv);
}

async function toggleLike(messageId, buttonElement) {
    if (!currentUser) {
        alert('Please log in to like messages!');
        return;
    }

    try {
        // Check if user already liked this message
        const { data: existingLike, error: checkError } = await supabase
            .from('message_likes')
            .select('id')
            .eq('message_id', messageId)
            .eq('user_id', currentUser.id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw checkError;
        }

        const isLiked = !!existingLike;
        const likesCountSpan = buttonElement.querySelector('.likes-count');

        if (isLiked) {
            // Unlike: remove from message_likes
            const { error: deleteError } = await supabase
                .from('message_likes')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', currentUser.id);

            if (deleteError) throw deleteError;

            // Update UI immediately
            buttonElement.classList.remove('liked');
            buttonElement.dataset.liked = 'false';

        } else {
            // Like: add to message_likes
            const { error: insertError } = await supabase
                .from('message_likes')
                .insert([{
                    message_id: messageId,
                    user_id: currentUser.id
                }]);

            if (insertError) throw insertError;

            // Update UI immediately
            buttonElement.classList.add('liked');
            buttonElement.dataset.liked = 'true';
        }

        // Get actual count and update both DB and UI
        const { data: actualCount, error: countError } = await supabase
            .from('message_likes')
            .select('id', { count: 'exact' })
            .eq('message_id', messageId);

        if (countError) throw countError;

        const newCount = actualCount?.length || 0;

        // Update messages_v3 with correct count
        const { error: updateError } = await supabase
            .from('messages_v3')
            .update({ likes_count: newCount })
            .eq('id', messageId);

        if (updateError) throw updateError;

        // Update UI with actual count
        likesCountSpan.textContent = newCount;

    } catch (error) {
        console.error('Error toggling like:', error);
        alert('Failed to update like. Please try again.');
    }
}

async function postMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (!messageText) {
        alert('Please enter a message!');
        return;
    }

    if (messageText.length > 200) {
        alert('Message too long! Please keep it under 200 characters.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('messages_v3')
            .insert([{
                user_id: currentUser.id,
                message_text: messageText,
                likes_count: 0
            }])
            .select();

        if (error) throw error;

        messageInput.value = '';
        loadMessages();
    } catch (error) {
        console.error('Error posting message:', error);
        alert('Failed to post message. Please try again.');
    }
}

async function deleteMessage(messageId, messageElement) {
    if (confirm('Delete this message?')) {
        try {
            const { error } = await supabase
                .from('messages_v3')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            messageElement.remove();
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
}

// Function to check which messages the current user has liked (call this when loading messages)
async function checkUserLikes() {
    if (!currentUser) return;
    
    try {
        const { data: userLikes, error } = await supabase
            .from('message_likes')
            .select('message_id')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        // Update UI to show liked messages
        userLikes.forEach(like => {
            const messageElement = document.querySelector(`[data-message-id="${like.message_id}"]`);
            if (messageElement) {
                const thumbsUpBtn = messageElement.querySelector('.thumbs-up-btn');
                if (thumbsUpBtn) {
                    thumbsUpBtn.style.backgroundColor = '#4ECDC4';
                    thumbsUpBtn.dataset.liked = 'true';
                }
            }
        });
    } catch (error) {
        console.error('Error checking user likes:', error);
    }
}

// Leaderboard functions
async function loadLeaderboards() {
    try {
        const { data: users, error } = await supabase
            .from('users_v3')
            .select('username, pomodoro_count, tasks_completed, week_count_pomodoro, day_count_pomodoro, week_count_task, day_count_task')
            .order('pomodoro_count', { ascending: false });

        if (error) throw error;

        // Get active periods
        const activePomoPeriod = document.querySelector('.period-btn.active[data-type="pomodoro"]')?.dataset.period || 'cumulative';
        const activeTaskPeriod = document.querySelector('.period-btn.active[data-type="task"]')?.dataset.period || 'cumulative';

        // Pomodoro leaderboard
        const pomodoroBoard = document.getElementById('pomodoroLeaderboard');
        pomodoroBoard.innerHTML = '';
        
        let pomodoroSortedUsers = [...users];
        switch (activePomoPeriod) {
            case 'weekly':
                pomodoroSortedUsers.sort((a, b) => (b.week_count_pomodoro || 0) - (a.week_count_pomodoro || 0));
                break;
            case 'cumulative':
                pomodoroSortedUsers.sort((a, b) => b.pomodoro_count - a.pomodoro_count);
                break;
            default: // daily
                pomodoroSortedUsers.sort((a, b) => (b.day_count_pomodoro || 0) - (a.day_count_pomodoro || 0));
        }
        
        pomodoroSortedUsers.slice(0, 3).forEach((user, index) => { //.slice(0,3) show top 3 rank
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            let count = 0;
            switch (activePomoPeriod) {
                case 'weekly':
                    count = user.week_count_pomodoro || 0;
                    break;
                case 'cumulative':
                    count = user.pomodoro_count;
                    break;
                default://daily
                    count = user.day_count_pomodoro || 0;
            }
            item.innerHTML = `
                <span>${index + 1}. ${user.username}</span>
                <span>${count} ‪‪❤︎‬</span>
            `;
            pomodoroBoard.appendChild(item);
        });

        // Task leaderboard
        const taskBoard = document.getElementById('taskLeaderboard');
        taskBoard.innerHTML = '';
        
        let taskSortedUsers = [...users];
        switch (activeTaskPeriod) {
            case 'weekly':
                taskSortedUsers.sort((a, b) => (b.week_count_task || 0) - (a.week_count_task || 0));
                break;
            case 'cumulative':
                taskSortedUsers.sort((a, b) => b.tasks_completed - a.tasks_completed);
                break;
            default: // daily
                taskSortedUsers.sort((a, b) => (b.day_count_task || 0) - (a.day_count_task || 0));
        }
        
        taskSortedUsers.slice(0, 3).forEach((user, index) => { //.slice(0,3) show top 3 rank
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            let count = 0;
            switch (activeTaskPeriod) {
                case 'weekly':
                    count = user.week_count_task || 0;
                    break;
                case 'cumulative':
                    count = user.tasks_completed;
                    break;
                default: // daily
                    count = user.day_count_task || 0;
            }
            item.innerHTML = `
                <span>${index + 1}. ${user.username}</span>
                <span>${count} ★</span>
            `;
            taskBoard.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading leaderboards:', error);
    }
}

// Pomodoro timer functions

// Tab title display as pomodoro timer
function updateDocumentTitle() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const timeStr = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    document.title = `To-Do List ${timeStr}`;
}

// Timer display
function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    document.getElementById('timerDisplay').textContent = 
        `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
}

// Play notificaion sounds
function playNotificationSound(isBreak = false) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different tones for work vs break
        if (isBreak) {
            // Higher, more relaxing tone for break time
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        } else {
            // Lower, more focused tone for work time
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
        }
        
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Audio not supported, falling back to alert');
    }
}

async function startPomodoro() {
    if (isRunning) return;
    isRunning = true;
    pomodoroTimer = setInterval(async function() {
        remainingTime--;
        updateTimerDisplay();
        updateDocumentTitle();
        if (remainingTime <= 0) {
            clearInterval(pomodoroTimer);
            isRunning = false;
            
            if (!isBreakTime) {
                // Completed a pomodoro session
                try {
                    await supabase
                        .from('users_v3')
                        .update({ 
                            pomodoro_count: currentUser.pomodoro_count + 1,
                            week_count_pomodoro: currentUser.week_count_pomodoro + 1,
                            day_count_pomodoro: currentUser.day_count_pomodoro + 1
                        })
                        .eq('id', currentUser.id);
                    
                    currentUser.pomodoro_count++;
                    currentUser.week_count_pomodoro++;
                    currentUser.day_count_pomodoro++;
                    loadLeaderboards();
                } catch (error) {
                    console.error('Error updating pomodoro count:', error);
                }
            }
            
            isBreakTime = !isBreakTime;
            remainingTime = isBreakTime ? 5 * 60 : 25 * 60;
            
            // Play sound and show alert
            playNotificationSound(isBreakTime);
            alert(isBreakTime ? "Take a 5-minute break~" : "Back to work~");
            
            updateTimerDisplay();
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
    isBreakTime = false;
    remainingTime = 25 * 60;
    updateTimerDisplay();
    updateDocumentTitle();
}

// Music Player functions
function initializeMusicPlayer() {
    loadSongList();
    
    const audioPlayer = document.getElementById('audioPlayer');
    const canvas = document.getElementById('fftCanvas');
    
    if (canvas && audioPlayer) {
        canvas.width = canvas.offsetWidth;
        canvas.height = 100;
        
        setupAudioVisualization(audioPlayer, canvas);
        
        // Auto-play next song when current ends
        audioPlayer.addEventListener('ended', playNextSong);
    }
}

function loadSongList() {
    const songList = document.getElementById('songList');
    songList.innerHTML = '';
    
    musicFiles.forEach((file, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.index = index;
        
        // Parse song name from filename
        const filename = file.split('/').pop().replace('.mp3', '');
        const parts = filename.split('_by');
        const songName = parts[0].replace(/_/g, ' ');
        const artist = parts[1] ? parts[1].replace(/([A-Z])/g, ' $1').trim() : 'Unknown Artist';
        
        songItem.innerHTML = `
            <div><strong>${songName}</strong></div>
            <div style="font-size: 12px; opacity: 0.8;">by ${artist}</div>
        `;
        
        songItem.addEventListener('click', () => playSong(index));
        songList.appendChild(songItem);
    });
}

function playSong(index) {
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlaying = document.getElementById('nowPlaying');
    
    currentSongIndex = index;
    audioPlayer.src = musicFiles[index];
    audioPlayer.load();
    audioPlayer.play();
    
    // Update now playing display
    const filename = musicFiles[index].split('/').pop().replace('.mp3', '');
    const parts = filename.split('_by');
    const songName = parts[0].replace(/_/g, ' ');
    const artist = parts[1] ? parts[1].replace(/([A-Z])/g, ' $1').trim() : 'Unknown Artist';
    
    nowPlaying.textContent = `♫ ${songName} - ${artist}`;
    
    // Update song list UI
    document.querySelectorAll('.song-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });
}

function playNextSong() {
    currentSongIndex = (currentSongIndex + 1) % musicFiles.length;
    playSong(currentSongIndex);
}

function setupAudioVisualization(audioPlayer, canvas) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioPlayer);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const ctx = canvas.getContext('2d');
        
        function drawVisualization() {
            requestAnimationFrame(drawVisualization);
            
            analyser.getByteFrequencyData(dataArray);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                
                const hue = (i / bufferLength) * 360;
                ctx.fillStyle = `hsl(${hue}, 50%, 60%)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        audioPlayer.addEventListener('play', () => {
            audioContext.resume();
            drawVisualization();
        });
        
    } catch (error) {
        console.error('Error setting up audio visualization:', error);
    }
}

// Affirmation functions
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


// automatically reset weekly and monthly count

//async function checkCalendarResets() {
//    try {
        // Call the PostgreSQL function to perform calendar-based resets
//        const { data, error } = await supabase.rpc('perform_calendar_resets'); //supa base does not have this function, need to fix
        
//        if (error) {
//            console.error('Error checking calendar resets:', error);
//            return;
//        }
        
        // Log any resets that occurred
//        if (data && data.length > 0) {
//            data.forEach(result => {
//                console.log('Reset result:', result.reset_performed);
//            });
//        }
        
//    } catch (error) {
//        console.error('Error in checkCalendarResets:', error);
//    }
//}
