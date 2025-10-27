import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  Search, 
  Star, 
  MessageSquare, 
  CheckCircle,
  TrendingUp,
  Award,
  Heart,
  Loader2
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { MiddlemanApplicationForm } from './user/MiddlemanApplicationForm';
import { useAuth, useApp } from '../App';

// Helper function to get avatar URL
const getAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) return '';

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
    return `http://localhost:5000${avatarUrl}`;
  }

  console.log('getAvatarUrl: Processing filename:', avatarUrl);
  const fullUrl = `http://localhost:5000/api/uploads/avatars/${avatarUrl}`;
  console.log('getAvatarUrl: Generated URL:', fullUrl);
  return fullUrl;
};

// Define the Middleman interface
interface Middleman {
  id: string | number;
  username: string;
  robloxUsername: string;
  avatar?: string;
  rating: number;
  vouchCount: number;
  credibilityScore: number;
  completedTrades: number;
  joinDate: string;
  verified: boolean;
  tier: string;
  status: string;
  fees: string;
  specialties: string[];
  responseTime: string;
  lastActive: string;
  description: string;
  successRate: number;
}

// Define the API response interface
interface MiddlemanApiResponse {
  _id: string;
  username: string;
  roblox_username: string;
  avatar_url?: string;
  rating?: number;
  vouches?: number;
  credibility_score?: number;
  trades?: number;
  verificationDate?: string;
  createdAt?: string;
  is_active?: boolean;
  fees?: string;
  preferred_trade_types?: string[];
  average_response_time?: string;
  last_active?: string;
  bio?: string;
  success_rate?: number;
}

