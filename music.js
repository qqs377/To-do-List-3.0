// Music Player functions
function initializeMusicPlayer() {
    loadSongList();
    
    const audioPlayer = document.getElementById('audioPlayer');
    const canvas = document.getElementById('fftCanvas');
    
    if (canvas && audioPlayer) {
        canvas.width = canvas.offsetWidth;
        canvas.height = 100;
        
        setupAudioVisualization(audioPlayer, canvas);
        
        // Auto-play next song when current ends
        audioPlayer.addEventListener('ended', playNextSong);
    }
}

function loadSongList() {
    const songList = document.getElementById('songList');
    songList.innerHTML = '';
    
    musicFiles.forEach((file, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.index = index;
        
        // Parse song name from filename
        const filename = file.split('/').pop().replace('.mp3', '');
        const parts = filename.split('_by');
        const songName = parts[0].replace(/_/g, ' ');
        const artist = parts[1] ? parts[1].replace(/([A-Z])/g, ' $1').trim() : 'Unknown Artist';
        
        songItem.innerHTML = `
            <div><strong>${songName}</strong></div>
            <div style="font-size: 12px; opacity: 0.8;">by ${artist}</div>
        `;
        
        songItem.addEventListener('click', () => playSong(index));
        songList.appendChild(songItem);
    });
}

function playSong(index) {
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlaying = document.getElementById('nowPlaying');
    
    currentSongIndex = index;
    audioPlayer.src = musicFiles[index];
    audioPlayer.load();
    audioPlayer.play();
    
    // Update now playing display
    const filename = musicFiles[index].split('/').pop().replace('.mp3', '');
    const parts = filename.split('_by');
    const songName = parts[0].replace(/_/g, ' ');
    const artist = parts[1] ? parts[1].replace(/([A-Z])/g, ' $1').trim() : 'Unknown Artist';
    
    nowPlaying.textContent = `♫ ${songName} - ${artist}`;
    
    // Update song list UI
    document.querySelectorAll('.song-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });
}

function playNextSong() {
    currentSongIndex = (currentSongIndex + 1) % musicFiles.length;
    playSong(currentSongIndex);
}

function setupAudioVisualization(audioPlayer, canvas) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioPlayer);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const ctx = canvas.getContext('2d');
        
        function drawVisualization() {
            requestAnimationFrame(drawVisualization);
            
            analyser.getByteFrequencyData(dataArray);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                
                const hue = (i / bufferLength) * 360;
                ctx.fillStyle = `hsl(${hue}, 50%, 60%)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        audioPlayer.addEventListener('play', () => {
            audioContext.resume();
            drawVisualization();
        });
        
    } catch (error) {
        console.error('Error setting up audio visualization:', error);
    }
}
