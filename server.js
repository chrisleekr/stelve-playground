import express from 'express';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import pino from 'pino';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup logger
const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

// Constants
const WEBSOCKET_PATH = '/websocket';
const DICE_MIN = 1;
const DICE_MAX = 6;
const PORT = process.env.PORT || 3000;

// Message types
const MessageTypes = {
  GET_SERVER_NUMBER: 'getServerNumber',
  GET_DICER_NUMBER: 'getDicerNumber'
};

// Game logic
class DiceGame {
  static generateDiceNumber() {
    return Math.floor(Math.random() * (DICE_MAX - DICE_MIN + 1)) + DICE_MIN;
  }

  static rollDice() {
    return {
      dice1: this.generateDiceNumber(),
      dice2: this.generateDiceNumber()
    };
  }
}

// Express app setup
const app = express();
app.use(express.static('build'));

// Create HTTP server
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

// WebSocket server setup
const wss = new WebSocketServer({ noServer: true });

// WebSocket message handler
class WebSocketMessageHandler {
  static createResponse(type) {
    const { dice1, dice2 } = DiceGame.rollDice();
    return { message: type, dice1, dice2 };
  }

  static handleMessage(ws, message) {
    try {
      logger.info({ socketId: ws.socketId, message }, '[wss:global] received message');

      switch (message) {
        case MessageTypes.GET_SERVER_NUMBER:
        case MessageTypes.GET_DICER_NUMBER: {
          const response = this.createResponse(message);
          ws.send(JSON.stringify(response));
          break;
        }
        default:
          logger.warn({ socketId: ws.socketId, message }, '[wss:global] unknown message type');
      }
    } catch (error) {
      logger.error(
        { socketId: ws.socketId, message, error },
        '[wss:global] error handling message'
      );
      ws.send(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname !== WEBSOCKET_PATH) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws);
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.socketId = nanoid();
  logger.info({ socketId: ws.socketId }, '[wss:global] client connected');

  ws.on('message', (message) => {
    WebSocketMessageHandler.handleMessage(ws, message.toString());
  });

  ws.on('error', (error) => {
    logger.error({ socketId: ws.socketId, error }, '[wss:global] websocket error');
  });

  ws.on('close', () => {
    logger.info({ socketId: ws.socketId }, '[wss:global] client disconnected');
  });
});
