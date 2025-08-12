// Simple virtual pet

function initPet() {
    pet.style.left = '100px';
    pet.style.top = '100px';

    // Click makes pet happy
    pet.addEventListener('click', () => {
        setPetState('happy');
        lastInteraction = Date.now();
        showPetNotification('Purr~');
        setTimeout(() => setPetState('idle'), 1000);
    });

    // Move pet periodically
    moveInterval = setInterval(movePet, 5000);

    // Idle check
    idleTimer = setInterval(checkIdle, 1000);
}

function movePet() {
    setPetState('walk');
    showPetNotification('Exploring...');

    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;

    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;

    pet.style.left = `${newX}px`;
    pet.style.top = `${newY}px`;

    pet.addEventListener('transitionend', onMoveEnd, { once: true });
}

function onMoveEnd() {
    setPetState('idle');
}

function setPetState(state) {
    switch (state) {
        case 'walk':
            petSprite.src = PET_IMAGES.walk;
            break;
        case 'happy':
            petSprite.src = PET_IMAGES.happy;
            break;
        case 'sleep':
            petSprite.src = PET_IMAGES.sleep;
            break;
        default:
            petSprite.src = PET_IMAGES.idle;
    }
}

function checkIdle() {
    const timeSinceInteraction = Date.now() - lastInteraction;
    if (timeSinceInteraction > 10000) { // 10 seconds of no clicks
        setPetState('sleep');
        showPetNotification('Zzz...');
    }
}

function showPetNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'pet-notification';
    notification.textContent = message;
    notificationsContainer.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}
