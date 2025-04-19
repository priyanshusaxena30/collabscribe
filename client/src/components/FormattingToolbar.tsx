import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface FormattingToolbarProps {
  onToggleAIPanel: () => void;
}

export function FormattingToolbar({ onToggleAIPanel }: FormattingToolbarProps) {
  return (
    <div className="flex items-center px-4 py-1 space-x-1 overflow-x-auto">
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_bold</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_italic</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_underlined</span>
      </Button>
      
      <Separator orientation="vertical" className="h-4 mx-1" />
      
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_list_bulleted</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_list_numbered</span>
      </Button>
      
      <Separator orientation="vertical" className="h-4 mx-1" />
      
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_h1</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_h2</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_h3</span>
      </Button>
      
      <Separator orientation="vertical" className="h-4 mx-1" />
      
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">insert_link</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">image</span>
      </Button>
      
      <Separator orientation="vertical" className="h-4 mx-1" />
      
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_align_left</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_align_center</span>
      </Button>
      <Button variant="ghost" size="icon" className="p-1.5 rounded hover:bg-gray-100">
        <span className="material-icons text-gray-700">format_align_right</span>
      </Button>
      
      <Separator orientation="vertical" className="h-4 mx-1 hidden md:block" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="p-1.5 rounded hover:bg-gray-100 hidden md:block text-accent"
        onClick={onToggleAIPanel}
      >
        <span className="material-icons">psychology</span>
      </Button>
      <span className="hidden md:inline text-xs font-medium text-accent">AI Assistant: Active</span>
    </div>
  );
}
