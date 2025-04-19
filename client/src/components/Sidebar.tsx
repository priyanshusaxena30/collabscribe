import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Edit, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  user: any;
  activeDocumentId?: number;
}

export function Sidebar({ user, activeDocumentId }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch user's documents
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const res = await fetch(`/api/documents?userId=${user.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    }
  });

  // Handle creating a new document
  const handleNewDocument = async () => {
    try {
      const res = await apiRequest("POST", "/api/documents", {
        title: "Untitled Document",
        ownerId: user.id,
        content: { ops: [{ insert: 'Start writing here...\n' }] }
      });
      const newDocument = await res.json();
      
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Navigate to the new document
      navigate(`/editor/${newDocument.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating document",
        description: error.message || "Failed to create new document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
      {/* App Logo and Title */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <Link href="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <Edit className="h-5 w-5 text-primary" />
            <span className="text-xl font-semibold">CollabAI Writer</span>
          </div>
        </Link>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</h2>
          <Button 
            className="mt-2 flex items-center w-full"
            onClick={handleNewDocument}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>

        <div className="mt-2">
          {isLoading ? (
            // Loading skeletons
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : error ? (
            <div className="px-4 py-3 text-center text-sm text-red-500">
              Failed to load documents
            </div>
          ) : documents?.length === 0 ? (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              No documents yet
            </div>
          ) : (
            documents?.map((doc: any) => (
              <Link href={`/editor/${doc.id}`} key={doc.id}>
                <a 
                  className={`group flex items-center px-4 py-3 hover:bg-gray-50 ${
                    activeDocumentId === doc.id ? 'border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Edited {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </a>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center px-4 py-3 border-t border-gray-200">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
            {user.username.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <Link href="/">
          <button className="flex-shrink-0 text-gray-400 hover:text-gray-500">
            <span className="material-icons text-sm">logout</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
