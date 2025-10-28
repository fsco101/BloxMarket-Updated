import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { 
  Search, 
  Ban, 
  UserCheck, 
  Eye, 
  Shield,
  Crown,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
  UserX,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Clock,
  XCircle
} from 'lucide-react';

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

interface User {
  _id: string;
  username: string;
  email: string;
  roblox_username: string;
  role: string;
  avatar_url?: string;
  credibility_score: number;
  createdAt: string;
  lastActive?: string;
  totalTrades: number;
  totalVouches: number;
  isActive?: boolean;
  is_active?: boolean;
  ban_reason?: string;
  banned_at?: string;
  banned_by?: string;
  deactivation_reason?: string;
  deactivated_at?: string;
  deactivated_by?: string;
  penalties?: Penalty[];
  active_penalties?: number;
}

interface Penalty {
  _id: string;
  type: 'warning' | 'restriction' | 'suspension' | 'strike';
  reason: string;
  issued_by: string;
  issued_at: string;
  expires_at?: string;
  is_active: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [jQueryReady, setJQueryReady] = useState(false);
  
  // Action dialogs
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
  const [liftPenaltyDialogOpen, setLiftPenaltyDialogOpen] = useState(false);
  const [liftBanDialogOpen, setLiftBanDialogOpen] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [penaltyType, setPenaltyType] = useState<'warning' | 'restriction' | 'suspension' | 'strike'>('warning');
  const [penaltySeverity, setPenaltySeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [penaltyDuration, setPenaltyDuration] = useState<string>('');

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Helper function to get avatar URL
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

  // Check if jQuery and DataTables are loaded
  const checkJQueryReady = () => {
    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.$ && window.$.fn && window.$.fn.DataTable) {
          console.log('jQuery and DataTables are ready');
          clearInterval(checkInterval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.error('jQuery/DataTables failed to load after 5 seconds');
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  };

  useEffect(() => {
    // Initialize jQuery check
    const initJQuery = async () => {
      const ready = await checkJQueryReady();
      setJQueryReady(ready);
      
      if (!ready) {
        setError('Required libraries (jQuery/DataTables) failed to load. Please refresh the page.');
        setLoading(false);
      }
    };
    
    initJQuery();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading users...');
      
      const response = await apiService.getUsers({
        page: 1,
        limit: 1000,
        search: '',
        role: '',
        status: ''
      });
      
      console.log('API Response:', response);
      
      if (!response || !response.users) {
        throw new Error('Invalid response format');
      }
      
      // Normalize the user data
      const normalizedUsers = response.users
        .filter((user: any) => user && user._id) // Filter out null/undefined users
        .map((user: any) => ({
          ...user,
          isActive: user.isActive !== undefined ? user.isActive : user.is_active !== undefined ? user.is_active : true
        }));
      
      console.log('Normalized users:', normalizedUsers.length);
      setUsers(normalizedUsers);
      
      // Always destroy existing DataTable and reinitialize to avoid DOM conflicts
      // Use requestAnimationFrame to ensure DOM stability
      requestAnimationFrame(() => {
        setTimeout(() => {
          // First cleanup
          if (dataTableRef.current) {
            console.log('Destroying existing DataTable...');
            try {
              // Remove all event handlers first
              if (window.$ && tableRef.current) {
                window.$(tableRef.current).off();
              }
              dataTableRef.current.destroy();
              dataTableRef.current = null;
              isInitialized.current = false;
            } catch (err) {
              console.error('Error destroying DataTable:', err);
              // Force cleanup
              dataTableRef.current = null;
              isInitialized.current = false;
            }
          }
          
          // Clear table body to ensure clean slate
          if (tableRef.current) {
            const tbody = tableRef.current.querySelector('tbody');
            if (tbody) {
              tbody.innerHTML = '';
            }
          }
          
          // Wait for DOM to settle completely
          setTimeout(() => {
            console.log('Initializing new DataTable...');
            initializeDataTable(normalizedUsers);
          }, 100);
        }, 50);
      });
      
    } catch (error: any) {
      console.error('Error loading users:', error);
      
      let errorMessage = 'Failed to load users';
      
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeDataTable = (userData: User[]) => {
    if (!window.$ || !window.$.fn || !window.$.fn.DataTable) {
      console.error('jQuery or DataTables not available');
      setError('DataTables library not loaded. Please refresh the page.');
      return;
    }

    if (!tableRef.current) {
      console.error('Table ref not available');
      return;
    }

    const $ = window.$;
    
    console.log('Initializing DataTable with', userData.length, 'users');
    
    try {
      // Destroy existing instance if exists
      if (dataTableRef.current) {
        try {
          dataTableRef.current.destroy();
        } catch (err) {
          console.log('No existing DataTable to destroy');
        }
      }

      dataTableRef.current = $(tableRef.current).DataTable({
        data: userData,
        destroy: true,
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[4, 'desc']],
        columns: [
          {
            title: 'User',
            data: null,
            orderable: false,
            render: (data: User) => {
              // Add null checks
              if (!data || !data.username) {
                return '<div class="text-gray-500">Invalid user data</div>';
              }
              
              const avatarHtml = data.avatar_url 
                ? `<img src="${getAvatarUrl(data.avatar_url)}" alt="${data.username}" class="w-10 h-10 rounded-full object-cover" />`
                : `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center"><span class="font-medium text-sm">${data.username[0]?.toUpperCase()}</span></div>`;
              
              return `
                <div class="flex items-center gap-3">
                  ${avatarHtml}
                  <div>
                    <p class="font-medium">${data.username}</p>
                    <p class="text-sm text-gray-500">${data.email || ''}</p>
                    ${data.roblox_username ? `<p class="text-xs text-blue-600">@${data.roblox_username}</p>` : ''}
                  </div>
                </div>
              `;
            }
          },
          {
            title: 'Role',
            data: 'role',
            render: (data: string) => {
              const roleColors: Record<string, string> = {
                'admin': 'bg-yellow-100 text-yellow-800',
                'moderator': 'bg-blue-100 text-blue-800',
                'middleman': 'bg-green-100 text-green-800',
                'verified': 'bg-indigo-100 text-indigo-800',
                'banned': 'bg-red-100 text-red-800',
                'user': 'bg-gray-100 text-gray-800'
              };
              
              const colorClass = roleColors[data] || roleColors['user'];
              
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                ${data.charAt(0).toUpperCase() + data.slice(1)}
              </span>`;
            }
          },
          {
            title: 'Stats',
            data: null,
            orderable: false,
            render: (data: User) => {
              // Add null checks
              if (!data) {
                return '<div class="text-gray-500">-</div>';
              }
              
              const credibility = data.credibility_score || 0;
              return `
                <div class="text-sm">
                  <p><strong>${data.totalTrades || 0}</strong> trades</p>
                  <p><strong>${data.totalVouches || 0}</strong> vouches</p>
                  <div class="flex items-center gap-1 mt-1">
                    <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500" style="width: ${credibility}%"></div>
                    </div>
                    <span class="text-xs text-gray-500">${credibility}%</span>
                  </div>
                </div>
              `;
            }
          },
          {
            title: 'Status',
            data: null,
            render: (data: User) => {
              // Add null checks
              if (!data) {
                return '<span class="text-gray-500">Unknown</span>';
              }
              
              const isBanned = data.role === 'banned';
              
              // Check for penalty statuses
              const penalties = data.penalties || [];
              const activePenalties = penalties.filter(p => p.is_active);
              
              const hasActiveSuspension = activePenalties.some(p => p.type === 'suspension');
              const hasActiveRestriction = activePenalties.some(p => p.type === 'restriction');
              const hasActiveWarning = activePenalties.some(p => p.type === 'warning');
              const hasActiveStrike = activePenalties.some(p => p.type === 'strike');
              
              let statusHtml = '';
              let statusText = '';
              let statusClass = '';
              
              if (isBanned) {
                statusText = 'Banned';
                statusClass = 'bg-red-100 text-red-800';
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
                if (data.ban_reason) {
                  statusHtml += `<div class="text-xs text-red-600 mt-1 p-1 bg-red-50 rounded max-w-xs truncate" title="${data.ban_reason}">Reason: ${data.ban_reason}</div>`;
                }
              } else if (hasActiveSuspension) {
                const suspension = activePenalties.find(p => p.type === 'suspension');
                statusText = 'Suspended';
                statusClass = 'bg-orange-100 text-orange-800';
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
                if (suspension) {
                  const expiryInfo = suspension.expires_at 
                    ? ` until ${new Date(suspension.expires_at).toLocaleDateString()}`
                    : ' permanently';
                  statusHtml += `<div class="text-xs text-orange-600 mt-1 p-1 bg-orange-50 rounded max-w-xs truncate" title="${suspension.reason}">Suspended${expiryInfo}</div>`;
                }
              } else if (hasActiveRestriction) {
                statusText = 'Restricted';
                statusClass = 'bg-yellow-100 text-yellow-800';
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
                if (activePenalties.some(p => p.type === 'restriction')) {
                  statusHtml += `<div class="text-xs text-yellow-600 mt-1 p-1 bg-yellow-50 rounded max-w-xs">Has active restrictions</div>`;
                }
              } else if (hasActiveWarning) {
                statusText = 'Warning';
                statusClass = 'bg-blue-100 text-blue-800';
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
                if (activePenalties.some(p => p.type === 'warning')) {
                  statusHtml += `<div class="text-xs text-blue-600 mt-1 p-1 bg-blue-50 rounded max-w-xs">Has active warnings</div>`;
                }
              } else if (hasActiveStrike) {
                const criticalStrike = activePenalties.find(p => p.type === 'strike' && p.severity === 'critical');
                if (criticalStrike) {
                  statusText = 'Critical Strike';
                  statusClass = 'bg-red-100 text-red-800';
                  statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
                  const expiryInfo = criticalStrike.expires_at 
                    ? ` until ${new Date(criticalStrike.expires_at).toLocaleDateString()}`
                    : ' permanently';
                  statusHtml += `<div class="text-xs text-red-600 mt-1 p-1 bg-red-50 rounded max-w-xs truncate" title="${criticalStrike.reason}">Critical strike${expiryInfo}</div>`;
                } else {
                  statusText = 'Strike';
                  statusClass = 'bg-purple-100 text-purple-800';
                  statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
                  statusHtml += `<div class="text-xs text-purple-600 mt-1 p-1 bg-purple-50 rounded max-w-xs">Has active strikes</div>`;
                }
              } else {
                statusText = 'Active';
                statusClass = 'bg-green-100 text-green-800';
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>`;
              }
              
              return statusHtml;
            }
          },
          {
            title: 'Joined',
            data: 'createdAt',
            render: (data: string, type: string, row: User) => {
              const joinDate = new Date(data).toLocaleDateString();
              const lastActive = row.lastActive ? new Date(row.lastActive).toLocaleDateString() : 'Never';
              
              return `
                <div class="text-sm">
                  <p><strong>Joined:</strong> ${joinDate}</p>
                  <p class="text-xs text-gray-500"><strong>Last:</strong> ${lastActive}</p>
                </div>
              `;
            }
          },
          {
            title: 'Actions',
            data: null,
            orderable: false,
            width: '250px',
            render: (data: User) => {
              // Add null checks
              if (!data || !data._id) {
                return '<div class="text-gray-500">-</div>';
              }
              
              const isBanned = data.role === 'banned';
              
              return `
                <div class="flex flex-wrap items-center gap-2">
                  <select class="role-select form-select form-select-sm" style="width: 120px;" data-user-id="${data._id}" ${isBanned ? 'disabled' : ''}>
                    <option value="user" ${data.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="verified" ${data.role === 'verified' ? 'selected' : ''}>Verified</option>
                    <option value="middleman" ${data.role === 'middleman' ? 'selected' : ''}>Middleman</option>
                    <option value="moderator" ${data.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                    <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                  
                                    ${!isBanned ? `
                    <button class="btn btn-sm btn-info lift-penalty-btn" data-user-id="${data._id}" title="Lift Penalties">
                      <i class="fas fa-undo"></i>
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-info lift-ban-btn" data-user-id="${data._id}" title="Lift Ban">
                      <i class="fas fa-undo"></i>
                    </button>
                  `}
                  
                  ${!isBanned ? `
                    <button class="btn btn-sm btn-warning penalty-btn" data-user-id="${data._id}" title="Issue Penalty">
                      <i class="fas fa-exclamation-triangle"></i>
                    </button>
                  ` : ''}
                  
                  ${!isBanned ? `
                    <button class="btn btn-sm btn-danger ban-btn" data-user-id="${data._id}" title="Ban User">
                      <i class="fas fa-ban"></i>
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-success unban-btn" data-user-id="${data._id}" title="Unban User">
                      <i class="fas fa-check-circle"></i>
                    </button>
                  `}
                  
                  <button class="btn btn-sm btn-primary view-btn" data-user-id="${data._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              `;
            }
          }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        language: {
          search: "_INPUT_",
          searchPlaceholder: "Search users...",
          lengthMenu: "Show _MENU_ users",
          info: "Showing _START_ to _END_ of _TOTAL_ users",
          infoEmpty: "No users found",
          infoFiltered: "(filtered from _MAX_ total users)",
          zeroRecords: "No matching users found",
          emptyTable: "No users available"
        }
      });

      isInitialized.current = true;
      console.log('DataTable initialized successfully');

      // Event handlers using arrow functions to preserve context
      const handleRoleChangeEvent = async function(this: any) {
        const userId = $(this).data('user-id');
        const newRole = $(this).val();
        const user = userData.find((u: User) => u && u._id === userId);
        if (user && user.role !== newRole) {
          await handleRoleChange(userId, newRole);
        }
      };

      const handlePenaltyEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find((u: User) => u && u._id === userId);
        if (user) openPenaltyDialog(user);
      };

      const handleLiftPenaltyEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find((u: User) => u && u._id === userId);
        if (user) openLiftPenaltyDialog(user);
      };

      const handleLiftBanEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find((u: User) => u && u._id === userId);
        if (user) openLiftBanDialog(user);
      };

      const handleBanEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find((u: User) => u && u._id === userId);
        if (user) openBanDialog(user);
      };

      const handleUnbanEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        handleBanUser(userId, 'unban');
      };

