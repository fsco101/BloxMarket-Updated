import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider, facebookProvider } from './firebase';
import { apiService } from './api';

export interface FirebaseAuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role?: string;
    [key: string]: unknown;
  };
  error?: string;
}

class FirebaseAuthService {
  private authStateListener: ((user: User | null) => void) | null = null;

  // Initialize auth state listener
  init(onAuthStateChange: (user: User | null) => void) {
    this.authStateListener = onAuthStateChange;
    onAuthStateChanged(auth, (user) => {
      if (this.authStateListener) {
        this.authStateListener(user);
      }
    });
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<FirebaseAuthResult> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send token to backend for verification and user creation/login
      const response = await apiService.request('/auth/firebase/google', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      }) as { token?: string; user?: { id: string; username: string; email: string; role?: string; [key: string]: unknown } };

      if (response.token) {
        // Store token using existing apiService method
        apiService.setToken(response.token, true); // Default to persistent login
        localStorage.setItem('bloxmarket-user', JSON.stringify(response.user));
      }

      return {
        success: true,
        token: response.token,
        user: response.user
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      const authError = error as FirebaseError;
      return {
        success: false,
        error: this.getErrorMessage(authError)
      };
    }
  }

  // Sign in with Facebook
  async signInWithFacebook(): Promise<FirebaseAuthResult> {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const idToken = await result.user.getIdToken();

      // Send token to backend for verification and user creation/login
      const response = await apiService.request('/auth/firebase/facebook', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      }) as { token?: string; user?: { id: string; username: string; email: string; role?: string; [key: string]: unknown } };

      if (response.token) {
        // Store token using existing apiService method
        apiService.setToken(response.token, true); // Default to persistent login
        localStorage.setItem('bloxmarket-user', JSON.stringify(response.user));
      }

      return {
        success: true,
        token: response.token,
        user: response.user
      };
    } catch (error) {
      console.error('Facebook sign-in error:', error);
      const authError = error as FirebaseError;
      return {
        success: false,
        error: this.getErrorMessage(authError)
      };
    }
  }

  // Sign out from Firebase (optional - mainly handled by backend)
  async signOutFromFirebase(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase sign-out error:', error);
    }
  }

  // Get current Firebase user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Helper method to get user-friendly error messages
  private getErrorMessage(error: FirebaseError): string {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials.';
      case 'auth/invalid-credential':
        return 'Invalid credentials provided.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();