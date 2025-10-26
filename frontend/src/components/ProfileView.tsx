import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  MessageSquare,
  MessageCircle,
  Globe,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Award,
  Users,
  Flag
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface ProfileData {
  user: {
    _id: string;
    username: string;
    roblox_username?: string;
    bio?: string;
    discord_username?: string;
    messenger_link?: string;
    website?: string;
    avatar_url?: string;
    role: string;
    credibility_score: number;
    vouch_count: number;
    is_verified?: boolean;
    is_middleman?: boolean;
    createdAt: string;
    last_active?: string;
    location?: string;
    timezone?: string;
  };
  stats: {
    totalTrades: number;
    completedTrades: number;
    totalVouches: number;
    successRate: number;
  };
}

export function ProfileView() {
  const { currentPage, setCurrentPage } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportType, setReportType] = useState<'Scamming' | 'Harassment' | 'Inappropriate Content' | 'Spam' | 'Impersonation' | 'Other'>('Other');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Extract user ID from currentPage (format: 'profile-{userId}')
  const userId = currentPage.startsWith('profile-') ? currentPage.replace('profile-', '') : null;

  useEffect(() => {
    if (!userId) {
      setError('Invalid profile URL');
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await apiService.getUserProfile(userId);
        setProfileData(data);
      } catch (err: unknown) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '';

    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }

    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Admin', variant: 'destructive' as const, icon: Shield },
      moderator: { label: 'Moderator', variant: 'secondary' as const, icon: Shield },
      middleman: { label: 'Middleman', variant: 'default' as const, icon: Users },
      verified: { label: 'Verified', variant: 'default' as const, icon: CheckCircle },
      user: { label: 'Member', variant: 'outline' as const, icon: Users }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `Active ${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Active ${diffInDays}d ago`;
    if (diffInDays < 30) return `Active ${Math.floor(diffInDays / 7)}w ago`;

    return `Active ${Math.floor(diffInDays / 30)}mo ago`;
  };

  const handleReportUser = async () => {
    if (!profileData || !reportReason.trim()) {
      toast.error('Please provide a reason for the report');
      return;
    }

    try {
      setSubmittingReport(true);

      await apiService.createReport({
        post_id: profileData.user._id,
        post_type: 'user',
        reason: reportReason.trim(),
        type: reportType
      });

      toast.success('Report submitted successfully');
      setReportModalOpen(false);
      setReportReason('');
      setReportType('Other');
    } catch (error: unknown) {
      console.error('Error submitting report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      toast.error(errorMessage);
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error || 'Profile not found'}</p>
          <Button onClick={() => setCurrentPage('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { user, stats } = profileData;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Profile Header - Hero Section */}
        <Card className="mb-8 overflow-hidden shadow-2xl border-0 bg-card">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-muted/30"></div>

            <CardContent className="relative p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Avatar Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
                      <AvatarImage
                        src={getAvatarUrl(user.avatar_url)}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                        }}
                      />
                      <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                    <div className="mb-4 lg:mb-0">
                      <div className="flex items-center gap-4 mb-3 justify-center lg:justify-start">
                        <h1 className="text-4xl lg:text-5xl font-bold text-card-foreground">
                          {user.username}
                        </h1>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-xl text-muted-foreground mb-2">
                        @{user.roblox_username || 'Not set'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Member since {formatDate(user.createdAt)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatLastActive(user.last_active)}
                      </p>
                    </div>

                    {/* Report Button */}
                    <div className="flex justify-center lg:justify-end">
                      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Flag className="w-4 h-4" />
                            Report User
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Report User</DialogTitle>
                            <DialogDescription>
                              Report {user.username} for violating community guidelines. All reports are reviewed by moderators.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <label htmlFor="report-type" className="text-sm font-medium">
                                Report Type
                              </label>
                              <select
                                id="report-type"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="Scamming">Scamming</option>
                                <option value="Harassment">Harassment</option>
                                <option value="Inappropriate Content">Inappropriate Content</option>
                                <option value="Spam">Spam</option>
                                <option value="Impersonation">Impersonation</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="grid gap-2">
                              <label htmlFor="report-reason" className="text-sm font-medium">
                                Reason
                              </label>
                              <Textarea
                                id="report-reason"
                                placeholder="Please provide details about why you're reporting this user..."
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="min-h-[100px]"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setReportModalOpen(false)}
                              disabled={submittingReport}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleReportUser}
                              disabled={submittingReport || !reportReason.trim()}
                            >
                              {submittingReport ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                'Submit Report'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-card rounded-xl border border-border">
                      <div className="text-2xl font-bold text-card-foreground mb-1">
                        {stats.totalTrades}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Total Trades</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-xl border border-border">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {stats.successRate}%
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-xl border border-border">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {user.vouch_count}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Vouches</div>
                    </div>
                    <div className="text-center p-4 bg-card rounded-xl border border-border">
                      <div className="flex items-center justify-center mb-1">
                        <Award className="w-6 h-6 text-yellow-500 mr-1" />
                        <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {user.credibility_score}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Credibility</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio Section */}
            {user.bio && (
              <Card className="shadow-xl border-0 bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-card-foreground">
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-card-foreground leading-relaxed text-lg">
                    {user.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card className="shadow-xl border-0 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-card-foreground">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.discord_username && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-blue-500 rounded-full">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">Discord</p>
                        <p className="text-sm text-muted-foreground">{user.discord_username}</p>
                      </div>
                    </div>
                  )}

                  {user.messenger_link && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-green-500 rounded-full">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">Messenger</p>
                        <a
                          href={user.messenger_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {user.messenger_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {user.website && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-purple-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">Website</p>
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {user.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {user.location && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-red-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">Location</p>
                        <p className="text-sm text-muted-foreground">{user.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Account Details */}
            <Card className="shadow-xl border-0 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-card-foreground">
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium text-muted-foreground">Username</span>
                  <span className="text-sm font-semibold text-card-foreground">{user.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium text-muted-foreground">Roblox</span>
                  <span className="text-sm font-semibold text-card-foreground">@{user.roblox_username || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium text-muted-foreground">Role</span>
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                  <span className="text-sm font-semibold text-card-foreground">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Trading Stats */}
            <Card className="shadow-xl border-0 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-card-foreground">
                  Trading Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-card-foreground">{stats.totalTrades}</div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completedTrades}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalVouches}</div>
                  <div className="text-sm text-muted-foreground">Vouches Received</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}