import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  TrendingUp,
  FileText,
  Loader2,
  Shield
} from 'lucide-react';

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
}

export function MiddlemanVerification() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const loadVerificationRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getVerificationRequests();
      setRequests(response.requests || []);
    } catch (error) {
      console.error('Error loading verification requests:', error);
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationRequests();
  }, []);

  const handleApprove = async (applicationId: string) => {
    try {
      setActionLoading(applicationId);
      await apiService.approveVerification(applicationId, 'middleman');
      toast.success('Verification approved successfully');
      loadVerificationRequests();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('Failed to approve verification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicationId: string, reason: string) => {
    try {
      setActionLoading(applicationId);
      await apiService.rejectVerification(applicationId, reason);
      toast.success('Verification rejected');
      loadVerificationRequests();
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Failed to reject verification');
    } finally {
      setActionLoading(null);
    }
  };

  // Helper function for status color coding

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Middleman Verification</h2>
          <p className="text-muted-foreground">Review and approve middleman applications</p>
        </div>
        <Button onClick={loadVerificationRequests} variant="outline">
          <Shield className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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

      {/* Verification Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading verification requests...</p>
            </div>
          ) : requests.length > 0 ? (
            <div className="divide-y">
              {requests.map((request) => (
                <div key={request._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>{request.user_id.username[0]?.toUpperCase()}</AvatarFallback>
                        {request.user_id.avatar_url && (
                          <AvatarImage src={request.user_id.avatar_url} alt={request.user_id.username} />
                        )}
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{request.user_id.username}</h3>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Middleman Application
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">@{request.user_id.roblox_username}</p>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Applied:</span>
                            <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Experience:</span>
                            <p className="font-medium">{request.experience ? request.experience.substring(0, 15) + '...' : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Availability:</span>
                            <p className="font-medium">{request.availability ? request.availability.substring(0, 15) + '...' : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Credibility:</span>
                            <p className="font-medium">{request.user_id.credibility_score || 0}%</p>
                          </div>
                        </div>
                        
                        {request.documents && request.documents.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">Documents:</span>
                            {request.documents.map((doc, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {doc.document_type || doc.original_filename || 'Document ' + (i+1)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleApprove(request._id)}
                            disabled={actionLoading === request._id}
                          >
                            {actionLoading === request._id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request._id, 'Application does not meet requirements')}
                            disabled={actionLoading === request._id}
                          >
                            {actionLoading === request._id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-1" />
                            )}
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No verification requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
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
                    {selectedRequest.user_id.username[0]?.toUpperCase()}
                  </AvatarFallback>
                  {selectedRequest.user_id.avatar_url && (
                    <AvatarImage src={selectedRequest.user_id.avatar_url} alt={selectedRequest.user_id.username} />
                  )}
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedRequest.user_id.username}</h3>
                  <p className="text-muted-foreground">{selectedRequest.user_id.email || "Email not available"}</p>
                  <p className="text-blue-600">@{selectedRequest.user_id.roblox_username}</p>
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
                      <span className="font-medium">{selectedRequest.user_id.credibility_score || 0}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Documents Submitted</span>
                      <span className="font-medium">{selectedRequest.documents?.length || 0}</span>
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