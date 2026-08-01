import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
// 1. Define your variant mapping types
export type AvatarVariant = "default" | "orange" | "blue" | "green" | "purple" | "pink" | "amber" | "gradient"

function Avatar({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
  variant?: AvatarVariant
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-variant={variant} // 2. Set the variant as a data attribute for children selectors
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-slate-200/60 after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full text-sm font-medium group-data-[size=sm]/avatar:text-xs",

        // 3. Dynamic variant color mapping via Tailwind group-data modifiers
        "group-data-[variant=default]/avatar:bg-muted group-data-[variant=default]/avatar:text-muted-foreground",
        "group-data-[variant=orange]/avatar:bg-orange-100 group-data-[variant=orange]/avatar:text-orange-700 dark:group-data-[variant=orange]/avatar:bg-orange-950/50 dark:group-data-[variant=orange]/avatar:text-orange-300",
        "group-data-[variant=blue]/avatar:bg-blue-100 group-data-[variant=blue]/avatar:text-blue-700 dark:group-data-[variant=blue]/avatar:bg-blue-950/50 dark:group-data-[variant=blue]/avatar:text-blue-300",
        "group-data-[variant=green]/avatar:bg-green-100 group-data-[variant=green]/avatar:text-green-700 dark:group-data-[variant=green]/avatar:bg-green-950/50 dark:group-data-[variant=green]/avatar:text-green-300",
        "group-data-[variant=purple]/avatar:bg-purple-100 group-data-[variant=purple]/avatar:text-purple-700 dark:group-data-[variant=purple]/avatar:bg-purple-950/50 dark:group-data-[variant=purple]/avatar:text-purple-300",
        "group-data-[variant=pink]/avatar:bg-pink-100 group-data-[variant=pink]/avatar:text-pink-700 dark:group-data-[variant=pink]/avatar:bg-pink-950/50 dark:group-data-[variant=pink]/avatar:text-pink-300",
        "group-data-[variant=amber]/avatar:bg-amber-100 group-data-[variant=amber]/avatar:text-amber-700 dark:group-data-[variant=amber]/avatar:bg-amber-950/50 dark:group-data-[variant=amber]/avatar:text-amber-300",
        "group-data-[variant=gradient]/avatar:bg-gradient-to-br group-data-[variant=gradient]/avatar:from-orange-500 group-data-[variant=gradient]/avatar:to-pink-500 group-data-[variant=gradient]/avatar:text-white",

        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}