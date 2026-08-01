import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
    message?: string;
}

export default function AccessDenied({
    message = "You don't have permission to access this page.",
}: AccessDeniedProps) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <ShieldX className="h-10 w-10 text-destructive/60" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">{message}</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-2">
                Go to Dashboard
            </Button>
        </div>
    );
}
