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
