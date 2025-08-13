// Particle System Classes
class Point {
    constructor(orx, ory, size, colorNum = 0, canvas, cancelRandPlace = false) {
        this.orx = orx;
        this.ory = ory;
        this.size = size;
        this.x = cancelRandPlace ? orx : Math.random() * canvas.width;
        this.y = cancelRandPlace ? ory : Math.random() * canvas.height;
        this.nx = orx;
        this.ny = ory;
        this.spx = 0;
        this.spy = 0;
        this.opacity = cancelRandPlace ? 1 : 0;
        this.canvas = canvas;
        let c = Math.floor(colorNum / 3);
        this.color = `${c},${c},${c}`;
    }

    update(ParticlePolymerizeFlag = true, options, mx, my) {
        const { Thickness, Drag, Ease, effectParticleMode } = options;
        this.spx = (this.nx - this.x) / (ParticlePolymerizeFlag ? 30 : 60);
        this.spy = (this.ny - this.y) / (ParticlePolymerizeFlag ? 30 : 60);
        
        let curDx = (mx - this.x), curDy = (my - this.y);
        let d1 = curDx * curDx + curDy * curDy;
        let f = Thickness / d1;
        f = f < 0.1 ? 0.1 : f;
        let finalT = 0;
        
        if (effectParticleMode == 'adsorption') {
            f = f > 12 ? 12 : f;
            if (f > 0.5 && f <= 1.5) f = 0.5;
        } else if (effectParticleMode == 'repulsion') {
            f = f > 7 ? 7 : f;
        }
        
        finalT = Math.atan2(curDy, curDx);
        let vx = f * Math.cos(finalT), vy = f * Math.sin(finalT);
        
        if (effectParticleMode) {
            let finalX = ((effectParticleMode === 'adsorption' ? vx : -vx) * Drag) + ((this.orx - this.x) * Ease) / 400;
            let finalY = ((effectParticleMode === 'adsorption' ? vy : -vy) * Drag) + ((this.ory - this.y) * Ease) / 400;
            this.spx += finalX;
            this.spy += finalY;
        }
        
        if (!ParticlePolymerizeFlag && this.opacity > 0) {
            this.x -= this.spx;
            this.opacity -= 0.04;
            if (this.opacity <= 0) {
                this.x = this.nx;
                this.y = this.ny;
            }
        } else {
            this.x += this.spx;
            if (this.opacity < 1) this.opacity += 0.012;
        }
        
        if (!ParticlePolymerizeFlag && this.opacity > 0) {
            this.y -= this.spy;
        } else {
            this.y += this.spy;
        }
    }

