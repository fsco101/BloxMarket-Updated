"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

type ScrollMode = "body" | "modal";

interface DialogImperativeHandle {
  scrollTo: (options: ScrollToOptions | number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getScrollElement: () => HTMLDivElement | null;
}

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  scrollMode?: ScrollMode;
  scrollBehavior?: "smooth" | "auto";
}

function DialogContent({
  className,
  children,
  scrollMode = "modal",
  scrollBehavior = "smooth",
  ...props
}: DialogContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Global scroll function that can be used programmatically
  const scrollTo = React.useCallback((options: ScrollToOptions | number) => {
    if (contentRef.current) {
      if (typeof options === 'number') {
        contentRef.current.scrollTo({
          top: options,
          behavior: scrollBehavior
        });
      } else {
        contentRef.current.scrollTo({
          ...options,
          behavior: scrollBehavior
        });
      }
    }
  }, [scrollBehavior]);

  // Expose scroll function globally for this modal instance
  React.useImperativeHandle(props.ref as React.Ref<DialogImperativeHandle>, () => ({
    scrollTo,
    scrollToTop: () => scrollTo(0),
    scrollToBottom: () => scrollTo(contentRef.current?.scrollHeight || 0),
    getScrollElement: () => contentRef.current
  }));

  // Enhanced base classes for better modal sizing and scrolling
  const base =
    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100vw-2rem)] translate-x-[-50%] translate-y-[-50%] gap-0 rounded-xl border border-border shadow-2xl duration-300 p-0";

  // Dynamic height calculation based on content and viewport
  const heightClass = scrollMode === "modal"
    ? "max-h-[calc(100vh-4rem)] h-auto"
    : "max-h-[calc(100vh-4rem)]";

  const overflowClass = scrollMode === "modal"
    ? "overflow-hidden"
    : "overflow-hidden";

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(base, heightClass, overflowClass, className)}
        {...props}
      >
        <div
          ref={contentRef}
          className={cn(
            "flex flex-col relative",
            scrollMode === "modal" ? "overflow-y-auto max-h-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" : "max-h-full",
            `scroll-smooth`
          )}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(203 213 225) transparent'
          }}
        >
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 z-20 rounded-sm opacity-70 transition-all hover:opacity-100 hover:bg-accent focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 p-2 bg-background/80 backdrop-blur-sm">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2.5 text-left px-8 pt-8 pb-4 border-b border-border/50",
        className
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex-1 overflow-y-auto px-8 py-6",
        className
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-8 py-6 border-t border-border/50 shrink-0 bg-muted/30 rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-2xl leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

export type { ScrollMode, DialogImperativeHandle };
