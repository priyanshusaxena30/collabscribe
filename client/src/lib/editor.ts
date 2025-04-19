// Common colors for user cursors
const CURSOR_COLORS = [
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#F59E0B', // amber-500
  '#10B981', // emerald-500
  '#EF4444', // red-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
];

/**
 * Generate a consistent random color for a user
 * @param userId User ID or some unique identifier
 * @returns A color string
 */
export function generateRandomColor(userId?: number | string): string {
  if (userId !== undefined) {
    // Generate a consistent color based on userId
    const index = typeof userId === 'number' 
      ? userId % CURSOR_COLORS.length
      : userId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CURSOR_COLORS.length;
    
    return CURSOR_COLORS[index];
  }
  
  // Fallback to random color
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

/**
 * Convert a Quill Delta to plain text
 * @param delta Quill Delta object
 * @returns Plain text representation
 */
export function deltaToPlainText(delta: any): string {
  if (!delta || !delta.ops) {
    return '';
  }
  
  return delta.ops.reduce((text: string, op: any) => {
    if (typeof op.insert === 'string') {
      return text + op.insert;
    }
    return text;
  }, '');
}

/**
 * Convert plain text to a Quill Delta
 * @param text Plain text string
 * @returns Quill Delta object
 */
export function plainTextToDelta(text: string): any {
  return {
    ops: [
      { insert: text }
    ]
  };
}

/**
 * Get initials from a username
 * @param username Username string
 * @param limit Maximum number of characters
 * @returns Initials
 */
export function getUserInitials(username: string, limit: number = 2): string {
  if (!username) return '';
  
  // Split by spaces and get first character of each part
  const parts = username.split(' ');
  if (parts.length === 1) {
    // If single word, just return the first character
    return username.charAt(0).toUpperCase();
  }
  
  // Get first letter of first and last parts
  const initials = parts
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, limit);
  
  return initials;
}
