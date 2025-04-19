import { useEffect, useState, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { UserContext } from "@/App";
import { Sidebar } from "@/components/Sidebar";
import { DocumentHeader } from "@/components/DocumentHeader";
import { DocumentEditor } from "@/components/DocumentEditor";
import { CollaborationPanel } from "@/components/CollaborationPanel";
import { AISuggestionsPanel } from "@/components/AISuggestionsPanel";
import { useToast } from "@/hooks/use-toast";
import { setupWebSocket, closeWebSocket } from "@/lib/websocket";
import useMediaQuery from "@/hooks/use-mobile";

export default function Editor() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const documentId = Number(id);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // State for user presence and document data
  const [document, setDocument] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [editorContent, setEditorContent] = useState<any>({ ops: [] });
  const [showAIPanel, setShowAIPanel] = useState<boolean>(!isMobile);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [aiMode, setAiMode] = useState<string>("balanced");
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
  }, [user, navigate]);

  // Initialize WebSocket connection when component mounts
  useEffect(() => {
    if (!user || !documentId) return;

    // Set up event listeners for WebSocket
    const handleMessage = (data: any) => {
      switch (data.type) {
        case "auth_success":
          // After successful auth, join the document
          window.ws?.send(JSON.stringify({
            type: "join_document",
            documentId,
          }));
          break;
          
        case "document_data":
          // Initial document data received
          setDocument(data.document);
          setEditorContent(data.document.content || { ops: [] });
          setActiveUsers(data.activeUsers || []);
          setSuggestions(data.suggestions || []);
          break;
          
        case "user_joined":
          // New user joined the document
          setActiveUsers(prev => {
            const exists = prev.some(u => u.userId === data.presence.userId);
            if (exists) {
              return prev.map(u => u.userId === data.presence.userId ? data.presence : u);
            } else {
              return [...prev, data.presence];
            }
          });
          
          // Show toast for new user
          if (data.presence.userId !== user.id) {
            toast({
              title: "User joined",
              description: `${data.presence.username} joined the document`,
            });
          }
          break;
          
        case "user_left":
          // User left the document
          setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
          break;
          
        case "cursor_update":
          // Update user cursor position
          setActiveUsers(prev => 
            prev.map(u => 
              u.userId === data.userId 
                ? { ...u, cursorPosition: data.cursorPosition }
                : u
            )
          );
          break;
          
        case "document_updated":
          // Document content updated
          if (data.userId !== user.id) {
            // Apply remote operations to editor content
            // This will be handled by Quill directly
          }
          break;
          
        case "ai_suggestions":
          // AI generated new suggestions
          setSuggestions(data.suggestions);
          break;
          
        case "suggestion_status_updated":
          // A suggestion was accepted or rejected
          setSuggestions(prev => 
            prev.map(s => 
              s.id === data.suggestion.id ? data.suggestion : s
            )
          );
          break;
          
        case "error":
          // Error message from the server
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
          break;
      }
    };

    // Initialize WebSocket connection
    setupWebSocket(user.id, handleMessage, () => setIsConnected(true), () => setIsConnected(false));

    // Cleanup WebSocket connection when component unmounts
    return () => {
      closeWebSocket();
    };
  }, [user, documentId, toast]);

  // Fetch document query (as a backup if WebSocket fails)
  const documentQuery = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    enabled: !!documentId && !document, // Only fetch if document isn't already loaded via WebSocket
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch document');
      return res.json();
    },
    onSuccess: (data) => {
      if (!document) {
        setDocument(data);
        setEditorContent(data.content || { ops: [] });
      }
    }
  });

  // Handle generating AI suggestions
  const handleGenerateSuggestions = async () => {
    if (!window.ws || !isConnected) {
      toast({
        title: "Connection error",
        description: "Unable to request AI suggestions. Please check your connection.",
        variant: "destructive",
      });
      return;
    }

    window.ws.send(JSON.stringify({
      type: "request_ai_suggestions",
      content: editorContent,
      mode: aiMode
    }));

    toast({
      title: "Generating suggestions",
      description: "AI is analyzing your document and generating suggestions..."
    });
  };

  // Handle document title update
  const handleTitleChange = (newTitle: string) => {
    if (!document) return;
    
    // Update locally
    setDocument({ ...document, title: newTitle });
    
    // Update on server
    fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
      credentials: 'include',
    }).catch(error => {
      toast({
        title: "Error saving title",
        description: error.message,
        variant: "destructive",
      });
    });
  };

  // Handle content change from the editor
  const handleContentChange = (content: any, delta: any, source: string) => {
    if (source !== 'user') return;
    
    // Update local state
    setEditorContent(content);
    
    // Send update via WebSocket
    if (window.ws && isConnected) {
      window.ws.send(JSON.stringify({
        type: "document_update",
        operations: delta.ops,
        version: Date.now() // Simple versioning
      }));
    }
  };

  // Handle cursor position change
  const handleCursorChange = (cursorPosition: any) => {
    if (window.ws && isConnected) {
      window.ws.send(JSON.stringify({
        type: "cursor_position",
        cursorPosition
      }));
    }
  };

  // Handle AI suggestion acceptance/rejection
  const handleSuggestionAction = (suggestionId: number, status: 'accepted' | 'rejected') => {
    if (window.ws && isConnected) {
      window.ws.send(JSON.stringify({
        type: "update_suggestion_status",
        suggestionId,
        status
      }));
    }
  };

  // Show loading state if not ready
  if (!user || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (hidden on mobile) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar user={user} activeDocumentId={documentId} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Document header with title, collaborators, etc. */}
        <DocumentHeader 
          document={document}
          activeUsers={activeUsers}
          onTitleChange={handleTitleChange}
          onMobileMenuToggle={() => {}}
          onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
          isConnected={isConnected}
        />

        {/* Document editor */}
        <div className="flex-1 overflow-y-auto">
          <DocumentEditor 
            content={editorContent}
            onContentChange={handleContentChange}
            onCursorChange={handleCursorChange}
            activeUsers={activeUsers}
            currentUser={user}
          />
        </div>

        {/* Collaboration status panel */}
        <CollaborationPanel activeUsers={activeUsers} isConnected={isConnected} />
      </div>

      {/* AI Suggestions panel (hidden on mobile unless toggled) */}
      {showAIPanel && (
        <div className={`${isMobile ? 'fixed inset-0 z-50 bg-white' : 'hidden lg:block lg:flex-shrink-0 w-80'} border-l border-gray-200 bg-white overflow-y-auto`}>
          <AISuggestionsPanel 
            suggestions={suggestions}
            onClose={() => setShowAIPanel(false)}
            onGenerateSuggestions={handleGenerateSuggestions}
            onSuggestionAction={handleSuggestionAction}
            aiMode={aiMode}
            onAiModeChange={setAiMode}
          />
        </div>
      )}
    </div>
  );
}
