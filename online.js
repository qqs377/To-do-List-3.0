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
