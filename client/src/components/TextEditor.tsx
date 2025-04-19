import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { generateRandomColor } from "@/lib/editor";

// Add global styles for cursor
const cursorStyles = `
  .ql-cursor {
    display: inline-block;
    width: 2px;
    height: 1.2em;
    margin-left: -1px;
    position: relative;
    animation: blink 1s step-end infinite;
  }
  
  @keyframes blink {
    from, to { opacity: 1; }
    50% { opacity: 0; }
  }
  
  .ql-cursor-name {
    position: absolute;
    top: -1.5em;
    left: 0;
    font-size: 0.75rem;
    background-color: inherit;
    color: white;
    padding: 0.1em 0.3em;
    border-radius: 0.2em;
    white-space: nowrap;
  }
`;

interface TextEditorProps {
  value: any;
  onChange: (content: any, delta: any, source: string) => void;
  onSelectionChange: (selection: any) => void;
  placeholder?: string;
  otherUsers: any[];
}

// Add a style tag for cursor
if (typeof document !== 'undefined') {
  const styleTag = document.createElement("style");
  styleTag.type = "text/css";
  styleTag.appendChild(document.createTextNode(cursorStyles));
  document.head.appendChild(styleTag);
}

// Custom Quill formats and modules
const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link', 'image'
];

export const TextEditor = forwardRef<any, TextEditorProps>(({
  value,
  onChange,
  onSelectionChange,
  placeholder = "Start writing...",
  otherUsers
}, ref) => {
  const quillRef = useRef<ReactQuill>(null);
  const [editorContent, setEditorContent] = useState(value || '');
  const [userCursors, setUserCursors] = useState<any>({});
  
  // Expose quill instance via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => quillRef.current?.getEditor(),
    getContent: () => editorContent
  }));
  
  // Update editor content when value prop changes
  useEffect(() => {
    if (value) {
      setEditorContent(value);
    }
  }, [value]);
  
  // Handle other users' cursor positions
  useEffect(() => {
    if (!quillRef.current) return;
    
    const quill = quillRef.current.getEditor();
    const cursors: any = {};
    
    // Remove existing cursors
    document.querySelectorAll('.ql-cursor').forEach(el => el.remove());
    
    // Add cursors for other users
    otherUsers.forEach(user => {
      if (!user.cursorPosition) return;
      
      // Create a unique color for this user if not already assigned
      if (!userCursors[user.userId]) {
        userCursors[user.userId] = generateRandomColor();
      }
      
      // Get the color for this user
      const color = userCursors[user.userId] || '#3B82F6';
      
      // Insert cursor marker at position
      const cursorPosition = user.cursorPosition.index || 0;
      
      // Only insert if position is valid
      if (cursorPosition <= quill.getLength()) {
        const cursorElement = document.createElement('span');
        cursorElement.className = 'ql-cursor';
        cursorElement.style.backgroundColor = color;
        cursorElement.setAttribute('data-user-id', user.userId.toString());
        
        // Add user name tooltip
        const nameElement = document.createElement('span');
        nameElement.className = 'ql-cursor-name';
        nameElement.textContent = user.username;
        nameElement.style.backgroundColor = color;
        
        cursorElement.appendChild(nameElement);
        
        // Store for future reference
        cursors[user.userId] = {
          element: cursorElement,
          position: cursorPosition,
          color
        };
        
        // Use Quill API to insert
        const currentContents = quill.getContents();
        try {
          // Insert cursor at position
          // In a real implementation, would need more sophisticated handling
          // to properly place and maintain cursors during edits
        } catch (error) {
          console.error('Error inserting cursor:', error);
        }
      }
    });
    
    // Save updated cursor data
    setUserCursors(prev => ({ ...prev, ...cursors }));
    
    // Cleanup function
    return () => {
      document.querySelectorAll('.ql-cursor').forEach(el => el.remove());
    };
  }, [otherUsers]);
  
  // Quill toolbar configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ]
  };
  
  // Handle content change
  const handleChange = (content: any, delta: any, source: any) => {
    setEditorContent(content);
    onChange(content, delta, source);
  };
  
  // Handle selection change
  const handleSelectionChange = (selection: any) => {
    if (selection) {
      onSelectionChange(selection);
    }
  };

  // Load React-Quill only on client-side
  if (typeof window === 'undefined') {
    return <div className="editor-loading">Loading editor...</div>;
  }

  return (
    <div className="editor-content prose prose-sm sm:prose lg:prose-lg mx-auto">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorContent}
        onChange={handleChange}
        onChangeSelection={handleSelectionChange}
        formats={formats}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  );
});

TextEditor.displayName = 'TextEditor';
