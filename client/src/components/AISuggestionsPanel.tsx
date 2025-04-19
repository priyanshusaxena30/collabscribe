import { useState, useEffect } from "react";
import { X, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AISuggestionsPanelProps {
  suggestions: any[];
  onClose: () => void;
  onGenerateSuggestions: () => void;
  onSuggestionAction: (id: number, action: 'accepted' | 'rejected') => void;
  aiMode: string;
  onAiModeChange: (mode: string) => void;
}

export function AISuggestionsPanel({
  suggestions,
  onClose,
  onGenerateSuggestions,
  onSuggestionAction,
  aiMode,
  onAiModeChange
}: AISuggestionsPanelProps) {
  const [recentActions, setRecentActions] = useState<any[]>([]);
  
  // Update recent actions when a suggestion status changes
  useEffect(() => {
    const updatedSuggestions = suggestions.filter(s => s.status !== 'pending');
    if (updatedSuggestions.length > 0) {
      // Get the most recent actions
      const actions = updatedSuggestions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
        .map(s => ({
          id: s.id,
          type: s.type,
          status: s.status,
          text: s.suggestedText.length > 30 
            ? s.suggestedText.substring(0, 30) + '...' 
            : s.suggestedText,
          timestamp: new Date(s.createdAt)
        }));
      
      setRecentActions(actions);
    }
  }, [suggestions]);
  
  // Get pending suggestions
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  
  // Handle suggestion action (accept/reject)
  const handleSuggestionAction = (id: number, action: 'accepted' | 'rejected') => {
    onSuggestionAction(id, action);
  };
  
  // Format suggestion types to be more user-friendly
  const formatSuggestionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  // Get appropriate color classes based on suggestion type
  const getSuggestionTypeClasses = (type: string) => {
    switch (type.toLowerCase()) {
      case 'grammar':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-100',
          badge: 'bg-purple-100 text-purple-800',
          hover: 'hover:bg-purple-100'
        };
      case 'content':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          badge: 'bg-blue-100 text-blue-800',
          hover: 'hover:bg-blue-100'
        };
      case 'structure':
        return {
          bg: 'bg-green-50',
          border: 'border-green-100',
          badge: 'bg-green-100 text-green-800',
          hover: 'hover:bg-green-100'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-100',
          badge: 'bg-gray-100 text-gray-800',
          hover: 'hover:bg-gray-100'
        };
    }
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="material-icons text-accent">psychology</span>
            <h3 className="ml-2 text-lg font-medium text-gray-900">AI Assistant</h3>
          </div>
          <button 
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <h4 className="text-sm font-medium text-gray-700">Suggestions</h4>
        
        {pendingSuggestions.length === 0 ? (
          <div className="mt-2 p-4 text-center border border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">No suggestions yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Generate suggestions by clicking the button below
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {pendingSuggestions.map(suggestion => {
              const typeClasses = getSuggestionTypeClasses(suggestion.type);
              
              return (
                <div 
                  key={suggestion.id}
                  className={`p-3 ${typeClasses.bg} rounded-lg border ${typeClasses.border} suggestion`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeClasses.badge}`}>
                      {formatSuggestionType(suggestion.type)}
                    </span>
                    <div className="flex space-x-1">
                      <button 
                        className={`p-1 rounded ${typeClasses.hover}`}
                        title="Accept"
                        onClick={() => handleSuggestionAction(suggestion.id, 'accepted')}
                      >
                        <Check className="h-4 w-4 text-accent" />
                      </button>
                      <button 
                        className={`p-1 rounded ${typeClasses.hover}`}
                        title="Reject"
                        onClick={() => handleSuggestionAction(suggestion.id, 'rejected')}
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {suggestion.originalText ? (
                      <>
                        <span className="italic">"{suggestion.originalText}"</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">"{suggestion.suggestedText}"</span>
                      </>
                    ) : (
                      suggestion.suggestedText
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Feedback History */}
      <div className="px-4 py-3 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
        {recentActions.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">No recent activity</p>
        ) : (
          <div className="mt-2 space-y-2">
            {recentActions.map(action => (
              <div key={action.id} className="flex items-start space-x-2">
                <div className={`flex-shrink-0 h-6 w-6 rounded-full ${
                  action.status === 'accepted' 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                } flex items-center justify-center`}>
                  <span className={`material-icons text-sm ${
                    action.status === 'accepted' 
                      ? 'text-success' 
                      : 'text-error'
                  }`}>
                    {action.status === 'accepted' ? 'check' : 'close'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">
                    You {action.status} suggestion to {action.text}
                  </p>
                  <p className="text-xs text-gray-400">
                    {timeAgo(action.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Assistant Controls */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <label htmlFor="ai-mode" className="block text-sm font-medium text-gray-700 mb-1">
          AI Assistant Mode
        </label>
        <Select value={aiMode} onValueChange={onAiModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balanced">Balanced</SelectItem>
            <SelectItem value="grammar">Grammar Focus</SelectItem>
            <SelectItem value="content">Content Suggestions</SelectItem>
            <SelectItem value="structure">Structure & Organization</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="default" 
          className="mt-3 w-full bg-accent hover:bg-accent/90"
          onClick={onGenerateSuggestions}
        >
          <span className="material-icons text-sm mr-1">auto_awesome</span>
          Generate Suggestions
        </Button>
      </div>
    </>
  );
}

// Helper function to format timestamps
function timeAgo(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString();
}
