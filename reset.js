function setButtonsDisabled(disabled) {
    document.getElementById('resetDailyBtn').disabled = disabled;
    document.getElementById('resetWeeklyBtn').disabled = disabled;
}

// Reset daily counts function
async function resetDailyCounts() {
    if (!confirm('Are you sure you want to reset daily counts for ALL users? This action cannot be undone.')) {
        return;
    }

    setButtonsDisabled(true);
    showStatus('Resetting daily counts...', 'loading');

    try {
        const { data, error } = await supabase
            .from('users_v3')
            .update({ 
                day_count_pomodoro: 0,
                day_count_task: 0
            })
            .neq('id', null); // This ensures we update all rows

        if (error) {
            throw error;
        }

        showStatus(`Successfully reset daily counts for ${data?.length || 'all'} users!`, 'success');
    } catch (error) {
        console.error('Error resetting daily counts:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        setButtonsDisabled(false);
    }
}

// Reset weekly counts function
async function resetWeeklyCounts() {
    if (!confirm('Are you sure you want to reset weekly counts for ALL users? This action cannot be undone.')) {
        return;
    }

    setButtonsDisabled(true);
    showStatus('Resetting weekly counts...', 'loading');

    try {
        const { data, error } = await supabase
            .from('users_v3')
            .update({ 
                week_count_pomodoro: 0,
                week_count_task: 0
            })
            .neq('id', null); // This ensures we update all rows

        if (error) {
            throw error;
        }

        showStatus(`Successfully reset weekly counts for ${data?.length || 'all'} users!`, 'success');
    } catch (error) {
        console.error('Error resetting weekly counts:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        setButtonsDisabled(false);
    }
}
