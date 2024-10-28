// Network Constants
const NETWORK = {
    P2P_PORT: 6881,
    BOOTSTRAP_NODES: [
        '/dns4/node1.infinitegpt.org/tcp/6881/p2p/QmBootstrapNode1',
        '/dns4/node2.infinitegpt.org/tcp/6881/p2p/QmBootstrapNode2'
    ],
    CONNECTION_TIMEOUT: 30000
};

// AI Training Constants
const AI = {
    BATCH_SIZE: 32,
    LEARNING_RATE: 0.001,
    MAX_SEQUENCE_LENGTH: 512,
    MIN_CPU_THRESHOLD: 10, // Minimum CPU % required to start training
    MAX_CPU_USAGE: 80     // Maximum CPU % that can be used
};

// Application States
const APP_STATES = {
    INITIALIZING: 'initializing',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    TRAINING: 'training',
    PAUSED: 'paused',
    ERROR: 'error'
};

// IPC Channel Names
const IPC_CHANNELS = {
    UPDATE_STATUS: 'update-status',
    UPDATE_STATS: 'update-stats',
    START_TRAINING: 'start-training',
    STOP_TRAINING: 'stop-training',
    ERROR: 'error-occurred'
};

module.exports = {
    NETWORK,
    AI,
    APP_STATES,
    IPC_CHANNELS
};