import { useState, useEffect, useRef, useCallback } from 'react';
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
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText,
  Loader2,
  Shield,
  RefreshCw,
  AlertTriangle,
  Download,
  Camera,
  CameraOff,
  RotateCcw
} from 'lucide-react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jQuery: any;
  }
}

interface Document {
  _id: string;
  document_type: string;
  filename: string;
  original_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  roblox_username: string;
  email: string;
  avatar_url?: string;
  credibility_score?: number;
}

interface VerificationRequest {
  _id: string;
  user_id: User;
  experience: string;
  availability: string;
  why_middleman: string;
  referral_codes?: string;
  external_links?: string[];
  preferred_trade_types?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  documents: Document[];
  trades: number;
  vouches: number;
  requestType: 'Middleman' | 'Verified Trader';
  rejection_reason?: string;
  averageRating?: number;
  documentCount: number;
  username: string;
  email: string;
  roblox_username: string;
  avatar_url: string;
  credibility_score: number;
}

export function MiddlemanVerification() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [jQueryReady, setJQueryReady] = useState(false);
  
  // Action dialogs
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const tableRef = useRef<HTMLTableElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataTableRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Camera functionality refs and state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

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

  const loadVerificationRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading verification requests...');
      
      const response = await apiService.getMiddlemanVerificationDataTable({
        page: 1,
        limit: 1000,
        search: '',
        status: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      console.log('API Response:', response);
      
      if (!response || !response.data) {
        console.log('No data in response, using empty array');
        setRequests([]);
        setLoading(false);
        return;
      }
      
      // Normalize the request data
      const normalizedRequests = response.data
        .filter((request: unknown) => {
          const req = request as VerificationRequest;
          return req && req._id;
        }) // Filter out null/undefined requests
        .map((request: unknown) => {
          const req = request as VerificationRequest;
          return {
            ...req,
            documentCount: req.documents?.length || 0,
            // Flatten user data for DataTables
            username: req.user_id?.username || req.username || '',
            email: req.user_id?.email || req.email || '',
            roblox_username: req.user_id?.roblox_username || req.roblox_username || '',
            avatar_url: req.user_id?.avatar_url || req.avatar_url || '',
            credibility_score: req.user_id?.credibility_score || req.credibility_score || 0
          };
        });
      
      console.log('Normalized requests:', normalizedRequests.length);
      setRequests(normalizedRequests);
      
      // Initialize DataTable after a short delay to ensure DOM is ready
      setTimeout(() => {
        initializeDataTable(normalizedRequests);
      }, 100);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error loading verification requests:', err);
      
      let errorMessage = 'Failed to load verification requests';
      
      if (err.message?.includes('403')) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (err.message?.includes('401')) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setRequests([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeDataTable = useCallback((requestData: VerificationRequest[]) => {
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
    
    console.log('Initializing DataTable with', requestData.length, 'requests');
    
    try {
      // Destroy existing instance if exists
      if (dataTableRef.current) {
        try {
          $(tableRef.current).off();
          if ($.fn.DataTable.isDataTable(tableRef.current)) {
            dataTableRef.current.destroy();
          }
        } catch (destroyError) {
          console.warn('Error destroying existing DataTable:', destroyError);
        }
        dataTableRef.current = null;
      }

      // Initialize new DataTable
      dataTableRef.current = $(tableRef.current).DataTable({
        data: requestData,
        destroy: true,
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[4, 'desc']],
        deferRender: true,
        columns: [
          {
            title: 'Applicant',
            data: null,
            orderable: false,
            render: (data: VerificationRequest) => {
              if (!data || !data.username) {
                return '<div class="text-gray-500">Invalid request data</div>';
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
            title: 'Application',
            data: null,
            orderable: false,
            render: (data: VerificationRequest) => {
              if (!data) {
                return '<div class="text-gray-500">-</div>';
              }
              
              return `
                <div class="text-sm">
                  <p><strong>Experience:</strong> ${data.experience ? data.experience.substring(0, 20) + '...' : 'N/A'}</p>
                  <p><strong>Availability:</strong> ${data.availability ? data.availability.substring(0, 20) + '...' : 'N/A'}</p>
                  <p class="text-xs text-gray-500 mt-1">${data.why_middleman ? data.why_middleman.substring(0, 30) + '...' : 'No reason provided'}</p>
                </div>
              `;
            }
          },
          {
            title: 'Stats',
            data: null,
            orderable: false,
            render: (data: VerificationRequest) => {
              if (!data) {
                return '<div class="text-gray-500">-</div>';
              }
              
              const credibility = data.credibility_score || 0;
              return `
                <div class="text-sm">
                  <p><strong>${data.trades || 0}</strong> trades</p>
                  <p><strong>${data.vouches || 0}</strong> vouches</p>
                  <p><strong>${data.documentCount || 0}</strong> documents</p>
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
            data: 'status',
            render: (data: string) => {
              const statusColors: Record<string, string> = {
                'approved': 'bg-green-100 text-green-800',
                'rejected': 'bg-red-100 text-red-800',
                'pending': 'bg-yellow-100 text-yellow-800'
              };
              
              const colorClass = statusColors[data] || statusColors['pending'];
              
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                ${data.charAt(0).toUpperCase() + data.slice(1)}
              </span>`;
            }
          },
          {
            title: 'Applied',
            data: 'createdAt',
            render: (data: string) => {
              const applyDate = new Date(data).toLocaleDateString();
              const applyTime = new Date(data).toLocaleTimeString();
              
              return `
                <div class="text-sm">
                  <p><strong>${applyDate}</strong></p>
                  <p class="text-xs text-gray-500">${applyTime}</p>
                </div>
              `;
            }
          },
          {
            title: 'Actions',
            data: null,
            orderable: false,
            width: '200px',
            render: (data: VerificationRequest) => {
              if (!data || !data._id) {
                return '<div class="text-gray-500">-</div>';
              }
              
              const isPending = data.status === 'pending';
              
              return `
                <div class="flex flex-wrap items-center gap-2">
                  <button class="btn btn-sm btn-primary view-btn" data-request-id="${data._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                  
                  ${isPending ? `
                    <button class="btn btn-sm btn-success approve-btn" data-request-id="${data._id}" title="Approve Application">
                      <i class="fas fa-check"></i>
                    </button>
                    
                    <button class="btn btn-sm btn-danger reject-btn" data-request-id="${data._id}" title="Reject Application">
                      <i class="fas fa-times"></i>
                    </button>
                  ` : ''}
                </div>
              `;
            }
          }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        language: {
          search: "_INPUT_",
          searchPlaceholder: "Search applications...",
          lengthMenu: "Show _MENU_ applications",
          info: "Showing _START_ to _END_ of _TOTAL_ applications",
          infoEmpty: "No applications found",
          infoFiltered: "(filtered from _MAX_ total applications)",
          zeroRecords: "No matching applications found",
          emptyTable: "No applications available"
        }
      });

      isInitialized.current = true;
      console.log('DataTable initialized successfully');

            // Event handlers
      $(tableRef.current).off(); // Remove old handlers
      
      $(tableRef.current).on('click', '.view-btn', function(e) {
        e.preventDefault();
        const requestId = $(this).data('request-id');
        const request = requestData.find((r: VerificationRequest) => r && r._id === requestId);
        if (request) {
          setSelectedRequest(request);
          setIsViewDialogOpen(true);
        }
      });

      $(tableRef.current).on('click', '.approve-btn', function(e) {
        e.preventDefault();
        const requestId = $(this).data('request-id');
        handleApprove(requestId);
      });

      $(tableRef.current).on('click', '.reject-btn', function(e) {
        e.preventDefault();
        const requestId = $(this).data('request-id');
        const request = requestData.find((r: VerificationRequest) => r && r._id === requestId);
        if (request) openRejectDialog(request);
      });
      
    } catch (error) {
      console.error('Error initializing DataTable:', error);
      toast.error('Failed to initialize table');
      setError('Failed to initialize data table. Please refresh the page.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Check authentication
    if (!apiService.isAuthenticated()) {
      setError('You must be logged in to access this page');
      setLoading(false);
      return;
    }
    
    // Only load requests if jQuery is ready
    if (jQueryReady) {
      loadVerificationRequests();
    }
    
    // Cleanup function
    return () => {
      const tableElement = tableRef.current; // eslint-disable-line react-hooks/exhaustive-deps
      if (dataTableRef.current && window.$ && window.$.fn && window.$.fn.DataTable) {
        try {
          const $ = window.$;
          if (tableElement && $.fn.DataTable.isDataTable(tableElement)) {
            $(tableElement).off(); // Remove event handlers first
            dataTableRef.current.destroy();
          }
          dataTableRef.current = null;
          isInitialized.current = false;
        } catch (error) {
          console.error('Error destroying DataTable during cleanup:', error);
        }
      }

      // Cleanup camera
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [jQueryReady, loadVerificationRequests, cameraStream]);

  const handleViewDocument = async (documentId: string) => {
    try {
      // Fetch the document with authentication
      const response = await fetch(`http://localhost:5000/api/verification/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('bloxmarket-token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Open the document in a new tab for viewing
      window.open(url, '_blank');
      
      toast.success('Document opened in new tab');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to view document');
    }
  };

  const handleApprove = async (applicationId: string) => {
    try {
      setActionLoading(applicationId);
      await apiService.approveMiddlemanApplication(applicationId);
      toast.success('Application approved successfully');
      loadVerificationRequests();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicationId: string, reason: string) => {
    try {
      setActionLoading(applicationId);
      await apiService.rejectMiddlemanApplication(applicationId, reason);
      toast.success('Application rejected');
      loadVerificationRequests();
      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (request: VerificationRequest) => {
    setActionRequest(request);
    setRejectDialogOpen(true);
    setRejectionReason('');
  };

  // Helper function for status color coding
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  // Camera control functions
  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      setCameraStream(stream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      toast.success('Camera started successfully');
    } catch (error) {
      console.error('Error accessing camera:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      toast.success('Camera stopped');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      toast.error('Canvas context not available');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Add to captured photos
    setCapturedPhotos(prev => [...prev, photoDataUrl]);
    
    toast.success('Photo captured successfully');
  };

  const clearCapturedPhotos = () => {
    setCapturedPhotos([]);
    toast.success('Captured photos cleared');
  };

  const removeCapturedPhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Middleman Verification</h2>
            <p className="text-muted-foreground">Review and approve middleman applications</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Middleman Verification</h2>
          <p className="text-muted-foreground">Review and approve middleman applications</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => apiService.exportMiddlemanVerificationCSV()} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadVerificationRequests} disabled={loading} variant="outline">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <UserCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Applications</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved This Month</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected This Month</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading verification requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No verification requests found</p>
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
                    <th>Applicant</th>
                    <th>Application</th>
                    <th>Stats</th>
                    <th>Status</th>
                    <th>Applied</th>
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Reject Application
            </DialogTitle>
            <DialogDescription>
              Reject {actionRequest?.username}'s middleman application. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter detailed reason for rejecting this application..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => actionRequest && handleReject(actionRequest._id, rejectionReason)}
              disabled={!rejectionReason.trim() || actionLoading === actionRequest?._id}
            >
              {actionLoading === actionRequest?._id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) {
          // Cleanup camera when dialog closes
          stopCamera();
          setCapturedPhotos([]);
          setCameraError('');
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>
              Detailed review of verification application
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-xl">
                    {selectedRequest.username[0]?.toUpperCase()}
                  </AvatarFallback>
                  {selectedRequest.avatar_url && (
                    <AvatarImage src={getAvatarUrl(selectedRequest.avatar_url)} alt={selectedRequest.username} />
                  )}
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedRequest.username}</h3>
                  <p className="text-muted-foreground">{selectedRequest.email || "Email not available"}</p>
                  <p className="text-blue-600">@{selectedRequest.roblox_username}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Application Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Why become a middleman?</label>
                      <p className="text-sm mt-1 border p-2 rounded bg-muted/50">{selectedRequest.why_middleman}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Experience</label>
                      <p className="text-sm mt-1 border p-2 rounded bg-muted/50">{selectedRequest.experience}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Availability</label>
                      <p className="text-sm mt-1 border p-2 rounded bg-muted/50">{selectedRequest.availability}</p>
                    </div>
                    
                    {selectedRequest.preferred_trade_types && selectedRequest.preferred_trade_types.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Preferred Trade Types</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedRequest.preferred_trade_types.map((type, i) => (
                            <Badge key={i} variant="outline">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedRequest.external_links && selectedRequest.external_links.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">External Links</label>
                        <div className="flex flex-col gap-1 mt-1">
                          {selectedRequest.external_links.map((link, i) => (
                            <a 
                              key={i} 
                              href={link.startsWith('http') ? link : `https://${link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Applicant Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Application Date</span>
                      <span className="font-medium">{new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(selectedRequest.status)}>
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Credibility Score</span>
                      <span className="font-medium">{selectedRequest.credibility_score || 0}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Documents Submitted</span>
                      <span className="font-medium">{selectedRequest.documentCount || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="font-medium">{selectedRequest.trades || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Vouches</span>
                      <span className="font-medium">{selectedRequest.vouches || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Submitted Documents</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.documents.map((doc, i) => (
                      <Badge key={i} variant="outline" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {doc.document_type || doc.original_filename || `Document ${i+1}`}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {selectedRequest.documents.map((doc, i) => (
                      <div key={i} className="border rounded-md p-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{doc.document_type || 'Document'}</span>
                          <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span>{doc.original_filename}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2 text-xs h-7 w-full"
                          onClick={() => handleViewDocument(doc._id)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Document
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Face Verification Images */}
              {selectedRequest.documents && selectedRequest.documents.filter(doc => doc.document_type === 'face_verification').length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Face Verification Images</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedRequest.documents
                      .filter(doc => doc.document_type === 'face_verification')
                      .map((doc, i) => (
                        <div key={i} className="border rounded-md p-3">
                          <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2">
                            <img
                              src={`http://localhost:5000/uploads/middlemanface/${doc.filename}`}
                              alt={`Face verification ${i + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-avatar.png'; // Fallback image
                              }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Face Image {i + 1}</p>
                            <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Face Verification Review</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Review these images to verify the applicant's identity. Ensure the face is clearly visible and matches the profile information.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Photo Capture */}
              <div>
                <h4 className="font-semibold mb-3">Live Photo Capture</h4>
                <div className="border rounded-md p-4 bg-gray-50">
                  {cameraError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{cameraError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Camera Feed */}
                    <div className="space-y-3">
                      <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                        />
                        {!isCameraActive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Camera inactive</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!isCameraActive ? (
                          <Button onClick={startCamera} className="flex-1">
                            <Camera className="w-4 h-4 mr-2" />
                            Start Camera
                          </Button>
                        ) : (
                          <>
                            <Button onClick={capturePhoto} variant="outline" className="flex-1">
                              <Camera className="w-4 h-4 mr-2" />
                              Capture Photo
                            </Button>
                            <Button onClick={stopCamera} variant="destructive">
                              <CameraOff className="w-4 h-4 mr-2" />
                              Stop
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Captured Photos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">Captured Photos ({capturedPhotos.length})</h5>
                        {capturedPhotos.length > 0 && (
                          <Button onClick={clearCapturedPhotos} variant="outline" size="sm">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Clear All
                          </Button>
                        )}
                      </div>

                      {capturedPhotos.length === 0 ? (
                        <div className="aspect-video border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No photos captured</p>
                            <p className="text-xs">Use camera to capture photos</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {capturedPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Captured ${index + 1}`}
                                className="w-full aspect-square object-cover rounded-md border"
                              />
                              <button
                                onClick={() => removeCapturedPhoto(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove photo"
                              >
                                ×
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Live Verification</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Capture real-time photos of the applicant for additional verification. These photos will be stored alongside the application for review.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" />
              
              {selectedRequest.status === 'pending' && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => {
                      handleApprove(selectedRequest._id);
                      setIsViewDialogOpen(false);
                    }}
                    disabled={actionLoading === selectedRequest._id}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Application
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleReject(selectedRequest._id, rejectionReason || 'Application does not meet requirements');
                      setIsViewDialogOpen(false);
                    }}
                    disabled={actionLoading === selectedRequest._id}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}