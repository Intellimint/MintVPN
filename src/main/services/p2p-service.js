const WebSocket = require('ws');
const { EventEmitter } = require('events');

class P2PService extends EventEmitter {
    constructor(mainWindow) {
        super();
        this.mainWindow = mainWindow;
        this.peers = new Map();
        this.server = null;
        this.peerId = this.generatePeerId();
    }

    generatePeerId() {
        return Math.random().toString(36).substr(2, 9);
    }

    async init() {
        try {
            // Create WebSocket server for accepting connections
            this.server = new WebSocket.Server({ port: 0 }); // Port 0 means random available port
            
            const port = this.server.address().port;
            console.log(`P2P service listening on port ${port}`);

            this.server.on('connection', (ws) => {
                this.handleConnection(ws);
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                this.mainWindow.webContents.send('error', {
                    message: 'P2P connection error',
                    details: error.message
                });
            });

            return true;
        } catch (error) {
            console.error('P2P initialization error:', error);
            throw error;
        }
    }

    handleConnection(ws) {
        const peerId = this.generatePeerId();
        this.peers.set(peerId, ws);
        this.updatePeerCount();

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received message:', data);
                this.emit('message', data);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        });

        ws.on('close', () => {
            this.peers.delete(peerId);
            this.updatePeerCount();
        });

        ws.on('error', (error) => {
            console.error(`Peer ${peerId} error:`, error);
            this.peers.delete(peerId);
            this.updatePeerCount();
        });
    }

    updatePeerCount() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('peer-count-update', this.peers.size);
        }
    }

    async broadcast(message) {
        const messageStr = JSON.stringify(message);
        for (const [peerId, ws] of this.peers.entries()) {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                }
            } catch (err) {
                console.error(`Failed to send message to peer ${peerId}:`, err);
            }
        }
    }

    async stop() {
        if (this.server) {
            for (const [_, ws] of this.peers.entries()) {
                ws.close();
            }
            this.peers.clear();
            this.updatePeerCount();
            
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.server = null;
                    resolve();
                });
            });
        }
    }

    getPeerCount() {
        return this.peers.size;
    }
}

module.exports = P2PService;