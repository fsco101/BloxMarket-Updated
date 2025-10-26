import * as React from "react";
import type { ReactNode } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Loader2, Search, AlertCircle } from "lucide-react";

// Universal Page Layout Component
interface PageLayoutProps {
  // Header props
  title: string;
  description: string;
  icon?: ReactNode;
  headerActions?: ReactNode;

  // Filters props
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterOptions?: Array<{ value: string; label: string }>;
  filterValue: string;
  onFilterChange: (value: string) => void;
  sortOptions?: Array<{ value: string; label: string }>;
  sortValue?: string;
  onSortChange?: (value: string) => void;

  // Stats props
  stats: Array<{
    icon: ReactNode;
    label: string;
    value?: string | number;
  }>;

  // Content props
  loading: boolean;
  error?: string;
  children: ReactNode;
  emptyState?: {
    icon: ReactNode;
    title: string;
    description: string;
  };

  // Layout props
  maxWidth?: string;
  gridCols?: {
    default: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function PageLayout({
  title,
  description,
  icon,
  headerActions,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filterOptions = [],
  filterValue,
  onFilterChange,
  sortOptions = [],
  sortValue,
  onSortChange,
  stats,
  loading,
  error,
  children,
  emptyState,
  maxWidth = "container",
  gridCols = { default: 1, lg: 2, xl: 3 }
}: PageLayoutProps) {
  const getGridClasses = () => {
    const classes = ['row', 'g-3'];
    if (gridCols.default > 1) classes.push(`row-cols-${gridCols.default}`);
    if (gridCols.md) classes.push(`row-cols-md-${gridCols.md}`);
    if (gridCols.lg) classes.push(`row-cols-lg-${gridCols.lg}`);
    if (gridCols.xl) classes.push(`row-cols-xl-${gridCols.xl}`);
    return classes.join(' ');
  };

  return (
    <div className="d-flex flex-column vh-100">
      {/* Header */}
      <div className="border-bottom bg-light p-3">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h1 className="h4 mb-1 d-flex align-items-center gap-2 fw-bold">
              {icon}
              {title}
            </h1>
            <p className="text-muted small mb-0">{description}</p>
          </div>
          {headerActions && (
            <div className="d-flex align-items-center gap-3">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-bottom p-3 bg-light">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 flex-fill">
            <Search className="text-muted" style={{ width: '1rem', height: '1rem' }} />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className="form-control"
              style={{ maxWidth: '300px' }}
            />
          </div>

          {filterOptions.length > 0 && (
            <Select value={filterValue} onValueChange={onFilterChange}>
              <SelectTrigger className="form-select" style={{ width: '200px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {sortOptions.length > 0 && sortValue && onSortChange && (
            <Select value={sortValue} onValueChange={onSortChange}>
              <SelectTrigger className="form-select" style={{ width: '130px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white p-3 border-bottom">
        <div className="d-flex align-items-center justify-content-center gap-4 small">
          {stats.map((stat, index) => (
            <div key={index} className="d-flex align-items-center gap-2">
              {stat.icon}
              <span>{stat.value ? `${stat.value} ` : ''}{stat.label}</span>
            </div>
          ))}
          {loading && (
            <div className="d-flex align-items-center gap-2">
              <Loader2 className="text-primary" style={{ width: '1rem', height: '1rem' }} />
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-fill overflow-auto">
        <div className={`${maxWidth} mx-auto p-3`}>
          {loading && (
            <div className="d-flex align-items-center justify-content-center py-5">
              <Loader2 className="text-primary me-2" style={{ width: '2rem', height: '2rem' }} />
              <span>Loading...</span>
            </div>
          )}

          {error && !loading && (
            <div className="d-flex align-items-center justify-content-center py-5">
              <AlertCircle className="text-danger me-2" style={{ width: '2rem', height: '2rem' }} />
              <span className="text-danger">{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {React.Children.count(children) > 0 ? (
                <div className={getGridClasses()}>
                  {React.Children.map(children, (child, index) => (
                    <div key={index} className="col">
                      {child}
                    </div>
                  ))}
                </div>
              ) : (
                emptyState && (
                                  emptyState && (
                  <div className="card text-center py-5">
                    <div className="card-body">
                      <div className="text-muted">
                        {emptyState.icon}
                        <h3 className="h5 mb-2">{emptyState.title}</h3>
                        <p className="mb-0">{emptyState.description}</p>
                      </div>
                    </div>
                  </div>
                )
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Universal Content Card Component
interface ContentCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hover?: boolean;
}

export function ContentCard({ children, onClick, className = "", hover = true }: ContentCardProps) {
  const cardClasses = [
    'card',
    'h-100',
    hover ? 'shadow-sm' : '',
    onClick ? 'cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      style={hover ? {
        transition: 'box-shadow 0.2s ease-in-out',
      } : undefined}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.classList.remove('shadow-sm');
          e.currentTarget.classList.add('shadow');
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.classList.remove('shadow');
          e.currentTarget.classList.add('shadow-sm');
        }
      }}
    >
      {children}
    </div>
  );
}

// Universal Card Header Component
interface CardHeaderProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode[];
  timestamp?: string;
  actions?: ReactNode;
  onUserClick?: () => void;
}

export function UniversalCardHeader({
  avatar,
  title,
  subtitle,
  badges = [],
  timestamp,
  actions,
  onUserClick
}: CardHeaderProps) {
  return (
    <div className="card-header pb-3">
      <div className="d-flex align-items-start justify-content-between">
        <div className="d-flex align-items-start gap-3">
          {avatar && (
            <div
              onClick={onUserClick}
              className={onUserClick ? "cursor-pointer rounded p-1" : ""}
              style={onUserClick ? {
                transition: 'background-color 0.2s ease-in-out',
              } : undefined}
              onMouseEnter={(e) => {
                if (onUserClick) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (onUserClick) {
                  e.currentTarget.style.backgroundColor = '';
                }
              }}
            >
              {avatar}
            </div>
          )}

          <div className="flex-fill">
            <div className="d-flex align-items-center gap-2 mb-1">
              <h3
                className={`card-title h5 mb-0 ${onUserClick ? 'cursor-pointer' : ''}`}
                style={onUserClick ? {
                  transition: 'color 0.2s ease-in-out',
                } : undefined}
                onClick={onUserClick}
                onMouseEnter={(e) => {
                  if (onUserClick) {
                    e.currentTarget.style.color = '#0d6efd';
                  }
                }}
                onMouseLeave={(e) => {
                  if (onUserClick) {
                    e.currentTarget.style.color = '';
                  }
                }}
              >
                {title}
              </h3>
            </div>

            {subtitle && (
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-medium small">{subtitle}</span>
                {badges.map((badge, index) => (
                  <React.Fragment key={index}>{badge}</React.Fragment>
                ))}
              </div>
            )}

            {timestamp && (
              <div className="small text-muted">
                {timestamp}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="text-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Universal Card Content Component
interface CardContentProps {
  description?: string;
  images?: ReactNode;
  metadata?: Array<{
    icon: ReactNode;
    label: string;
    value?: string | number;
  }>;
  tags?: ReactNode[];
  actions?: ReactNode;
}

export function UniversalCardContent({
  description,
  images,
  metadata = [],
  tags = [],
  actions
}: CardContentProps) {
  return (
    <div className="card-body">
      {description && (
        <p className="card-text small text-muted mb-3" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {description}
        </p>
      )}

      {images && (
        <div className="mb-3">
          {images}
        </div>
      )}

      {tags.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-3">
          {tags}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between">
        {metadata.length > 0 && (
          <div className="d-flex align-items-center gap-3 small text-muted">
            {metadata.map((item, index) => (
              <div key={index} className="d-flex align-items-center gap-1">
                {item.icon}
                <span>{item.value ? `${item.value} ` : ''}{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {actions && (
          <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}