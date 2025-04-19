import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Share, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattingToolbar } from "./FormattingToolbar";

interface DocumentHeaderProps {
  document: any;
  activeUsers: any[];
  onTitleChange: (title: string) => void;
  onMobileMenuToggle: () => void;
  onToggleAIPanel: () => void;
  isConnected: boolean;
}

export function DocumentHeader({
  document,
  activeUsers,
  onTitleChange,
  onMobileMenuToggle,
  onToggleAIPanel,
  isConnected
}: DocumentHeaderProps) {
  const [title, setTitle] = useState(document?.title || "Untitled Document");
  const [showSaved, setShowSaved] = useState(false);
  const titleTimeoutRef = useRef<any>(null);
  const [location, navigate] = useLocation();

  // Update title when document changes
  useEffect(() => {
    if (document?.title) {
      setTitle(document.title);
    }
  }, [document]);

  // Handle title change with debounce
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Clear existing timeout
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }
    
    // Set a new timeout to update title after typing stops
    titleTimeoutRef.current = setTimeout(() => {
      onTitleChange(newTitle);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }, 1000);
  };

  return (
    <div className="relative border-b border-gray-200 bg-white">
      {/* Mobile header */}
      <div className="md:hidden flex items-center px-4 py-2">
        <button 
          className="text-gray-500 hover:text-gray-700"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-2 flex items-center space-x-2">
          <span className="material-icons text-primary">edit</span>
          <span className="text-lg font-semibold">CollabAI Writer</span>
        </div>
      </div>

      {/* Document Title and Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            className="text-lg font-semibold border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 px-0"
            value={title}
            onChange={handleTitleChange}
            placeholder="Document Title"
          />
          {showSaved && <span className="text-xs text-gray-500">Saved</span>}
        </div>
        <div className="flex items-center space-x-3">
          {/* Active Users */}
          <div className="flex -space-x-2 overflow-hidden">
            {activeUsers.slice(0, 3).map((user, index) => (
              <div 
                key={user.userId}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-primary text-white flex items-center justify-center font-medium"
                style={{ 
                  backgroundColor: 
                    index === 0 ? 'hsl(var(--primary))' : 
                    index === 1 ? 'hsl(var(--accent))' : 
                    'hsl(142, 71%, 45%)' // green-500 equivalent
                }}
                title={user.username}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            ))}
            {activeUsers.length > 3 && (
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-300 text-gray-800 flex items-center justify-center font-medium">
                +{activeUsers.length - 3}
              </div>
            )}
          </div>
          
          {/* Share Button */}
          <Button 
            size="sm"
            className="hidden md:inline-flex items-center"
            onClick={() => {
              // Copy the current URL to clipboard
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }}
          >
            <Share className="mr-1 h-4 w-4" />
            Share
          </Button>
          
          {/* AI Button on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={onToggleAIPanel}
          >
            <span className="material-icons text-accent">psychology</span>
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <FormattingToolbar 
        onToggleAIPanel={onToggleAIPanel}
      />
    </div>
  );
}
