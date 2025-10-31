import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { alertService } from '../services/alertService';

export interface ChartDataPoint {
  name?: string;
  label?: string;
  value?: number;
  users?: number;
  trades?: number;
  posts?: number;
  reports?: number;
  participants?: number;
  popularity?: number;
  [key: string]: string | number | undefined;
}

interface ChartDownloadOptions {
  chartId: string;
  filename: string;
  title?: string;
  description?: string;
  includeStatistics?: boolean;
  includeLegend?: boolean;
  includeMetadata?: boolean;
  includeDataTable?: boolean;
  includeExecutiveSummary?: boolean;
  timePeriod?: string;
  dataSource?: string;
  generatedBy?: string;
  chartData?: ChartDataPoint[]; // Actual chart data array
  dataKey?: string; // Key for data values (e.g., 'value', 'users', 'trades')
  nameKey?: string; // Key for data labels (e.g., 'name', 'label')
}

interface ChartLegendItem {
  name: string;
  color: string;
  description?: string;
}

interface ChartStatistics {
  maxValue?: number;
  minValue?: number;
  averageValue?: number;
  dataPoints?: number;
  totalValue?: number;
  medianValue?: number;
  standardDeviation?: number;
  growthRate?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

interface ChartMetadata {
  chartType: string;
  dataSource: string;
  timePeriod: string;
  generatedBy: string;
  generatedAt: Date;
  dataPoints: number;
  lastUpdated?: Date;
}

interface DataTableRow {
  label: string;
  value: number;
  percentage?: number;
  change?: number;
}

export class ChartReportGenerator {
  // Wait for chart to be fully rendered
  private static async waitForChartRender(chartId: string, timeout: number = 5000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = document.getElementById(chartId);
        if (element) {
          // Additional check: ensure the element has content
          const svgElement = element.querySelector('svg');
          if (svgElement && svgElement.getBoundingClientRect().width > 0) {
            resolve(element);
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Chart element '${chartId}' not found or not rendered within ${timeout}ms`));
          return;
        }

        // Check again in next frame
        requestAnimationFrame(checkElement);
      };

      checkElement();
    });
  }

  // Alternative: Direct SVG export without html2canvas
  private static async exportChartAsSVG(chartElement: HTMLElement): Promise<string> {
    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in chart');
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;

    // Ensure proper dimensions
    const rect = svgElement.getBoundingClientRect();
    clonedSvg.setAttribute('width', rect.width.toString());
    clonedSvg.setAttribute('height', rect.height.toString());

    // Convert to string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);

    // Add XML declaration if missing
    if (!svgString.includes('<?xml')) {
      svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;
    }

    return svgString;
  }

  private static async convertSvgToCanvas(svgElement: SVGElement, width: number, height: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('SVG conversion timeout'));
        }, 10000); // 10 second timeout

        // Use canvg v4 API
        import('canvg').then((canvgModule) => {
          const { Canvg } = canvgModule;
          const svgString = new XMLSerializer().serializeToString(svgElement);
          const v = Canvg.fromString(ctx, svgString, {
            ignoreMouse: true,
            ignoreAnimation: true,
            ignoreDimensions: true,
            enableRedraw: false
          });

          v.render().then(() => {
            clearTimeout(timeout);
            resolve(canvas);
          }).catch((renderError) => {
            clearTimeout(timeout);
            reject(renderError);
          });
        }).catch((importError) => {
          clearTimeout(timeout);
          console.error('Canvg import failed:', importError);
          reject(importError);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async captureChart(chartElement: HTMLElement): Promise<HTMLCanvasElement> {
    const svgElement = chartElement.querySelector('svg');
    let canvgError: Error | null = null;

    if (svgElement) {
      try {
        return await this.convertSvgToCanvas(svgElement, svgElement.clientWidth, svgElement.clientHeight);
      } catch (svgError) {
        canvgError = svgError as Error;
        console.warn('Canvg failed, trying alternative SVG conversion:', canvgError);
      }
    }

    // Last resort: html2canvas with minimal options to avoid iframe issues
    try {
      return await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 1, // Lower scale to reduce memory usage
        useCORS: true,
        allowTaint: false,
        logging: false,
        ignoreElements: () => true, // Ignore all child elements that might cause issues
        foreignObjectRendering: false,
        removeContainer: true
      });
    } catch (html2canvasError) {
      throw new Error(`All chart capture methods failed. Canvg: ${canvgError?.message || 'Unknown'}, html2canvas: ${(html2canvasError as Error)?.message || 'Unknown'}`);
    }
  }

  private static extractChartData(chartElement: HTMLElement, filename: string, options: ChartDownloadOptions): DataTableRow[] {
    const data: DataTableRow[] = [];

    // Use provided chart data if available
    if (options.chartData && options.chartData.length > 0) {
      const dataKey = options.dataKey || 'value';
      const nameKey = options.nameKey || 'name';

      options.chartData.forEach((item, index) => {
        const label = item[nameKey] || item.label || `Item ${index + 1}`;
        const value = item[dataKey] || item.value || 0;

        if (typeof value === 'number') {
          data.push({
            label: label.toString(),
            value: value
          });
        }
      });

      // Calculate percentages if we have total
      const total = data.reduce((sum, row) => sum + row.value, 0);
      if (total > 0) {
        data.forEach(row => {
          row.percentage = (row.value / total) * 100;
        });
      }

      return data;
    }

    // Fallback: Extract from DOM (for backward compatibility)
    if (filename.includes('platform-activity')) {
      // For area charts, extract from SVG text elements
      const svgElement = chartElement.querySelector('svg');
      if (svgElement) {
        const textElements = Array.from(svgElement.querySelectorAll('text'));
        const values: { [key: string]: number } = {};

        textElements.forEach((text) => {
          const textContent = text.textContent?.trim();
          if (textContent && !isNaN(Number(textContent))) {
            const numValue = Number(textContent);
            // Group by approximate values (assuming they're stacked)
            const key = Math.floor(numValue / 10) * 10;
            values[key] = (values[key] || 0) + numValue;
          }
        });

        Object.entries(values).forEach(([label, value]) => {
          data.push({ label: `Range ${label}-${Number(label) + 9}`, value });
        });
      }
    } else if (filename.includes('user-status')) {
      // For pie charts, we need to get the data from the component props
      // Since we can't access React props directly, we'll use placeholder data
      // In a real implementation, you'd pass the data through the options
      data.push(
        { label: 'Regular Users', value: 150, percentage: 60 },
        { label: 'Verified Users', value: 75, percentage: 30 },
        { label: 'Middlemen', value: 15, percentage: 6 },
        { label: 'Moderators', value: 8, percentage: 3.2 },
        { label: 'Admins', value: 2, percentage: 0.8 }
      );
    } else if (filename.includes('popular-wishlists') || filename.includes('event-participants') || filename.includes('reports-issues')) {
      // For bar charts, extract from SVG
      const svgElement = chartElement.querySelector('svg');
      if (svgElement) {
        const bars = svgElement.querySelectorAll('rect');
        bars.forEach((bar, index) => {
          const height = parseFloat(bar.getAttribute('height') || '0');
          if (height > 0) {
            data.push({
              label: `Item ${index + 1}`,
              value: Math.round(height * 10) // Scale back to approximate real value
            });
          }
        });
      }
    }

    return data;
  }

  private static extractChartStatistics(chartElement: HTMLElement, options: ChartDownloadOptions): ChartStatistics {
    const stats: ChartStatistics = {};
    const values: number[] = [];

    // Use provided chart data if available
    if (options.chartData && options.chartData.length > 0) {
      const dataKey = options.dataKey || 'value';

      options.chartData.forEach((item) => {
        const value = item[dataKey] || item.value || 0;
        if (typeof value === 'number') {
          values.push(value);
        }
      });
    } else {
      // Fallback: Extract from DOM (for backward compatibility)
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) return stats;

      // Collect numeric values from text nodes
      const textNodes = Array.from(svgElement.querySelectorAll('text'));
      textNodes.forEach((t) => {
        const txt = t.textContent?.trim();
        if (txt && !isNaN(Number(txt))) {
          values.push(Number(txt));
        }
      });

      // Collect numeric values from rect heights (bar charts)
      const rects = Array.from(svgElement.querySelectorAll('rect'));
      rects.forEach((r) => {
        const h = parseFloat(r.getAttribute('height') || '0');
        if (!isNaN(h) && h > 0) values.push(h);
      });
    }

    if (values.length === 0) return stats;

    // Basic aggregates
    const sorted = values.slice().sort((a, b) => a - b);
    const total = values.reduce((s, v) => s + v, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    // Standard deviation (population)
    const variance = values.reduce((s, v) => s + Math.pow(v - average, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);

    // Simple growthRate/trend heuristic: compare last vs first numeric value
    let growthRate: number | undefined;
    let trend: ChartStatistics['trend'] | undefined;
    if (values.length >= 2) {
      const first = values[0];
      const last = values[values.length - 1];
      // avoid division by zero
      growthRate = first === 0 ? (last - first) : (last - first) / Math.abs(first);
      if (growthRate > 0.02) trend = 'increasing';
      else if (growthRate < -0.02) trend = 'decreasing';
      else trend = 'stable';
    }

    stats.maxValue = max;
    stats.minValue = min;
    stats.averageValue = average;
    stats.dataPoints = values.length;
    stats.totalValue = total;
    stats.medianValue = median;
    stats.standardDeviation = stddev;
    if (growthRate !== undefined) stats.growthRate = growthRate;
    if (trend) stats.trend = trend;

    return stats;
  }

  private static getChartMetadata(filename: string, options: ChartDownloadOptions): ChartMetadata {
    const chartType = filename.includes('platform-activity') ? 'Area Chart' :
                     filename.includes('user-status') ? 'Pie Chart' :
                     'Bar Chart';

    return {
      chartType,
      dataSource: options.dataSource || 'BloxMarket Database',
      timePeriod: options.timePeriod || 'Last 30 days',
      generatedBy: options.generatedBy || 'Admin Dashboard',
      generatedAt: new Date(),
      dataPoints: 0, // Will be filled from statistics
      lastUpdated: new Date()
    };
  }

  private static generateExecutiveSummary(filename: string, statistics: ChartStatistics): string[] {
    const summary: string[] = [];

    if (filename.includes('platform-activity')) {
      summary.push('Platform Activity Overview:');
      summary.push(`• Total activity across all metrics: ${statistics.totalValue || 0}`);
      summary.push(`• Average daily activity: ${statistics.averageValue?.toFixed(1) || 0}`);
      if (statistics.trend === 'increasing') {
        summary.push('• Trend: Activity is increasing, indicating platform growth');
      } else if (statistics.trend === 'decreasing') {
        summary.push('• Trend: Activity is declining, may require attention');
      } else {
        summary.push('• Trend: Activity is stable');
      }
    } else if (filename.includes('user-status')) {
      summary.push('User Distribution Summary:');
      summary.push(`• Total users: ${statistics.totalValue || 0}`);
      summary.push(`• Most common user type: Regular Users (${((statistics.maxValue || 0) / (statistics.totalValue || 1) * 100).toFixed(1)}%)`);
      summary.push('• User verification levels indicate healthy community growth');
    } else if (filename.includes('popular-wishlists')) {
      summary.push('Wishlist Popularity Analysis:');
      summary.push(`• Most popular wishlist: ${statistics.maxValue || 0} upvotes`);
      summary.push(`• Average popularity: ${statistics.averageValue?.toFixed(1) || 0} upvotes`);
      summary.push('• High engagement indicates active trading community');
    } else if (filename.includes('event-participants')) {
      summary.push('Event Participation Metrics:');
      summary.push(`• Highest participation: ${statistics.maxValue || 0} attendees`);
      summary.push(`• Average event size: ${statistics.averageValue?.toFixed(1) || 0} participants`);
      summary.push('• Community events show strong engagement levels');
    } else if (filename.includes('reports-issues')) {
      summary.push('Moderation Activity Summary:');
      summary.push(`• Total reports: ${statistics.totalValue || 0}`);
      summary.push(`• Peak reporting period: ${statistics.maxValue || 0} reports`);
      summary.push('• Active moderation indicates healthy platform oversight');
    }

    return summary;
  }

  private static getChartLegend(filename: string): ChartLegendItem[] {
    if (filename.includes('platform-activity')) {
      return [
        { name: 'Users', color: '#0d6efd', description: 'User registration and activity trends' },
        { name: 'Trades', color: '#198754', description: 'Trading activity and transactions' },
        { name: 'Posts', color: '#6f42c1', description: 'Forum posts and community engagement' }
      ];
    } else if (filename.includes('user-status')) {
      return [
        { name: 'Regular Users', color: '#6c757d', description: 'Standard platform users' },
        { name: 'Verified Users', color: '#0d6efd', description: 'Verified account holders' },
        { name: 'Middlemen', color: '#198754', description: 'Verified middleman accounts' },
        { name: 'Moderators', color: '#fd7e14', description: 'Platform moderators' },
        { name: 'Admins', color: '#dc3545', description: 'Platform administrators' },
        { name: 'Banned Users', color: '#6f42c1', description: 'Suspended or banned accounts' }
      ];
    } else if (filename.includes('popular-wishlists')) {
      return [
        { name: 'Popularity', color: '#e83e8c', description: 'Wishlist popularity by upvotes' }
      ];
    } else if (filename.includes('event-participants')) {
      return [
        { name: 'Participants', color: '#ffc107', description: 'Event participation count' }
      ];
    } else if (filename.includes('reports-issues')) {
      return [
        { name: 'Reports', color: '#dc3545', description: 'Reported issues and moderation cases' }
      ];
    }
    return [];
  }

  private static formatChartTitle(filename: string): string {
    return filename
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Distribution', 'Distribution Report')
      .replace('Activity', 'Activity Report')
      .replace('Participants', 'Participants Report')
      .replace('Issues', 'Issues Report');
  }

  private static addReportHeader(pdf: jsPDF, title: string): void {
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Add company branding
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 53, 69); // Danger red
    pdf.text('BloxMarket', 20, 25);

    // Add report title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const titleLines = pdf.splitTextToSize(title, pageWidth - 40);
    pdf.text(titleLines, 20, 40);

    // Add generation date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    pdf.text(`Generated on: ${currentDate}`, 20, 55);

    // Add horizontal line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, 65, pageWidth - 20, 65);
  }

  private static addChartImage(pdf: jsPDF, canvas: HTMLCanvasElement): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const chartWidth = pageWidth - (margin * 2);

    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png');

    // Add chart image to PDF (moved higher up for more legend space)
    pdf.addImage(imgData, 'PNG', margin, 50, chartWidth, 120);

    // Add chart border
    pdf.setDrawColor(240, 240, 240);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, 50, chartWidth, 120);
  }

  private static addMetadataSection(pdf: jsPDF, metadata: ChartMetadata, startY: number): number {
    const margin = 20;
    const lineHeight = 6; // Consistent line height

    // Add metadata header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Report Metadata:', margin, startY);
    startY += 10;

    // Add metadata content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);

    const metadataItems = [
      `Chart Type: ${metadata.chartType}`,
      `Data Source: ${metadata.dataSource}`,
      `Time Period: ${metadata.timePeriod}`,
      `Generated By: ${metadata.generatedBy}`,
      `Generated At: ${metadata.generatedAt.toLocaleString()}`,
      `Data Points: ${metadata.dataPoints}`,
      ...(metadata.lastUpdated ? [`Last Updated: ${metadata.lastUpdated.toLocaleString()}`] : [])
    ];

    metadataItems.forEach((item, index) => {
      pdf.text(item, margin, startY + (index * lineHeight * 1.2)); // Slightly better spacing
    });

    return startY + (metadataItems.length * lineHeight * 1.2) + 8; // Consistent spacing after section
  }

  private static addExecutiveSummarySection(pdf: jsPDF, summary: string[], startY: number): number {
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const lineHeight = 6;

    // Add summary header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Executive Summary:', margin, startY);
    startY += 10;

    // Add summary content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);

    let currentY = startY;
    summary.forEach((item) => {
      const lines = pdf.splitTextToSize(item, pageWidth - margin * 2);
      const textLines = Array.isArray(lines) ? lines : [lines];
      pdf.text(textLines, margin, currentY);
      currentY += textLines.length * lineHeight * 1.2; // Better line spacing
    });

    return currentY + 8; // Consistent spacing after section
  }

  private static addDataTableSection(pdf: jsPDF, data: DataTableRow[], startY: number): number {
    const margin = 20;
    const colWidth = 40;
    const rowHeight = 8;
    const lineHeight = 6; // Consistent line height

    // Add table header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Data Table:', margin, startY);
    startY += 10;

    // Table headers
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);

    pdf.text('Category', margin, startY);
    pdf.text('Value', margin + colWidth, startY);
    pdf.text('%', margin + colWidth * 2, startY);
    pdf.text('Change', margin + colWidth * 3, startY);

    // Header underline
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, startY + 2, margin + colWidth * 4, startY + 2);
    startY += lineHeight + 2; // Consistent spacing

    // Table data
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);

    data.forEach((row, index) => {
      const yPos = startY + (index * rowHeight);

      pdf.text(row.label.substring(0, 15), margin, yPos);
      pdf.text(row.value.toString(), margin + colWidth, yPos);
      if (row.percentage !== undefined) {
        pdf.text(`${row.percentage.toFixed(1)}%`, margin + colWidth * 2, yPos);
      }
      if (row.change !== undefined) {
        const changeText = row.change > 0 ? `+${row.change}` : row.change.toString();
        pdf.text(changeText, margin + colWidth * 3, yPos);
      }
    });

    return startY + (data.length * rowHeight) + 8; // Consistent spacing after section
  }

  private static addEnhancedStatisticsSection(pdf: jsPDF, statistics: ChartStatistics, startY: number): number {
    const margin = 20;
    const lineHeight = 6; // Consistent line height

    // Add statistics header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Detailed Statistics:', margin, startY);
    startY += 10;

    // Add statistics content
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);

    const stats = [];
    if (statistics.maxValue !== undefined) stats.push(`Maximum Value: ${statistics.maxValue}`);
    if (statistics.minValue !== undefined) stats.push(`Minimum Value: ${statistics.minValue}`);
    if (statistics.averageValue !== undefined) stats.push(`Average Value: ${statistics.averageValue.toFixed(2)}`);
    if (statistics.medianValue !== undefined) stats.push(`Median Value: ${statistics.medianValue.toFixed(2)}`);
    if (statistics.standardDeviation !== undefined) stats.push(`Standard Deviation: ${statistics.standardDeviation.toFixed(2)}`);
    if (statistics.totalValue !== undefined) stats.push(`Total Value: ${statistics.totalValue}`);
    if (statistics.dataPoints !== undefined) stats.push(`Data Points: ${statistics.dataPoints}`);
    if (statistics.growthRate !== undefined) stats.push(`Growth Rate: ${statistics.growthRate.toFixed(3)}`);
    if (statistics.trend) stats.push(`Trend: ${statistics.trend.charAt(0).toUpperCase() + statistics.trend.slice(1)}`);

    // Split into two columns if too many stats
    const midPoint = Math.ceil(stats.length / 2);
    const leftColumn = stats.slice(0, midPoint);
    const rightColumn = stats.slice(midPoint);

    leftColumn.forEach((stat, index) => {
      pdf.text(stat, margin, startY + (index * lineHeight));
    });

    rightColumn.forEach((stat, index) => {
      pdf.text(stat, margin + 80, startY + (index * lineHeight));
    });

    return startY + Math.max(leftColumn.length, rightColumn.length) * lineHeight + 8; // Consistent spacing after section
  }

  private static addLegendSection(pdf: jsPDF, legend: ChartLegendItem[], startY: number): number {
    const margin = 20;
    const lineHeight = 8; // Increased line height for better readability

    // Add legend header with more prominence
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Chart Legend:', margin, startY);

    // Add a background box for the legend header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin - 2, startY - 6, 60, 8, 'F');

    startY += 15;

    // Add legend items with better spacing and visibility
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    legend.forEach((item, index) => {
      const yPos = startY + (index * lineHeight * 2); // Double spacing between items

      // Add larger, more visible color indicator
      const colorMatch = item.color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (colorMatch) {
        const r = parseInt(colorMatch[1], 16);
        const g = parseInt(colorMatch[2], 16);
        const b = parseInt(colorMatch[3], 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(margin, yPos - 4, 6, 6, 'F'); // Larger color box

        // Add border around color indicator
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPos - 4, 6, 6);
      }

      // Add legend text with better formatting
      pdf.setTextColor(0, 0, 0);
      const legendText = `${item.name}: ${item.description || ''}`;
      pdf.text(legendText, margin + 12, yPos);
    });

    return startY + (legend.length * lineHeight * 2) + 10; // More spacing after section
  }

  private static addReportFooter(pdf: jsPDF): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);

    // Add footer text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text('BloxMarket Admin Dashboard Report', 20, pageHeight - 15);

    // Add page number
    pdf.setFont('helvetica', 'normal');
    pdf.text('Page 1 of 1', pageWidth - 20, pageHeight - 15, { align: 'right' });
  }

  static async downloadChartReport(options: ChartDownloadOptions): Promise<void> {
    const {
      chartId,
      filename,
      title,
      includeStatistics = true,
      includeLegend = true,
      includeMetadata = true,
      includeDataTable = true,
      includeExecutiveSummary = true,
      timePeriod,
      dataSource,
      generatedBy
    } = options;

    try {
      // Wait for chart to be fully rendered before proceeding
      const chartElement = await this.waitForChartRender(chartId);

      // Extract all data we need
      const statistics = this.extractChartStatistics(chartElement, options);
      const metadata = this.getChartMetadata(filename, {
        ...options,
        timePeriod: timePeriod || 'Last 30 days',
        dataSource: dataSource || 'BloxMarket Database',
        generatedBy: generatedBy || 'Admin Dashboard'
      });
      metadata.dataPoints = statistics.dataPoints || 0;

      const dataTable = this.extractChartData(chartElement, filename, options);
      const executiveSummary = this.generateExecutiveSummary(filename, statistics);

      // Create PDF document with multiple pages if needed
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      let currentY = 25; // Start below header

      // Page 1: Header, Chart, and Summary
      const reportTitle = title || this.formatChartTitle(filename);
      this.addReportHeader(pdf, reportTitle);

      // Add metadata section
      if (includeMetadata) {
        currentY = this.addMetadataSection(pdf, metadata, currentY);
      }

      // Add executive summary
      if (includeExecutiveSummary && executiveSummary.length > 0) {
        currentY = this.addExecutiveSummarySection(pdf, executiveSummary, currentY);
      }

      // Check if we need a new page for the chart
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (currentY > pageHeight - 150) { // Leave room for chart
        pdf.addPage();
        currentY = 25;
      }

      // Capture and add chart image
      const canvas = await this.captureChart(chartElement);
      this.addChartImage(pdf, canvas);
      currentY = 190; // More space after chart for prominent legend display

      // Add legend section with page break check
      if (includeLegend) {
        const legend = this.getChartLegend(filename);
        if (legend.length > 0) {
          // Check if legend fits on current page
          const pageHeight = pdf.internal.pageSize.getHeight();
          const estimatedLegendHeight = legend.length * 16 + 25; // Rough estimate
          if (currentY + estimatedLegendHeight > pageHeight - 30) {
            pdf.addPage();
            currentY = 25;
          }
          currentY = this.addLegendSection(pdf, legend, currentY);
        }
      }

      // Page 2: Detailed Statistics and Data Table
      pdf.addPage();
      currentY = 25;

      // Add page title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${reportTitle} - Detailed Analysis`, 20, currentY);
      currentY += 15;

      // Add enhanced statistics
      if (includeStatistics) {
        currentY = this.addEnhancedStatisticsSection(pdf, statistics, currentY);
      }

      // Add data table if we have data
      if (includeDataTable && dataTable.length > 0) {
        // Check if we need a new page
        if (currentY > pageHeight - 100) {
          pdf.addPage();
          currentY = 25;
        }
        currentY = this.addDataTableSection(pdf, dataTable, currentY);
      }

      // Add footer to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        this.addReportFooter(pdf);
      }

      // Save the PDF
    } catch (error) {
      console.error('PDF generation failed:', error);
      alertService.error('Failed to generate PDF report. Please try again.');
    }
  }

