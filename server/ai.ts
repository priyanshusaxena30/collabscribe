import OpenAI from "openai";
import { AiSuggestionRequest, AiSuggestion, InsertAiSuggestion } from "@shared/schema";
import { storage } from "./storage";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "your-api-key" });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface SuggestionResponse {
  type: string;
  original_text?: string;
  suggested_text: string;
  explanation: string;
}

/**
 * Generate writing suggestions based on the document content
 */
export async function generateSuggestions(
  request: AiSuggestionRequest
): Promise<AiSuggestion[]> {
  try {
    const { documentId, content, mode } = request;

    // Convert Quill delta content to plain text for AI processing
    const plainText = deltaToPlainText(content);
    
    if (!plainText || plainText.trim().length === 0) {
      return [];
    }

    // Create appropriate system prompt based on mode
    const systemPrompt = createSystemPrompt(mode);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: plainText,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const suggestions = parseSuggestions(response.choices[0].message.content, documentId);
    
    // Save suggestions to storage
    const savedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        return await storage.createAiSuggestion(suggestion);
      })
    );

    return savedSuggestions;
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    return [];
  }
}

/**
 * Helper function to convert Quill delta to plain text
 */
function deltaToPlainText(delta: any): string {
  if (!delta || !delta.ops) {
    return "";
  }

  return delta.ops.reduce((text: string, op: any) => {
    if (typeof op.insert === 'string') {
      return text + op.insert;
    }
    return text;
  }, "");
}

/**
 * Create a system prompt based on the selected mode
 */
function createSystemPrompt(mode: string): string {
  const basePrompt = "You are an AI writing assistant tasked with improving a document. ";
  
  switch (mode) {
    case "grammar":
      return basePrompt + "Focus on grammar, spelling, and punctuation issues. Provide specific suggestions to improve these aspects. Respond with JSON in the following format: { 'suggestions': [{ 'type': 'grammar', 'original_text': 'text with error', 'suggested_text': 'corrected text', 'explanation': 'explanation of the change' }] }";
    
    case "content":
      return basePrompt + "Focus on content improvements like clarity, persuasiveness, and information completeness. Suggest additional points, examples, or evidence that could strengthen the document. Respond with JSON in the following format: { 'suggestions': [{ 'type': 'content', 'suggested_text': 'suggested addition or modification', 'explanation': 'explanation of why this would improve the document' }] }";
    
    case "structure":
      return basePrompt + "Focus on document structure, organization, and flow. Suggest improvements to paragraph structure, section organization, or logical flow. Respond with JSON in the following format: { 'suggestions': [{ 'type': 'structure', 'suggested_text': 'suggestion for restructuring', 'explanation': 'explanation of why this would improve the document' }] }";
    
    default: // balanced
      return basePrompt + "Provide a balanced set of suggestions covering grammar, content, and structure. Limit to 3-5 most important suggestions. Respond with JSON in the following format: { 'suggestions': [{ 'type': 'grammar|content|structure', 'original_text': 'original text if applicable', 'suggested_text': 'suggested text', 'explanation': 'explanation of the suggestion' }] }";
  }
}

/**
 * Parse the AI response and convert to suggestion objects
 */
function parseSuggestions(responseContent: string, documentId: number): InsertAiSuggestion[] {
  try {
    const parsed = JSON.parse(responseContent);
    
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      return [];
    }

    return parsed.suggestions.map((suggestion: SuggestionResponse) => ({
      documentId,
      type: suggestion.type,
      originalText: suggestion.original_text || null,
      suggestedText: suggestion.suggested_text,
    }));
  } catch (error) {
    console.error("Error parsing AI suggestions:", error);
    return [];
  }
}
