import { Menu, Bell, Search, PanelLeftClose, PanelLeftOpen, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

interface TopbarProps {
    onMobileMenuClick: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export default function Topbar({ onMobileMenuClick, isCollapsed, onToggleCollapse }: TopbarProps) {
    const location = useLocation();
    const [theme, setTheme] = useState<"light" | "dark">("light");

    // Simple breadcrumb generator
    const getBreadcrumbs = () => {
        const path = location.pathname.split("/").filter(Boolean);
        if (path.length === 1 && path[0] === "dashboard") return "Dashboard";
        return path.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ");
    };

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    // Initialize theme based on document class
    useEffect(() => {
        if (document.documentElement.classList.contains("dark")) {
            setTheme("dark");
        }
    }, []);

    return (
        <header className="h-16 border-b shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] border-purple-100 dark:border-zinc-800 bg-purple-50/95 dark:bg-zinc-950 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 sticky top-0 backdrop-blur-md transition-colors">
            {/* Left Section */}
            <div className="flex items-center gap-2 lg:gap-3">
                {/* Mobile Menu Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-purple-900/70 dark:text-zinc-400 hover:text-purple-950 dark:hover:text-zinc-100 hover:bg-purple-600/5 dark:hover:bg-zinc-900 rounded-xl transition-colors"
                    onClick={onMobileMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Desktop Collapse Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex text-purple-900/70 dark:text-zinc-400 hover:text-purple-950 dark:hover:text-zinc-100 hover:bg-purple-600/5 dark:hover:bg-zinc-900 rounded-xl transition-colors"
                    onClick={onToggleCollapse}
                >
                    {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </Button>

                {/* Breadcrumbs */}
                <div className="hidden sm:flex flex-col">
                    <p className="text-[13px] text-purple-900/60 dark:text-zinc-500 font-semibold flex items-center gap-2">
                        Acme School
                        <span className="text-purple-200 dark:text-zinc-800 font-normal">/</span>
                        <span className="text-purple-950 dark:text-zinc-200 font-bold">{getBreadcrumbs()}</span>
                    </p>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">

                {/* Search Bar */}
                <div className="hidden md:flex relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-900/40 dark:text-zinc-500 group-focus-within:text-purple-700 dark:group-focus-within:text-purple-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search everywhere..."
                        className="h-10 w-48 lg:w-64 bg-purple-600/5 dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800/80 rounded-xl pl-10 pr-12 text-sm text-purple-950 dark:text-zinc-200 outline-none transition-all placeholder:text-purple-900/40 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-950 focus:border-purple-600 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-600/10 dark:focus:ring-purple-500/10 font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded-md border border-purple-200/60 dark:border-zinc-800 bg-purple-100/50 dark:bg-zinc-950 px-1.5 font-mono text-[9px] font-bold text-purple-900/50 dark:text-zinc-500 shadow-sm">
                            ⌘K
                        </kbd>
                    </div>
                </div>

                {/* Notifications Indicator */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-purple-900/70 dark:text-zinc-400 hover:text-purple-950 dark:hover:text-zinc-100 hover:bg-purple-600/5 dark:hover:bg-zinc-900 rounded-xl h-10 w-10 relative"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-500 ring-2 ring-purple-5/50 dark:ring-zinc-950"></span>
                </Button>

                {/* Light/Dark Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-purple-900/70 dark:text-zinc-400 hover:text-purple-950 dark:hover:text-zinc-100 hover:bg-purple-600/5 dark:hover:bg-zinc-900 rounded-xl h-10 w-10"
                    onClick={toggleTheme}
                >
                    {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
            </div>
        </header>
    );
}