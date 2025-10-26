import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { 
  Calendar,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Eye
} from 'lucide-react';

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

interface Event {
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
  const [jQueryReady, setJQueryReady] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const isInitialized = useRef(false);

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
      
      // Wait for jQuery to be ready before initializing DataTable
      if (!jQueryReady) {
        console.log('Waiting for jQuery to be ready...');
        const ready = await checkJQueryReady();
        if (!ready) {
          setError('DataTables library not available');
          return;
        }
      }
      
      // Wait for DOM to update and table to be rendered
      setTimeout(() => {
        if (dataTableRef.current) {
          console.log('Updating existing DataTable...');
          try {
            dataTableRef.current.clear();
            dataTableRef.current.rows.add(normalizedEvents);
            dataTableRef.current.draw();
          } catch (err) {
            console.error('Error updating DataTable:', err);
            // Reinitialize if update fails
            dataTableRef.current.destroy();
            dataTableRef.current = null;
            isInitialized.current = false;
            initializeDataTable(normalizedEvents);
          }
        } else if (!isInitialized.current) {
          console.log('Initializing new DataTable...');
          initializeDataTable(normalizedEvents);
        }
      }, 200);
      
    } catch (error: any) {
      console.error('Error loading events:', error);
      
      let errorMessage = 'Failed to load events';
      
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin or moderator privileges required.';
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
  };

  const initializeDataTable = (eventData: Event[]) => {
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
    
    console.log('Initializing DataTable with', eventData.length, 'events');
    
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
        data: eventData,
        destroy: true,
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[3, 'desc']],
        columns: [
          {
            title: 'Event Name',
            data: 'name',
            render: (data: string, type: string, row: Event) => {
              return `
                <div>
                  <p class="font-medium">${data}</p>
                  ${row.description ? `<p class="text-sm text-gray-500">${row.description}</p>` : ''}
                </div>
              `;
            }
          },
          {
            title: 'Date',
            data: 'date',
            render: (data: string) => {
              if (!data) return '<span class="text-gray-400">Not set</span>';
              return new Date(data).toLocaleDateString();
            }
          },
          {
            title: 'Status',
            data: 'status',
            render: (data: string) => {
              const statusColors: Record<string, string> = {
                'active': 'bg-green-100 text-green-800',
                'upcoming': 'bg-blue-100 text-blue-800',
                'completed': 'bg-gray-100 text-gray-800',
                'cancelled': 'bg-red-100 text-red-800'
              };
              
              const colorClass = statusColors[data?.toLowerCase()] || statusColors['active'];
              
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                ${data ? data.charAt(0).toUpperCase() + data.slice(1) : 'Active'}
              </span>`;
            }
          },
          {
            title: 'Created',
            data: 'createdAt',
            render: (data: string) => {
              if (!data) return '<span class="text-gray-400">Unknown</span>';
              const created = new Date(data).toLocaleDateString();
              return `<div class="text-sm">${created}</div>`;
            }
          },
          {
            title: 'Actions',
            data: null,
            orderable: false,
            width: '150px',
            render: (data: Event) => {
              const eventId = data._id || data.id;
              return `
                <div class="flex items-center gap-2">
                  <button class="btn btn-sm btn-primary view-btn" data-event-id="${eventId}" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-btn" data-event-id="${eventId}" title="Delete Event">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `;
            }
          }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        language: {
          search: "_INPUT_",
          searchPlaceholder: "Search events...",
          lengthMenu: "Show _MENU_ events",
          info: "Showing _START_ to _END_ of _TOTAL_ events",
          infoEmpty: "No events found",
          infoFiltered: "(filtered from _MAX_ total events)",
          zeroRecords: "No matching events found",
          emptyTable: "No events available"
        }
      });

      isInitialized.current = true;
      console.log('DataTable initialized successfully');

      // Event handlers
      const handleViewEvent = function(this: any, e: any) {
        e.preventDefault();
        const eventId = $(this).data('event-id');
        const event = eventData.find(ev => ev._id === eventId || ev.id === eventId);
        if (event) {
          console.log('View event:', event);
          toast.info(`Viewing event: ${event.name}`);
          // Add your view logic here
        }
      };

      const handleDeleteEvent = async function(this: any, e: any) {
        e.preventDefault();
        const eventId = $(this).data('event-id');
        const event = eventData.find(ev => ev._id === eventId || ev.id === eventId);
        
        if (event && confirm(`Are you sure you want to delete "${event.name}"?`)) {
          await deleteEvent(eventId);
        }
      };

      // Attach event handlers
      $(tableRef.current).off(); // Remove old handlers
      $(tableRef.current).on('click', '.view-btn', handleViewEvent);
      $(tableRef.current).on('click', '.delete-btn', handleDeleteEvent);
      
    } catch (error) {
      console.error('Error initializing DataTable:', error);
      toast.error('Failed to initialize table');
      setError('Failed to initialize data table. Please refresh the page.');
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      // Use the admin-specific delete method
      await apiService.deleteEventAdmin(eventId);
      toast.success('Event deleted successfully');
      await loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Failed to delete event');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    // Check authentication
    if (!apiService.isAuthenticated()) {
      setError('You must be logged in to access this page');
      setLoading(false);
      return;
    }
    
    // Only load events if jQuery is ready
    if (jQueryReady) {
      loadEvents();
    }
    
    // Cleanup
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
  }, [jQueryReady]);

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
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No events found</p>
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
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Created</th>
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
    </div>
  );
}