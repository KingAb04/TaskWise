// Unified Timer Implementation for TaskWise
class TaskWiseTimer {
    static instance;

    constructor() {
        if (TaskWiseTimer.instance) {
            return TaskWiseTimer.instance;
        }
        TaskWiseTimer.instance = this;

        this.initializeState();
        this.startStateSync();
        
        // Set up event listeners for state changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'taskwise_timer_state') {
                this.handleStateUpdate(JSON.parse(e.newValue));
            }
        });

        // Initialize interface based on current page
        this.isFocusPage = document.body.classList.contains('FocusYrn');
        if (this.isFocusPage) {
            this.initializeFocusPage();
        } else {
            this.initializeFloatingTimer();
        }

        return this;
    }

    initializeState() {
        const savedState = localStorage.getItem('taskwise_timer_state');
        if (savedState) {
            this.state = {
                ...JSON.parse(savedState),
                lastUpdate: Date.now()
            };
        } else {
            this.state = {
                mode: 'pomodoro',
                timeLeft: 25 * 60,
                isRunning: false,
                isMinimized: false,
                position: { x: null, y: null },
                lastUpdate: Date.now()
            };
        }

        this.settings = {
            pomodoro: 25 * 60,
            short: 5 * 60,
            long: 15 * 60
        };

        const savedSettings = localStorage.getItem('taskwise_timer_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    initializeFocusPage() {
        this.elements = {
            timeDisplay: document.getElementById('timeDisplay'),
            statusText: document.getElementById('statusText'),
            startBtn: document.querySelector('.start-btn'),
            pomodoroBtn: document.getElementById('pomodoroBtn'),
            shortBtn: document.getElementById('shortBtn'),
            longBtn: document.getElementById('longBtn')
        };

        // Set up event listeners
        this.elements.startBtn.addEventListener('click', () => this.toggleTimer());
        this.elements.pomodoroBtn.addEventListener('click', () => this.switchMode('pomodoro'));
        this.elements.shortBtn.addEventListener('click', () => this.switchMode('short'));
        this.elements.longBtn.addEventListener('click', () => this.switchMode('long'));

        // Set initial background color based on current mode
        document.body.className = `focus-page ${this.state.mode}`;

        this.updateDisplay();
        
        if (this.state.isRunning) {
            this.startTimer();
        }
    }

    initializeFloatingTimer() {
        this.floatingTimer = document.createElement('div');
        this.floatingTimer.className = `floating-timer ${this.state.mode}${this.state.isMinimized ? ' minimized' : ''}`;
        this.floatingTimer.innerHTML = this.getFloatingTimerHTML();
        
        document.body.appendChild(this.floatingTimer);
        
        this.initializeFloatingControls();
        this.makeDraggable(this.floatingTimer);
        this.restorePosition();
        this.updateDisplay();

        if (this.state.isRunning) {
            this.startTimer();
        }
    }

    getFloatingTimerHTML() {
        return `
            <div class="timer-header">
                <h3 class="timer-title">Focus Timer</h3>
                <div class="timer-controls">
                    <button class="timer-control minimize-btn" title="Minimize">_</button>
                    <button class="timer-control close-btn" title="Close">×</button>
                </div>
            </div>
            <div class="timer-display">${this.formatTime(this.state.timeLeft)}</div>
            <p class="timer-status">#1 Time to focus!</p>
            <div class="timer-actions">
                <button class="timer-btn pomodoro-btn">Focus</button>
                <button class="timer-btn short-btn">Short</button>
                <button class="timer-btn long-btn">Long</button>
                <button class="timer-btn start-btn">
                    ${this.state.isRunning ? 'Pause' : 'Start'}
                </button>
            </div>
        `;
    }

    initializeFloatingControls() {
        if (!this.floatingTimer) return;

        const controls = {
            startBtn: this.floatingTimer.querySelector('.start-btn'),
            pomodoroBtn: this.floatingTimer.querySelector('.pomodoro-btn'),
            shortBtn: this.floatingTimer.querySelector('.short-btn'),
            longBtn: this.floatingTimer.querySelector('.long-btn'),
            minimizeBtn: this.floatingTimer.querySelector('.minimize-btn'),
            closeBtn: this.floatingTimer.querySelector('.close-btn')
        };

        controls.startBtn.addEventListener('click', () => this.toggleTimer());
        controls.pomodoroBtn.addEventListener('click', () => this.switchMode('pomodoro'));
        controls.shortBtn.addEventListener('click', () => this.switchMode('short'));
        controls.longBtn.addEventListener('click', () => this.switchMode('long'));
        controls.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        controls.closeBtn.addEventListener('click', () => this.hideFloatingTimer());
    }

    toggleTimer() {
        if (this.state.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.state.isRunning = true;
        this.state.lastUpdate = Date.now();
        this.saveState();
        
        this.timerInterval = setInterval(() => this.tick(), 1000);
        this.updateStartButton('Pause');
    }

    pauseTimer() {
        this.state.isRunning = false;
        this.saveState();
        
        clearInterval(this.timerInterval);
        this.updateStartButton('Start');
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
        this.updateStartButton('Restart');
    }

    switchMode(mode) {
        this.state.mode = mode;
        this.state.timeLeft = this.settings[mode];
        
        if (this.state.isRunning) {
            this.pauseTimer();
        }

        // Update body class if on focus page
        if (this.isFocusPage) {
            document.body.className = `focus-page ${mode}`;
        }

        this.updateDisplay();
        this.saveState();
    }

    toggleMinimize() {
        if (!this.floatingTimer) return;
        
        this.state.isMinimized = !this.state.isMinimized;
        this.floatingTimer.classList.toggle('minimized');
        this.saveState();
    }

    hideFloatingTimer() {
        if (this.floatingTimer) {
            this.floatingTimer.style.display = 'none';
        }
    }

    updateDisplay() {
        const timeString = this.formatTime(this.state.timeLeft);
        
        if (this.isFocusPage && this.elements) {
            this.elements.timeDisplay.textContent = timeString;
            this.updateModeButtons();
        }
        
        if (this.floatingTimer) {
            this.floatingTimer.querySelector('.timer-display').textContent = timeString;
            this.floatingTimer.className = `floating-timer ${this.state.mode}${this.state.isMinimized ? ' minimized' : ''}`;
            this.updateFloatingModeButtons();
        }
    }

    updateStartButton(text) {
        if (this.isFocusPage && this.elements) {
            this.elements.startBtn.textContent = text.toUpperCase();
        }
        
        if (this.floatingTimer) {
            this.floatingTimer.querySelector('.start-btn').textContent = text;
        }
    }

    updateModeButtons() {
        if (!this.isFocusPage || !this.elements) return;
        
        const buttons = [
            this.elements.pomodoroBtn,
            this.elements.shortBtn,
            this.elements.longBtn
        ];
        
        buttons.forEach(btn => btn.classList.remove('active'));
        
        if (this.state.mode === 'pomodoro') this.elements.pomodoroBtn.classList.add('active');
        if (this.state.mode === 'short') this.elements.shortBtn.classList.add('active');
        if (this.state.mode === 'long') this.elements.longBtn.classList.add('active');
    }

    updateFloatingModeButtons() {
        if (!this.floatingTimer) return;
        
        const buttons = this.floatingTimer.querySelectorAll('.timer-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = this.floatingTimer.querySelector(`.${this.state.mode}-btn`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    saveState() {
        this.state.lastUpdate = Date.now();
        localStorage.setItem('taskwise_timer_state', JSON.stringify(this.state));
    }

    handleStateUpdate(newState) {
        this.state = { ...newState };
        this.updateDisplay();
        
        if (this.state.isRunning) {
            this.startTimer();
        } else {
            this.pauseTimer();
        }
    }

    startStateSync() {
        setInterval(() => {
            if (!document.hidden && this.state.isRunning) {
                const now = Date.now();
                const elapsed = Math.floor((now - this.state.lastUpdate) / 1000);
                
                if (elapsed > 0) {
                    this.state.timeLeft = Math.max(0, this.state.timeLeft - elapsed);
                    this.state.lastUpdate = now;
                    this.updateDisplay();
                    this.saveState();
                    
                    if (this.state.timeLeft === 0) {
                        this.timerComplete();
                    }
                }
            }
        }, 1000);
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.querySelector('.timer-header').addEventListener('mousedown', dragMouseDown);

        const self = this;

        function dragMouseDown(e) {
            if (e.target.closest('.timer-controls')) return;

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
            
            self.state.position = {
                x: parseInt(element.style.left),
                y: parseInt(element.style.top)
            };
            self.saveState();
        }
    }

    restorePosition() {
        if (!this.floatingTimer || !this.state.position.x || !this.state.position.y) return;
        
        this.floatingTimer.style.right = 'auto';
        this.floatingTimer.style.bottom = 'auto';
        this.floatingTimer.style.left = `${this.state.position.x}px`;
        this.floatingTimer.style.top = `${this.state.position.y}px`;
    }

    notifyTimerComplete() {
        if (Notification.permission === "granted") {
            new Notification("Timer Complete!", {
                body: "Time to take a break!",
                icon: "/static/assets/taskwise-logo-1.png"
            });
        }

        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
        audio.play().catch(() => {});
    }
}

// Initialize timer on page load
document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    window.taskWiseTimer = new TaskWiseTimer();
});