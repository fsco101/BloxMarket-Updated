import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { apiService } from '../../services/api';
import { alertService } from '../../services/alertService';
import { toast } from 'sonner';
import { AlertTriangle, Eye, CheckCircle, Trash2, Download, Search, Filter, ShieldAlert, ShieldX } from 'lucide-react';

interface Report {
  id?: string;
  _id?: string;
  type: string;
  post_type: string;
  post_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  post_title: string;
  post_content: string;
  reported_user: {
    id: string;
    username: string;
    roblox_username?: string;
  } | null;
  reported_by: {
    id: string;
    username: string;
    roblox_username?: string;
  };
  reviewed_by?: {
    id: string;
    username: string;
  };
  review_notes?: string;
  created_at: string;
  updated_at?: string;
}

export function FlaggedPosts() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // DataTable state
  const [page, setPage] = useState(1);
  const limit = 25; // Fixed limit for now
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsFiltered, setRecordsFiltered] = useState(0);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [postTypeFilter, setPostTypeFilter] = useState('all');

  // Modal states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isPostDeleteModalOpen, setIsPostDeleteModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Penalty state
  const [penaltyType, setPenaltyType] = useState<'warning' | 'suspension' | 'ban' | 'deactivation'>('warning');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState(7);
  const [issuingPenalty, setIssuingPenalty] = useState(false);

  // Post deletion state
  const [deletingPost, setDeletingPost] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    resolved: 0,
    recent: 0
  });

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiService.getReportsDataTable({
        page,
        limit,
        search: searchValue,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        post_type: postTypeFilter !== 'all' ? postTypeFilter : undefined
      });

      setReports(response.data || []);
      setRecordsTotal(response.recordsTotal || 0);
      setRecordsFiltered(response.recordsFiltered || 0);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchValue, statusFilter, typeFilter, postTypeFilter]);

  const loadStats = async () => {
    try {
      const statsData = await apiService.getReportsStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadReports();
    loadStats();
  }, [page, limit, searchValue, statusFilter, typeFilter, postTypeFilter, loadReports]);

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  const handleResolveReport = (report: Report) => {
    setSelectedReport(report);
    setReviewNotes('');
    setIsResolveModalOpen(true);
  };

  const handleStatusUpdate = async (status: 'pending' | 'reviewed' | 'resolved') => {
    if (!selectedReport) return;

    try {
      setResolving(true);
      await apiService.updateReportStatusAdmin(selectedReport._id || selectedReport.id!, status, reviewNotes.trim() || undefined);

      toast.success(`Report ${status} successfully`);
      setIsResolveModalOpen(false);
      setSelectedReport(null);
      setReviewNotes('');

      // Reload data
      loadReports();
      loadStats();
    } catch (err) {
      console.error('Error updating report status:', err);
      toast.error('Failed to update report status');
    } finally {
      setResolving(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const confirmed = await alertService.confirm(
      'Delete Report',
      'Are you sure you want to delete this report? This action cannot be undone.',
      'Delete',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiService.deleteReportAdmin(reportId);
      toast.success('Report deleted successfully');

      // Reload data
      loadReports();
      loadStats();
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    }
  };

  const handleIssuePenalty = (report: Report) => {
    setSelectedReport(report);
    setPenaltyType('warning');
    setPenaltyReason('');
    setSuspensionDuration(7);
    setIsPenaltyModalOpen(true);
  };

  const handleDeletePost = (report: Report) => {
    setSelectedReport(report);
    setIsPostDeleteModalOpen(true);
  };

  const handleConfirmPenalty = async () => {
    if (!selectedReport?.reported_user) return;

    try {
      setIssuingPenalty(true);
      await apiService.issueUserPenalty(
        selectedReport.reported_user.id,
        penaltyType,
        penaltyReason,
        penaltyType === 'suspension' ? suspensionDuration : undefined
      );

      toast.success('Penalty issued successfully');
      setIsPenaltyModalOpen(false);
      setSelectedReport(null);
      setPenaltyReason('');
      setSuspensionDuration(7);

      // Reload data
      loadReports();
      loadStats();
    } catch (err) {
      console.error('Error issuing penalty:', err);
      toast.error('Failed to issue penalty');
    } finally {
      setIssuingPenalty(false);
    }
  };

  const handleConfirmPostDeletion = async () => {
    if (!selectedReport) return;

    try {
      setDeletingPost(true);
      await apiService.deleteReportedPost(selectedReport.post_type, selectedReport.post_id);

      toast.success('Post deleted successfully');
      setIsPostDeleteModalOpen(false);
      setSelectedReport(null);

      // Reload data
      loadReports();
      loadStats();
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (postTypeFilter !== 'all') filters.post_type = postTypeFilter;

      await apiService.exportReportsCSV(filters);
      toast.success('Export started. Download will begin shortly.');
    } catch (err) {
      console.error('Error exporting reports:', err);
      toast.error('Failed to export reports');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="secondary">Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="default">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPostTypeBadge = (postType: string) => {
    const colors = {
      trade: 'bg-blue-100 text-blue-800',
      forum: 'bg-purple-100 text-purple-800',
      event: 'bg-green-100 text-green-800',
      wishlist: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={colors[postType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {postType.charAt(0).toUpperCase() + postType.slice(1)}
      </Badge>
    );
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadReports}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Reports</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.reviewed}</div>
            <div className="text-sm text-muted-foreground">Reviewed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.recent}</div>
            <div className="text-sm text-muted-foreground">Last 7 Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Reports Management</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={loadReports}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search reports..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Scamming">Scamming</SelectItem>
                <SelectItem value="Harassment">Harassment</SelectItem>
                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                <SelectItem value="Spam">Spam</SelectItem>
                <SelectItem value="Impersonation">Impersonation</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={postTypeFilter} onValueChange={setPostTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Post Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="trade">Trades</SelectItem>
                <SelectItem value="forum">Forum</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="wishlist">Wishlists</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reports Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Report Type</th>
                  <th className="text-left p-3 font-medium">Post Type</th>
                  <th className="text-left p-3 font-medium">Reported User</th>
                  <th className="text-left p-3 font-medium">Reported By</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report._id || report.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Badge variant="outline">{report.type}</Badge>
                    </td>
                    <td className="p-3">
                      {getPostTypeBadge(report.post_type)}
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">
                          {report.reported_user?.username || 'Unknown'}
                        </div>
                        {report.reported_user?.roblox_username && (
                          <div className="text-sm text-muted-foreground">
                            @{report.reported_user.roblox_username}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{report.reported_by.username}</div>
                        {report.reported_by.roblox_username && (
                          <div className="text-sm text-muted-foreground">
                            @{report.reported_by.roblox_username}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {report.status !== 'resolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveReport(report)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {report.reported_user && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIssuePenalty(report)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePost(report)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <ShieldX className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report._id || report.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reports.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No reports found matching your criteria.</p>
            </div>
          )}

          {/* Pagination Info */}
          <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
            <div>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, recordsFiltered)} of {recordsFiltered} entries
              {recordsFiltered !== recordsTotal && ` (filtered from ${recordsTotal} total entries)`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= recordsFiltered}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Report Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Report Type</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{selectedReport.type}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Post Type</Label>
                  <div className="mt-1">
                    {getPostTypeBadge(selectedReport.post_type)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="mt-1 text-sm">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Reported Post</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedReport.post_title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedReport.post_content}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  {selectedReport.reason}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Reported User</Label>
                  <div className="mt-1">
                    <div className="font-medium">
                      {selectedReport.reported_user?.username || 'Unknown'}
                    </div>
                    {selectedReport.reported_user?.roblox_username && (
                      <div className="text-sm text-muted-foreground">
                        @{selectedReport.reported_user.roblox_username}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reported By</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedReport.reported_by.username}</div>
                    {selectedReport.reported_by.roblox_username && (
                      <div className="text-sm text-muted-foreground">
                        @{selectedReport.reported_by.roblox_username}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedReport.reviewed_by && (
                <div>
                  <Label className="text-sm font-medium">Reviewed By</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedReport.reviewed_by.username}</div>
                    {selectedReport.review_notes && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <Label className="text-xs text-muted-foreground">Review Notes</Label>
                        <div className="text-sm mt-1">{selectedReport.review_notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Report Modal */}
      <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about your review decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResolveModalOpen(false)}
              disabled={resolving}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleStatusUpdate('reviewed')}
              disabled={resolving}
            >
              {resolving ? 'Processing...' : 'Mark as Reviewed'}
            </Button>
            <Button
              onClick={() => handleStatusUpdate('resolved')}
              disabled={resolving}
            >
              {resolving ? 'Processing...' : 'Resolve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Penalty User Modal */}
      <Dialog open={isPenaltyModalOpen} onOpenChange={setIsPenaltyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Penalty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Penalty Type</Label>
              <Select value={penaltyType} onValueChange={(value) => setPenaltyType(value as 'warning' | 'suspension' | 'ban' | 'deactivation')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="suspension">Suspension</SelectItem>
                  <SelectItem value="ban">Ban</SelectItem>
                  <SelectItem value="deactivation">Deactivation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="penalty-reason">Reason</Label>
              <Textarea
                id="penalty-reason"
                placeholder="Enter the reason for the penalty..."
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
                className="mt-1"
              />
            </div>
            {penaltyType === 'suspension' && (
              <div>
                <Label htmlFor="suspension-duration">Duration (in days)</Label>
                <Input
                  id="suspension-duration"
                  type="number"
                  min="1"
                  value={suspensionDuration}
                  onChange={(e) => setSuspensionDuration(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPenaltyModalOpen(false)}
              disabled={issuingPenalty}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPenalty}
              disabled={issuingPenalty}
            >
              {issuingPenalty ? 'Processing...' : 'Issue Penalty'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirmation Modal */}
      <Dialog open={isPostDeleteModalOpen} onOpenChange={setIsPostDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPostDeleteModalOpen(false)}
              disabled={deletingPost}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPostDeletion}
              disabled={deletingPost}
            >
              {deletingPost ? 'Processing...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}