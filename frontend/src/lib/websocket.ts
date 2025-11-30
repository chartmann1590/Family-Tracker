type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private url: string = '';
  private shouldReconnect: boolean = true;

  connect(token: string) {
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://localhost:3000/ws`;
    this.url = `${wsUrl}?token=${token}`;
    this.shouldReconnect = true;
    this.createConnection();
  }

  private createConnection() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.emit('connected', {});
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);

          if (message.type) {
            this.emit(message.type, message.data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected', {});
        this.ws = null;

        // Attempt to reconnect
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            this.createConnection();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }
}

export const wsClient = new WebSocketClient();

export default wsClient;
