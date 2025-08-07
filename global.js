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
                
                // IMPORTANT: Initialize tags immediately after login
                await initializeTags();
                
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

            // IMPORTANT: Initialize tags for new user
            await initializeTags();
            
            showMainApp();
        }
    } catch (error) {
        console.error('Auth error:', error);
        errorElement.textContent = 'Authentication failed. Please try again.';
    }
}

// Fixed showMainApp function
async function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = currentUser.username;
    
    // Initialize app in correct order
    setRandomBackground();
    
    try {
        // Load user-specific data first
        await loadUserTags(); // Make sure tags are loaded
        await loadTasks();     // Then load tasks (which depend on tags)
        
        // Load other data
        await loadMessages();
        await loadLeaderboards();
        await loadStudyingWith();
        await loadUserFilter();
        
        // Initialize non-async components
        initializeMusicPlayer();
        updateTimerDisplay();
        
        console.log('App initialized successfully for user:', currentUser.username);
        console.log('User tags loaded:', window.userTags);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error loading app data. Please refresh and try again.');
    }
}

// Add this function to properly initialize tags
async function initializeTags() {
    if (!currentUser) {
        console.error('Cannot initialize tags: no current user');
        return;
    }
    
    try {
        console.log('Initializing tags for user:', currentUser.username);
        await loadUserTags();
        console.log('Tags initialized:', window.userTags);
        
        // Validate that all default tags exist
        if (!window.userTags || window.userTags.length === 0) {
            console.log('No tags found, creating default tags...');
            await createDefaultTags();
        }
        
    } catch (error) {
        console.error('Error initializing tags:', error);
        throw error; // Re-throw to handle in calling function
    }
}

// Add this function to create default tags if they don't exist
async function createDefaultTags() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD'];
    const defaultNames = {
        '#FF6B6B': 'Priority',
        '#4ECDC4': 'Work',
        '#45B7D1': 'Personal',
        '#FFEAA7': 'Learning',
        '#DDA0DD': 'Fun'
    };
    
    try {
        const defaultTags = colors.map(color => ({
            user_id: currentUser.id,
            color: color,
            tag_name: defaultNames[color]
        }));
        
        const { data, error } = await supabase
            .from('tags_v3')
            .insert(defaultTags)
            .select();
            
        if (error) throw error;
        
        console.log('Default tags created:', data);
        window.userTags = data;
        
    } catch (error) {
        console.error('Error creating default tags:', error);
        throw error;
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

// Add these debugging functions to help identify the 401 issue

// Debug function to check authentication state
function debugAuthState() {
    console.log('=== AUTHENTICATION STATE DEBUG ===');
    console.log('currentUser:', currentUser);
    console.log('window.userTags:', window.userTags);
    console.log('window.allTasks:', window.allTasks);
    
    if (currentUser) {
        console.log('User ID:', currentUser.id);
        console.log('Username:', currentUser.username);
    } else {
        console.error('❌ No current user set!');
    }
    
    if (window.userTags) {
        console.log('User tags count:', window.userTags.length);
        window.userTags.forEach(tag => {
            console.log(`  Tag: ${tag.tag_name} (${tag.color}) - Owner: ${tag.user_id}`);
        });
    } else {
        console.error('❌ No user tags loaded!');
    }
    
    console.log('=== END DEBUG ===');
}

// Function to test Supabase connection and permissions
async function testSupabaseConnection() {
    console.log('=== TESTING SUPABASE CONNECTION ===');
    
    if (!currentUser) {
        console.error('❌ Cannot test - no current user');
        return;
    }
    
    try {
        // Test 1: Can we read our own user data?
        console.log('Test 1: Reading user data...');
        const { data: userData, error: userError } = await supabase
            .from('users_v3')
            .select('*')
            .eq('id', currentUser.id);
            
        if (userError) {
            console.error('❌ User data read failed:', userError);
        } else {
            console.log('✅ User data read successful');
        }
        
        // Test 2: Can we read our own tags?
        console.log('Test 2: Reading tags...');
        const { data: tagData, error: tagError } = await supabase
            .from('tags_v3')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (tagError) {
            console.error('❌ Tag read failed:', tagError);
        } else {
            console.log('✅ Tag read successful, count:', tagData?.length || 0);
        }
        
        // Test 3: Can we read our own tasks?
        console.log('Test 3: Reading tasks...');
        const { data: taskData, error: taskError } = await supabase
            .from('tasks_v3')
            .select('*')
            .eq('user_id', currentUser.id)
            .limit(1);
            
        if (taskError) {
            console.error('❌ Task read failed:', taskError);
        } else {
            console.log('✅ Task read successful');
        }
        
        // Test 4: Can we create a test tag?
        console.log('Test 4: Creating test tag...');
        const { data: testTag, error: createError } = await supabase
            .from('tags_v3')
            .insert([{
                user_id: currentUser.id,
                color: '#000000',
                tag_name: 'TEST_TAG_DELETE_ME'
            }])
            .select()
            .single();
            
        if (createError) {
            console.error('❌ Test tag creation failed:', createError);
        } else {
            console.log('✅ Test tag created successfully');
            
            // Clean up test tag
            await supabase
                .from('tags_v3')
                .delete()
                .eq('id', testTag.id);
            console.log('✅ Test tag cleaned up');
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
    
    console.log('=== END CONNECTION TEST ===');
}

// Add event listener to call these debug functions
// You can call these from browser console or add temporary buttons
window.debugAuthState = debugAuthState;
window.testSupabaseConnection = testSupabaseConnection;

// Improved error handling for Supabase requests
function handleSupabaseError(error, operation) {
    console.error(`Supabase error in ${operation}:`, error);
    
    if (error.message?.includes('JWT')) {
        console.error('❌ JWT/Authentication issue detected');
        alert('Authentication expired. Please refresh the page and log in again.');
        return;
    }
    
    if (error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('❌ Permission/Policy issue detected');
        console.log('Current user:', currentUser);
        alert('Permission denied. Please refresh the page and try again.');
        return;
    }
    
    if (error.code === '42501') {
        console.error('❌ Insufficient privileges');
        alert('Access denied. Please refresh and log in again.');
        return;
    }
    
    console.error('❌ Generic error:', error);
}

// Modified loadUserTags with better error handling
async function loadUserTags() {
    if (!currentUser) {
        console.error('Cannot load tags: no current user');
        return;
    }
    
    try {
        console.log('Loading tags for user:', currentUser.id);
        
        const { data: tags, error } = await supabase
            .from('tags_v3')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) {
            handleSupabaseError(error, 'loadUserTags');
            throw error;
        }

        console.log('Tags loaded successfully:', tags);

        // Create default tags if they don't exist
        const existingColors = tags.map(tag => tag.color);
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD'];
        const missingColors = colors.filter(color => !existingColors.includes(color));
        
        if (missingColors.length > 0) {
            console.log('Creating missing default tags:', missingColors);
            await createDefaultTags();
            return loadUserTags(); // Reload after creating defaults
        }
        
        window.userTags = tags;
        return tags;
    } catch (error) {
        console.error('Error loading user tags:', error);
        window.userTags = null;
        throw error;
    }
}
