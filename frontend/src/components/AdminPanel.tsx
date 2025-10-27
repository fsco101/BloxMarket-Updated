import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import {
  Shield,
  Users,
  Flag,
  Settings,
  Ban,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ShoppingCart,
  Calendar,
  BarChart3,
  Activity,
  UserCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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

interface ChartData {
  name: string;
  users: number;
  trades: number;
  posts: number;
  reports: number;
}

interface AnalyticsData {
  userActivity: Array<{ date: string; users: number }>;
  tradeActivity: Array<{ date: string; trades: number }>;
  forumActivity: Array<{ date: string; posts: number }>;
  reportActivity: Array<{ date: string; reports: number }>;
}

export function AdminPanel() {
  const { user, isLoading: authLoading, isLoggedIn } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string;
    label: string;
    description: string;
    count: number;
    color: string;
  }>>([]);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  // Time period configuration
  const timePeriodConfig = useMemo(() => ({
    weekly: { days: 7, label: 'Weekly' },
    monthly: { days: 30, label: 'Monthly' },
    quarterly: { days: 90, label: 'Quarterly' },
    yearly: { days: 365, label: 'Yearly' }
  }), []);

  const loadRecentActivity = useCallback(async () => {
    try {
      const activity = [];

      // Get recent user registrations (last 24 hours)
      try {
        const usersResponse = await apiService.request('/admin/users?limit=1000');
        const recentUsers = usersResponse.users?.filter((user: { createdAt?: string; created_at?: string }) => {
          const userDate = new Date(user.createdAt || user.created_at || '');
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return userDate >= oneDayAgo;
        }) || [];
        activity.push({
          type: 'user_registrations',
          label: 'User Registrations Today',
          description: 'New user signups',
          count: recentUsers.length,
          color: 'primary'
        });
      } catch {
        activity.push({
          type: 'user_registrations',
          label: 'User Registrations Today',
          description: 'New user signups',
          count: 0,
          color: 'primary'
        });
      }

      // Get recent trades (last 24 hours)
      try {
        const tradesResponse = await apiService.getTrades({ limit: 1000 });
        const recentTrades = tradesResponse.filter((trade: { created_at?: string; createdAt?: string }) => {
          const tradeDate = new Date(trade.created_at || trade.createdAt || '');
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return tradeDate >= oneDayAgo;
        });
        activity.push({
          type: 'new_trades',
          label: 'New Trades Created',
          description: 'Trading activity',
          count: recentTrades.length,
          color: 'success'
        });
      } catch {
        activity.push({
          type: 'new_trades',
          label: 'New Trades Created',
          description: 'Trading activity',
          count: 0,
          color: 'success'
        });
      }

      // Get recent forum posts (last 24 hours)
      try {
        const forumResponse = await apiService.getForumPosts({ limit: 1000 });
        const recentPosts = forumResponse.filter((post: { createdAt?: string; created_at?: string }) => {
          const postDate = new Date(post.createdAt || post.created_at || '');
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return postDate >= oneDayAgo;
        });
        activity.push({
          type: 'forum_posts',
          label: 'Forum Posts Created',
          description: 'Community engagement',
          count: recentPosts.length,
          color: 'purple'
        });
      } catch {
        activity.push({
          type: 'forum_posts',
          label: 'Forum Posts Created',
          description: 'Community engagement',
          count: 0,
          color: 'purple'
        });
      }

      // Get recent reports resolved (last 24 hours)
      try {
        const reportsResponse = await apiService.getReports({ limit: 1000 });
        const recentResolved = reportsResponse.filter((report: { status?: string; updatedAt?: string; updated_at?: string }) => {
          if (report.status !== 'resolved') return false;
          const resolvedDate = new Date(report.updatedAt || report.updated_at || '');
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return resolvedDate >= oneDayAgo;
        });
        activity.push({
          type: 'reports_resolved',
          label: 'Reports Resolved',
          description: 'Moderation actions',
          count: recentResolved.length,
          color: 'info'
        });
      } catch {
        activity.push({
          type: 'reports_resolved',
          label: 'Reports Resolved',
          description: 'Moderation actions',
          count: 0,
          color: 'info'
        });
      }

      setRecentActivity(activity);
    } catch (err) {
      console.error('Error loading recent activity:', err);
      // Set default empty activity
      setRecentActivity([
        { type: 'user_registrations', label: 'User Registrations Today', description: 'New user signups', count: 0, color: 'primary' },
        { type: 'new_trades', label: 'New Trades Created', description: 'Trading activity', count: 0, color: 'success' },
        { type: 'forum_posts', label: 'Forum Posts Created', description: 'Community engagement', count: 0, color: 'purple' },
        { type: 'reports_resolved', label: 'Reports Resolved', description: 'Moderation actions', count: 0, color: 'info' }
      ]);
    }
  }, []);

  const loadAdminStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (authLoading || !isLoggedIn) {
        setError('Authentication not ready.');
        return;
      }

      const days = timePeriodConfig[timePeriod].days;
      const [stats, analytics] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getAdminAnalytics(days)
      ]);
      
      setAdminStats(stats);
      setAnalyticsData(analytics);

      // Load recent activity data
      await loadRecentActivity();
    } catch (err: unknown) {
      console.error('Error loading admin data:', err);
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
  }, [authLoading, isLoggedIn, timePeriod, timePeriodConfig, loadRecentActivity]);

  useEffect(() => {
    if (isAdminOrModerator && !authLoading) {
      loadAdminStats();
    }
  }, [isAdminOrModerator, authLoading, loadAdminStats]);

  // Separate useEffect for event listener to avoid dependency issues
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => setActiveSection(event.detail);
    window.addEventListener('admin-section-change', handleSectionChange as EventListener);
    return () => window.removeEventListener('admin-section-change', handleSectionChange as EventListener);
  }, []); // Empty dependency array - only set up once

  // If user is not admin or moderator, show access denied
  if (!isAdminOrModerator) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="min-h-full flex items-center justify-center bg-background">
          <div className="card max-w-md mx-auto">
            <div className="card-body p-8 text-center">
              <Shield className="text-danger mx-auto mb-4" style={{ width: '4rem', height: '4rem' }} />
              <h2 className="h4 fw-bold mb-2">Access Denied</h2>
              <p className="text-muted mb-4">
                You need administrator or moderator privileges to access this page.
              </p>
              <button className="btn btn-outline-secondary" onClick={() => window.history.back()}>
                Go Back
              </button>
            </div>
          </div>
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
        return <FlaggedPosts />;
      case 'flagged':
        return <FlaggedPosts />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading admin statistics...</span>
          </div>
          <p className="text-muted mt-3">Loading admin statistics...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-5">
          <AlertTriangle className="text-danger" style={{ width: '2rem', height: '2rem' }} />
          <p className="text-danger mt-3 mb-4">{error}</p>
          <button className="btn btn-primary" onClick={loadAdminStats}>
            <RefreshCw className="me-2" style={{ width: '1rem', height: '1rem' }} />
            Try Again
          </button>
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

    // Generate chart data from analytics based on time period
    const chartData: ChartData[] = analyticsData ? 
      analyticsData.userActivity.map((userItem, index) => {
        let displayName: string;
        
        if (timePeriod === 'weekly') {
          // Show day names for weekly
          displayName = new Date(userItem.date).toLocaleDateString('en-US', { weekday: 'short' });
        } else if (timePeriod === 'monthly') {
          // Show day numbers for monthly
          displayName = new Date(userItem.date).getDate().toString();
        } else if (timePeriod === 'quarterly') {
          // Show week numbers for quarterly
          const date = new Date(userItem.date);
          const startOfQuarter = new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
          const weekNumber = Math.ceil((date.getTime() - startOfQuarter.getTime()) / (7 * 24 * 60 * 60 * 1000));
          displayName = `W${weekNumber}`;
        } else { // yearly
          // Show month names for yearly
          displayName = new Date(userItem.date).toLocaleDateString('en-US', { month: 'short' });
        }
        
        return {
          name: displayName,
          users: userItem.users,
          trades: analyticsData.tradeActivity[index]?.trades || 0,
          posts: analyticsData.forumActivity[index]?.posts || 0,
          reports: analyticsData.reportActivity[index]?.reports || 0,
        };
      }) : [];

    const pieData = stats ? [
      { name: 'Active Users', value: stats.activeUsers, color: '#0d6efd' },
      { name: 'Banned Users', value: stats.bannedUsers, color: '#dc3545' },
      { name: 'Inactive Users', value: Math.max(0, stats.totalUsers - stats.activeUsers - stats.bannedUsers), color: '#6c757d' },
    ].filter(item => item.value > 0) : []; // Only show segments with data

    return (
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h2 fw-bold d-flex align-items-center gap-3 mb-2">
                  <Shield className="text-danger" style={{ width: '2rem', height: '2rem' }} />
                  Admin Dashboard
                </h1>
                <p className="text-muted mb-0">Platform management and analytics</p>
              </div>

              {/* Section Navigation */}
              <div className="d-flex gap-2">
                <button
                  className={`btn ${activeSection === 'dashboard' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => setActiveSection('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`btn ${activeSection === 'users' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => setActiveSection('users')}
                >
                  Users
                </button>
                <button
                  className={`btn ${activeSection === 'reports' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => setActiveSection('reports')}
                >
                  Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Alert */}
        {(stats.pendingReports > 0 || stats.flaggedPosts > 0 || stats.verificationRequests > 0) && (
          <div className="alert alert-warning border-warning mb-4">
            <AlertTriangle className="me-2" style={{ width: '1.25rem', height: '1.25rem' }} />
            <strong>Attention needed:</strong> {stats.pendingReports} pending reports, {stats.flaggedPosts} flagged posts,
            and {stats.verificationRequests} verification requests require review.
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('users')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-primary bg-opacity-10 rounded-3 me-3">
                    <Users className="text-primary" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Total Users</p>
                    <h4 className="mb-1">{stats.totalUsers?.toLocaleString() || '0'}</h4>
                    <small className="text-success">{stats.activeUsers || 0} active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('trades')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-success bg-opacity-10 rounded-3 me-3">
                    <ShoppingCart className="text-success" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Total Trades</p>
                    <h4 className="mb-1">{stats.totalTrades?.toLocaleString() || '0'}</h4>
                    <small className="text-info">{stats.activeTrades || 0} active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('forum')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-purple bg-opacity-10 rounded-3 me-3">
                    <MessageSquare className="text-purple" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Forum Posts</p>
                    <h4 className="mb-1">{stats.totalForumPosts?.toLocaleString() || '0'}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('events')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-warning bg-opacity-10 rounded-3 me-3">
                    <Calendar className="text-warning" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Events</p>
                    <h4 className="mb-1">{stats.totalEvents?.toLocaleString() || '0'}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('reports')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-danger bg-opacity-10 rounded-3 me-3">
                    <Flag className="text-danger" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Pending Reports</p>
                    <h4 className="mb-1 text-danger">{stats.pendingReports || 0}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('flagged')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-warning bg-opacity-10 rounded-3 me-3">
                    <AlertTriangle className="text-warning" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Flagged Posts</p>
                    <h4 className="mb-1 text-warning">{stats.flaggedPosts || 0}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('middleman')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-info bg-opacity-10 rounded-3 me-3">
                    <UserCheck className="text-info" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">MM Applications</p>
                    <h4 className="mb-1 text-info">{stats.middlemanApplications || 0}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('users')}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="p-3 bg-secondary bg-opacity-10 rounded-3 me-3">
                    <Ban className="text-secondary" style={{ width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-1">Banned Users</p>
                    <h4 className="mb-1 text-secondary">{stats.bannedUsers || 0}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <BarChart3 className="me-2" style={{ width: '1.25rem', height: '1.25rem' }} />
                  Platform Activity Trends
                </h5>
                <div className="d-flex gap-2">
                  {Object.entries(timePeriodConfig).map(([key, config]) => (
                    <button
                      key={key}
                      className={`btn btn-sm ${timePeriod === key ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setTimePeriod(key as 'weekly' | 'monthly' | 'quarterly' | 'yearly')}
                    >
                      {(config as { days: number; label: string }).label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="users" stackId="1" stroke="#0d6efd" fill="#0d6efd" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="trades" stackId="1" stroke="#198754" fill="#198754" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="posts" stackId="1" stroke="#6f42c1" fill="#6f42c1" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <PieChart className="me-2" style={{ width: '1.25rem', height: '1.25rem' }} />
                  User Status Distribution
                </h5>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value} users (${((value / stats.totalUsers) * 100).toFixed(1)}%)`,
                        name
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry) => (
                        <span style={{ color: entry.color }}>
                          {value}: {entry.payload?.value || 0}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <TrendingUp className="me-2" style={{ width: '1.25rem', height: '1.25rem' }} />
                  Reports & Issues
                </h5>
                <div className="d-flex gap-2">
                  {Object.entries(timePeriodConfig).map(([key, config]) => (
                    <button
                      key={key}
                      className={`btn btn-sm ${timePeriod === key ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setTimePeriod(key as 'weekly' | 'monthly' | 'quarterly' | 'yearly')}
                    >
                      {(config as { days: number; label: string }).label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="reports" fill="#dc3545" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <Activity className="me-2" style={{ width: '1.25rem', height: '1.25rem' }} />
                  Recent Activity
                </h5>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {recentActivity.map((activity) => (
                    <div key={activity.type} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{activity.label}</strong>
                        <br />
                        <small className="text-muted">{activity.description}</small>
                      </div>
                      <span className={`badge bg-${activity.color} rounded-pill`}>+{activity.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card shadow-sm">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0 d-flex align-items-center">
              <Settings className="me-2" style={{ width: '1.25rem', height: '1.25rem' }} />
              Quick Actions
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-2">
              <div className="col-md-3">
                <button
                  className="btn btn-outline-info w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setActiveSection('middleman')}
                >
                  <UserCheck style={{ width: '1rem', height: '1rem' }} />
                  MM Verification
                </button>
              </div>
              <div className="col-md-3">
                <button
                  className="btn btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setActiveSection('flagged')}
                >
                  <AlertTriangle style={{ width: '1rem', height: '1rem' }} />
                  Flagged Content
                </button>
              </div>
              <div className="col-md-3">
                <button
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setActiveSection('users')}
                >
                  <Users style={{ width: '1rem', height: '1rem' }} />
                  Manage Users
                </button>
              </div>
              <div className="col-md-3">
                <button
                  className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setActiveSection('trades')}
                >
                  <Eye style={{ width: '1rem', height: '1rem' }} />
                  View Trades
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid p-4">
      {renderContent()}
    </div>
  );
};