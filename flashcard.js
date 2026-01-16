// Flashcard System with SM-2 Algorithm
let currentFlashcardFilter = 'all'; // 'all', 'due', 'new'
let flashcardDeck = [];
let currentCardIndex = 0;
let isFlipped = false;
let studyMode = false;

// Initialize flashcard system - called after DOM loads and user logs in
async function initializeFlashcards() {
    await loadFlashcards();
    await loadFlashcardStats();
    await ensureUserFlashcardStats();
    setupFlashcardEventListeners();
}

// Setup all event listeners
function setupFlashcardEventListeners() {
    // Create flashcard button
    const createBtn = document.getElementById('createFlashcardBtn');
    if (createBtn) {
        createBtn.addEventListener('click', createFlashcard);
    }
    
    // Study buttons
    document.querySelectorAll('.study-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            startStudySession(filter);
        });
    });
    
    // Exit study button
    const exitBtn = document.getElementById('exitStudyBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', exitStudySession);
    }
    
    // Study card flip
    const studyCard = document.getElementById('studyCard');
    if (studyCard) {
        studyCard.addEventListener('click', flipStudyCard);
    }
    
    // Rating buttons
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            rateCard(rating);
        });
    });
    
    // Leaderboard period buttons
    document.querySelectorAll('.flashcard-period-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const period = this.getAttribute('data-period');
            const container = this.closest('.flashcard-leaderboard');
            
            // Update active state
            container.querySelectorAll('.flashcard-period-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            // Show/hide leaderboards
            container.querySelectorAll('[id^="flashcardLeaderboard-"]').forEach(lb => {
                lb.style.display = 'none';
            });
            
            const targetLb = container.querySelector(`#flashcardLeaderboard-${period}`);
            if (targetLb) {
                targetLb.style.display = 'block';
            }
            
            await updateFlashcardLeaderboard(period);
        });
    });
}

// Ensure user has stats entry
async function ensureUserFlashcardStats() {
    try {
        const { data: existing } = await supabaseClient
            .from('flashcard_stats')
            .select('*')
            .eq('username', currentUser.username)
            .single();
            
        if (!existing) {
            await supabaseClient
                .from('flashcard_stats')
                .insert([{
                    username: currentUser.username,
                    cards_studied_today: 0,
                    cards_studied_week: 0,
                    cards_studied_total: 0,
                    cards_reviewed_today: 0,
                    cards_reviewed_week: 0,
                    cards_reviewed_total: 0,
                    last_study_date: new Date().toISOString().split('T')[0]
                }]);
        }
    } catch (error) {
        console.error('Error ensuring flashcard stats:', error);
    }
}

// Load all flashcards
async function loadFlashcards() {
    try {
        const { data: cards, error } = await supabaseClient
            .from('flashcards')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        flashcardDeck = cards || [];
        await displayFlashcardLibrary();
    } catch (error) {
        console.error('Error loading flashcards:', error);
    }
}

