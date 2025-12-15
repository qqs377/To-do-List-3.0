// LeetCode tracking functionality

// Weights for difficulty levels
const DIFFICULTY_WEIGHTS = {
    easy: 1,
    medium: 2,
    hard: 3
};

// Submit LeetCode progress - uses currentUser from global.js
async function submitLeetCode() {
    // Check if user is logged in
    if (!currentUser || !currentUser.id) {
        alert('Please log in first!');
        return;
    }

    const easyCount = parseInt(document.getElementById('easyInput').value) || 0;
    const mediumCount = parseInt(document.getElementById('mediumInput').value) || 0;
    const hardCount = parseInt(document.getElementById('hardInput').value) || 0;

    if (easyCount === 0 && mediumCount === 0 && hardCount === 0) {
        alert('Please enter at least one problem count!');
        return;
    }

    // Calculate weighted score
    const score = (easyCount * DIFFICULTY_WEIGHTS.easy) + 
                  (mediumCount * DIFFICULTY_WEIGHTS.medium) + 
                  (hardCount * DIFFICULTY_WEIGHTS.hard);

    try {
        // Update user's LeetCode stats in users_v3
        const { data, error } = await supabase
            .from('users_v3')
            .update({
                leetcode_easy: (currentUser.leetcode_easy || 0) + easyCount,
                leetcode_medium: (currentUser.leetcode_medium || 0) + mediumCount,
                leetcode_hard: (currentUser.leetcode_hard || 0) + hardCount,
                leetcode_total_score: (currentUser.leetcode_total_score || 0) + score,
                leetcode_day_score: (currentUser.leetcode_day_score || 0) + score,
                leetcode_week_score: (currentUser.leetcode_week_score || 0) + score
            })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        // Update local currentUser object
        currentUser.leetcode_easy = data.leetcode_easy;
        currentUser.leetcode_medium = data.leetcode_medium;
        currentUser.leetcode_hard = data.leetcode_hard;
        currentUser.leetcode_total_score = data.leetcode_total_score;
        currentUser.leetcode_day_score = data.leetcode_day_score;
        currentUser.leetcode_week_score = data.leetcode_week_score;

        // Clear inputs
        document.getElementById('easyInput').value = '';
        document.getElementById('mediumInput').value = '';
        document.getElementById('hardInput').value = '';

        // Reload leaderboard
        await loadLeetCodeLeaderboard();
        
        alert(`Successfully logged!\n\nEasy: ${easyCount}\nMedium: ${mediumCount}\nHard: ${hardCount}\n\nTotal Score: +${score} points`);
    } catch (error) {
        console.error('Error submitting LeetCode progress:', error);
        alert('Failed to submit progress. Please try again.');
    }
}

// Load LeetCode leaderboard
async function loadLeetCodeLeaderboard() {
    try {
        const { data: users, error } = await supabase
            .from('users_v3')
            .select('username, leetcode_easy, leetcode_medium, leetcode_hard, leetcode_total_score, leetcode_day_score, leetcode_week_score')
            .order('leetcode_total_score', { ascending: false });

        if (error) throw error;

        // Get active period
        const activePeriod = document.querySelector('.period-btn.active[data-type="leetcode"]')?.dataset.period || 'cumulative';

        const leaderboard = document.getElementById('leetcodeLeaderboard');
        leaderboard.innerHTML = '';

        // Sort users based on active period
        let sortedUsers = [...users];
        switch (activePeriod) {
            case 'daily':
                sortedUsers.sort((a, b) => (b.leetcode_day_score || 0) - (a.leetcode_day_score || 0));
                break;
            case 'weekly':
                sortedUsers.sort((a, b) => (b.leetcode_week_score || 0) - (a.leetcode_week_score || 0));
                break;
            default: // cumulative
                sortedUsers.sort((a, b) => (b.leetcode_total_score || 0) - (a.leetcode_total_score || 0));
        }

        // Filter users who have done at least one problem
        const activeUsers = sortedUsers.filter(user => {
            switch (activePeriod) {
                case 'daily':
                    return (user.leetcode_day_score || 0) > 0;
                case 'weekly':
                    return (user.leetcode_week_score || 0) > 0;
                default:
                    return (user.leetcode_total_score || 0) > 0;
            }
        });

        // Display top 5 users
        activeUsers.slice(0, 5).forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            // Highlight current user
            if (currentUser && user.username === currentUser.username) {
                item.style.background = 'rgba(255, 255, 255, 0.2)';
                item.style.fontWeight = 'bold';
            }
            
            let score = 0;
            let breakdown = '';
            
            switch (activePeriod) {
                case 'daily':
                    score = user.leetcode_day_score || 0;
                    break;
                case 'weekly':
                    score = user.leetcode_week_score || 0;
                    break;
                default: // cumulative
                    score = user.leetcode_total_score || 0;
                    breakdown = ` <span style="font-size: 11px; opacity: 0.8;">(E:${user.leetcode_easy || 0} M:${user.leetcode_medium || 0} H:${user.leetcode_hard || 0})</span>`;
            }

            item.innerHTML = `
                <span>${index + 1}. ${user.username}${breakdown}</span>
                <span>${score} ❆</span>
            `;
            leaderboard.appendChild(item);
        });

        if (activeUsers.length === 0) {
            leaderboard.innerHTML = '<div class="leaderboard-item">No data yet. Be the first!</div>';
        }
    } catch (error) {
        console.error('Error loading LeetCode leaderboard:', error);
        const leaderboard = document.getElementById('leetcodeLeaderboard');
        leaderboard.innerHTML = '<div class="leaderboard-item">Error loading leaderboard</div>';
    }
}

// Reset daily scores (call this function daily via a cron job or manually)
async function resetDailyLeetCodeScores() {
    if (!confirm('Are you sure you want to reset all daily LeetCode scores?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('users_v3')
            .update({ leetcode_day_score: 0 })
            .neq('id', 0); // Update all records

        if (error) throw error;
        
        // Update local user if logged in
        if (currentUser) {
            currentUser.leetcode_day_score = 0;
        }
        
        console.log('Daily LeetCode scores reset successfully');
        alert('Daily LeetCode scores have been reset!');
        await loadLeetCodeLeaderboard();
    } catch (error) {
        console.error('Error resetting daily scores:', error);
        alert('Failed to reset daily scores. Please try again.');
    }
}

// Reset weekly scores (call this function weekly via a cron job or manually)
async function resetWeeklyLeetCodeScores() {
    if (!confirm('Are you sure you want to reset all weekly LeetCode scores?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('users_v3')
            .update({ leetcode_week_score: 0 })
            .neq('id', 0); // Update all records

        if (error) throw error;
        
        // Update local user if logged in
        if (currentUser) {
            currentUser.leetcode_week_score = 0;
        }
        
        console.log('Weekly LeetCode scores reset successfully');
        alert('Weekly LeetCode scores have been reset!');
        await loadLeetCodeLeaderboard();
    } catch (error) {
        console.error('Error resetting weekly scores:', error);
        alert('Failed to reset weekly scores. Please try again.');
    }
}

// Initialize LeetCode leaderboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up period toggle buttons for LeetCode
    document.querySelectorAll('.period-btn[data-type="leetcode"]').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from siblings
            this.parentElement.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Reload leaderboard
            loadLeetCodeLeaderboard();
        });
    });
});
