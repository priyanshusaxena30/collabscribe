import {
  User,
  InsertUser,
  Document,
  InsertDocument,
  DocumentCollaborator,
  InsertDocumentCollaborator,
  AiSuggestion,
  InsertAiSuggestion,
  UserPresence,
  DocumentUpdate
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Document collaborator operations
  getDocumentCollaborators(documentId: number): Promise<DocumentCollaborator[]>;
  addDocumentCollaborator(collaborator: InsertDocumentCollaborator): Promise<DocumentCollaborator>;
  removeDocumentCollaborator(documentId: number, userId: number): Promise<boolean>;
  
  // AI suggestion operations
  getDocumentSuggestions(documentId: number): Promise<AiSuggestion[]>;
  createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion>;
  updateAiSuggestionStatus(id: number, status: 'accepted' | 'rejected'): Promise<AiSuggestion | undefined>;
  
  // For real-time collaboration
  getUserPresence(documentId: number): Promise<UserPresence[]>;
  updateUserPresence(presence: UserPresence): Promise<UserPresence>;
  removeUserPresence(userId: number, documentId: number): Promise<boolean>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private documentCollaborators: Map<number, DocumentCollaborator>;
  private aiSuggestions: Map<number, AiSuggestion>;
  private userPresence: Map<string, UserPresence>; // key format: `${userId}-${documentId}`
  
  private userIdCounter: number;
  private documentIdCounter: number;
  private documentCollaboratorIdCounter: number;
  private aiSuggestionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.documentCollaborators = new Map();
    this.aiSuggestions = new Map();
    this.userPresence = new Map();
    
    this.userIdCounter = 1;
    this.documentIdCounter = 1;
    this.documentCollaboratorIdCounter = 1;
    this.aiSuggestionIdCounter = 1;
    
    // Add some initial data for testing
    this.addInitialData();
  }

  private addInitialData() {
    // Add a test user
    const user: User = {
      id: this.userIdCounter++,
      username: "demo",
      password: "demo123", // Not secure, but this is just for demo
      email: "demo@example.com",
      avatar: undefined,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    // Get documents where user is owner
    const ownedDocuments = Array.from(this.documents.values()).filter(
      (doc) => doc.ownerId === userId
    );
    
    // Get documents where user is collaborator
    const collaborations = Array.from(this.documentCollaborators.values()).filter(
      (collab) => collab.userId === userId
    );
    
    const collaborativeDocIds = collaborations.map(c => c.documentId);
    
    const collaborativeDocuments = Array.from(this.documents.values()).filter(
      (doc) => collaborativeDocIds.includes(doc.id)
    );
    
    return [...ownedDocuments, ...collaborativeDocuments];
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument: Document = {
      ...document,
      ...updates,
      updatedAt: new Date()
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Document collaborator operations
  async getDocumentCollaborators(documentId: number): Promise<DocumentCollaborator[]> {
    return Array.from(this.documentCollaborators.values()).filter(
      (collab) => collab.documentId === documentId
    );
  }

  async addDocumentCollaborator(insertCollaborator: InsertDocumentCollaborator): Promise<DocumentCollaborator> {
    const id = this.documentCollaboratorIdCounter++;
    const collaborator: DocumentCollaborator = {
      ...insertCollaborator,
      id,
      addedAt: new Date()
    };
    this.documentCollaborators.set(id, collaborator);
    return collaborator;
  }

  async removeDocumentCollaborator(documentId: number, userId: number): Promise<boolean> {
    const collaborator = Array.from(this.documentCollaborators.values()).find(
      (collab) => collab.documentId === documentId && collab.userId === userId
    );
    
    if (!collaborator) return false;
    
    return this.documentCollaborators.delete(collaborator.id);
  }

  // AI suggestion operations
  async getDocumentSuggestions(documentId: number): Promise<AiSuggestion[]> {
    return Array.from(this.aiSuggestions.values()).filter(
      (suggestion) => suggestion.documentId === documentId
    );
  }

  async createAiSuggestion(insertSuggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const id = this.aiSuggestionIdCounter++;
    const suggestion: AiSuggestion = {
      ...insertSuggestion,
      id,
      status: "pending",
      createdAt: new Date()
    };
    this.aiSuggestions.set(id, suggestion);
    return suggestion;
  }

  async updateAiSuggestionStatus(id: number, status: 'accepted' | 'rejected'): Promise<AiSuggestion | undefined> {
    const suggestion = this.aiSuggestions.get(id);
    if (!suggestion) return undefined;
    
    const updatedSuggestion: AiSuggestion = {
      ...suggestion,
      status
    };
    
    this.aiSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }

  // For real-time collaboration
  async getUserPresence(documentId: number): Promise<UserPresence[]> {
    return Array.from(this.userPresence.values()).filter(
      (presence) => presence.documentId === documentId
    );
  }

  async updateUserPresence(presence: UserPresence): Promise<UserPresence> {
    const key = `${presence.userId}-${presence.documentId}`;
    this.userPresence.set(key, presence);
    return presence;
  }

  async removeUserPresence(userId: number, documentId: number): Promise<boolean> {
    const key = `${userId}-${documentId}`;
    return this.userPresence.delete(key);
  }
}

// Export a singleton instance of the storage
export const storage = new MemStorage();
