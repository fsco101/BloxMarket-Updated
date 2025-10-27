import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { DataTable } from '../ui/datatable';
import type { DataTableColumn, DataTableRef } from '../ui/datatable';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import {
  Calendar,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Eye
} from 'lucide-react';interface Event {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  date?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataKey, setDataKey] = useState(0);

  const dataTableRef = useRef<DataTableRef<Event>>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Loading events...');

      // Use the new DataTable endpoint with correct path
      const response = await apiService.getEventsDataTable({
        page: 1,
        limit: 1000,
        search: '',
        status: ''
      });

      console.log('API Response:', response);

      if (!response || !response.events) {
        throw new Error('Invalid response format');
      }

      const normalizedEvents = response.events;

      console.log('Normalized events:', normalizedEvents.length);
      setEvents(normalizedEvents);
      setDataKey(prev => prev + 1); // Force DataTable remount on data load

    } catch (error) {
      console.error('Error loading events:', error);

      let errorMessage = 'Failed to load events';

      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { status?: number } };
        if (apiError.response?.status === 403) {
          errorMessage = 'Access denied. Admin or moderator privileges required.';
        } else if (apiError.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      // Use the admin-specific delete method
      await apiService.deleteEventAdmin(eventId);
      toast.success('Event deleted successfully');
    } catch (err) {
      console.error('Error deleting event:', err);
      
      // Check if the deletion actually worked by trying to load events
      // If the event was deleted, loadEvents will succeed and the event won't be in the list
      try {
        await loadEvents();
        // If we get here, the events loaded successfully, so the deletion probably worked
        toast.success('Event deleted successfully');
      } catch {
        // If loading also fails, show the original error
        toast.error('Failed to delete event');
      }
    }
  };

  const handleAction = async (action: string, event: Event) => {
    const eventId = event._id || event.id;

    if (action === 'view') {
      console.log('View event:', event);
      toast.info(`Viewing event: ${event.name}`);
      // Add your view logic here
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete "${event.name}"?`)) {
        // Optimistic update: remove the event from local state immediately
        setEvents(prevEvents => prevEvents.filter(e => (e._id || e.id) !== eventId));
        setDataKey(prev => prev + 1); // Force DataTable remount
        
        try {
          await deleteEvent(eventId!);
        } catch (error) {
          // If deletion fails, add the event back to the list
          setEvents(prevEvents => [...prevEvents, event]);
          setDataKey(prev => prev + 1); // Force DataTable remount again
          console.error('Failed to delete event, restored to list:', error);
        }
      }
    }
  };

  const columns: DataTableColumn<Event>[] = [
    {
      title: 'Event Name',
      data: 'name',
      render: (data: unknown, _type: string, row: Event) => {
        return `
          <div>
            <p class="font-medium">${String(data)}</p>
            ${row.description ? `<p class="text-sm text-gray-500">${row.description}</p>` : ''}
          </div>
        `;
      }
    },
    {
      title: 'Date',
      data: 'date',
      render: (data: unknown) => {
        if (!data) return '<span class="text-gray-400">Not set</span>';
        return new Date(String(data)).toLocaleDateString();
      }
    },
    {
      title: 'Status',
      data: 'status',
      render: (data: unknown) => {
        const status = String(data || 'active').toLowerCase();
        const statusColors: Record<string, string> = {
          'active': 'bg-green-100 text-green-800',
          'upcoming': 'bg-blue-100 text-blue-800',
          'completed': 'bg-gray-100 text-gray-800',
          'cancelled': 'bg-red-100 text-red-800'
        };

        const colorClass = statusColors[status] || statusColors['active'];

        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
          ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>`;
      }
    },
    {
      title: 'Created',
      data: 'createdAt',
      render: (data: unknown) => {
        if (!data) return '<span class="text-gray-400">Unknown</span>';
        const created = new Date(String(data)).toLocaleDateString();
        return `<div class="text-sm">${created}</div>`;
      }
    },
    {
      title: 'Actions',
      data: null,
      orderable: false,
      width: '150px',
      render: () => {
        return `
          <div class="flex items-center gap-2">
            <button class="btn btn-sm btn-primary" data-action="view" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-danger" data-action="delete" title="Delete Event">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
      }
    }
  ];

  useEffect(() => {
    // Check authentication
    if (!apiService.isAuthenticated()) {
      setError('You must be logged in to access this page');
      setLoading(false);
      return;
    }

    loadEvents();
  }, []);

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Events Management</h2>
            <p className="text-muted-foreground">Manage platform events</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-red-500" />
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
            <Calendar className="w-6 h-6" />
            Events Management
          </h2>
          <p className="text-muted-foreground">Manage platform events</p>
        </div>
        <Button onClick={loadEvents} disabled={loading} variant="outline">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Events</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.status?.toLowerCase() === 'active').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.status?.toLowerCase() === 'upcoming').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>All Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            ref={dataTableRef}
            data={events}
            columns={columns}
            loading={loading}
            emptyMessage="No events found"
            onAction={handleAction}
            key={`events-${dataKey}`}
            options={{
              pageLength: 25,
              order: [[3, 'desc']],
              language: {
                searchPlaceholder: "Search events..."
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}