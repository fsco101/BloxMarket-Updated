import * as React from "react";
import type { ReactNode } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Card, CardHeader, CardContent } from "./card";
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
  gridCols = { default: 1, lg: 2, xl: 3 }
}: PageLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {icon}
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
          {headerActions && (
            <div className="flex items-center gap-3">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-6 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {filterOptions.length > 0 && (
            <Select value={filterValue} onValueChange={onFilterChange}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-32">
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
      <div className="bg-muted/30 border-b border-border p-4">
        <div className="flex items-center justify-center gap-8 text-sm">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              {stat.icon}
              <span>{stat.value ? `${stat.value} ` : ''}{stat.label}</span>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-7xl mx-auto p-6`}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Loading...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-destructive mr-2" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {React.Children.count(children) > 0 ? (
                <div className={`grid gap-6 ${gridCols.default === 1 ? 'grid-cols-1' : gridCols.default === 2 ? 'grid-cols-1 md:grid-cols-2' : gridCols.default === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {React.Children.map(children, (child, index) => (
                    <div key={index}>
                      {child}
                    </div>
                  ))}
                </div>
              ) : (
                emptyState && (
                  <Card className="text-center py-12">
                    <CardContent>
                      <div className="text-muted-foreground">
                        {emptyState.icon}
                        <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
                        <p>{emptyState.description}</p>
                      </div>
                    </CardContent>
                  </Card>
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
  return (
    <Card
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
      hover={hover}
      onClick={onClick}
    >
      {children}
    </Card>
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
    <div className="flex items-start justify-between p-6 pb-3">
      <div className="flex items-start gap-3">
        {avatar && (
          <div
            onClick={onUserClick}
            className={onUserClick ? "cursor-pointer rounded p-1 hover:bg-muted/50 transition-colors" : ""}
          >
            {avatar}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`text-lg font-semibold leading-none tracking-tight ${onUserClick ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
              onClick={onUserClick}
            >
              {title}
            </h3>
          </div>

          {subtitle && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">{subtitle}</span>
              {badges.map((badge, index) => (
                <React.Fragment key={index}>{badge}</React.Fragment>
              ))}
            </div>
          )}

          {timestamp && (
            <div className="text-xs text-muted-foreground">
              {timestamp}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="text-right">
          {actions}
        </div>
      )}
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
    <div className="p-6 pt-0">
      {description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
      )}

      {images && (
        <div className="mb-3">
          {images}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags}
        </div>
      )}

      <div className="flex items-center justify-between">
        {metadata.length > 0 && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {metadata.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                {item.icon}
                <span>{item.value ? `${item.value} ` : ''}{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {actions && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}