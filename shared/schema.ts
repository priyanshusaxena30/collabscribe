import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  avatar: true,
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Untitled Document"),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  content: json("content").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  ownerId: true,
  content: true,
});

export const documentCollaborators = pgTable("document_collaborators", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  permission: text("permission").default("read").notNull(), // read, write, admin
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertDocumentCollaboratorSchema = createInsertSchema(documentCollaborators).pick({
  documentId: true,
  userId: true,
  permission: true,
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  type: text("type").notNull(), // grammar, content, structure, etc.
  originalText: text("original_text"),
  suggestedText: text("suggested_text").notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions).pick({
  documentId: true,
  type: true,
  originalText: true,
  suggestedText: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentCollaborator = typeof documentCollaborators.$inferSelect;
export type InsertDocumentCollaborator = z.infer<typeof insertDocumentCollaboratorSchema>;

export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAiSuggestion = z.infer<typeof insertAiSuggestionSchema>;

// Additional types for websocket communication
export type UserPresence = {
  userId: number;
  username: string;
  avatar?: string;
  cursorPosition?: CursorPosition;
  lastActivity: Date;
  documentId: number;
};

export type CursorPosition = {
  index: number;
  length: number;
};

export type DocumentUpdate = {
  documentId: number;
  userId: number;
  operations: any[]; // For storing delta operations from Quill
  version: number;
};

export type EditorState = {
  users: Record<number, UserPresence>;
  document: Document;
  suggestions: AiSuggestion[];
};

export type AiSuggestionRequest = {
  documentId: number;
  content: any; // The current document content
  cursorPosition?: CursorPosition;
  mode: 'balanced' | 'grammar' | 'content' | 'structure'; // AI assistant mode
};