    render() {
        const ctx = this.canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.opacity > 1 ? 1 : this.opacity})`;
        ctx.fill();
        ctx.closePath();
    }
}

class DameDaneParticle {
    constructor(canvas, options, callback) {
        const initOptions = {
            renderX: 0,
            renderY: 0,
            spacing: 1,
            size: 1,
            Drag: 0.95,
            Ease: 0.1,
            Thickness: 50,
            validColor: { min: 300, max: 765, invert: false },
            cancelParticleAnimation: false
        };
        
        for (const i in initOptions) {
            if (typeof options[i] === 'undefined') options[i] = initOptions[i];
        }
        
        options.Thickness *= options.Thickness;
        const { src } = options;
        
        this.canvasEle = canvas;
        this.ctx = canvas.getContext('2d');
        
        // FIXED: Ensure canvas fills entire viewport
        this.resizeCanvas();
        
        this.IMG = new Image();
        this.IMG.src = src;
        this.ImgW = 0;
        this.ImgH = 0;
        this.PointArr = [];
        this.ParticlePolymerizeFlag = true;
        this.animeId = -1;
        // FIXED: Initialize mouse position to center of screen
        this.mx = window.innerWidth / 2;
        this.my = window.innerHeight / 2;
        this.hasInit = false;
        this.options = options;
        
        this.IMG.onload = () => {
            const { renderX, renderY, w, h } = this.options;
            this.renderX = renderX;
            this.renderY = renderY;
            
            if (typeof w === 'number') this.ImgW = w;
            else this.ImgW = this.IMG.width;
            
            if (typeof h === 'number') this.ImgH = h;
            else this.ImgH = Math.floor(this.ImgW * (this.IMG.height / this.IMG.width));
            
            const ele = document.createElement('canvas');
            ele.width = this.ImgW;
            ele.height = this.ImgH;
            const eleCtx = ele.getContext('2d');
            eleCtx.drawImage(this.IMG, 0, 0, this.ImgW, this.ImgH);
            
            this._imgArr = eleCtx.getImageData(0, 0, this.ImgW, this.ImgH).data;
            eleCtx.clearRect(0, 0, canvas.width, canvas.height);
            this._InitParticle(this._imgArr, true);
            this._Draw2Canvas();
            this.hasInit = true;
            callback && callback();
        };
        
        this.IMG.onerror = () => {
            console.warn('Image failed to load, using fallback');
            // If image fails to load, create fallback pattern
            this.createFallbackPattern();
            callback && callback();
        };
        
        // Throttle function implementation
        const throttle = (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            }
        };
        
        // FIXED: Mouse tracking with proper event handling
        this.$changeMxMy = throttle((e) => {
            const rect = canvas.getBoundingClientRect();
            this.mx = e.clientX - rect.left;
            this.my = e.clientY - rect.top;
        }, 16); // ~60fps
        
        // FIXED: Add mouse event listeners to the canvas itself
        canvas.addEventListener("mousemove", this.$changeMxMy);
        canvas.addEventListener("mouseenter", this.$changeMxMy);
        
        this.$fit = throttle(() => {
            this.resizeCanvas();
            this._InitParticle();
        }, 100);
        
        window.addEventListener('resize', this.$fit);
    }

    // FIXED: Proper canvas resizing method
    resizeCanvas() {
        const canvas = this.canvasEle;
        
        // Force canvas to fill entire viewport
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        
        // Set canvas internal dimensions to match display size
        canvas.width = vw;
        canvas.height = vh;
        
        // Ensure canvas style matches viewport with important flags
        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.margin = '0';
        canvas.style.padding = '0';
        canvas.style.display = 'block';
        canvas.style.zIndex = '1';
        
        // Force a reflow
        canvas.offsetHeight;
        
        this.w = canvas.width;
        this.h = canvas.height;
        
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}, Viewport: ${vw}x${vh}`);
    }

    // FIXED: Create fallback pattern when images don't exist
    createFallbackPattern() {
        const tempCanvas = document.createElement('canvas');
        const size = 400;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Create a gradient pattern
        const gradient = tempCtx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, 'rgb(100, 150, 200)');
        gradient.addColorStop(0.5, 'rgb(150, 100, 200)');
        gradient.addColorStop(1, 'rgb(200, 150, 100)');
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, size, size);
        
        // Add some texture for particle generation
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const pixelSize = Math.random() * 2 + 1;
            const brightness = Math.random() * 100 + 100;
            tempCtx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.8)`;
            tempCtx.fillRect(x, y, pixelSize, pixelSize);
        }
        
        // Use the generated pattern
        this.ImgW = size;
        this.ImgH = size;
        this._imgArr = tempCtx.getImageData(0, 0, size, size).data;
        this._InitParticle(this._imgArr, true);
        this._Draw2Canvas();
        this.hasInit = true;
    }

    _InitParticle = (ImgData, rebuildParticle = false) => {
        if (!ImgData) {
            if (this._imgArr) {
                ImgData = this._imgArr;
            } else {
                this.createFallbackPattern();
                return;
            }
        }
        
        let imgW = this.ImgW, imgH = this.ImgH, cnt = 0;
        let arr = this.PointArr;
        let { spacing, size, validColor, cancelParticleAnimation } = this.options;
        let proportion = window.innerHeight / window.outerHeight;
        spacing *= proportion > 0.5 ? proportion : 0.5;
        
        let r, g, b, val, position;
        const gap = 3; // Reduced gap for more particles
        
        // Center the image
        const centerX = (window.innerWidth - (imgW * spacing)) / 2;
        const centerY = (window.innerHeight - (imgH * spacing)) / 2;
        
        for (var h = 0; h < imgH; h += gap) {
            for (var w = 0; w < imgW; w += gap) {
                position = (imgW * h + w) * 4;
                r = ImgData[position];
                g = ImgData[position + 1];
                b = ImgData[position + 2];
                val = r + g + b;
                
                if ((validColor.invert && (val <= validColor.min || val >= validColor.max)) || 
                    (!validColor.invert && val >= validColor.min && val <= validColor.max)) {
                    if (arr[cnt] && !cancelParticleAnimation) {
                        const point = arr[cnt];
                        point.orx = point.nx = w * spacing + centerX;
                        point.ory = point.ny = h * spacing + centerY;
                        let c = Math.floor(val / 3);
                        point.color = `${c},${c},${c}`;
                    } else {
                        arr[cnt] = new Point(
                            w * spacing + centerX, 
                            h * spacing + centerY, 
                            size, 
                            val, 
                            this.canvasEle, 
                            this.hasInit || cancelParticleAnimation
                        );
                    }
                    cnt++;
                }
            }
        }
        
        if (cnt < arr.length) this.PointArr = arr.splice(0, cnt);
        
        if (rebuildParticle && !cancelParticleAnimation) {
            arr = this.PointArr;
            let len = arr.length, randIndex = 0, tx = 0, ty = 0;
            while (len) {
                randIndex = (Math.floor(Math.random() * len--));
                tx = arr[randIndex].orx;
                ty = arr[randIndex].ory;
                arr[randIndex].orx = arr[randIndex].nx = arr[len].orx;
                arr[randIndex].ory = arr[randIndex].ny = arr[len].ory;
                arr[len].orx = arr[len].nx = tx;
                arr[len].ory = arr[len].ny = ty;
            }
        }
        
        if (!this.ParticlePolymerizeFlag) this.ParticlePolymerize(false);
    }

    _Draw2Canvas = () => {
        cancelAnimationFrame(this.animeId);
        const w = this.canvasEle.width, h = this.canvasEle.height;
        this.ctx.clearRect(0, 0, w, h);
        
        this.PointArr.forEach((point) => {
            point.update(this.ParticlePolymerizeFlag, this.options, this.mx, this.my);
            point.render();
        });
        
        this.animeId = requestAnimationFrame(this._Draw2Canvas);
    }

    ParticlePolymerize(flag) {
        if (typeof flag === 'boolean') this.ParticlePolymerizeFlag = flag;
        else this.ParticlePolymerizeFlag = !this.ParticlePolymerizeFlag;
        
        this.PointArr.forEach((point) => {
            point.nx = this.ParticlePolymerizeFlag ? point.orx : Math.random() * this.canvasEle.width;
            point.ny = this.ParticlePolymerizeFlag ? point.ory : Math.random() * this.canvasEle.height;
        });
    }

    ChangeImg(src, options) {
        this.IMG.src = src;
        if (options) {
            for (const i in options) {
                this.options[i] = options[i];
            }
        }
    }

    PreDestory(callback) {
        this.canvasEle.removeEventListener('mousemove', this.$changeMxMy);
        this.canvasEle.removeEventListener('mouseenter', this.$changeMxMy);
        window.removeEventListener('resize', this.$fit);
        cancelAnimationFrame(this.animeId);
        this.PointArr = [];
        this.ctx.clearRect(0, 0, this.canvasEle.width, this.canvasEle.height);
        // Stop image rotation when destroying
        stopImageRotation();
        callback && callback();
    }
}

// Initialize particle system
let particleSystem;
let isLoggedIn = false;

// Function to stop particle system after login
function stopParticleSystem() {
    if (particleSystem) {
        particleSystem.PreDestory(() => {
            console.log('Particle system stopped after login');
        });
        particleSystem = null;
    }
    
    // Hide the auth modal and canvas
    const authModal = document.getElementById('authModal');
    const particleCanvas = document.getElementById('particleCanvas');
    
    if (authModal) {
        authModal.style.display = 'none';
    }
    
    if (particleCanvas) {
        particleCanvas.style.display = 'none';
    }
    
    isLoggedIn = true;
}

// FIXED: Create better fallback images
function createFallbackImage(width, height, pattern) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (pattern === 1) {
        // Create flowing wave pattern
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgb(120, 180, 220)');
        gradient.addColorStop(0.3, 'rgb(180, 120, 220)');
        gradient.addColorStop(0.7, 'rgb(220, 180, 120)');
        gradient.addColorStop(1, 'rgb(120, 220, 180)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add wave-like texture
        for (let y = 0; y < height; y += 3) {
            for (let x = 0; x < width; x += 3) {
                const intensity = Math.sin(x * 0.02) * Math.sin(y * 0.02) * 50 + 150;
                ctx.fillStyle = `rgba(${intensity}, ${intensity}, ${intensity}, 0.6)`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    } else {
        // Create spiral pattern
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i < 3000; i++) {
            const angle = i * 0.1;
            const radius = i * 0.1;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                const intensity = (Math.sin(angle) + 1) * 127.5;
                ctx.fillStyle = `rgba(${intensity}, ${intensity * 0.8}, ${intensity * 1.2}, 0.7)`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }
    
    return canvas.toDataURL();
}

// FIXED: Initialize particle system when page loads (only if not logged in)
document.addEventListener('DOMContentLoaded', function() {
    // Don't start particles if user is already logged in
    if (isLoggedIn) return;
    
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) {
        console.error('Particle canvas not found');
        return;
    }
    
    // Create fallback image
    const fallbackImage = createFallbackImage(600, 400, 1);
    
    particleSystem = new DameDaneParticle(canvas, {
        src: fallbackImage,
        renderX: 0,
        renderY: 0,
        w: 600,
        h: 400,
        size: 2,
        spacing: 2,
        validColor: {
            min: 100,
            max: 700,
            invert: false
        },
        effectParticleMode: 'adsorption',
        Thickness: 40,
        Drag: 0.95,
        Ease: 0.15
    }, () => {
        console.log('Particle system initialized successfully');
        // Only start automatic image rotation if not logged in
        if (!isLoggedIn) {
            startImageRotation();
        }
    });
});

// Automatic image rotation system
let currentImageIndex = 0;
let imageRotationTimer = null;

const imageConfigs = [
    {
        src: './images/cover1.png',
        fallbackPattern: 1,
        options: {
            w: 700,
            h: 500,
            effectParticleMode: 'adsorption',
            Thickness: 40,
            spacing: 1.5
        }
    },
    {
        src: './images/cover2.png',
        fallbackPattern: 2,
        options: {
            w: 500,
            h: 400,
            effectParticleMode: 'repulsion',
            Thickness: 30,
            spacing: 1.2
        }
    },
    {
        src: './images/cover3.png',
        fallbackPattern: 1,
        options: {
            w: 600,
            h: 450,
            effectParticleMode: 'adsorption',
            Thickness: 35,
            spacing: 1.3
        }
    },
    {
        src: './images/cover4.png',
        fallbackPattern: 2,
        options: {
            w: 650,
            h: 480,
            effectParticleMode: 'repulsion',
            Thickness: 25,
            spacing: 1.4
        }
    },
    {
        src: './images/cover5.png',
        fallbackPattern: 1,
        options: {
            w: 550,
            h: 420,
            effectParticleMode: 'adsorption',
            Thickness: 45,
            spacing: 1.6
        }
    }
];

function loadImageWithFallback(config) {
    // Check if particle system exists and is properly initialized
    if (!particleSystem || !particleSystem.hasInit) {
        console.warn('Particle system not ready for image change');
        return;
    }
    
    const img = new Image();
    img.onload = function() {
        // Double-check particle system still exists before calling ChangeImg
        if (particleSystem && typeof particleSystem.ChangeImg === 'function') {
            particleSystem.ChangeImg(config.src, {
                ...config.options,
                w: img.width,
                h: img.height
            });
        }
    };
    img.onerror = function() {
        // Double-check particle system still exists before calling ChangeImg
        if (particleSystem && typeof particleSystem.ChangeImg === 'function') {
            const fallbackImage = createFallbackImage(
                config.options.w, 
                config.options.h, 
                config.fallbackPattern
            );
            particleSystem.ChangeImg(fallbackImage, config.options);
        }
    };
    img.src = config.src;
}

function rotateToNextImage() {
    // Check if particle system exists and user is not logged in
    if (!particleSystem || isLoggedIn || !particleSystem.hasInit) {
        return;
    }
    
    loadImageWithFallback(imageConfigs[currentImageIndex]);
    currentImageIndex = (currentImageIndex + 1) % imageConfigs.length;
}

function startImageRotation() {
    // Don't start if logged in or particle system doesn't exist
    if (isLoggedIn || !particleSystem) {
        return;
    }
    
    // Wait a bit for particle system to fully initialize before starting rotation
    setTimeout(() => {
        if (!isLoggedIn && particleSystem && particleSystem.hasInit) {
            // Load first image immediately
            rotateToNextImage();
            
            // Set up automatic rotation every 3 seconds
            imageRotationTimer = setInterval(rotateToNextImage, 300000);
        }
    }, 500); // Wait 500ms for initialization
}

function stopImageRotation() {
    if (imageRotationTimer) {
        clearInterval(imageRotationTimer);
        imageRotationTimer = null;
    }
}

// Function to stop particle system after login
function stopParticleSystem() {
    // Stop image rotation first
    stopImageRotation();
    
    if (particleSystem) {
        particleSystem.PreDestory(() => {
            console.log('Particle system stopped after login');
        });
        particleSystem = null;
    }
    
    // Hide the auth modal and canvas
    const authModal = document.getElementById('authModal');
    const particleCanvas = document.getElementById('particleCanvas');
    
    if (authModal) {
        authModal.style.display = 'none';
    }
    
    if (particleCanvas) {
        particleCanvas.style.display = 'none';
    }
    
    isLoggedIn = true;
}

// Add placeholder handleAuth function if it doesn't exist
if (typeof handleAuth === 'undefined') {
    function handleAuth() {
        console.log('Auth function called');
        // Add your authentication logic here
        
        // After successful authentication, stop the particle system
        // You should call stopParticleSystem() in your actual auth logic
        // For demo purposes, we'll stop it after 1 second
        setTimeout(() => {
            stopParticleSystem();
        }, 1000);
    }
}

// Function to be called by your actual authentication system
window.onUserLogin = function() {
    stopParticleSystem();
};
