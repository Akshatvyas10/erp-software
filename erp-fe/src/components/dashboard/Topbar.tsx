import { Menu, Bell, Search, PanelLeftClose, PanelLeftOpen, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/store/hooks";

interface TopbarProps {
    onMobileMenuClick: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export default function Topbar({ onMobileMenuClick, isCollapsed, onToggleCollapse }: TopbarProps) {
    const { mode, toggleMode } = useThemeMode();

    // Breadcrumb generator removed as breadcrumb section is disabled

    return (
        <header className="h-16 border-b shadow-xs border-border/60 bg-background/95 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 sticky top-0 backdrop-blur-md transition-colors">
            {/* Left Section */}
            <div className="flex items-center gap-2 lg:gap-3">
                {/* Mobile Menu Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                    onClick={onMobileMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Desktop Collapse Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                    onClick={onToggleCollapse}
                >
                    {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </Button>

                {/* Breadcrumbs */}
                {/*      <div className="hidden sm:flex flex-col">
                    <p className="text-[13px] text-muted-foreground font-semibold flex items-center gap-2">
                        Acme School
                        <span className="text-border font-normal">/</span>
                        <span className="text-foreground font-bold">{getBreadcrumbs()}</span>
                    </p>
                </div> */}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">

                {/* Search Bar */}
                <div className="hidden md:flex relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search everywhere..."
                        className="h-10 w-48 lg:w-64 bg-muted/50 border border-border/80 rounded-xl pl-10 pr-12 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 font-mono text-[9px] font-bold text-muted-foreground shadow-xs">
                            ⌘K
                        </kbd>
                    </div>
                </div>

                {/* Notifications Indicator */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-10 w-10 relative"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
                </Button>

                {/* Light/Dark Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-10 w-10"
                    onClick={toggleMode}
                    title={mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                    {mode === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
            </div>
        </header>
    );
}