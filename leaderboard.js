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
