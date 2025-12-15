// LeetCode tracking functionality

// Weights for difficulty levels
const DIFFICULTY_WEIGHTS = {
    easy: 1,
    medium: 2,
    hard: 3
};

// Submit LeetCode progress
async function submitLeetCode() {
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
        // Check if user already has a record
        const { data: existing, error: fetchError } = await supabase
            .from('LeetCodeRank')
            .select('*')
            .eq('username', currentUsername)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existing) {
            // Update existing record - add to existing counts
            const { error: updateError } = await supabase
                .from('LeetCodeRank')
                .update({
                    easy_count: existing.easy_count + easyCount,
                    medium_count: existing.medium_count + mediumCount,
                    hard_count: existing.hard_count + hardCount,
                    total_score: existing.total_score + score,
                    day_score: existing.day_score + score,
                    week_score: existing.week_score + score,
                    updated_at: new Date().toISOString()
                })
                .eq('username', currentUsername);

            if (updateError) throw updateError;
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('LeetCodeRank')
                .insert([{
                    username: currentUsername,
                    easy_count: easyCount,
                    medium_count: mediumCount,
                    hard_count: hardCount,
                    total_score: score,
                    day_score: score,
                    week_score: score
                }]);

            if (insertError) throw insertError;
        }

        // Clear inputs
        document.getElementById('easyInput').value = '';
        document.getElementById('mediumInput').value = '';
        document.getElementById('hardInput').value = '';

        // Reload leaderboard
        await loadLeetCodeLeaderboard();
        
        alert(`Successfully logged: ${easyCount} Easy, ${mediumCount} Medium, ${hardCount} Hard (Score: ${score})`);
    } catch (error) {
        console.error('Error submitting LeetCode progress:', error);
        alert('Failed to submit progress. Please try again.');
    }
}

// Load LeetCode leaderboard
async function loadLeetCodeLeaderboard() {
    try {
        const { data: users, error } = await supabase
            .from('LeetCodeRank')
            .select('*')
            .order('total_score', { ascending: false });

        if (error) throw error;

        // Get active period
        const activePeriod = document.querySelector('.period-btn.active[data-type="leetcode"]')?.dataset.period || 'cumulative';

        const leaderboard = document.getElementById('leetcodeLeaderboard');
        leaderboard.innerHTML = '';

        // Sort users based on active period
        let sortedUsers = [...users];
        switch (activePeriod) {
            case 'daily':
                sortedUsers.sort((a, b) => (b.day_score || 0) - (a.day_score || 0));
                break;
            case 'weekly':
                sortedUsers.sort((a, b) => (b.week_score || 0) - (a.week_score || 0));
                break;
            default: // cumulative
                sortedUsers.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
        }

        // Display top 5 users
        sortedUsers.slice(0, 5).forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            let score = 0;
            let breakdown = '';
            switch (activePeriod) {
                case 'daily':
                    score = user.day_score || 0;
                    break;
                case 'weekly':
                    score = user.week_score || 0;
                    break;
                default: // cumulative
                    score = user.total_score || 0;
                    breakdown = ` (E: ${user.easy_count}, M: ${user.medium_count}, H: ${user.hard_count})`;
            }

            item.innerHTML = `
                <span>${index + 1}. ${user.username}${breakdown}</span>
                <span>${score} 🏆</span>
            `;
            leaderboard.appendChild(item);
        });

        if (sortedUsers.length === 0) {
            leaderboard.innerHTML = '<div class="leaderboard-item">No data yet. Be the first!</div>';
        }
    } catch (error) {
        console.error('Error loading LeetCode leaderboard:', error);
    }
}

// Reset daily scores (call this function daily via a cron job or manually)
async function resetDailyLeetCodeScores() {
    try {
        const { error } = await supabase
            .from('LeetCodeRank')
            .update({ day_score: 0 })
            .neq('id', 0); // Update all records

        if (error) throw error;
        console.log('Daily LeetCode scores reset successfully');
        await loadLeetCodeLeaderboard();
    } catch (error) {
        console.error('Error resetting daily scores:', error);
    }
}

// Reset weekly scores (call this function weekly via a cron job or manually)
async function resetWeeklyLeetCodeScores() {
    try {
        const { error } = await supabase
            .from('LeetCodeRank')
            .update({ week_score: 0 })
            .neq('id', 0); // Update all records

        if (error) throw error;
        console.log('Weekly LeetCode scores reset successfully');
        await loadLeetCodeLeaderboard();
    } catch (error) {
        console.error('Error resetting weekly scores:', error);
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
