"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Grid3X3, Bell, HelpCircle, ChevronDown } from "lucide-react"

interface GlobalHeaderProps {
  productName?: string
}

export function GlobalHeader({ productName = "DocuMind" }: GlobalHeaderProps) {
  return (
    <TooltipProvider>
      <header className="h-12 border-b border-border bg-background flex items-center justify-between px-4">
        {/* Left Group */}
        <div className="flex items-center gap-3">
          {/* Waffle Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>Dashboard</DropdownMenuItem>
              <DropdownMenuItem>Models</DropdownMenuItem>
              <DropdownMenuItem>Datasets</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logo Placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-bold">D</span>
            </div>
            <span className="font-semibold text-sm">{productName}</span>
          </div>
        </div>

        {/* Right Group */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Notifications
            </TooltipContent>
          </Tooltip>

          {/* Help */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Help & Resources
            </TooltipContent>
          </Tooltip>

          {/* Environment Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Production</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                Production
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                Staging
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                Development
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-border mx-1" />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback className="text-xs">JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs font-medium">John Doe</DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-muted-foreground">john@example.com</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">Account Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  )
}
