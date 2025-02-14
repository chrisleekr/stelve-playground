import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import type { WebSocket as WebSocketBase } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { logger } from './logger';

// Constants
const WEBSOCKET_PATH = '/websocket';
const DICE_MIN = 1;
const DICE_MAX = 6;

// Message types
type MessageType = 'getServerNumber' | 'getDicerNumber';

interface DiceResponse {
  message: MessageType;
  dice1: number;
  dice2: number;
}

export const GlobalThisWSS = Symbol.for('sveltekit.wss');

export interface ExtendedWebSocket extends WebSocketBase {
  socketId: string;
}

export type ExtendedWebSocketServer = WebSocketServer;

export type ExtendedGlobal = typeof globalThis & {
  [GlobalThisWSS]: ExtendedWebSocketServer;
};

// Game logic
class DiceGame {
  private static generateDiceNumber(): number {
    return Math.floor(Math.random() * (DICE_MAX - DICE_MIN + 1)) + DICE_MIN;
  }

  static rollDice(): { dice1: number; dice2: number } {
    return {
      dice1: this.generateDiceNumber(),
      dice2: this.generateDiceNumber()
    };
  }
}

// WebSocket message handler
class WebSocketMessageHandler {
  private static createResponse(type: MessageType): DiceResponse {
    const { dice1, dice2 } = DiceGame.rollDice();
    return { message: type, dice1, dice2 };
  }

  static handleMessage(ws: ExtendedWebSocket, message: string): void {
    try {
      logger.info({ socketId: ws.socketId, message }, '[wss:global] received message');

      switch (message as MessageType) {
        case 'getServerNumber':
        case 'getDicerNumber': {
          const response = this.createResponse(message as MessageType);
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

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer): void => {
  const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : null;
  if (pathname !== WEBSOCKET_PATH) return;

  const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];

  wss.handleUpgrade(req, sock, head, (ws) => {
    logger.info('[handleUpgrade] creating new connection');
    wss.emit('connection', ws as ExtendedWebSocket, req);
  });
};

export const createWSSGlobalInstance = (): ExtendedWebSocketServer => {
  const wss: ExtendedWebSocketServer = new WebSocketServer({ noServer: true });

  (globalThis as ExtendedGlobal)[GlobalThisWSS] = wss;

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.socketId = nanoid();
    logger.info({ socketId: ws.socketId }, '[wss:global] client connected');

    ws.on('message', (message: Buffer) => {
      WebSocketMessageHandler.handleMessage(ws, message.toString());
    });

    ws.on('error', (error) => {
      logger.error({ socketId: ws.socketId, error }, '[wss:global] websocket error');
    });

    ws.on('close', () => {
      logger.info({ socketId: ws.socketId }, '[wss:global] client disconnected');
    });
  });

  return wss;
};
