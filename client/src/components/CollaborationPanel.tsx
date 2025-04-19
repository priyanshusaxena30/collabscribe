import { useState, useEffect } from "react";

interface CollaborationPanelProps {
  activeUsers: any[];
  isConnected: boolean;
}

export function CollaborationPanel({ activeUsers, isConnected }: CollaborationPanelProps) {
  const [showConnectionToast, setShowConnectionToast] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  
  // Show connection toast when connection status changes
  useEffect(() => {
    if (isConnected) {
      setShowConnectionToast(true);
      const timer = setTimeout(() => {
        setShowConnectionToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);
  
  // Find a random active user for the "typing" indicator
  useEffect(() => {
    if (activeUsers.length > 1) {
      const otherUsers = activeUsers.filter(user => !user.isCurrentUser);
      if (otherUsers.length > 0) {
        const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        setEditingMessage(`${randomUser.username} is editing`);
        
        const timer = setTimeout(() => {
          setEditingMessage(null);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [activeUsers]);

  return (
    <>
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-2">
          <div className="flex items-center text-xs text-gray-500 space-x-4">
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${activeUsers.length > 0 ? 'bg-green-500' : 'bg-gray-400'} mr-1`}></div>
              <span>{activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} editing</span>
            </div>
            <div className="flex items-center">
              <span className="material-icons text-xs mr-1">wifi</span>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {editingMessage && (
              <div className="flex items-center">
                <span>{editingMessage}</span>
                <div className="typing-indicator ml-1">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Connection Toast */}
      {showConnectionToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center space-x-2 z-20">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-sm font-medium">Connected to server</span>
        </div>
      )}
    </>
  );
}
