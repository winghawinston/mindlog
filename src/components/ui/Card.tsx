// ============================================================
// CARD COMPONENT SYSTEM
//
// Composable card primitives. Use them like this:
//
// <Card>
//   <CardHeader>
//     <CardTitle>Title</CardTitle>
//     <CardDescription>Subtitle</CardDescription>
//   </CardHeader>
//   <CardContent>...your content...</CardContent>
//   <CardFooter>...actions...</CardFooter>
// </Card>
//
// All components accept className for overrides — the base
// styles are sensible defaults, not hard constraints.
// ============================================================

import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

// base card — the white/dark surface container
const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn(
        "bg-white dark:bg-dark-surface",
        "border border-parchment dark:border-dark-border",
        "rounded-xl p-6",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

// groups title + description at the top of a card
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1 p-6 pb-0", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

// primary heading inside a card
const CardTitle = forwardRef<HTMLHeadingElement,HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-medium text-ink dark:text-[#f0ede8] leading-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// subtitle or supporting text below the title
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-ink-muted dark:text-[#888480]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// main content area — padded on all sides
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

// bottom actions row — sits flush at the bottom
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};