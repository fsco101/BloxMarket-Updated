import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import 'datatables.net-bs5';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    $: any;
    jQuery: any;
  }
}

export interface DataTableColumn<T = Record<string, unknown>> {
  title: string;
  data?: keyof T | string | null;
  orderable?: boolean;
  searchable?: boolean;
  width?: string;
  className?: string;
  render?: (data: unknown, type: string, row: T, meta?: unknown) => string | HTMLElement;
}

export interface DataTableOptions {
  pageLength?: number;
  lengthMenu?: (number | string)[][];
  order?: [number, 'asc' | 'desc'][];
  responsive?: boolean;
  searching?: boolean;
  paging?: boolean;
  info?: boolean;
  autoWidth?: boolean;
  scrollX?: boolean;
  scrollY?: string | boolean;
  dom?: string;
  language?: {
    search?: string;
    searchPlaceholder?: string;
    lengthMenu?: string;
    info?: string;
    infoEmpty?: string;
    infoFiltered?: string;
    zeroRecords?: string;
    emptyTable?: string;
    loadingRecords?: string;
    processing?: string;
  };
}

export interface DataTableProps<T = Record<string, unknown>> {
  id?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  options?: DataTableOptions;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  onAction?: (action: string, row: T, index: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export interface DataTableRef<T = Record<string, unknown>> {
  reload: (newData?: T[]) => void;
  getDataTable: () => unknown;
  destroy: () => void;
}

const defaultOptions: DataTableOptions = {
  pageLength: 25,
  lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
  responsive: true,
  searching: true,
  paging: true,
  info: true,
  autoWidth: false,
  dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
  language: {
    search: "_INPUT_",
    searchPlaceholder: "Search...",
    lengthMenu: "Show _MENU_ entries",
    info: "Showing _START_ to _END_ of _TOTAL_ entries",
    infoEmpty: "No entries found",
    infoFiltered: "(filtered from _MAX_ total entries)",
    zeroRecords: "No matching entries found",
    emptyTable: "No data available in table",
    loadingRecords: "Loading...",
    processing: "Processing..."
  }
};

function DataTableInner<T = Record<string, unknown>>(
  {
    id,
    data,
    columns,
    options = {},
    className = '',
    onRowClick,
    onAction,
    loading = false,
    emptyMessage = 'No data available'
  }: DataTableProps<T>,
  ref: React.Ref<DataTableRef>
) {
  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const isInitialized = useRef(false);

  const mergedOptions = useMemo(() => ({ ...defaultOptions, ...options }), [options]);

  const checkJQueryReady = (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkInterval = setInterval(() => {
        attempts++;

        if (window.$ && window.$.fn && window.$.fn.DataTable) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  };

  const initializeDataTable = useCallback((tableData: T[]) => {
    if (!window.$ || !window.$.fn || !window.$.fn.DataTable) {
      console.error('jQuery or DataTables not available');
      return;
    }

    if (!tableRef.current) {
      console.error('Table ref not available');
      return;
    }

    const $ = window.$;

    try {
      // Destroy existing instance if exists
      if (dataTableRef.current) {
        try {
          dataTableRef.current.destroy();
        } catch (err) {
          console.log('No existing DataTable to destroy');
        }
      }

      // Prepare columns for DataTables
      const dtColumns = columns.map(col => ({
        title: col.title,
        data: col.data,
        orderable: col.orderable !== false,
        searchable: col.searchable !== false,
        width: col.width,
        className: col.className,
        render: col.render
      }));

      dataTableRef.current = $(tableRef.current).DataTable({
        ...mergedOptions,
        data: tableData,
        columns: dtColumns,
        destroy: true,
        initComplete: function() {
          // Add Bootstrap classes to DataTables elements
          $(this).addClass('table table-striped table-hover');
          $('.dataTables_wrapper').addClass('bootstrap5');
          $('.dataTables_length select').addClass('form-select form-select-sm');
          $('.dataTables_filter input').addClass('form-control form-control-sm');
          $('.dataTables_info').addClass('small');
          $('.dataTables_paginate .paginate_button').addClass('btn btn-sm btn-outline-primary mx-1');
          $('.dataTables_paginate .paginate_button.current').addClass('active');
          $('.dataTables_paginate .paginate_button.disabled').addClass('disabled');
        }
      });

      isInitialized.current = true;

      // Add event handlers
      if (onRowClick) {
        $(tableRef.current).on('click', 'tbody tr', function(this: HTMLElement) {
          const rowData = dataTableRef.current.row(this).data();
          const rowIndex = dataTableRef.current.row(this).index();
          if (rowData) {
            onRowClick(rowData, rowIndex);
          }
        });
      }

      if (onAction) {
        $(tableRef.current).on('click', '[data-action]', function(this: HTMLElement, e: Event) {
          e.preventDefault();
          e.stopPropagation();

          const action = $(this).data('action');
          const row = $(this).closest('tr');
          const rowData = dataTableRef.current.row(row).data();
          const rowIndex = dataTableRef.current.row(row).index();

          if (rowData && action) {
            onAction(action, rowData, rowIndex);
          }
        });
      }

    } catch (error) {
      console.error('Error initializing DataTable:', error);
    }
  }, [columns, mergedOptions, onRowClick, onAction]);

  const destroy = useCallback(() => {
    if (dataTableRef.current) {
      try {
        const $ = window.$;
        if ($ && tableRef.current) {
          $(tableRef.current).off();
        }
        dataTableRef.current.destroy();
        dataTableRef.current = null;
        isInitialized.current = false;
      } catch (err) {
        console.error('Error destroying DataTable:', err);
      }
    }
  }, []);

  const reload = useCallback((newData?: T[]) => {
    const dataToUse = newData || data;
    if (dataTableRef.current) {
      try {
        dataTableRef.current.clear();
        dataTableRef.current.rows.add(dataToUse);
        dataTableRef.current.draw();
      } catch (err) {
        console.error('Error reloading DataTable:', err);
        // Reinitialize if reload fails
        dataTableRef.current.destroy();
        dataTableRef.current = null;
        isInitialized.current = false;
        initializeDataTable(dataToUse);
      }
    } else if (!isInitialized.current) {
      initializeDataTable(dataToUse);
    }
  }, [data]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    reload,
    getDataTable: () => dataTableRef.current,
    destroy
  }), [reload, destroy]);

  useEffect(() => {
    const init = async () => {
      const ready = await checkJQueryReady();
      if (ready && data.length > 0) {
        setTimeout(() => initializeDataTable(data), 100);
      }
    };

    init();

    return () => {
      destroy();
    };
  }, [data, destroy, initializeDataTable]);

  useEffect(() => {
    if (isInitialized.current && dataTableRef.current) {
      reload(data);
    } else if (!isInitialized.current && data.length > 0) {
      checkJQueryReady().then(ready => {
        if (ready) {
          setTimeout(() => initializeDataTable(data), 100);
        }
      });
    }
  }, [data, reload, initializeDataTable]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="text-muted">
          <i className="fas fa-inbox fa-3x mb-3"></i>
          <p className="mb-0">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table
        id={id}
        ref={tableRef}
        className={`table table-striped table-hover ${className}`}
        style={{ width: '100%' }}
      >
        <thead className="table-dark">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={col.className} style={{ width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* DataTables will populate this */}
        </tbody>
      </table>
    </div>
  );
}

export const DataTable = forwardRef(DataTableInner) as <T = Record<string, unknown>>(
  props: DataTableProps<T> & { ref?: React.Ref<DataTableRef<T>> }
) => ReturnType<typeof DataTableInner>;