import { Route, Switch } from "wouter";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import NotFound from "@/pages/not-found";
import { createContext, useState, useEffect } from "react";

// User context for global authentication state
export const UserContext = createContext<{
  user: any;
  setUser: (user: any) => void;
}>({
  user: null,
  setUser: () => {},
});

function App() {
  const [user, setUser] = useState<any>(null);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Update localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/editor/:id" component={Editor} />
        <Route component={NotFound} />
      </Switch>
    </UserContext.Provider>
  );
}

export default App;
