import { useState, useContext, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { UserContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, FileText, User, Plus } from "lucide-react";

export default function Home() {
  const [location, navigate] = useLocation();
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  
  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    email: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      fetchDocuments.refetch();
    }
  }, [user]);

  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return res.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const register = useMutation({
    mutationFn: async (userData: { username: string; password: string; email: string }) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: "You can now log in with your credentials.",
      });
      setActiveTab("login");
      setLoginForm({
        username: registerForm.username,
        password: registerForm.password,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different credentials.",
        variant: "destructive",
      });
    },
  });

  // Fetch documents query
  const fetchDocuments = useQuery({
    queryKey: ['/api/documents'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(`/api/documents?userId=${user.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    }
  });

  // Create document mutation
  const createDocument = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/documents", {
        title: "Untitled Document",
        ownerId: user.id,
        content: { ops: [{ insert: 'Start writing here...\n' }] }
      });
      return res.json();
    },
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      navigate(`/editor/${newDocument.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create document",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(loginForm);
  };

  // Handle register
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(registerForm);
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
  };

  // Create new document
  const handleCreateDocument = () => {
    createDocument.mutate();
  };

  // Open existing document
  const handleOpenDocument = (documentId: number) => {
    navigate(`/editor/${documentId}`);
  };

  // If user is logged in, show documents list
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Edit className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">CollabAI Writer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{user.username}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Your Documents</h2>
            <Button onClick={handleCreateDocument}>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </div>

          {fetchDocuments.isPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="bg-gray-100 h-24"></CardHeader>
                  <CardContent className="py-4">
                    <div className="h-6 bg-gray-100 rounded mb-2"></div>
                    <div className="h-4 bg-gray-100 w-1/2 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : fetchDocuments.isError ? (
            <div className="text-center py-8">
              <p className="text-red-500">Error loading documents. Please try again.</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchDocuments.refetch()}>
                Retry
              </Button>
            </div>
          ) : fetchDocuments.data?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
              <p className="mt-1 text-gray-500">Create your first document to get started.</p>
              <Button className="mt-4" onClick={handleCreateDocument}>
                <Plus className="mr-2 h-4 w-4" />
                Create Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fetchDocuments.data?.map((doc: any) => (
                <Card 
                  key={doc.id} 
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleOpenDocument(doc.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle>{doc.title}</CardTitle>
                    <CardDescription>
                      Last edited {new Date(doc.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-500 truncate">
                    {doc.content?.ops?.[0]?.insert || "Empty document"}
                  </CardContent>
                  <CardFooter className="pt-0 text-xs text-gray-400">
                    Created {new Date(doc.createdAt).toLocaleDateString()}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // If not logged in, show auth screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-4">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            <Edit className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">CollabAI Writer</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Real-time collaborative document editing with AI-powered suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="Enter your username"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={login.isPending}>
                      {login.isPending ? "Logging in..." : "Login"}
                    </Button>
                    
                    {/* Quick login for demo purposes */}
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setLoginForm({ username: "demo", password: "demo123" });
                        setTimeout(() => login.mutate({ username: "demo", password: "demo123" }), 100);
                      }}
                    >
                      Use Demo Account
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Username</Label>
                      <Input
                        id="reg-username"
                        placeholder="Choose a username"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Choose a password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={register.isPending}>
                      {register.isPending ? "Creating account..." : "Register"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