export function MiddlemanDirectory() {
  const { user } = useAuth();
  const { setCurrentPage } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  const [middlemen, setMiddlemen] = useState<Middleman[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<null | {
    status: string;
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
  }>(null);
  
  // Vouch-related state
  const [userVouchedMiddlemen, setUserVouchedMiddlemen] = useState<Set<string>>(new Set());
  const [vouchLoading, setVouchLoading] = useState<Set<string>>(new Set());
  const [vouchStatusVersion, setVouchStatusVersion] = useState(0); // Track vouch status changes
  
  // Check application status on component mount
  useEffect(() => {
    const checkApplicationStatus = async () => {
      try {
        const response = await apiService.getApplicationStatus();
        setApplicationStatus(response);
      } catch (error) {
        // If no application found, that's fine - user can apply
        if ((error as Error).message !== 'No application found') {
          console.error('Error checking application status:', error);
        }
      }
    };

    if (user) {
      checkApplicationStatus();
    }
  }, [user]);

  // Load user's vouch status for all middlemen
  useEffect(() => {
    const loadUserVouchStatus = async () => {
      if (!user || middlemen.length === 0) return;

      try {
        const vouchStatusPromises = middlemen.map(mm => 
          apiService.hasUserVouchedForMiddleman(mm.id.toString())
            .catch(error => {
              console.error(`Error checking vouch status for middleman ${mm.id}:`, error);
              return { hasVouched: false }; // Default to not vouched on error
            })
        );

        const vouchStatuses = await Promise.all(vouchStatusPromises);

        const vouchedSet = new Set<string>();
        vouchStatuses.forEach((status, index) => {
          if (status.hasVouched) {
            vouchedSet.add(middlemen[index].id.toString());
          }
        });

        setUserVouchedMiddlemen(vouchedSet);
      } catch (error) {
        console.error('Error loading user vouch status:', error);
      }
    };

    loadUserVouchStatus();
  }, [user, middlemen, vouchStatusVersion]);

  // Determine if user can apply to be a middleman
  const canApplyForMiddleman = () => {
    // User must be logged in
    if (!user) return false;

    // User cannot be a middleman already
    if (user.role === 'middleman') return false;

    // User cannot have a pending application
    if (applicationStatus?.status === 'pending') return false;

    // User can apply if they have no application or their previous application was rejected
    // OR if they were previously approved but are no longer a middleman (role was changed)
    return !applicationStatus ||
           applicationStatus.status === 'rejected' ||
           (applicationStatus.status === 'approved' && user.role !== 'middleman');
  };

  // Fetch actual middlemen data from the backend
  useEffect(() => {
    const fetchMiddlemen = async () => {
      try {
        setLoading(true);
        const response = await apiService.getMiddlemen();
        
        // Transform the data to match our component's expected format
        const formattedMiddlemen = response.middlemen.map((mm: MiddlemanApiResponse) => ({
          id: mm._id,
          username: mm.username,
          robloxUsername: mm.roblox_username,
          avatar: mm.avatar_url,
          rating: mm.rating || 5,
          vouchCount: mm.vouches || 0,
          credibilityScore: mm.credibility_score || 0,
          completedTrades: mm.trades || 0,
          joinDate: mm.verificationDate || mm.createdAt,
          verified: true,
          tier: determineTier(mm.rating || 0, mm.vouches || 0),
          status: mm.is_active ? 'online' : 'offline',
          fees: mm.fees || '3-5%',
          specialties: mm.preferred_trade_types || ['General Trading'],
          responseTime: mm.average_response_time || '< 1 hour',
          lastActive: getLastActiveText(mm.last_active),
          description: mm.bio || 'Verified middleman on BloxMarket platform.',
          successRate: mm.success_rate || 100
        }));
        
        setMiddlemen(formattedMiddlemen);
      } catch (error) {
        console.error('Error fetching middlemen:', error);
        toast.error('Failed to load middlemen directory');
        
        // Fallback to mock data if API fails
        setMiddlemen([
          {
            id: 1,
            username: 'TrustedMM_Pro',
            robloxUsername: 'TrustedMM_Pro',
            avatar: 'https://images.unsplash.com/photo-1740252117027-4275d3f84385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyb2Jsb3glMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MXx8fHwxNzU4NTYwNDQ4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
            rating: 5,
            vouchCount: 347,
            credibilityScore: 3470, // 347 vouches * 5 stars * 2 points per star
            completedTrades: 1205,
            joinDate: '2022-01-15',
            verified: true,
            tier: 'diamond',
            status: 'online',
            fees: '2-5%',
            specialties: ['High Value Items', 'Robux Trading', 'Limited Items'],
            responseTime: '< 5 min',
            lastActive: 'Online now',
            description: 'Professional middleman with 3+ years experience. Specializing in high-value trades and Robux transactions. Fast response time and 100% success rate.',
            successRate: 100
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMiddlemen();
  }, [vouchStatusVersion]); // Add vouchStatusVersion as dependency
  
  // Helper functions for formatting data
  const determineTier = (rating: number, vouches: number): string => {
    if (vouches >= 300 && rating >= 4.8) return 'diamond';
    if (vouches >= 200 && rating >= 4.5) return 'platinum';
    if (vouches >= 100 && rating >= 4.0) return 'gold';
    if (vouches >= 50) return 'silver';
    return 'bronze';
  };
  
  const getLastActiveText = (lastActive: string | undefined): string => {
    if (!lastActive) return 'Unknown';
    
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMinutes = Math.round((now.getTime() - lastActiveDate.getTime()) / 60000);
    
    if (diffMinutes < 5) return 'Online now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hours ago`;
    return lastActiveDate.toLocaleDateString();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300';
      case 'platinum': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'gold': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'silver': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default: return 'bg-bronze-100 text-bronze-700 dark:bg-bronze-900 dark:text-bronze-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Vouch handling functions
  const handleVouch = async (middlemanId: string, rating: number, comment?: string) => {
    if (!user) {
      toast.error('You must be logged in to vouch');
      return;
    }

    if (user.id === middlemanId) {
      toast.error('You cannot vouch for yourself');
      return;
    }

    setVouchLoading(prev => new Set(prev).add(middlemanId));

    try {
      await apiService.vouchForMiddleman(middlemanId, rating, comment);
      
      // Update local state for immediate UI feedback
      setUserVouchedMiddlemen(prev => new Set(prev).add(middlemanId));
      
      // Trigger data refetch to get updated vouch count and credibility score
      setVouchStatusVersion(prev => prev + 1);

      toast.success('Successfully vouched for middleman!');
    } catch (error) {
      console.error('Error vouching for middleman:', error);
      toast.error('Failed to vouch for middleman');
    } finally {
      setVouchLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(middlemanId);
        return newSet;
      });
    }
  };

  const handleUnvouch = async (middlemanId: string) => {
    setVouchLoading(prev => new Set(prev).add(middlemanId));

    try {
      await apiService.unvouchForMiddleman(middlemanId);
      
      // Update local state for immediate UI feedback
      setUserVouchedMiddlemen(prev => {
        const newSet = new Set(prev);
        newSet.delete(middlemanId);
        return newSet;
      });
      
      // Trigger data refetch to get updated vouch count and credibility score
      setVouchStatusVersion(prev => prev + 1);

      toast.success('Successfully removed vouch');
    } catch (error) {
      console.error('Error removing vouch:', error);
      toast.error('Failed to remove vouch');
    } finally {
      setVouchLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(middlemanId);
        return newSet;
      });
    }
  };

  const handleMiddlemanClick = (middlemanId: string) => {
    setCurrentPage(`profile-${middlemanId}`);
  };

  const filteredMiddlemen = middlemen.filter(mm => 
    mm.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mm.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedMiddlemen = filteredMiddlemen.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating || b.vouchCount - a.vouchCount;
      case 'vouches':
        return b.vouchCount - a.vouchCount;
      case 'trades':
        return b.completedTrades - a.completedTrades;
      case 'newest':
        return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-500" />
              Middleman Directory
            </h1>
            <p className="text-muted-foreground">Verified middlemen to help secure your trades</p>
          </div>
          
          {canApplyForMiddleman() && (
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              onClick={() => setIsApplicationFormOpen(true)}
            >
              Apply to be a Middleman
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search middlemen by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="vouches">Most Vouches</SelectItem>
              <SelectItem value="trades">Most Trades</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>{sortedMiddlemen.length} Verified Middlemen</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>99.2% Success Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <span>45,678 Completed Trades</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 animate-spin">
                  <Shield className="w-4 h-4 text-white animate-pulse" />
                </div>
                <p className="text-muted-foreground">Loading middlemen...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedMiddlemen.map((mm) => (
                <Card 
                  key={mm.id} 
                  className="hover:shadow-lg transition-all duration-200 relative cursor-pointer"
                  onClick={() => handleMiddlemanClick(mm.id.toString())}
                >
                  {/* Status Indicator */}
                  <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${getStatusColor(mm.status)}`} />
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <Avatar 
                        className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMiddlemanClick(mm.id.toString());
                        }}
                      >
                        <AvatarImage src={getAvatarUrl(mm.avatar)} />
                        <AvatarFallback>{mm.username[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 
                            className="font-semibold text-lg cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMiddlemanClick(mm.id.toString());
                            }}
                          >
                            {mm.username}
                          </h3>
                          {mm.verified && (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">@{mm.robloxUsername}</p>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTierColor(mm.tier)}>
                            <Award className="w-3 h-3 mr-1" />
                            {mm.tier} tier
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {mm.fees} fees
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < mm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-sm font-medium ml-1">{mm.rating}.0</span>
                          <span className="text-sm text-muted-foreground">({mm.vouchCount} vouches)</span>
                        </div>
                        
                        {/* Credibility Score */}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300">
                            <Heart className="w-3 h-3 mr-1" />
                            {mm.credibilityScore} credibility
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{mm.description}</p>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <span className="text-xs text-muted-foreground">Completed Trades</span>
                        <p className="font-semibold text-green-600 dark:text-green-400">{mm.completedTrades.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Success Rate</span>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">{mm.successRate}%</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Response Time</span>
                        <p className="font-semibold">{mm.responseTime}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Last Active</span>
                        <p className="font-semibold">{mm.lastActive}</p>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Specialties:</span>
                      <div className="flex flex-wrap gap-1">
                        {mm.specialties.map((specialty, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                      {/* Rating Section */}
                      {user && user.id !== mm.id.toString() && !userVouchedMiddlemen.has(mm.id.toString()) && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Rate:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                className="text-yellow-400 hover:text-yellow-500 transition-colors disabled:opacity-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVouch(mm.id.toString(), star);
                                }}
                                disabled={vouchLoading.has(mm.id.toString())}
                                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                              >
                                <Star className={`w-5 h-5 ${vouchLoading.has(mm.id.toString()) ? 'opacity-50' : ''}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vouch/Contact Section */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          {user && user.id !== mm.id.toString() ? (
                            userVouchedMiddlemen.has(mm.id.toString()) ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="w-full bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100 dark:bg-pink-950 dark:border-pink-800 dark:text-pink-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnvouch(mm.id.toString());
                                }}
                                disabled={vouchLoading.has(mm.id.toString())}
                              >
                                {vouchLoading.has(mm.id.toString()) ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Heart className="w-3 h-3 mr-1 fill-current" />
                                )}
                                {vouchLoading.has(mm.id.toString()) ? 'Removing...' : 'Unvouch'}
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVouch(mm.id.toString(), 5);
                                }}
                                disabled={vouchLoading.has(mm.id.toString())}
                              >
                                {vouchLoading.has(mm.id.toString()) ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Heart className="w-3 h-3 mr-1" />
                                )}
                                {vouchLoading.has(mm.id.toString()) ? 'Vouching...' : 'Vouch'}
                              </Button>
                            )
                          ) : (
                            <div className="text-xs text-muted-foreground text-center py-2 border rounded">
                              {user ? 'Cannot vouch for yourself' : 'Login to vouch'}
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMiddlemanClick(mm.id.toString());
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && sortedMiddlemen.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No middlemen found</h3>
                  <p>Try adjusting your search criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="border-t border-border p-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <Shield className="w-4 h-4 inline mr-1" />
              All middlemen are verified by our team and have completed identity verification
            </p>
            <p>Always verify the middleman's identity before proceeding with trades. Report any suspicious activity immediately.</p>
          </div>
        </div>
      </div>
      
      {/* Application Form Dialog */}
      <MiddlemanApplicationForm 
        isOpen={isApplicationFormOpen} 
        onClose={() => setIsApplicationFormOpen(false)} 
      />
    </div>
  );
}