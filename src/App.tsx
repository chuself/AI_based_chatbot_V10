
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, createContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Commands from "./pages/Commands";
import Memories from "./pages/Memories";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

// Create a context for the Supabase session
export const SupabaseContext = createContext<{
  session: any;
  user: any;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}>({
  session: null,
  user: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle auth state changes - set this up first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          localStorage.removeItem('supabase.auth.token');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.id);
          // We don't need to set localStorage here as Supabase handles this
        }
        
        if (loading) {
          setLoading(false);
        }
      }
    );

    // Check for existing session - do this after setting up the listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Checked existing session:', session ? 'Found' : 'None');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.session) {
      console.log('Sign in successful, session established');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Set session persistence to true explicitly for all sign ups
        data: {
          persistent_session: true
        }
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({
      // Setting scope to 'local' ensures we only sign out on this device
      scope: 'local'
    });
    return { error };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
        <div className="animate-pulse text-purple-600">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseContext.Provider value={{ session, user, signIn, signUp, signOut }}>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route 
                  path="/" 
                  element={<Index />}
                />
                <Route 
                  path="/auth" 
                  element={!user ? <Auth /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/settings" 
                  element={<Settings />}
                />
                <Route 
                  path="/commands" 
                  element={<Commands />}
                />
                <Route 
                  path="/memories" 
                  element={<Memories />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </SupabaseContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
