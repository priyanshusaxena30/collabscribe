import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertDocumentSchema, 
  insertDocumentCollaboratorSchema,
  Document,
  UserPresence,
  DocumentUpdate,
  AiSuggestionRequest
} from "@shared/schema";
import { generateSuggestions } from "./ai";

// WebSocket connections store
interface ConnectedClient {
  userId: number;
  ws: WebSocket;
  documentId?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const clients: ConnectedClient[] = [];

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Store client connection temporarily without userId
    const client: ConnectedClient = { userId: -1, ws };
    clients.push(client);
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different types of messages
        switch (data.type) {
          case 'auth':
            // Authenticate user and update client info
            const userId = Number(data.userId);
            const user = await storage.getUser(userId);
            
            if (user) {
              client.userId = userId;
              console.log(`User ${userId} authenticated`);
              
              // Send confirmation back to client
              ws.send(JSON.stringify({ type: 'auth_success', userId }));
            } else {
              ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid user' }));
            }
            break;
            
          case 'join_document':
            // User joins a document for editing
            if (client.userId === -1) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
              break;
            }
            
            const documentId = Number(data.documentId);
            const document = await storage.getDocument(documentId);
            
            if (!document) {
              ws.send(JSON.stringify({ type: 'error', message: 'Document not found' }));
              break;
            }
            
            // Update client's current document
            client.documentId = documentId;
            
            // Update user presence
            const presence: UserPresence = {
              userId: client.userId,
              username: (await storage.getUser(client.userId))?.username || 'Unknown',
              documentId,
              lastActivity: new Date(),
              cursorPosition: data.cursorPosition
            };
            
            await storage.updateUserPresence(presence);
            
            // Get all data needed for the editor
            const collaborators = await storage.getDocumentCollaborators(documentId);
            const suggestions = await storage.getDocumentSuggestions(documentId);
            const activeUsers = await storage.getUserPresence(documentId);
            
            // Send document data to the client
            ws.send(JSON.stringify({
              type: 'document_data',
              document,
              collaborators,
              suggestions,
              activeUsers
            }));
            
            // Notify other clients about new user
            broadcastToDocument(documentId, {
              type: 'user_joined',
              presence
            }, client.userId);
            
            break;
            
          case 'leave_document':
            if (client.documentId) {
              await storage.removeUserPresence(client.userId, client.documentId);
              
              // Notify other clients
              broadcastToDocument(client.documentId, {
                type: 'user_left',
                userId: client.userId
              }, client.userId);
              
              client.documentId = undefined;
            }
            break;
            
          case 'cursor_position':
            if (client.documentId) {
              const presence: UserPresence = {
                userId: client.userId,
                username: (await storage.getUser(client.userId))?.username || 'Unknown',
                documentId: client.documentId,
                lastActivity: new Date(),
                cursorPosition: data.cursorPosition
              };
              
              await storage.updateUserPresence(presence);
              
              // Broadcast cursor position to other clients
              broadcastToDocument(client.documentId, {
                type: 'cursor_update',
                userId: client.userId,
                cursorPosition: data.cursorPosition
              }, client.userId);
            }
            break;
            
          case 'document_update':
            if (client.documentId) {
              const update: DocumentUpdate = {
                documentId: client.documentId,
                userId: client.userId,
                operations: data.operations,
                version: data.version
              };
              
              // Update document in storage
              const document = await storage.getDocument(client.documentId);
              if (document) {
                const content = applyOperationsToContent(document.content, update.operations);
                await storage.updateDocument(client.documentId, { content });
                
                // Broadcast update to other clients
                broadcastToDocument(client.documentId, {
                  type: 'document_updated',
                  operations: update.operations,
                  userId: client.userId,
                  version: update.version
                }, client.userId);
              }
            }
            break;
            
          case 'request_ai_suggestions':
            if (client.documentId) {
              const suggestionRequest: AiSuggestionRequest = {
                documentId: client.documentId,
                content: data.content,
                cursorPosition: data.cursorPosition,
                mode: data.mode || 'balanced'
              };
              
              // Generate suggestions
              const suggestions = await generateSuggestions(suggestionRequest);
              
              // Send suggestions back to the client
              ws.send(JSON.stringify({
                type: 'ai_suggestions',
                suggestions
              }));
              
              // Notify other clients about new suggestions
              broadcastToDocument(client.documentId, {
                type: 'new_suggestions_available',
                count: suggestions.length
              }, client.userId);
            }
            break;
            
