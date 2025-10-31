import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  MessageCircle,
  Globe,
  Calendar,
  Edit,
  Camera,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Award,
  Users
} from 'lucide-react';

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
  vouches?: {
    id: string;
    rating: number;
    comment?: string;
    given_by: {
      id: string;
      username: string;
      avatar_url?: string;
    };
    created_at: string;
  }[];
  middlemanVouches?: {
    id: string;
    rating: number;
    comment?: string;
    given_by: {
      id: string;
      username: string;
      avatar_url?: string;
    };
    created_at: string;
  }[];
}

interface EditFormData {
  username: string;
  bio: string;
  discordUsername: string;
  messengerLink: string;
  website: string;
  robloxUsername: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function NewUserProfile() {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [editForm, setEditForm] = useState<EditFormData>({
    username: '',
    bio: '',
    discordUsername: '',
    messengerLink: '',
    website: '',
    robloxUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        // Use getUserProfile instead of getCurrentUser to get the nested structure
        const userId = user?._id || user?.id;
        if (!userId || typeof userId !== 'string') {
          throw new Error('User ID not found');
        }

        const data = await apiService.getUserProfile(userId) as ProfileData;
        setProfileData(data);

        // Initialize edit form with current data
        setEditForm({
          username: data.user.username || '',
          bio: data.user.bio || '',
          discordUsername: data.user.discord_username || '',
          messengerLink: data.user.messenger_link || '',
          website: data.user.website || '',
          robloxUsername: data.user.roblox_username || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } catch (err: unknown) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Avatar file too large (max 2MB)');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setSelectedAvatar(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatar) return;

    try {
      setSaving(true);
      const toastId = toast.loading('Uploading avatar...');

      const result = await apiService.uploadAvatar(selectedAvatar) as { avatar_url: string };

      // Update profile data with new avatar
      setProfileData(prev => prev ? ({
        ...prev,
        user: {
          ...prev.user,
          avatar_url: result.avatar_url
        }
      }) : null);

      setSelectedAvatar(null);
      setAvatarPreview('');
      toast.success('Avatar updated successfully!', { id: toastId });
    } catch (err: unknown) {
      console.error('Failed to upload avatar:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    // Validate password change
    if (editForm.newPassword || editForm.confirmPassword || editForm.currentPassword) {
      if (!editForm.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (!editForm.newPassword) {
        setError('New password is required');
        return;
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (editForm.newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');

      const updateData: {
        username: string;
        robloxUsername: string;
        bio: string;
        discordUsername: string;
        messengerLink: string;
        website: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        username: editForm.username,
        robloxUsername: editForm.robloxUsername,
        bio: editForm.bio,
        discordUsername: editForm.discordUsername,
        messengerLink: editForm.messengerLink,
        website: editForm.website
      };

      // Add password change if provided
      if (editForm.newPassword) {
        updateData.currentPassword = editForm.currentPassword;
        updateData.newPassword = editForm.newPassword;
      }

      await apiService.updateProfile(updateData);

      setIsEditDialogOpen(false);
      toast.success('Profile updated successfully!');

      // Refetch profile data to ensure we have the latest data
      try {
        const userId = user?._id || user?.id;
        if (userId && typeof userId === 'string') {
          const updatedData = await apiService.getUserProfile(userId) as ProfileData;
          setProfileData(updatedData);
        }
      } catch (refetchError) {
        console.error('Failed to refetch profile data:', refetchError);
        // Fallback to optimistic update if refetch fails
        setProfileData(prev => prev ? {
          ...prev,
          user: {
            ...prev.user,
            username: editForm.username,
            bio: editForm.bio,
            discord_username: editForm.discordUsername,
            messenger_link: editForm.messengerLink,
            website: editForm.website,
            roblox_username: editForm.robloxUsername
          }
        } : null);
      }

      // Clear password fields
      setEditForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      console.error('Failed to update profile:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Profile Header - Hero Section */}
        <Card className="mb-8 overflow-hidden shadow-2xl border-0 bg-card">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-muted/30"></div>

            <CardContent className="relative p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Avatar Section - Larger */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
                      <AvatarImage
                        src={avatarPreview || getAvatarUrl(profileData?.user?.avatar_url)}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                        }}
                      />
                      <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                        {profileData?.user?.username?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 border border-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', zIndex: 30 }}>
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="d-none"
                      />
                      <span className="visually-hidden">Change avatar</span>
                    </label>
                  </div>
                  {selectedAvatar && (
                    <div className="position-absolute top-0 end-0 d-flex gap-2" style={{ zIndex: 40 }}>
                      <Button
                        size="sm"
                        onClick={handleAvatarUpload}
                        disabled={saving}
                        className="btn btn-success rounded-circle p-2 d-flex align-items-center justify-content-center shadow-lg border border-white"
                        style={{ width: '36px', height: '36px' }}
                        title="Save avatar"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedAvatar(null);
                          setAvatarPreview('');
                        }}
                        className="btn btn-danger rounded-circle p-2 d-flex align-items-center justify-content-center shadow-lg border border-white"
                        style={{ width: '36px', height: '36px' }}
                        title="Cancel upload"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Profile Info - Enhanced */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                    <div className="mb-4 lg:mb-0">
                      <div className="flex items-center gap-4 mb-3 justify-center lg:justify-start">
                        <h1 className="text-4xl lg:text-5xl font-bold text-card-foreground">
                          {profileData?.user?.username || 'Loading...'}
                        </h1>
                        {profileData?.user && getRoleBadge(profileData.user.role || 'user')}
                      </div>
                      <p className="text-xl text-muted-foreground mb-2">
                        @{profileData?.user?.roblox_username || 'Not set'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Member since {profileData?.user?.createdAt ? formatDate(profileData.user.createdAt) : 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {profileData?.user?.last_active ? formatLastActive(profileData.user.last_active) : 'Unknown'}
                      </p>
                    </div>

                    {/* Edit Profile Button */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Edit className="w-5 h-5 mr-2" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="text-card-foreground">Edit Profile</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleEditProfile} className="space-y-6 py-4">
                          {/* Profile Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 text-card-foreground">Profile Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                  id="username"
                                  value={editForm.username}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                  placeholder="Enter your username"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="roblox">Roblox Username *</Label>
                                <Input
                                  id="roblox"
                                  value={editForm.robloxUsername}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, robloxUsername: e.target.value }))}
                                  placeholder="Enter your Roblox username"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="bio">Bio</Label>
                              <Textarea
                                id="bio"
                                value={editForm.bio}
                                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                className="min-h-[100px] resize-none"
                                placeholder="Tell others about yourself..."
                                maxLength={500}
                              />
                              <div className="text-xs text-muted-foreground text-right">
                                {editForm.bio.length}/500 characters
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="discord">Discord Username</Label>
                                <Input
                                  id="discord"
                                  value={editForm.discordUsername}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, discordUsername: e.target.value }))}
                                  placeholder="username#1234 or @username"
                                  maxLength={50}
                                />
                                <div className="text-xs text-muted-foreground text-right">
                                  {editForm.discordUsername.length}/50 characters
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="messenger">Messenger Link</Label>
                                <Input
                                  id="messenger"
                                  value={editForm.messengerLink}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, messengerLink: e.target.value }))}
                                  placeholder="https://m.me/username"
                                  maxLength={200}
                                />
                                <div className="text-xs text-muted-foreground text-right">
                                  {editForm.messengerLink.length}/200 characters
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="website">Website/Social Media</Label>
                              <Input
                                id="website"
                                value={editForm.website}
                                onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                                placeholder="https://twitter.com/username"
                                maxLength={200}
                              />
                              <div className="text-xs text-muted-foreground text-right">
                                {editForm.website.length}/200 characters
                              </div>
                            </div>
                          </div>

                          {/* Password Change */}
                          <div className="space-y-4 border-t border-border pt-6">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 text-card-foreground">Change Password</h3>

                            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor="currentPassword">Current Password</Label>
                                  <Input
                                    id="currentPassword"
                                    type="password"
                                    value={editForm.currentPassword}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    placeholder="Enter current password"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="newPassword">New Password</Label>
                                  <Input
                                    id="newPassword"
                                    type="password"
                                    value={editForm.newPassword}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="Enter new password"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                  <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={editForm.confirmPassword}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="Confirm new password"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {error && (
                            <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                              {error}
                            </div>
                          )}

                          <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                              {saving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
                                    <div className="text-center p-4 bg-card rounded-xl border border-border">
                                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                        {profileData?.stats?.totalVouches || 0}
                                      </div>
                                      <div className="text-sm font-medium text-muted-foreground">Vouches</div>
                                    </div>
                                    <div className="text-center p-4 bg-card rounded-xl border border-border">
                                      <div className="flex items-center justify-center mb-1">
                                        <Award className="w-6 h-6 text-yellow-500 mr-1" />
                                        <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                          {profileData?.user?.credibility_score || 0}
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

        {/* Profile Content - Enhanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Bio and Links */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio Section */}
            {profileData?.user?.bio && (
              <Card className="shadow-xl border-0 bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-card-foreground">
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-card-foreground leading-relaxed text-lg">
                    {profileData.user.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information - Enhanced */}
            <Card className="shadow-xl border-0 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-card-foreground">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {profileData?.user?.discord_username && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-blue-500 rounded-full">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">Discord</p>
                        <p className="text-sm text-muted-foreground truncate">{profileData.user.discord_username}</p>
                      </div>
                    </div>
                  )}

                  {profileData?.user?.messenger_link && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-green-500 rounded-full">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">Messenger</p>
                        <a
                          href={profileData.user.messenger_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {profileData.user.messenger_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {profileData?.user?.website && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-purple-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">Website</p>
                        <a
                          href={profileData.user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {profileData.user.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {profileData?.user?.location && (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                      <div className="p-3 bg-red-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">Location</p>
                        <p className="text-sm text-muted-foreground truncate">{profileData.user.location}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
                    <div className="p-3 bg-indigo-500 rounded-full">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">Member Since</p>
                      <p className="text-sm text-muted-foreground">
                        {profileData?.user?.createdAt ? new Date(profileData.user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Additional Info */}
          <div className="space-y-8">
            {/* Vouches Section */}
            {(profileData?.vouches && profileData.vouches.length > 0) || (profileData?.middlemanVouches && profileData.middlemanVouches.length > 0) && (
              <Card className="shadow-xl border-0 bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-card-foreground flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Recent Vouches ({profileData.stats.totalVouches})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trade Vouches */}
                  {profileData.vouches && profileData.vouches.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground border-b border-border pb-2">Trade Vouches</h4>
                      {profileData.vouches.map((vouch) => (
                        <div key={vouch.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={getAvatarUrl(vouch.given_by.avatar_url)}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {vouch.given_by.username[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-card-foreground truncate">
                                {vouch.given_by.username}
                              </span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Award
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < vouch.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-muted-foreground'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {vouch.comment && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {vouch.comment}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(vouch.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Middleman Vouches */}
                  {profileData.middlemanVouches && profileData.middlemanVouches.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground border-b border-border pb-2">Middleman Vouches</h4>
                      {profileData.middlemanVouches.map((vouch) => (
                        <div key={vouch.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={getAvatarUrl(vouch.given_by.avatar_url)}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {vouch.given_by.username[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-card-foreground truncate">
                                {vouch.given_by.username}
                              </span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Award
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < vouch.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-muted-foreground'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {vouch.comment && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {vouch.comment}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(vouch.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total count message */}
                  {((profileData.vouches?.length || 0) + (profileData.middlemanVouches?.length || 0)) < profileData.stats.totalVouches && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-muted-foreground">
                        And {profileData.stats.totalVouches - ((profileData.vouches?.length || 0) + (profileData.middlemanVouches?.length || 0))} more vouches...
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                  <span className="text-sm font-semibold text-card-foreground">{profileData?.user?.username || 'Loading...'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium text-muted-foreground">Roblox</span>
                  <span className="text-sm font-semibold text-card-foreground">@{profileData?.user?.roblox_username || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium text-muted-foreground">Role</span>
                  {profileData?.user ? getRoleBadge(profileData.user.role || 'user') : <span className="text-sm">Loading...</span>}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                  <span className="text-sm font-semibold text-card-foreground">
                    {profileData?.user?.createdAt ? formatDate(profileData.user.createdAt) : 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}