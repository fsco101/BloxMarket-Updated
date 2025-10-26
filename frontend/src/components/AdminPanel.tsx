import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  Flag, 
  Settings,
  Ban,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  User,
  FileText,
  ShoppingCart,
  Heart,
  Calendar,
  BarChart3,
  Activity,
  UserCheck,
  Loader2
} from 'lucide-react';

// Import admin components
import { UserManagement } from './admin/UserManagement';
import { MiddlemanVerification } from './admin/MiddlemanVerification';
import { ForumManagement } from './admin/ForumManagement';
import { TradingPostManagement } from './admin/TradingPostManagement';
import { WishlistManagement } from './admin/WishlistManagement';
import { EventsManagement } from './admin/EventsManagement';
import { FlaggedPosts } from './admin/FlaggedPosts';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  verificationRequests: number;
  flaggedPosts: number;
  pendingReports: number;
  totalTrades: number;
  activeTrades: number;
  totalForumPosts: number;
  totalWishlists: number;
  totalEvents: number;
  middlemanApplications: number;
}

export function AdminPanel() {
  const { user, logout, isLoading: authLoading, isLoggedIn } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      setError('');

      if (authLoading || !isLoggedIn || !apiService.isAuthenticated()) {
        setError('Authentication not ready.');
        return;
      }

      const stats = await apiService.getAdminStats();
      setAdminStats(stats);
    } catch (err: unknown) {
      console.error('Error loading admin stats:', err);
      if (err instanceof Error) {
        // Do not call logout(); apiService will dispatch 'auth-expired' if needed
        if (err.message.includes('Session expired') || err.message.includes('Invalid token')) {
          setError('Your session has expired. Please log in again.');
          return;
        }
        setError(err.message);
      } else {
        setError('Failed to load admin statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrModerator && !authLoading && apiService.isAuthenticated()) {
      loadAdminStats();
    }
    const handleSectionChange = (event: CustomEvent) => setActiveSection(event.detail);
    window.addEventListener('admin-section-change', handleSectionChange as EventListener);
    return () => window.removeEventListener('admin-section-change', handleSectionChange as EventListener);
  }, [isAdminOrModerator, authLoading]);

  // If user is not admin or moderator, show access denied
  if (!isAdminOrModerator) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="min-h-full flex items-center justify-center bg-background">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You need administrator or moderator privileges to access this page.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagement />;
      case 'middleman':
        return <MiddlemanVerification />;
      case 'forum':
        return <ForumManagement />;
      case 'trades':
        return <TradingPostManagement />;
      case 'wishlists':
        return <WishlistManagement />;
      case 'events':
        return <EventsManagement />;
      case 'reports':
        return <UserReports />;
      case 'flagged':
        return <FlaggedPosts />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin statistics...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadAdminStats}>Try Again</Button>
        </div>
      );
    }

    // Default stats if adminStats is null
    const stats = adminStats || {
      totalUsers: 0,
      activeUsers: 0,
      bannedUsers: 0,
      verificationRequests: 0,
      flaggedPosts: 0,
      pendingReports: 0,
      totalTrades: 0,
      activeTrades: 0,
      totalForumPosts: 0,
      totalWishlists: 0,
      totalEvents: 0,
      middlemanApplications: 0
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Platform management and statistics</p>
          </div>
          
          {/* Section Navigation */}
          <div className="flex gap-2">
            <Button 
              variant={activeSection === 'dashboard' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveSection('dashboard')}
            >
              Dashboard
            </Button>
            <Button 
              variant={activeSection === 'users' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveSection('users')}
            >
              Users
            </Button>
            <Button 
              variant={activeSection === 'reports' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveSection('reports')}
            >
              Reports
            </Button>
          </div>
        </div>

        {/* Quick Actions Alert */}
        {(stats.pendingReports > 0 || stats.flaggedPosts > 0 || stats.verificationRequests > 0) && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              Attention needed: {stats.pendingReports} pending reports, {stats.flaggedPosts} flagged posts, 
              and {stats.verificationRequests} verification requests require review.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('users')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-green-600">{stats.activeUsers || 0} active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('trades')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{stats.totalTrades?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-blue-600">{stats.activeTrades || 0} active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('forum')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Forum Posts</p>
                  <p className="text-2xl font-bold">{stats.totalForumPosts?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('events')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Events</p>
                  <p className="text-2xl font-bold">{stats.totalEvents?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('reports')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <Flag className="w-5 h-5 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pendingReports || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('flagged')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flagged Posts</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.flaggedPosts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('middleman')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MM Applications</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.middlemanApplications || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('users')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Ban className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Banned Users</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.bannedUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Platform Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Registrations Today</span>
                  <Badge variant="outline">+{Math.floor(Math.random() * 50) + 10}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">New Trades Created</span>
                  <Badge variant="outline">+{Math.floor(Math.random() * 30) + 5}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Forum Posts Created</span>
                  <Badge variant="outline">+{Math.floor(Math.random() * 20) + 3}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reports Resolved</span>
                  <Badge variant="outline" className="text-green-600">+{Math.floor(Math.random() * 10) + 2}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveSection('middleman')}
                  className="flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  MM Verification
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveSection('flagged')}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Flagged Content
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveSection('users')}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Manage Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6">
      {renderContent()}
    </div>
  );
}

// Export the section setter function to be used by Sidebar
export const useAdminPanel = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  return { activeSection, setActiveSection };
};