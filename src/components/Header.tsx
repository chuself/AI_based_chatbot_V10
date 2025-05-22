
import { Link, useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
import { Settings, ChevronLeft, LogOut, LogIn, Menu } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { SupabaseContext } from "@/App";

interface HeaderProps {
  modelName?: string;
  showBackButton?: boolean;
  title?: string;
}

const Header = ({ modelName, showBackButton = false, title }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useContext(SupabaseContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error, redirected } = await signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out.",
      });
      
      // Redirect to auth page after signout
      navigate("/auth");
    }
  };

  const getUserInitials = () => {
    if (!user) return "G";
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    return user.email ? user.email[0].toUpperCase() : "U";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between py-2 px-4 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center">
        {showBackButton ? (
          <Link to="/" className="mr-2 hover:text-gray-900 p-2 rounded-full bg-gray-100">
            <ChevronLeft size={20} />
          </Link>
        ) : null}
        
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-900">
            {title || "Chuself AI"}
          </h1>
          {modelName && (
            <div className="text-xs text-gray-500">
              {modelName}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="py-6 flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-lg font-medium hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/memories" 
                className="text-lg font-medium hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Memories
              </Link>
              <Link 
                to="/commands" 
                className="text-lg font-medium hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Custom Commands
              </Link>
              <Link 
                to="/settings" 
                className="text-lg font-medium hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
              {user ? (
                <Button 
                  variant="outline" 
                  className="mt-4 w-full justify-start"
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              ) : (
                <Link 
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button variant="outline" className="mt-4 w-full justify-start">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="hidden md:flex items-center space-x-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <Settings size={20} />
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuItem className="text-sm text-gray-500 cursor-default">
                    {user.email}
                  </DropdownMenuItem>
                  <Link to="/memories">
                    <DropdownMenuItem>Memories</DropdownMenuItem>
                  </Link>
                  <Link to="/commands">
                    <DropdownMenuItem>Custom Commands</DropdownMenuItem>
                  </Link>
                  <Link to="/settings">
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <Link to="/auth">
                  <DropdownMenuItem>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </DropdownMenuItem>
                </Link>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