      const handleViewEvent = function(this: any, e: any) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const user = userData.find((u: User) => u && u._id === userId);
        if (user) {
          setSelectedUser(user);
          setIsEditDialogOpen(true);
        }
      };

      const tableElement = tableRef.current;
      // Attach event handlers
      $(tableElement).off(); // Remove old handlers
      $(tableElement).on('change', '.role-select', handleRoleChangeEvent);
      $(tableElement).on('click', '.penalty-btn', handlePenaltyEvent);
      $(tableElement).on('click', '.lift-penalty-btn', handleLiftPenaltyEvent);
      $(tableElement).on('click', '.lift-ban-btn', handleLiftBanEvent);
      $(tableElement).on('click', '.ban-btn', handleBanEvent);

      return () => {
        $(tableElement).off(); // Cleanup
      };
      $(tableRef.current).on('click', '.unban-btn', handleUnbanEvent);
      $(tableRef.current).on('click', '.view-btn', handleViewEvent);
      
    } catch (error) {
      console.error('Error initializing DataTable:', error);
      toast.error('Failed to initialize table');
      setError('Failed to initialize data table. Please refresh the page.');
    }
  };

  useEffect(() => {
    // Check authentication
    if (!apiService.isAuthenticated()) {
      setError('You must be logged in to access this page');
      setLoading(false);
      return;
    }

    // Only load users if jQuery is ready
    if (jQueryReady) {
      loadUsers();
    }

    // Cleanup function
    return () => {
      if (dataTableRef.current) {
        try {
          const $ = window.$;
          if ($ && tableRef.current) {
            $(tableRef.current).off(); // Remove event handlers
          }
          dataTableRef.current.destroy();
          dataTableRef.current = null;
          isInitialized.current = false;
        } catch (err) {
          console.error('Error destroying DataTable:', err);
        }
      }
    };
  }, [jQueryReady, loadUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Prevent multiple simultaneous operations
    if (actionLoading) return;
    
    try {
      setActionLoading(userId);
      await apiService.updateUserRole(userId, newRole);
      toast.success('User role updated successfully');
      
      // Update local state instead of reloading all users
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
      await loadUsers(); // Only reload on error
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string, action: 'ban' | 'unban', reason?: string) => {
    // Prevent multiple simultaneous operations
    if (actionLoading) return;
    
    try {
      setActionLoading(userId);
      await apiService.banUser(userId, action, reason);
      toast.success(`User ${action}ned successfully`);
      
      // Update local state instead of reloading all users
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { 
                ...user, 
                role: action === 'ban' ? 'banned' : 'user',
                is_active: action === 'ban' ? false : true,
                ban_reason: action === 'ban' ? reason : undefined
              } 
            : user
        )
      );
      
      setBanDialogOpen(false);
      setActionReason('');
    } catch (error) {
      console.error(`Error ${action}ning user:`, error);
      toast.error(`Failed to ${action} user`);
      await loadUsers(); // Only reload on error
    } finally {
      setActionLoading(null);
    }
  };

  const openBanDialog = (user: User) => {
    setActionUser(user);
    setBanDialogOpen(true);
    setActionReason('');
  };

  const openPenaltyDialog = (user: User) => {
    setActionUser(user);
    setPenaltyDialogOpen(true);
    setActionReason('');
    setPenaltyType('warning');
    setPenaltySeverity('low');
    setPenaltyDuration('');
  };

  const openLiftPenaltyDialog = (user: User) => {
    setSelectedUser(user);
    setLiftPenaltyDialogOpen(true);
  };

  const openLiftBanDialog = (user: User) => {
    setSelectedUser(user);
    setLiftBanDialogOpen(true);
  };

  const handleIssuePenalty = async () => {
    if (!actionUser || !actionReason.trim()) return;

    try {
      setActionLoading(actionUser._id);
      
      const penaltyData = {
        userId: actionUser._id,
        type: penaltyType,
        severity: penaltySeverity,
        reason: actionReason,
        duration: penaltyDuration ? parseInt(penaltyDuration) : undefined
      };

      await apiService.issuePenalty(penaltyData);
      toast.success('Penalty issued successfully');
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === actionUser._id 
            ? { 
                ...user, 
                active_penalties: (user.active_penalties || 0) + 1,
                penalties: [...(user.penalties || []), {
                  _id: Date.now().toString(), // Temporary ID
                  type: penaltyType,
                  reason: actionReason,
                  issued_by: 'Current Admin', // This should come from API
                  issued_at: new Date().toISOString(),
                  expires_at: penaltyDuration ? new Date(Date.now() + parseInt(penaltyDuration) * 24 * 60 * 60 * 1000).toISOString() : undefined,
                  is_active: true,
                  severity: penaltySeverity
                }]
              } 
            : user
        )
      );
      
      setPenaltyDialogOpen(false);
      setActionReason('');
      setPenaltyDuration('');
    } catch (error) {
      console.error('Error issuing penalty:', error);
      toast.error('Failed to issue penalty');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLiftPenalty = async (userId: string, penaltyId: string) => {
    try {
      setActionLoading(penaltyId);
      
      await apiService.liftPenalty(userId, penaltyId);
      toast.success('Penalty lifted successfully');
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { 
                ...user, 
                active_penalties: Math.max(0, (user.active_penalties || 0) - 1),
                penalties: user.penalties?.map(penalty => 
                  penalty._id === penaltyId 
                    ? { ...penalty, is_active: false }
                    : penalty
                ) || []
              } 
            : user
        )
      );
      
      // Update selected user if it's the same user
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          active_penalties: Math.max(0, (prev.active_penalties || 0) - 1),
          penalties: prev.penalties?.map(penalty => 
            penalty._id === penaltyId 
              ? { ...penalty, is_active: false }
              : penalty
          ) || []
        } : null);
      }
      
    } catch (error) {
      console.error('Error lifting penalty:', error);
      toast.error('Failed to lift penalty');
    } finally {
      setActionLoading(null);
    }
  };

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold mb-2">Access Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            User Management
          </h2>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <Button onClick={loadUsers} disabled={loading} variant="outline">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => {
                    const isBanned = u.role === 'banned';
                    const hasActiveSuspension = (u.penalties || []).some(p => p.is_active && p.type === 'suspension');
                    const hasCriticalStrike = (u.penalties || []).some(p => p.is_active && p.type === 'strike' && p.severity === 'critical');
                    return !isBanned && !hasActiveSuspension && !hasCriticalStrike;
                  }).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspended Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => (u.penalties || []).some(p => p.is_active && p.type === 'suspension')).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Banned Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'banned').length}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users with Penalties</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => (u.active_penalties || 0) > 0).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Restricted Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => (u.penalties || []).some(p => p.is_active && p.type === 'restriction')).length}
                </p>
              </div>
              <UserX className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'moderator' || u.role === 'admin').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table 
                ref={tableRef}
                className="display table table-striped table-hover w-full"
                style={{ width: '100%' }}
              >
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Stats</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Data populated by DataTables */}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Permanently ban {actionUser?.username} from the platform. This action will immediately revoke all access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-reason">Ban Reason *</Label>
              <Textarea
                id="ban-reason"
                placeholder="Enter detailed reason for banning this user..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => actionUser && handleBanUser(actionUser._id, 'ban', actionReason)}
              disabled={!actionReason.trim() || actionLoading === actionUser?._id}
            >
              {actionLoading === actionUser?._id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Penalty Dialog */}
      <Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Issue Penalty
            </DialogTitle>
            <DialogDescription>
              Issue a penalty to {actionUser?.username}. Choose the type and severity of the penalty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="penalty-type">Penalty Type *</Label>
                <select
                  id="penalty-type"
                  value={penaltyType}
                  onChange={(e) => setPenaltyType(e.target.value as 'warning' | 'restriction' | 'suspension' | 'strike')}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="warning">Warning</option>
                  <option value="restriction">Restriction</option>
                  <option value="suspension">Suspension</option>
                  <option value="strike">Strike</option>
                </select>
              </div>
              <div>
                <Label htmlFor="penalty-severity">Severity *</Label>
                <select
                  id="penalty-severity"
                  value={penaltySeverity}
                  onChange={(e) => setPenaltySeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="penalty-duration">Duration (days) - Optional</Label>
              <input
                id="penalty-duration"
                type="number"
                placeholder="Leave empty for permanent penalty"
                value={penaltyDuration}
                onChange={(e) => setPenaltyDuration(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="penalty-reason">Reason *</Label>
              <Textarea
                id="penalty-reason"
                placeholder="Enter detailed reason for the penalty..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPenaltyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleIssuePenalty}
              disabled={!actionReason.trim() || actionLoading === actionUser?._id}
            >
              {actionLoading === actionUser?._id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Issue Penalty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Penalty Dialog */}
      <Dialog open={liftPenaltyDialogOpen} onOpenChange={setLiftPenaltyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-green-500" />
              Lift Penalties
            </DialogTitle>
            <DialogDescription>
              Select penalties to lift for {selectedUser?.username}. This will restore the user's access and privileges.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && selectedUser.penalties && selectedUser.penalties.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedUser.penalties.filter(p => p.is_active).map((penalty, index) => (
                  <div key={penalty._id || index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="destructive">
                        {penalty.type} - {penalty.severity}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLiftPenalty(selectedUser._id, penalty._id)}
                        disabled={actionLoading === penalty._id}
                      >
                        {actionLoading === penalty._id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        Lift Penalty
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{penalty.reason}</p>
                    <div className="text-xs text-gray-500">
                      Issued by: {penalty.issued_by}
                      {penalty.expires_at && (
                        <span className="ml-2">
                          Expires: {new Date(penalty.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedUser.penalties.filter(p => p.is_active).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No active penalties found for this user.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No penalties found for this user.</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiftPenaltyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Ban Dialog */}
      <Dialog open={liftBanDialogOpen} onOpenChange={setLiftBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Lift Ban
            </DialogTitle>
            <DialogDescription>
              Lift the ban for {selectedUser?.username}. This will restore the user's access to the platform.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <strong>Ban Reason:</strong> {selectedUser.ban_reason || 'No reason provided'}
                  </div>
                  {selectedUser.banned_at && (
                    <div className="mt-2">
                      <strong>Banned on:</strong> {new Date(selectedUser.banned_at).toLocaleDateString()}
                    </div>
                  )}
                  {selectedUser.banned_by && (
                    <div className="mt-1">
                      <strong>Banned by:</strong> {selectedUser.banned_by}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>What happens when you lift the ban:</strong>
                </p>
                <ul className="mt-2 text-sm text-green-700 list-disc list-inside space-y-1">
                  <li>User will regain access to the platform</li>
                  <li>User role will be restored to 'user'</li>
                  <li>All trading and account features will be available</li>
                  <li>Ban reason will be cleared from their profile</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiftBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => selectedUser && handleBanUser(selectedUser._id, 'unban')}
              disabled={actionLoading === selectedUser?._id}
            >
              {actionLoading === selectedUser?._id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Lift Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              User Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={getAvatarUrl(selectedUser.avatar_url)} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedUser.username}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  {selectedUser.roblox_username && (
                    <p className="text-blue-600">@{selectedUser.roblox_username}</p>
                  )}
                </div>
                <Badge>{selectedUser.role}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Total Trades</Label>
                  <p className="text-2xl font-bold">{selectedUser.totalTrades || 0}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Vouches</Label>
                  <p className="text-2xl font-bold">{selectedUser.totalVouches || 0}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Member Since</Label>
                  <p className="font-semibold">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Last Active</Label>
                  <p className="font-semibold">
                    {selectedUser.lastActive 
                      ? new Date(selectedUser.lastActive).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {selectedUser.ban_reason && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <strong>Ban Reason:</strong> {selectedUser.ban_reason}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Penalties Section */}
              {selectedUser.penalties && selectedUser.penalties.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Penalties ({selectedUser.active_penalties || 0} active)
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedUser.penalties.map((penalty, index) => (
                      <div key={penalty._id || index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={penalty.is_active ? "destructive" : "secondary"}>
                            {penalty.type} - {penalty.severity}
                          </Badge>
                          {penalty.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLiftPenalty(selectedUser._id, penalty._id)}
                              disabled={actionLoading === penalty._id}
                            >
                              {actionLoading === penalty._id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              Lift
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{penalty.reason}</p>
                        <div className="text-xs text-gray-500">
                          Issued by: {penalty.issued_by}
                          {penalty.expires_at && (
                            <span className="ml-2">
                              Expires: {new Date(penalty.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}