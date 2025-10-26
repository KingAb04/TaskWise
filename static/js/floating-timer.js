// Floating Timer Implementation
class FloatingTimer {
    constructor() {
        this.initializeState();
        this.createTimerElement();
        this.initializeEventListeners();
        this.startStateSync();
    }

    initializeState() {
        // Load or initialize timer state
        const savedState = localStorage.getItem('taskwise_timer_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.state = {
                ...state,
                isRunning: false // Always start paused when reloading
            };
        } else {
            this.state = {
                mode: 'pomodoro',
                timeLeft: 25 * 60,
                isRunning: false,
                isMinimized: false,
                position: { x: null, y: null }
            };
        }

        // Settings
        this.settings = {
            pomodoro: 25 * 60,
            short: 5 * 60,
            long: 15 * 60
        };

        // Load custom settings if they exist
        const savedSettings = localStorage.getItem('taskwise_timer_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    createTimerElement() {
        // Create the floating timer HTML
        const timer = document.createElement('div');
        timer.className = `floating-timer ${this.state.mode}`;
        timer.innerHTML = `
            <div class="timer-header">
                <h3 class="timer-title">Focus Timer</h3>
                <div class="timer-controls">
                    <button class="timer-control minimize-btn" title="Minimize">_</button>
                    <button class="timer-control close-btn" title="Close">×</button>
                </div>
            </div>
            <div class="timer-display">25:00</div>
            <p class="timer-status">#1 Time to focus!</p>
            <div class="timer-actions">
                <button class="timer-btn pomodoro-btn">Focus</button>
                <button class="timer-btn short-btn">Short</button>
                <button class="timer-btn long-btn">Long</button>
                <button class="timer-btn start-btn">Start</button>
            </div>
        `;

        // Make timer draggable
        this.makeDraggable(timer);

        // Restore position if saved
        if (this.state.position.x !== null && this.state.position.y !== null) {
            timer.style.right = 'auto';
            timer.style.bottom = 'auto';
            timer.style.left = `${this.state.position.x}px`;
            timer.style.top = `${this.state.position.y}px`;
        }

        // Restore minimized state if needed
        if (this.state.isMinimized) {
            timer.classList.add('minimized');
        }

        document.body.appendChild(timer);
        this.timerElement = timer;
        this.updateDisplay();
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.addEventListener('mousedown', dragMouseDown);

        const self = this;

        function dragMouseDown(e) {
            if (e.target.closest('.timer-controls')) return; // Don't drag when clicking controls

            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', closeDragElement);
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            const newTop = element.offsetTop - pos2;
            const newLeft = element.offsetLeft - pos1;

            // Keep timer within viewport
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            element.style.top = `${Math.min(Math.max(0, newTop), maxY)}px`;
            element.style.left = `${Math.min(Math.max(0, newLeft), maxX)}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }

        function closeDragElement() {
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('mouseup', closeDragElement);
            
            // Save position
            self.state.position = {
                x: parseInt(element.style.left),
                y: parseInt(element.style.top)
            };
            self.saveState();
        }
    }

    initializeEventListeners() {
        // Mode buttons
        this.timerElement.querySelector('.pomodoro-btn').addEventListener('click', () => this.switchMode('pomodoro'));
        this.timerElement.querySelector('.short-btn').addEventListener('click', () => this.switchMode('short'));
        this.timerElement.querySelector('.long-btn').addEventListener('click', () => this.switchMode('long'));

        // Start/Pause button
        this.timerElement.querySelector('.start-btn').addEventListener('click', () => this.toggleTimer());

        // Minimize button
        this.timerElement.querySelector('.minimize-btn').addEventListener('click', () => this.toggleMinimize());

        // Close button
        this.timerElement.querySelector('.close-btn').addEventListener('click', () => this.hide());

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState();
            } else {
                this.checkTimerProgress();
            }
        });
    }

    toggleTimer() {
        const btn = this.timerElement.querySelector('.start-btn');
        if (this.state.isRunning) {
            this.pauseTimer();
            btn.textContent = 'Start';
        } else {
            this.startTimer();
            btn.textContent = 'Pause';
        }
    }

    startTimer() {
        if (!this.state.isRunning) {
            this.state.isRunning = true;
            this.saveState();
            this.timerInterval = setInterval(() => this.tick(), 1000);
        }
    }

    pauseTimer() {
        if (this.state.isRunning) {
            this.state.isRunning = false;
            this.saveState();
            clearInterval(this.timerInterval);
        }
    }

    tick() {
        if (this.state.timeLeft > 0) {
            this.state.timeLeft--;
            this.updateDisplay();
            this.saveState();
        } else {
            this.timerComplete();
        }
    }

    timerComplete() {
        this.pauseTimer();
        this.notifyTimerComplete();
        const btn = this.timerElement.querySelector('.start-btn');
        btn.textContent = 'Restart';
    }

    notifyTimerComplete() {
        // Show browser notification if permitted
        if (Notification.permission === "granted") {
            new Notification("Timer Complete!", {
                body: "Time to take a break!",
                icon: "/static/assets/taskwise-logo-1.png"
            });
        }

        // Play sound
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
        audio.play().catch(() => {}); // Ignore autoplay policy errors
    }

    switchMode(mode) {
        this.state.mode = mode;
        this.state.timeLeft = this.settings[mode];
        this.state.isRunning = false;
        clearInterval(this.timerInterval);
        
        this.timerElement.className = `floating-timer ${mode}${this.state.isMinimized ? ' minimized' : ''}`;
        const btn = this.timerElement.querySelector('.start-btn');
        btn.textContent = 'Start';
        
        this.updateDisplay();
        this.saveState();
    }

    toggleMinimize() {
        this.state.isMinimized = !this.state.isMinimized;
        this.timerElement.classList.toggle('minimized');
        this.saveState();
    }

    hide() {
        this.pauseTimer();
        this.timerElement.style.display = 'none';
    }

    show() {
        this.timerElement.style.display = 'block';
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        const display = this.timerElement.querySelector('.timer-display');
        display.textContent = this.formatTime(this.state.timeLeft);

        // Update active mode button
        const modeButtons = this.timerElement.querySelectorAll('.timer-btn');
        modeButtons.forEach(btn => btn.classList.remove('active'));
        this.timerElement.querySelector(`.${this.state.mode}-btn`).classList.add('active');
    }

    saveState() {
        localStorage.setItem('taskwise_timer_state', JSON.stringify(this.state));
    }

    startStateSync() {
        // Check for timer progress every second when the page is visible
        setInterval(() => {
            if (!document.hidden && this.state.isRunning) {
                this.checkTimerProgress();
            }
        }, 1000);
    }

    checkTimerProgress() {
        const savedState = localStorage.getItem('taskwise_timer_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.isRunning) {
                // Update time based on elapsed time
                const now = new Date().getTime();
                const lastUpdate = state.lastUpdate || now;
                const elapsed = Math.floor((now - lastUpdate) / 1000);
                
                if (elapsed > 0) {
                    this.state.timeLeft = Math.max(0, state.timeLeft - elapsed);
                    this.updateDisplay();
                    
                    if (this.state.timeLeft === 0) {
                        this.timerComplete();
                    }
                }
            }
        }
    }
}

// Initialize floating timer on dashboard load
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    // Create the floating timer
    window.floatingTimer = new FloatingTimer();
});