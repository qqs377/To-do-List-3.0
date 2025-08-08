// Supabase Configuration
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
    loadUserTags();
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
