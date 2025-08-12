const pet = document.getElementById('virtualPet');
const petSprite = document.getElementById('petSprite');
const notificationsContainer = document.getElementById('petNotifications');

const PET_IMAGES = {
    idle: 'pet/cat_idle.png',
    walk: 'pet/cat_walk.gif',
    happy: 'pet/cat_happy.gif',
    sleep: 'pet/cat_sleep.gif'
};

let lastInteraction = Date.now();
let moveInterval;
let idleTimer;

const IDLE_TIME_TO_SLEEP = 30000; // 30 seconds
const MOVE_INTERVAL_NORMAL = 5000; // 5 seconds
const MOVE_INTERVAL_SLEEP = 30000; // 30 seconds

initPet();

function initPet() {
    pet.style.left = '100px';
    pet.style.top = '100px';

    pet.addEventListener('click', () => {
        lastInteraction = Date.now();
        if (currentState === 'sleep') {
            // Wake up pet
            setPetState('happy');
            showPetNotification('Purr~');
            restartMovement(MOVE_INTERVAL_NORMAL);
            setTimeout(() => setPetState('idle'), 1000);
        } else {
            setPetState('happy');
            showPetNotification('Purr~');
            setTimeout(() => setPetState('idle'), 1000);
        }
    });

    startMovement(MOVE_INTERVAL_NORMAL);

    idleTimer = setInterval(checkIdle, 1000);
}

let currentState = 'idle';

function startMovement(interval) {
    if (moveInterval) clearInterval(moveInterval);
    moveInterval = setInterval(movePet, interval);
}

function restartMovement(interval) {
    startMovement(interval);
}

function movePet() {
    if (currentState === 'sleep') return; // don't move if sleeping

    setPetState('walk');

    const maxX = window.innerWidth - petSprite.clientWidth;
    const maxY = window.innerHeight - petSprite.clientHeight;

    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;

    pet.style.left = `${newX}px`;
    pet.style.top = `${newY}px`;

    pet.addEventListener('transitionend', () => {
        setPetState('idle');
    }, { once: true });
}

function setPetState(state) {
    currentState = state;
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
    if (timeSinceInteraction > IDLE_TIME_TO_SLEEP && currentState !== 'sleep') {
        setPetState('sleep');
        // Slow down movement when sleeping
        restartMovement(MOVE_INTERVAL_SLEEP);
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
    }, 3000);
}
