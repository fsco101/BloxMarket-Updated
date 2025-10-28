import React, { useState } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../services/api';

interface Penalty {
  type: 'warning' | 'restriction' | 'suspension' | 'strike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  expires_at?: string;
}

export function Login() {
  const { login } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use the state values directly instead of FormData
      const username = loginForm.username?.trim();
      const password = loginForm.password;

      // Validate input
      if (!username || !password) {
        setError('Please enter both username/email and password.');
        setIsLoading(false);
        return;
      }

      console.log('Attempting login with:', { username, password: password ? '[REDACTED]' : 'empty' });

      // Send username (which can be email or username) in the login request
      const response = await apiService.login({
        username: username,
        password: password
      }, rememberMe);

      // Check for active penalties in the response
      if (response.penalties && response.penalties.length > 0) {
        // Show penalty warnings to the user
        const penaltyMessages = response.penalties.map((penalty: Penalty) => 
          `${penalty.type.charAt(0).toUpperCase() + penalty.type.slice(1)} (${penalty.severity}): ${penalty.reason}`
        ).join('\n• ');
        
        // You can show this as a toast or alert
        console.warn('User has active penalties:', response.penalties);
        // For now, we'll show it in an alert after login
        setTimeout(() => {
          alert(`Warning: You have active penalties:\n• ${penaltyMessages}\n\nPlease review and comply with platform rules to avoid further action.`);
        }, 1000);
      }

      // Ensure token is persisted and ApiService has it
      if (response.token) {
        // Use the updated setToken method that handles storage based on rememberMe
        apiService.setToken(response.token, rememberMe);

        // Store user data in the same storage as the token
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('bloxmarket-user', JSON.stringify(response.user));

        // Clean up the other storage to prevent conflicts
        const otherStorage = rememberMe ? sessionStorage : localStorage;
        otherStorage.removeItem('bloxmarket-token');
        otherStorage.removeItem('bloxmarket-user');
      }

      // Login successful, update auth context with rememberMe preference
      login(response.user, rememberMe);
    } catch (error: unknown) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please check your credentials.';

      if (error instanceof Error) {
        // Handle specific error messages from the backend
        if (error.message.includes('banned')) {
          errorMessage = 'Your account has been banned. Please contact support.';
        } else if (error.message.includes('deactivated') || error.message.includes('disabled')) {
          errorMessage = 'Your account has been deactivated. Please contact support.';
        } else if (error.message.includes('Invalid credentials')) {
          errorMessage = 'Invalid username/email or password. Please try again.';
        } else if (error.message.includes('required')) {
          errorMessage = 'Please enter both username/email and password.';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-background/95 shadow-xl border border-border/50">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your BloxMarket account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">Username or Email</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username or email"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label
              htmlFor="remember-me"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Remember me for 30 days
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="text-center mt-4">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Forgot your password?
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}