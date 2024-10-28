const { IPC_CHANNELS, APP_STATES } = require('../shared/constants');

class UIManager {
    constructor() {
        // Status Elements
        this.statusElement = document.getElementById('status');
        this.cpuUsageElement = document.getElementById('cpu-usage');
        this.memoryUsageElement = document.getElementById('memory-usage');
        this.networkStatusElement = document.getElementById('network-status');
        this.networkIndicator = document.getElementById('network-indicator');
        this.peerCountElement = document.getElementById('peer-count');

        // Control Elements
        this.startButton = document.getElementById('start-btn');
        this.stopButton = document.getElementById('stop-btn');
        this.settingsButton = document.getElementById('settings-btn');

        // Animation frames
        this.statsUpdateFrame = null;
        this.lastCpuUsage = 0;
        this.lastMemoryUsage = 0;
        this.lastPeerCount = 0;

        // State
        this.isTraining = false;

        this.initializeEventListeners();
        this.initializeIPC();
    }

    initializeEventListeners() {
        // Start Button with animation
        this.startButton.addEventListener('click', async () => {
            this.startButton.style.transform = 'scale(0.95)';
            setTimeout(() => this.startButton.style.transform = '', 100);
            
            try {
                const response = await window.electron.ipcRenderer.invoke(IPC_CHANNELS.START_TRAINING);
                if (response.success) {
                    this.setTrainingState(true);
                } else {
                    this.showError({ message: response.message || 'Failed to start training' });
                }
            } catch (error) {
                this.showError(error);
            }
        });

        // Stop Button with animation
        this.stopButton.addEventListener('click', async () => {
            this.stopButton.style.transform = 'scale(0.95)';
            setTimeout(() => this.stopButton.style.transform = '', 100);
            
            try {
                const response = await window.electron.ipcRenderer.invoke(IPC_CHANNELS.STOP_TRAINING);
                if (response.success) {
                    this.setTrainingState(false);
                } else {
                    this.showError({ message: response.message || 'Failed to stop training' });
                }
            } catch (error) {
                this.showError(error);
            }
        });

        // Settings Button with animation
        this.settingsButton.addEventListener('click', () => {
            this.settingsButton.style.transform = 'scale(0.95)';
            setTimeout(() => this.settingsButton.style.transform = '', 100);
            window.electron.ipcRenderer.send('open-settings');
        });

        document.addEventListener('DOMContentLoaded', () => {
            this.updateStatus(APP_STATES.INITIALIZING);
        });
    }

    initializeIPC() {
        window.electron.ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS, (status) => {
            this.updateStatus(status);
        });

        window.electron.ipcRenderer.on(IPC_CHANNELS.UPDATE_STATS, (stats) => {
            this.updateStats(stats);
        });

        window.electron.ipcRenderer.on(IPC_CHANNELS.ERROR, (error) => {
            this.showError(error);
        });

        window.electron.ipcRenderer.on('peer-count-update', (count) => {
            this.animateValue(this.peerCountElement, this.lastPeerCount, count, 500);
            this.lastPeerCount = count;
        });
    }

    setTrainingState(isTraining) {
        this.isTraining = isTraining;
        this.startButton.style.display = isTraining ? 'none' : 'inline-block';
        this.stopButton.style.display = isTraining ? 'inline-block' : 'none';
        this.updateStatus(isTraining ? APP_STATES.TRAINING : APP_STATES.CONNECTED);
    }

    updateStatus(status) {
        const statusMessages = {
            [APP_STATES.INITIALIZING]: 'System Initializing...',
            [APP_STATES.CONNECTING]: 'Establishing Network Connection...',
            [APP_STATES.CONNECTED]: 'Network Connected',
            [APP_STATES.TRAINING]: 'Training Active',
            [APP_STATES.PAUSED]: 'Training Paused',
            [APP_STATES.ERROR]: 'System Error'
        };

        this.statusElement.textContent = `Status: ${statusMessages[status] || status}`;
        
        const isConnected = [APP_STATES.CONNECTED, APP_STATES.TRAINING].includes(status);
        this.networkStatusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        this.networkIndicator.className = `status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`;
        
        // Add pulse animation for status changes
        this.networkIndicator.style.animation = 'none';
        this.networkIndicator.offsetHeight; // Trigger reflow
        this.networkIndicator.style.animation = 'pulse 2s infinite';
    }

    updateStats(stats) {
        const { cpu, memory } = stats;
        this.animateValue(this.cpuUsageElement, this.lastCpuUsage, cpu, 500);
        this.lastCpuUsage = cpu;

        const memoryMB = Math.round(memory / 1024 / 1024);
        this.animateValue(this.memoryUsageElement, this.lastMemoryUsage, memoryMB, 500, 'MB');
        this.lastMemoryUsage = memoryMB;
    }

    animateValue(element, start, end, duration, suffix = '%') {
        if (this.statsUpdateFrame) {
            cancelAnimationFrame(this.statsUpdateFrame);
        }

        const startTimestamp = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);

            const current = start + (end - start) * this.easeOutQuad(progress);
            element.textContent = `${current.toFixed(1)}${suffix}`;

            if (progress < 1) {
                this.statsUpdateFrame = requestAnimationFrame(animate);
            }
        };

        this.statsUpdateFrame = requestAnimationFrame(animate);
    }

    easeOutQuad(x) {
        return 1 - (1 - x) * (1 - x);
    }

    showError(error) {
        console.error('Error:', error);
        this.statusElement.textContent = `Error: ${error.message}`;
        this.statusElement.style.color = '#ef4444';
        
        // Reset after 5 seconds
        setTimeout(() => {
            this.statusElement.style.color = '';
            this.updateStatus(this.isTraining ? APP_STATES.TRAINING : APP_STATES.CONNECTED);
        }, 5000);
    }
}

// Initialize the UI manager when the window loads
window.addEventListener('load', () => {
    window.uiManager = new UIManager();
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}