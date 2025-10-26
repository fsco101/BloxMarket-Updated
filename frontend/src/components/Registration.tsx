import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../services/api';

export function Registration() {
  const { login } = useAuth();
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    robloxUsername: '',
    messengerLink: '',
    avatar: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'form' | 'email' | 'code' | 'register' | null>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateForm = () => {
    if (registerForm.username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return false;
    }

    if (!registerForm.email.trim()) {
      setError('Email address is required.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return false;
    }

    return true;
  };

  const handleProceedToEmailVerification = () => {
    if (!validateForm()) {
      return;
    }

    setVerificationStep('email');
    setError('');
  };

  const handleSendEmailVerification = async () => {
    setIsLoading(true);
    setError('');

    try {
      await apiService.sendEmailVerification(registerForm.email);
      setPendingEmail(registerForm.email);
      setVerificationStep('code');
      setResendCooldown(60); // Start 60 second cooldown
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await apiService.verifyEmailCode(pendingEmail, verificationCode.trim());
      setVerificationStep('register');
      setVerificationCode('');
      setError('');
    } catch (error: unknown) {
      let errorMessage = 'Verification failed. Please check your code and try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiService.register({
        username: registerForm.username.trim(),
        email: pendingEmail,
        password: registerForm.password,
        robloxUsername: registerForm.robloxUsername.trim() || undefined,
        messengerLink: registerForm.messengerLink.trim() || undefined
      });

      // Registration successful, login the user
      login(response.user, true);
      setVerificationStep(null);
      setPendingEmail('');
    } catch (error: unknown) {
      let errorMessage = 'Registration failed. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);

    try {
      await apiService.sendEmailVerification(pendingEmail);
      setResendCooldown(60);
      setError('');
    } catch (error: unknown) {
      let errorMessage = 'Failed to resend verification code. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-background/95 shadow-xl border border-border/50">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Join the BloxMarket community today
        </CardDescription>
      </CardHeader>
      <CardContent>
        {verificationStep === 'form' ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            handleProceedToEmailVerification();
          }} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reg-username">Username *</Label>
              <Input
                id="reg-username"
                type="text"
                placeholder="Choose a username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                We'll send a verification code to this email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roblox-username">Roblox Username</Label>
              <Input
                id="roblox-username"
                type="text"
                placeholder="Enter your Roblox username (optional)"
                value={registerForm.robloxUsername}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, robloxUsername: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Link your Roblox account for verification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="messenger-link">Messenger Link</Label>
              <Input
                id="messenger-link"
                type="text"
                placeholder="Your messenger profile link (optional)"
                value={registerForm.messengerLink}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, messengerLink: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Add your messenger contact for easier communication
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Password *</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 6 characters)"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  required
                  minLength={6}
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
              <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 mt-2 rounded">
                <div
                  className={`h-full rounded ${
                    registerForm.password.length === 0 ? 'w-0' :
                    registerForm.password.length < 6 ? 'w-1/4 bg-red-500' :
                    registerForm.password.length < 8 ? 'w-2/4 bg-yellow-500' :
                    registerForm.password.length < 10 ? 'w-3/4 bg-blue-500' :
                    'w-full bg-green-500'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {registerForm.password.length === 0 ? 'Password strength indicator' :
                 registerForm.password.length < 6 ? 'Very weak - Use at least 6 characters' :
                 registerForm.password.length < 8 ? 'Weak - Consider using a longer password' :
                 registerForm.password.length < 10 ? 'Good - Password has decent length' :
                 'Strong - Great password length'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  disabled={isLoading}
                  required
                />
              </div>
              {registerForm.password && registerForm.confirmPassword &&
               registerForm.password !== registerForm.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={isLoading || !registerForm.username.trim() || !registerForm.email.trim() || !registerForm.password || !registerForm.confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Continue to Email Verification'
              )}
            </Button>
          </form>
        ) : verificationStep === 'email' ? (
          <div className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                We will send a verification code to: <strong>{registerForm.email}</strong>
              </p>
            </div>

            <Button
              onClick={handleSendEmailVerification}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setVerificationStep('form');
                  setError('');
                }}
                className="text-sm"
              >
                Back to Form
              </Button>
            </div>
          </div>
        ) : verificationStep === 'code' ? (
          <div className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to {pendingEmail}
              </p>
            </div>

            <Button
              onClick={handleVerifyEmailCode}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
                className="text-sm"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setVerificationStep('form');
                  setVerificationCode('');
                  setError('');
                }}
                className="text-sm"
              >
                Change Email
              </Button>
            </div>
          </div>
        ) : verificationStep === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reg-username">Username</Label>
              <Input
                id="reg-username"
                type="text"
                placeholder="Choose a username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roblox-username">Roblox Username</Label>
              <Input
                id="roblox-username"
                type="text"
                placeholder="Enter your Roblox username (optional)"
                value={registerForm.robloxUsername}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, robloxUsername: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Link your Roblox account for verification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="messenger-link">Messenger Link</Label>
              <Input
                id="messenger-link"
                type="text"
                placeholder="Your messenger profile link (optional)"
                value={registerForm.messengerLink}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, messengerLink: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Add your messenger contact for easier communication
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 6 characters)"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  required
                  minLength={6}
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
              <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 mt-2 rounded">
                <div
                  className={`h-full rounded ${
                    registerForm.password.length === 0 ? 'w-0' :
                    registerForm.password.length < 6 ? 'w-1/4 bg-red-500' :
                    registerForm.password.length < 8 ? 'w-2/4 bg-yellow-500' :
                    registerForm.password.length < 10 ? 'w-3/4 bg-blue-500' :
                    'w-full bg-green-500'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {registerForm.password.length === 0 ? 'Password strength indicator' :
                 registerForm.password.length < 6 ? 'Very weak - Use at least 6 characters' :
                 registerForm.password.length < 8 ? 'Weak - Consider using a longer password' :
                 registerForm.password.length < 10 ? 'Good - Password has decent length' :
                 'Strong - Great password length'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  disabled={isLoading}
                  required
                />
              </div>
              {registerForm.password && registerForm.confirmPassword &&
               registerForm.password !== registerForm.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setVerificationStep('form');
                  setPendingEmail('');
                  setRegisterForm(prev => ({ ...prev, email: '' }));
                }}
                className="text-sm"
              >
                Change Email
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}