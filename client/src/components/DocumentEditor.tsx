import { useRef, useEffect, useState } from "react";
import { TextEditor } from "./TextEditor";

interface DocumentEditorProps {
  content: any;
  onContentChange: (content: any, delta: any, source: string) => void;
  onCursorChange: (selection: any) => void;
  activeUsers: any[];
  currentUser: any;
}

export function DocumentEditor({
  content,
  onContentChange,
  onCursorChange,
  activeUsers,
  currentUser
}: DocumentEditorProps) {
  const editorRef = useRef<any>(null);
  
  // Handle cursor updates from other users
  useEffect(() => {
    if (!editorRef.current) return;
    
    // The actual implementation will be handled by the Quill editor
    // in the TextEditor component
  }, [activeUsers]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <TextEditor
        ref={editorRef}
        value={content}
        onChange={onContentChange}
        onSelectionChange={onCursorChange}
        placeholder="Start writing..."
        otherUsers={activeUsers.filter(user => user.userId !== currentUser.id)}
      />
    </div>
  );
}
