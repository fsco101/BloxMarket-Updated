import * as React from "react";
import type { ReactNode } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Card, CardContent } from "./card";
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.05),rgba(255,255,255,0))]" />
      
      {/* Enhanced Header */}
      <div className="relative border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
        <div className="relative p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {icon && (
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 shadow-sm">
                    {icon}
                  </div>
                )}
                {title}
              </h1>
              <p className="text-muted-foreground text-base font-medium">{description}</p>
            </div>
            {headerActions && (
              <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-border/50 shadow-lg">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Filters Section */}
      <div className="relative border-b border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Enhanced Search */}
            <div className="flex items-center gap-3 flex-1 relative group">
              <div className="absolute left-3 z-10">
                <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              </div>
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                className="pl-10 bg-background/70 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 flex-1 min-w-0 max-w-3xl"
                size="default"
              />
            </div>

            {/* Enhanced Filters */}
            <div className="flex items-center gap-3">
              {filterOptions.length > 0 && (
                <div className="relative">
                  <Select value={filterValue} onValueChange={onFilterChange}>
                    <SelectTrigger className="w-52 bg-background/70 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
                      <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-popover/95 border-border/60">
                      {filterOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="hover:bg-accent/70 transition-colors duration-150"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sortOptions.length > 0 && sortValue && onSortChange && (
                <div className="relative">
                  <Select value={sortValue} onValueChange={onSortChange}>
                    <SelectTrigger className="w-40 bg-background/70 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-popover/95 border-border/60">
                      {sortOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="hover:bg-accent/70 transition-colors duration-150"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Bar */}
      <div className="relative bg-gradient-to-r from-card/50 via-card/70 to-card/50 border-b border-border/40 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 text-sm">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-200">
                  {stat.icon}
                </div>
                <span className="font-medium">
                  {stat.value && (
                    <span className="text-primary font-semibold mr-1">{stat.value}</span>
                  )}
                  <span className="text-muted-foreground">{stat.label}</span>
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium text-primary">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="flex-1 overflow-y-auto relative bg-gradient-to-b from-transparent to-muted/10">
        <div className="max-w-7xl mx-auto p-6 lg:p-8 relative">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 animate-pulse" />
                <Loader2 className="w-8 h-8 animate-spin text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Loading content...</h3>
                <p className="text-muted-foreground">Please wait while we fetch your data</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {React.Children.count(children) > 0 ? (
                <div className={`grid gap-6 lg:gap-8 ${
                  gridCols.default === 1 
                    ? 'grid-cols-1' 
                    : gridCols.default === 2 
                    ? 'grid-cols-1 md:grid-cols-2' 
                    : gridCols.default === 3 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                    : gridCols.default === 4
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}>
                  {React.Children.map(children, (child, index) => (
                    <div 
                      key={index} 
                      className="transform transition-all duration-300 hover:scale-[1.02] hover:translate-y-[-2px]"
                      style={{ 
                        animationDelay: `${index * 100}ms`,
                        animation: 'fadeInUp 0.6s ease-out forwards'
                      }}
                    >
                      {child}
                    </div>
                  ))}
                </div>
              ) : (
                emptyState && (
                  <div className="flex items-center justify-center py-20">
                    <Card className="text-center py-16 px-8 max-w-md mx-auto border-dashed border-2 border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                      <CardContent className="space-y-6">
                        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center border border-border/40">
                          <div className="text-muted-foreground scale-150">
                            {emptyState.icon}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-xl font-semibold text-foreground">{emptyState.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{emptyState.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Universal Content Card Component
interface ContentCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hover?: boolean;
  variant?: 'default' | 'premium' | 'glass' | 'gradient';
}

export function ContentCard({ 
  children, 
  onClick, 
  className = "", 
  hover = true,
  variant = 'default'
}: ContentCardProps) {
  const baseClasses = "transition-all duration-300 relative overflow-hidden group";
  
  const variantClasses = {
    default: "bg-card border border-border/60 shadow-sm hover:shadow-lg hover:border-border",
    premium: "bg-gradient-to-br from-card via-card to-card/80 border border-border/60 shadow-lg hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30",
    glass: "bg-card/70 backdrop-blur-xl border border-border/40 shadow-xl hover:bg-card/80 hover:border-border/60",
    gradient: "bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border/60 shadow-lg hover:shadow-xl hover:from-primary/10 hover:to-secondary/10"
  };

  const hoverClasses = hover ? "hover:scale-[1.02] hover:-translate-y-1" : "";
  const clickClasses = onClick ? "cursor-pointer active:scale-[0.98]" : "";

  return (
    <Card
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${clickClasses} rounded-xl ${className}`}
      onClick={onClick}
    >
      {/* Subtle gradient overlay for premium variants */}
      {(variant === 'premium' || variant === 'gradient') && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </Card>
  );
}

// Enhanced Universal Card Header Component
interface CardHeaderProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode[];
  timestamp?: string;
  actions?: ReactNode;
  onUserClick?: () => void;
  premium?: boolean;
}

export function UniversalCardHeader({
  avatar,
  title,
  subtitle,
  badges = [],
  timestamp,
  actions,
  onUserClick,
  premium = false
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between p-6 pb-4 relative">
      {/* Premium background effect */}
      {premium && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-t-xl" />
      )}
      
      <div className="flex items-start gap-4 flex-1 relative z-10">
        {avatar && (
          <div
            onClick={onUserClick}
            className={`${
              onUserClick 
                ? "cursor-pointer rounded-xl p-1 hover:bg-muted/50 hover:scale-105 transition-all duration-200 group" 
                : "rounded-xl"
            }`}
          >
            <div className="relative">
              {avatar}
              {onUserClick && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            <h3
              className={`text-lg font-semibold leading-tight tracking-tight ${
                onUserClick 
                  ? 'cursor-pointer hover:text-primary transition-colors duration-200 hover:underline decoration-primary/30 underline-offset-4' 
                  : ''
              } ${premium ? 'bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text' : ''}`}
              onClick={onUserClick}
            >
              {title}
            </h3>
            {badges.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {badges.map((badge, index) => (
                  <div key={index} className="transform hover:scale-105 transition-transform duration-200">
                    {badge}
                  </div>
                ))}
              </div>
            )}
          </div>

          {subtitle && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200">
                {subtitle}
              </span>
            </div>
          )}

          {timestamp && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/80 font-medium px-2 py-1 rounded-md bg-muted/30">
                {timestamp}
              </span>
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="relative z-10 ml-4">
          <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted/50 transition-colors duration-200">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Universal Card Content Component
interface CardContentProps {
  description?: string;
  images?: ReactNode;
  metadata?: Array<{
    icon: ReactNode;
    label: string;
    value?: string | number;
    highlight?: boolean;
  }>;
  tags?: ReactNode[];
  actions?: ReactNode;
  gradient?: boolean;
}

export function UniversalCardContent({
  description,
  images,
  metadata = [],
  tags = [],
  actions,
  gradient = false
}: CardContentProps) {
  return (
    <div className="px-6 pb-6 relative">
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/5 to-muted/10 rounded-b-xl pointer-events-none" />
      )}
      
      <div className="relative z-10 space-y-4">
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-300 cursor-pointer">
            {description}
          </p>
        )}

        {images && (
          <div className="rounded-lg overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors duration-300">
            {images}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <div 
                key={index} 
                className="transform hover:scale-105 transition-all duration-200 hover:shadow-sm"
              >
                {tag}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          {metadata.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              {metadata.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 ${
                    item.highlight 
                      ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <div className={`${item.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.icon}
                  </div>
                  <span className="font-medium">
                    {item.value && (
                      <span className={`mr-1 ${item.highlight ? 'text-primary font-semibold' : 'text-foreground'}`}>
                        {item.value}
                      </span>
                    )}
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {actions && (
            <div 
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted/50 transition-colors duration-200" 
              onClick={(e) => e.stopPropagation()}
            >
              {React.Children.map(actions, (action, index) => (
                <div key={index} className="transform hover:scale-105 transition-transform duration-200">
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}