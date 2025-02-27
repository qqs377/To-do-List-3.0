// Select the canvas and set up its properties
const canvas = document.getElementById("fftCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = 400;

// Set up audio context and analyzer
navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    
    // Connect microphone input to the analyzer
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 2048; // Controls resolution of FFT
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function drawFFT() {
        requestAnimationFrame(drawFFT);
        
        analyser.getByteFrequencyData(dataArray); // Get FFT data
        
        // Clear canvas and draw background
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 2;
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    
    drawFFT();
}).catch(err => console.error("Error accessing microphone:", err));