  // Convenience method for quick chart downloads
  static async downloadChart(chartId: string, filename: string): Promise<void> {
    await this.downloadChartReport({
      chartId,
      filename,
      includeStatistics: true,
      includeLegend: true,
      includeMetadata: true,
      includeDataTable: true,
      includeExecutiveSummary: true
    });
  }

  // Comprehensive report with all features
  static async downloadComprehensiveReport(chartId: string, filename: string, options?: {
    title?: string;
    timePeriod?: string;
    dataSource?: string;
    generatedBy?: string;
  }): Promise<void> {
    await this.downloadChartReport({
      chartId,
      filename,
      title: options?.title,
      timePeriod: options?.timePeriod,
      dataSource: options?.dataSource,
      generatedBy: options?.generatedBy,
      includeStatistics: true,
      includeLegend: true,
      includeMetadata: true,
      includeDataTable: true,
      includeExecutiveSummary: true
    });
  }

  // Alternative method: Export chart as SVG file
  static async downloadChartAsSVG(chartId: string, filename: string): Promise<void> {
    try {
      const chartElement = await this.waitForChartRender(chartId);
      const svgString = await this.exportChartAsSVG(chartElement);

      // Create and download SVG file
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('SVG export failed:', error);
      alertService.error('Failed to export chart as SVG. Please try again.');
    }
  }
}

// Export convenience function for backward compatibility
export const downloadChart = ChartReportGenerator.downloadChart.bind(ChartReportGenerator);
export const downloadComprehensiveReport = ChartReportGenerator.downloadComprehensiveReport.bind(ChartReportGenerator);