          case 'update_suggestion_status':
            if (client.documentId) {
              const suggestionId = Number(data.suggestionId);
              const status = data.status as 'accepted' | 'rejected';
              
              const updatedSuggestion = await storage.updateAiSuggestionStatus(suggestionId, status);
              
              if (updatedSuggestion) {
                // Broadcast to all clients in the document
                broadcastToDocument(client.documentId, {
                  type: 'suggestion_status_updated',
                  suggestion: updatedSuggestion
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', async () => {
      // Handle user disconnection
      const index = clients.findIndex(c => c.ws === ws);
      
      if (index !== -1) {
        const client = clients[index];
        
        // Remove user presence if they were editing a document
        if (client.documentId !== undefined && client.userId !== -1) {
          await storage.removeUserPresence(client.userId, client.documentId);
          
          // Notify other clients about user leaving
          broadcastToDocument(client.documentId, {
            type: 'user_left',
            userId: client.userId
          }, client.userId);
        }
        
        // Remove client from array
        clients.splice(index, 1);
      }
      
      console.log('WebSocket client disconnected');
    });
  });
  
  // Helper function to broadcast to all clients editing a specific document
  function broadcastToDocument(documentId: number, data: any, excludeUserId?: number) {
    clients.forEach(client => {
      if (
        client.documentId === documentId && 
        client.ws.readyState === WebSocket.OPEN &&
        (excludeUserId === undefined || client.userId !== excludeUserId)
      ) {
        client.ws.send(JSON.stringify(data));
      }
    });
  }
  
  // Helper function to apply operations to document content
  function applyOperationsToContent(content: any, operations: any[]): any {
    // This is a simple implementation assuming content is a Quill delta
    // A real implementation would need more sophisticated delta handling
    if (!content.ops) {
      content = { ops: [] };
    }
    
    // Apply each operation
    operations.forEach(op => {
      // In a real app, would use Quill's delta library for proper transformation
      if (op.insert) {
        content.ops.push({ insert: op.insert, attributes: op.attributes });
      } else if (op.delete) {
        content.ops.push({ delete: op.delete });
      } else if (op.retain) {
        content.ops.push({ retain: op.retain, attributes: op.attributes });
      }
    });
    
    return content;
  }
  
  // REST API routes
  
  // User routes
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating user' });
    }
  });
  
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // In a real app, would create a session token here
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: 'Login error' });
    }
  });
  
  // Document routes
  app.get('/api/documents', async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Valid userId is required' });
      }
      
      const documents = await storage.getDocumentsByUserId(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching documents' });
    }
  });
  
  app.get('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching document' });
    }
  });
  
  app.post('/api/documents', async (req: Request, res: Response) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid document data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating document' });
    }
  });
  
  app.patch('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const updates = req.body;
      const updatedDocument = await storage.updateDocument(id, updates);
      
      if (!updatedDocument) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ message: 'Error updating document' });
    }
  });
  
  app.delete('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const success = await storage.deleteDocument(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting document' });
    }
  });
  
  // Collaborator routes
  app.get('/api/documents/:id/collaborators', async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const collaborators = await storage.getDocumentCollaborators(documentId);
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching collaborators' });
    }
  });
  
  app.post('/api/documents/:id/collaborators', async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const collaboratorData = insertDocumentCollaboratorSchema.parse({
        ...req.body,
        documentId
      });
      
      const collaborator = await storage.addDocumentCollaborator(collaboratorData);
      res.status(201).json(collaborator);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid collaborator data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error adding collaborator' });
    }
  });
  
  app.delete('/api/documents/:documentId/collaborators/:userId', async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const userId = Number(req.params.userId);
      
      if (isNaN(documentId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      const success = await storage.removeDocumentCollaborator(documentId, userId);
      
      if (!success) {
        return res.status(404).json({ message: 'Collaborator not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Error removing collaborator' });
    }
  });
  
  // AI Suggestion routes
  app.get('/api/documents/:id/suggestions', async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const suggestions = await storage.getDocumentSuggestions(documentId);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching suggestions' });
    }
  });
  
  app.post('/api/documents/:id/generate-suggestions', async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const suggestionRequest: AiSuggestionRequest = {
        documentId,
        content: document.content,
        mode: req.body.mode || 'balanced'
      };
      
      const suggestions = await generateSuggestions(suggestionRequest);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: 'Error generating suggestions' });
    }
  });
  
  app.patch('/api/suggestions/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid suggestion ID' });
      }
      
      const status = req.body.status;
      
      if (status !== 'accepted' && status !== 'rejected') {
        return res.status(400).json({ message: 'Status must be either "accepted" or "rejected"' });
      }
      
      const suggestion = await storage.updateAiSuggestionStatus(id, status);
      
      if (!suggestion) {
        return res.status(404).json({ message: 'Suggestion not found' });
      }
      
      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ message: 'Error updating suggestion' });
    }
  });

  return httpServer;
}
