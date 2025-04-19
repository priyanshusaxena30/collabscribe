// Declare global WebSocket instance
declare global {
  interface Window {
    ws: WebSocket | null;
  }
}

/**
 * Setup WebSocket connection to the server
 * @param userId User ID to authenticate with
 * @param onMessage Callback function for handling messages
 * @param onConnect Callback function for connection established
 * @param onDisconnect Callback function for connection lost
 */
export function setupWebSocket(
  userId: number,
  onMessage: (data: any) => void,
  onConnect?: () => void,
  onDisconnect?: () => void
): void {
  // Close existing connection if any
  if (window.ws) {
    window.ws.close();
    window.ws = null;
  }

  // Determine WebSocket protocol based on page protocol
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  // Create new WebSocket connection
  const ws = new WebSocket(wsUrl);
  window.ws = ws;

  // Connection opened event handler
  ws.addEventListener("open", () => {
    console.log("WebSocket connection established");
    
    // Authenticate the connection with user ID
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "auth",
        userId: userId,
      }));
    }
    
    if (onConnect) onConnect();
  });

  // Message received event handler
  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  // Connection closed event handler
  ws.addEventListener("close", () => {
    console.log("WebSocket connection closed");
    if (onDisconnect) onDisconnect();
    
    // Attempt to reconnect after a delay
    setTimeout(() => {
      if (!window.ws || window.ws.readyState === WebSocket.CLOSED) {
        setupWebSocket(userId, onMessage, onConnect, onDisconnect);
      }
    }, 3000);
  });

  // Error event handler
  ws.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

/**
 * Close the WebSocket connection
 */
export function closeWebSocket(): void {
  if (window.ws) {
    window.ws.close();
    window.ws = null;
  }
}

/**
 * Send a message through the WebSocket connection
 * @param message Message to send
 * @returns true if message was sent, false otherwise
 */
export function sendWebSocketMessage(message: any): boolean {
  if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    window.ws.send(messageStr);
    return true;
  } catch (error) {
    console.error("Error sending WebSocket message:", error);
    return false;
  }
}
