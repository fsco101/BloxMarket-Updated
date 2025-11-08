import Swal from 'sweetalert2';
import type { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

// Global Alert Service for consistent SweetAlert2 usage across the application
class AlertService {
  private defaultConfig = {
    confirmButtonColor: '#3b82f6', // blue-500
    cancelButtonColor: '#ef4444', // red-500
    customClass: {
      popup: 'rounded-lg shadow-xl',
      confirmButton: 'px-4 py-2 rounded-md font-medium',
      cancelButton: 'px-4 py-2 rounded-md font-medium',
      title: 'text-lg font-semibold text-gray-900',
      htmlContainer: 'text-gray-700',
    },
    showClass: {
      popup: 'animate__animated animate__fadeIn animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOut animate__faster'
    }
  };

  // Success alert
  async success(title: string, text?: string, options?: Partial<SweetAlertOptions>): Promise<SweetAlertResult> {
    return Swal.fire({
      ...this.defaultConfig,
      icon: 'success',
      title,
      text,
      timer: text ? undefined : 2000, // Auto-close after 2s if no text
      showConfirmButton: !!text, // Hide button if auto-closing
      ...options
    } as SweetAlertOptions);
  }

  // Error alert
  async error(title: string, text?: string, options?: Partial<SweetAlertOptions>): Promise<SweetAlertResult> {
    return Swal.fire({
      ...this.defaultConfig,
      icon: 'error',
      title,
      text,
      ...options
    } as SweetAlertOptions);
  }

  // Warning alert
  async warning(title: string, text?: string, options?: Partial<SweetAlertOptions>): Promise<SweetAlertResult> {
    return Swal.fire({
      ...this.defaultConfig,
      icon: 'warning',
      title,
      text,
      ...options
    } as SweetAlertOptions);
  }

  // Info alert
  async info(title: string, text?: string, options?: Partial<SweetAlertOptions>): Promise<SweetAlertResult> {
    return Swal.fire({
      ...this.defaultConfig,
      icon: 'info',
      title,
      text,
      timer: text ? undefined : 3000, // Auto-close after 3s if no text
      showConfirmButton: !!text,
      ...options
    } as SweetAlertOptions);
  }

  // Confirmation dialog
  async confirm(
    title: string,
    text?: string,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
    options?: Partial<SweetAlertOptions>
  ): Promise<boolean> {
    const result = await Swal.fire({
      ...this.defaultConfig,
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true, // Cancel button first
      ...options
    } as SweetAlertOptions);

    return result.isConfirmed;
  }

  // Destructive confirmation (for delete operations)
  async confirmDelete(
    itemName: string,
    itemType: string = 'item',
    options?: Partial<SweetAlertOptions>
  ): Promise<boolean> {
    return this.confirm(
      `Delete ${itemType}`,
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      'Delete',
      'Cancel',
      {
        icon: 'warning',
        confirmButtonColor: '#ef4444', // red-500
        ...options
      }
    );
  }

  // Input dialog
  async input(
    title: string,
    text?: string,
    inputType: 'text' | 'email' | 'password' | 'number' | 'tel' | 'range' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'url' = 'text',
    inputPlaceholder?: string,
    inputValue?: string,
    options?: Partial<SweetAlertOptions>
  ): Promise<string | null> {
    const result = await Swal.fire({
      ...this.defaultConfig,
      icon: 'question',
      title,
      text,
      input: inputType,
      inputPlaceholder,
      inputValue,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      inputValidator: (value: string) => {
        if (!value) {
          return 'This field is required';
        }
        return null;
      },
      ...options
    } as SweetAlertOptions);

    return result.isConfirmed ? result.value : null;
  }

  // Loading dialog
  async loading(title: string = 'Loading...', text?: string): Promise<() => void> {
    Swal.fire({
      ...this.defaultConfig,
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    } as SweetAlertOptions);

    // Return a function to close the loading dialog
    return () => {
      Swal.close();
    };
  }

  // Toast notification (non-blocking)
  toast(
    title: string,
    icon: 'success' | 'error' | 'warning' | 'info' = 'info',
    timer: number = 3000
  ): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
      icon,
      title,
      customClass: {
        popup: 'rounded-md shadow-lg',
        title: 'text-sm font-medium'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInRight animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutRight animate__faster'
      }
    } as SweetAlertOptions);
  }

  // Close any open dialogs
  close(): void {
    Swal.close();
  }

  // Custom alert with full SweetAlert2 options
  async custom(options: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire({
      ...this.defaultConfig,
      ...options
    } as SweetAlertOptions);
  }

  // Queue multiple alerts (if supported)
  async queue(alerts: SweetAlertOptions[]): Promise<SweetAlertResult[]> {
    // Note: Swal.queue might not be available in all versions
    if (typeof (Swal as any).queue === 'function') {
      return (Swal as any).queue(alerts.map((alert: SweetAlertOptions) => ({
        ...this.defaultConfig,
        ...alert
      })));
    } else {
      // Fallback: show alerts sequentially
      const results: SweetAlertResult[] = [];
      for (const alert of alerts) {
        const result = await this.custom(alert);
        results.push(result);
      }
      return results;
    }
  }

  // Mixin for common configurations
  mixin(options: Record<string, unknown>): AlertService {
    const mixedService = new AlertService();
    mixedService.defaultConfig = { ...this.defaultConfig, ...options };
    return mixedService;
  }
}

// Create and export a singleton instance
export const alertService = new AlertService();

// Export the class for custom instances
export default AlertService;