
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, LogOut, Check, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Local storage keys
const GOOGLE_AUTH_TOKEN = "google-auth-token";
const GOOGLE_SELECTED_ACCOUNT = "google-selected-account";
const GOOGLE_SELECTED_CALENDAR = "google-selected-calendar";

// Validation schema for email input
const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" })
});

interface GoogleAccount {
  email: string;
  name?: string;
  picture?: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

const GoogleApiSettings = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const { toast } = useToast();

  // Initialize form with Zod validation
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: ""
    }
  });

  // Check if user is authenticated on component mount
  useEffect(() => {
    const token = localStorage.getItem(GOOGLE_AUTH_TOKEN);
    if (token) {
      setIsAuthenticated(true);
      const savedAccount = localStorage.getItem(GOOGLE_SELECTED_ACCOUNT);
      if (savedAccount) {
        try {
          const account = JSON.parse(savedAccount);
          setSelectedAccount(account.email);
          
          // If the email doesn't match any predefined account, it's custom
          if (account.email && !accounts.some(acc => acc.email === account.email)) {
            setUseCustomEmail(true);
            form.setValue("email", account.email);
          }
          
          fetchUserAccounts();
        } catch (e) {
          console.error("Error parsing saved Google account:", e);
        }
      }

      const savedCalendar = localStorage.getItem(GOOGLE_SELECTED_CALENDAR);
      if (savedCalendar) {
        try {
          const calendar = JSON.parse(savedCalendar);
          setSelectedCalendar(calendar.id);
        } catch (e) {
          console.error("Error parsing saved Google calendar:", e);
        }
      }
    }
  }, []);

  const handleGoogleAuth = () => {
    setIsLoading(true);
    
    // For demo purposes, we'll simulate the authentication flow
    // In a real app, you would redirect to Google OAuth flow
    setTimeout(() => {
      const mockToken = "mock-google-auth-token-" + Date.now();
      localStorage.setItem(GOOGLE_AUTH_TOKEN, mockToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      toast({
        title: "Google Account Connected",
        description: "Successfully authenticated with Google API",
      });
      
      fetchUserAccounts();
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem(GOOGLE_AUTH_TOKEN);
    localStorage.removeItem(GOOGLE_SELECTED_ACCOUNT);
    localStorage.removeItem(GOOGLE_SELECTED_CALENDAR);
    setIsAuthenticated(false);
    setAccounts([]);
    setCalendars([]);
    setSelectedAccount("");
    setSelectedCalendar("");
    setUseCustomEmail(false);
    form.reset();
    
    toast({
      title: "Logged Out",
      description: "Google account disconnected",
    });
  };

  const fetchUserAccounts = () => {
    setIsLoading(true);
    
    // Mock API call to get user's Google accounts
    setTimeout(() => {
      const mockAccounts: GoogleAccount[] = [
        { email: "user@gmail.com", name: "Demo User", picture: "https://i.pravatar.cc/150?u=user" },
        { email: "work@example.com", name: "Work Account", picture: "https://i.pravatar.cc/150?u=work" }
      ];
      
      setAccounts(mockAccounts);
      setIsLoading(false);
      
      // If no account is selected, select the first one (unless using custom email)
      if (!selectedAccount && mockAccounts.length > 0 && !useCustomEmail) {
        handleSelectAccount(mockAccounts[0].email);
      }
    }, 1000);
  };

  const fetchCalendars = (account: string) => {
    setIsLoading(true);
    
    // Mock API call to get user's calendars for the selected account
    setTimeout(() => {
      const mockCalendars: GoogleCalendar[] = [
        { id: "primary", summary: "Main Calendar", primary: true },
        { id: "work", summary: "Work Calendar" },
        { id: "personal", summary: "Personal Events" }
      ];
      
      setCalendars(mockCalendars);
      setIsLoading(false);
      
      // If no calendar is selected, select the primary one
      if (!selectedCalendar) {
        const primaryCalendar = mockCalendars.find(cal => cal.primary);
        if (primaryCalendar) {
          handleSelectCalendar(primaryCalendar.id);
        } else if (mockCalendars.length > 0) {
          handleSelectCalendar(mockCalendars[0].id);
        }
      }
    }, 1000);
  };

  const handleSelectAccount = (email: string) => {
    setSelectedAccount(email);
    setUseCustomEmail(false); // When selecting from dropdown, disable custom email
    
    const account = accounts.find(acc => acc.email === email);
    
    if (account) {
      localStorage.setItem(GOOGLE_SELECTED_ACCOUNT, JSON.stringify(account));
      
      toast({
        title: "Account Selected",
        description: `Now using Google account: ${email}`,
      });
      
      // When a new account is selected, fetch its calendars
      fetchCalendars(email);
    }
  };

  const handleCustomEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    const email = values.email;
    setSelectedAccount(email);
    
    // Create a custom account object
    const customAccount = {
      email: email,
      name: "Custom Account"
    };
    
    localStorage.setItem(GOOGLE_SELECTED_ACCOUNT, JSON.stringify(customAccount));
    
    toast({
      title: "Custom Email Set",
      description: `Now using custom email: ${email}`,
    });
    
    // Fetch calendars for this email
    fetchCalendars(email);
  };

  const handleSelectCalendar = (calendarId: string) => {
    setSelectedCalendar(calendarId);
    const calendar = calendars.find(cal => cal.id === calendarId);
    
    if (calendar) {
      localStorage.setItem(GOOGLE_SELECTED_CALENDAR, JSON.stringify(calendar));
      
      toast({
        title: "Calendar Selected",
        description: `Now using calendar: ${calendar.summary}`,
      });
    }
  };

  const handleRefreshAccounts = () => {
    fetchUserAccounts();
  };

  const handleRefreshCalendars = () => {
    if (selectedAccount) {
      fetchCalendars(selectedAccount);
    } else {
      toast({
        title: "Error",
        description: "Please select an account first",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Google API Integration</h3>
        <p className="text-sm text-gray-400">
          Connect your Google account to access emails, calendar, and other Google services
        </p>
      </div>
      
      <Separator className="my-3 bg-white/10" />
      
      {!isAuthenticated ? (
        <Button 
          onClick={handleGoogleAuth} 
          className="w-full bg-white text-black hover:bg-gray-100 border border-gray-300"
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
          )}
          Connect with Google
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              {selectedAccount && (
                <span className="text-sm font-medium">{selectedAccount}</span>
              )}
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Google Account</Label>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUseCustomEmail(!useCustomEmail)}
                >
                  {useCustomEmail ? "Use Predefined" : "Use Custom Email"}
                </Button>
                {!useCustomEmail && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshAccounts}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
            </div>
            
            {useCustomEmail ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCustomEmailSubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input 
                              placeholder="Enter your email address" 
                              {...field} 
                              className="flex-1"
                            />
                            <Button type="submit" size="sm">
                              <Check className="h-4 w-4 mr-2" />
                              Set
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            ) : (
              <>
                {accounts.length > 0 ? (
                  <Select 
                    value={selectedAccount} 
                    onValueChange={handleSelectAccount}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Google account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.email} value={account.email}>
                          {account.email} {account.name ? `(${account.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert variant="default">
                    <AlertDescription>
                      No Google accounts found. Refresh to try again.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
          
          {selectedAccount && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Google Calendar</label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshCalendars}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Calendars
                </Button>
              </div>
              
              {calendars.length > 0 ? (
                <Select 
                  value={selectedCalendar} 
                  onValueChange={handleSelectCalendar}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary} {calendar.primary ? "(Primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert variant="default">
                  <AlertDescription>
                    No calendars found. Refresh to try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-400 mt-2">
            <p>Connected services:</p>
            <ul className="list-disc ml-5 mt-1">
              <li>Gmail (Email reading and sending)</li>
              <li>Google Calendar (Event management)</li>
              <li>Google Drive (File access)</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-400 mt-2">
        <p>
          The Gemini AI can read and manage your Google data with your permission.
          Your data is only accessed when you explicitly ask the AI to perform tasks
          with your Google account.
        </p>
      </div>
    </div>
  );
};

export default GoogleApiSettings;

