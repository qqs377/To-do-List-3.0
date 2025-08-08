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

    const colors = ['#FF6B6B', '#77DD77', '#45B7D1', '#f7ac3b', '#DDA0DD'];
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
