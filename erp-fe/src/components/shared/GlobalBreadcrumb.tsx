import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

export function GlobalBreadcrumb() {
    const location = useLocation();
    const navigate = useNavigate();

    // Split pathname, ignore empty strings
    const paths = location.pathname.split("/").filter(Boolean);

    // If we are exactly at /dashboard, maybe no breadcrumb needed?
    // Or we can just show Home
    if (paths.length <= 1) return null;

    // Typically paths[0] is 'dashboard'
    // Let's build the breadcrumb dynamically
    const breadcrumbs = [];
    let currentUrl = `/${paths[0]}`; // e.g. /dashboard
    
    // We start from index 1 because index 0 is 'dashboard'
    let parentHref = "";
    let parentLabel = "";
    let hasId = false;

    for (let i = 1; i < paths.length; i++) {
        const segment = paths[i];
        currentUrl += `/${segment}`;

        let label = capitalize(segment);
        const isId = UUID_REGEX.test(segment) || (!isNaN(Number(segment)) && segment.length > 3);

        if (isId) {
            label = "View Details";
            hasId = true;
            // The parent URL is the URL right before this ID
            parentHref = currentUrl.replace(`/${segment}`, "");
        } else {
            // If it's the module name (e.g. 'teachers')
            if (i === 1) {
                parentLabel = label;
                if (!hasId) parentHref = currentUrl;
            }
        }

        breadcrumbs.push({
            url: currentUrl,
            label,
            isId
        });
    }

    // Only show the "Back" button if we are deep into a view (e.g., viewing an ID)
    const showBack = hasId && parentHref !== "";

    return (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mb-4 pointer-events-none">
            <nav className="pointer-events-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-card/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/50 w-fit shadow-sm overflow-hidden">
                <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center p-0.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <Home className="h-4 w-4" />
                </Link>
                {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                        <div key={crumb.url} className="flex items-center gap-1.5">
                            <ChevronRight className="h-3.5 w-3.5 opacity-40 shrink-0" />
                            {isLast ? (
                                <span className="text-foreground font-semibold truncate max-w-[120px] sm:max-w-[250px] px-1">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link 
                                    to={crumb.url} 
                                    className="hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md px-1 truncate max-w-[120px]"
                                >
                                    {crumb.label}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>

            {showBack && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="pointer-events-auto h-8 gap-2 rounded-full px-4 border-border/80 bg-background/50 backdrop-blur hover:bg-accent hover:text-accent-foreground text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] w-fit"
                    onClick={() => navigate(parentHref)}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to {parentLabel}
                </Button>
            )}
        </div>
    );
}