// Display flashcard library
async function displayFlashcardLibrary() {
    const container = document.getElementById('flashcardLibrary');
    if (!container) return;
    
    if (flashcardDeck.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.7;">No flashcards yet. Create your first card!</p>';
        return;
    }
    
    // Get user progress for all cards
    const { data: progressData } = await supabaseClient
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', currentUser.id);
    
    const progressMap = {};
    if (progressData) {
        progressData.forEach(p => {
            progressMap[p.flashcard_id] = p;
        });
    }
    
    let html = '<div class="flashcard-grid">';
    
    flashcardDeck.forEach(card => {
        const progress = progressMap[card.id];
        const isDue = progress ? new Date(progress.next_review_date) <= new Date() : true;
        const isNew = !progress || progress.repetitions === 0;
        
        let statusBadge = '';
        if (isNew) {
            statusBadge = '<span class="card-status new">New</span>';
        } else if (isDue) {
            statusBadge = '<span class="card-status due">Due</span>';
        } else {
            statusBadge = '<span class="card-status learned">Learned</span>';
        }
        
        html += `
            <div class="flashcard-mini" data-card-id="${card.id}">
                ${statusBadge}
                <div class="card-mini-front">${escapeHtml(card.front)}</div>
                <div class="card-mini-meta">
                    <span>By ${escapeHtml(card.created_by)}</span>
                    ${progress ? `<span>Reviews: ${progress.total_reviews}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add double-click listeners to cards
    document.querySelectorAll('.flashcard-mini').forEach(cardEl => {
        cardEl.addEventListener('dblclick', function() {
            const cardId = parseInt(this.getAttribute('data-card-id'));
            editFlashcard(cardId);
        });
    });
    
    updateFlashcardCounts(progressMap);
}

// Update card counts
function updateFlashcardCounts(progressMap) {
    const totalCards = flashcardDeck.length;
    let dueCards = 0;
    let newCards = 0;
    
    flashcardDeck.forEach(card => {
        const progress = progressMap[card.id];
        if (!progress || progress.repetitions === 0) {
            newCards++;
            dueCards++;
        } else if (new Date(progress.next_review_date) <= new Date()) {
            dueCards++;
        }
    });
    
    const totalEl = document.getElementById('totalCardsCount');
    const dueEl = document.getElementById('dueCardsCount');
    const newEl = document.getElementById('newCardsCount');
    
    if (totalEl) totalEl.textContent = totalCards;
    if (dueEl) dueEl.textContent = dueCards;
    if (newEl) newEl.textContent = newCards;
}

// Create new flashcard
async function createFlashcard() {
    const frontInput = document.getElementById('cardFrontInput');
    const backInput = document.getElementById('cardBackInput');
    
    if (!frontInput || !backInput) return;
    
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    
    if (!front || !back) {
        alert('Please enter both front and back of the card');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('flashcards')
            .insert([{
                front: front,
                back: back,
                created_by: currentUser.username
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        frontInput.value = '';
        backInput.value = '';
        
        await loadFlashcards();
    } catch (error) {
        console.error('Error creating flashcard:', error);
        alert('Failed to create flashcard');
    }
}

// Edit flashcard
async function editFlashcard(cardId) {
    const card = flashcardDeck.find(c => c.id === cardId);
    if (!card) return;
    
    const newFront = prompt('Edit front:', card.front);
    if (newFront === null) return;
    
    const newBack = prompt('Edit back:', card.back);
    if (newBack === null) return;
    
    try {
        const { error } = await supabaseClient
            .from('flashcards')
            .update({
                front: newFront.trim(),
                back: newBack.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', cardId);
            
        if (error) throw error;
        
        await loadFlashcards();
    } catch (error) {
        console.error('Error updating flashcard:', error);
        alert('Failed to update flashcard');
    }
}

// Start study session
async function startStudySession(filter = 'due') {
    currentFlashcardFilter = filter;
    studyMode = true;
    
    // Get cards based on filter
    const { data: progressData } = await supabaseClient
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', currentUser.id);
    
    const progressMap = {};
    if (progressData) {
        progressData.forEach(p => {
            progressMap[p.flashcard_id] = p;
        });
    }
    
    // Filter cards
    let studyCards = flashcardDeck.filter(card => {
        const progress = progressMap[card.id];
        
        if (filter === 'all') return true;
        if (filter === 'new') return !progress || progress.repetitions === 0;
        if (filter === 'due') {
            if (!progress || progress.repetitions === 0) return true;
            return new Date(progress.next_review_date) <= new Date();
        }
        return false;
    });
    
    if (studyCards.length === 0) {
        alert('No cards to study with this filter!');
        return;
    }
    
    // Shuffle cards
    studyCards = studyCards.sort(() => Math.random() - 0.5);
    flashcardDeck = studyCards;
    currentCardIndex = 0;
    
    document.getElementById('flashcardLibrarySection').style.display = 'none';
    document.getElementById('flashcardStudySection').style.display = 'block';
    
    showCurrentCard();
}

// Show current card
async function showCurrentCard() {
    if (currentCardIndex >= flashcardDeck.length) {
        endStudySession();
        return;
    }
    
    const card = flashcardDeck[currentCardIndex];
    isFlipped = false;
    
    document.getElementById('studyCardFront').textContent = card.front;
    document.getElementById('studyCardBack').textContent = card.back;
    document.getElementById('studyCard').classList.remove('flipped');
    document.getElementById('studyProgress').textContent = `Card ${currentCardIndex + 1} of ${flashcardDeck.length}`;
    document.getElementById('ratingButtons').style.display = 'none';
}

// Flip card
function flipStudyCard() {
    if (!studyMode) return;
    
    isFlipped = !isFlipped;
    const card = document.getElementById('studyCard');
    
    if (isFlipped) {
        card.classList.add('flipped');
        document.getElementById('ratingButtons').style.display = 'flex';
    } else {
        card.classList.remove('flipped');
        document.getElementById('ratingButtons').style.display = 'none';
    }
}

// Rate card using SM-2 algorithm
async function rateCard(rating) {
    if (!isFlipped) {
        alert('Please flip the card first!');
        return;
    }
    
    const card = flashcardDeck[currentCardIndex];
    
    try {
        // Get or create progress
        let { data: progress } = await supabaseClient
            .from('user_flashcard_progress')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('flashcard_id', card.id)
            .single();
        
        const isNewCard = !progress || progress.repetitions === 0;
        
        if (!progress) {
            progress = {
                user_id: currentUser.id,
                flashcard_id: card.id,
                easiness_factor: 2.5,
                interval: 0,
                repetitions: 0,
                next_review_date: new Date().toISOString(),
                total_reviews: 0
            };
        }
        
        // SM-2 Algorithm
        const oldEF = progress.easiness_factor;
        let newEF = oldEF + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
        
        if (newEF < 1.3) newEF = 1.3;
        
        let newInterval = 0;
        let newRepetitions = progress.repetitions;
        
        if (rating < 2) {
            // Failed
            newRepetitions = 0;
            newInterval = 0;
        } else {
            // Passed
            if (newRepetitions === 0) {
                newInterval = 1;
            } else if (newRepetitions === 1) {
                newInterval = 6;
            } else {
                newInterval = Math.round(progress.interval * newEF);
            }
            newRepetitions += 1;
        }
        
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
        
        // Update progress
        const updateData = {
            easiness_factor: newEF,
            interval: newInterval,
            repetitions: newRepetitions,
            next_review_date: nextReviewDate.toISOString(),
            last_reviewed: new Date().toISOString(),
            total_reviews: progress.total_reviews + 1
        };
        
        if (progress.id) {
            await supabaseClient
                .from('user_flashcard_progress')
                .update(updateData)
                .eq('id', progress.id);
        } else {
            await supabaseClient
                .from('user_flashcard_progress')
                .insert([{ ...updateData, user_id: currentUser.id, flashcard_id: card.id }]);
        }
        
        // Update stats
        await updateFlashcardStatsAfterReview(isNewCard);
        
        // Next card
        currentCardIndex++;
        showCurrentCard();
        
    } catch (error) {
        console.error('Error rating card:', error);
        alert('Failed to save rating');
    }
}

// Update stats after review
async function updateFlashcardStatsAfterReview(isNewCard) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: stats } = await supabaseClient
            .from('flashcard_stats')
            .select('*')
            .eq('username', currentUser.username)
            .single();
        
        if (!stats) return;
        
        const updates = {
            cards_reviewed_total: stats.cards_reviewed_total + 1,
            cards_reviewed_week: stats.cards_reviewed_week + 1,
            last_study_date: today
        };
        
        // Reset daily count if new day
        if (stats.last_study_date !== today) {
            updates.cards_reviewed_today = 1;
            updates.cards_studied_today = isNewCard ? 1 : 0;
        } else {
            updates.cards_reviewed_today = stats.cards_reviewed_today + 1;
            if (isNewCard) {
                updates.cards_studied_today = stats.cards_studied_today + 1;
            }
        }
        
        if (isNewCard) {
            updates.cards_studied_total = stats.cards_studied_total + 1;
            updates.cards_studied_week = stats.cards_studied_week + 1;
        }
        
        await supabaseClient
            .from('flashcard_stats')
            .update(updates)
            .eq('username', currentUser.username);
            
        await loadFlashcardLeaderboard();
        
    } catch (error) {
        console.error('Error updating flashcard stats:', error);
    }
}

// End study session
function endStudySession() {
    studyMode = false;
    document.getElementById('flashcardLibrarySection').style.display = 'block';
    document.getElementById('flashcardStudySection').style.display = 'none';
    
    alert('Study session complete! Great work! 🎉');
    loadFlashcards();
}

// Exit study session
function exitStudySession() {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
        endStudySession();
    }
}

// Load flashcard stats leaderboard
async function loadFlashcardStats() {
    try {
        const { data, error } = await supabaseClient
            .from('flashcard_stats')
            .select('*')
            .order('cards_studied_total', { ascending: false });
            
        if (error) throw error;
        
        // Display stats (you can expand this)
        console.log('Flashcard stats loaded:', data);
        
    } catch (error) {
        console.error('Error loading flashcard stats:', error);
    }
}

// Load flashcard leaderboard (COMBINED: studied + reviewed)
async function loadFlashcardLeaderboard() {
    const periods = ['daily', 'weekly', 'cumulative'];
    
    for (const period of periods) {
        await updateFlashcardLeaderboard(period);
    }
}

async function updateFlashcardLeaderboard(period) {
    try {
        const { data, error } = await supabaseClient
            .from('flashcard_stats')
            .select('*')
            .order('cards_reviewed_total', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        const containerId = `flashcardLeaderboard-${period}`;
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="leaderboard-empty">No data yet</div>';
            return;
        }
        
        // Calculate combined count (studied + reviewed) for each user
        let sortedData = data.map(user => {
            let combinedCount = 0;
            
            if (period === 'daily') {
                combinedCount = (user.cards_studied_today || 0) + (user.cards_reviewed_today || 0);
            } else if (period === 'weekly') {
                combinedCount = (user.cards_studied_week || 0) + (user.cards_reviewed_week || 0);
            } else { // cumulative
                combinedCount = (user.cards_studied_total || 0) + (user.cards_reviewed_total || 0);
            }
            
            return {
                ...user,
                combinedCount: combinedCount
            };
        });
        
        // Sort by combined count
        sortedData.sort((a, b) => b.combinedCount - a.combinedCount);
        
        let html = '';
        sortedData.forEach((user, index) => {
            const isCurrentUser = user.username === currentUser.username;
            
            html += `
                <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                    <span class="rank">${index + 1}</span>
                    <span class="username">${escapeHtml(user.username)}</span>
                    <span class="score">${user.combinedCount} cards</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading flashcard leaderboard:', error);
    }
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
