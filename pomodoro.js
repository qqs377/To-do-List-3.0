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
