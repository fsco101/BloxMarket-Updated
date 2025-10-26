import { useState } from 'react';
import { useTheme } from '../App';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Moon, Sun } from 'lucide-react';
import { Login } from './Login';
import { Registration } from './Registration';

export function AuthPage() {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900" />

      {/* Background Image with Blur and Gray Shade */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/authpage.jpg')`,
          backgroundSize: 'cover',
          filter: 'blur(3px) grayscale(20%) brightness(0.8)',
          transform: 'scale(1.1)', // Slight scale to prevent blur edges
        }}
      />
      {/* Enhanced Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/50 to-gray-900/60 dark:from-gray-900/70 dark:via-gray-800/60 dark:to-gray-900/70" />      {/* Content */}
      <div className="relative w-full max-w-md z-10">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">BM</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BloxMarket
          </h1>
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
            <Login />
          </TabsContent>

          <TabsContent value="register">
            <Registration />
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}