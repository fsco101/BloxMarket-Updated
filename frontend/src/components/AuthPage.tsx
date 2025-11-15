import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Login } from './Login';
import { Registration } from './Registration';
import { SocialLogin } from './SocialLogin';

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />

      {/* Background Image with Blur and Gray Shade */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/landingpage.jpg')`,
          backgroundSize: 'cover',
          filter: 'blur(3px) grayscale(20%) brightness(0.8)',
          transform: 'scale(1.1)', // Slight scale to prevent blur edges
        }}
      />
      {/* Enhanced Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/50 to-gray-900/60" />      {/* Content */}
      <div className="relative w-full max-w-md z-10">
        {/* Theme Toggle
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </div> */}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center width-300 height-200">
            <img 
              src="/NEWLOGO1.gif" 
              alt="BloxMarket Logo" 
              className="w-full h-full object-contain"
              style={{objectFit: 'contain'}}
            />
          </div>
          <p className="text-muted-foreground mt-2">
            The ultimate Roblox trading community
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <div className="space-y-4">
              <SocialLogin />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
              <Login />
            </div>
          </TabsContent>

          <TabsContent value="register">
            <div className="space-y-4">
              <SocialLogin />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
              <Registration />
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}