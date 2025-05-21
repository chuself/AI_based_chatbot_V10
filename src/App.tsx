
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState, createContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Commands from "./pages/Commands";
import Memories from "./pages/Memories";

const queryClient = new QueryClient();

// Create a context for the Supabase session
export const SupabaseContext = createContext<{
  session: any;
  user: any;
}>({
  session: null,
  user: null,
});

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Handle auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.id);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If no session, try anonymous sign-in
      if (!session) {
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (error) {
            console.error('Error signing in anonymously:', error);
          } else if (data && data.user) {
            console.log('Signed in anonymously as:', data.user.id);
          }
        });
      }
    });

    // Cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseContext.Provider value={{ session, user }}>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/commands" element={<Commands />} />
                <Route path="/memories" element={<Memories />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
