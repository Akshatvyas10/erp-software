import { useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { getSocket } from "@/lib/socket";
import { useAppSelector } from "@/store/hooks";

export const PermissionUpdateDialog = () => {
    const [open, setOpen] = useState(false);
    
    // Select the current version from redux store
    const currentVersion = useAppSelector((state) => state.permissions.version);

    useEffect(() => {
        const socket = getSocket();
        
        if (!socket) return;

        const handlePermissionsUpdated = (data: { version: number, userId: string, updatedAt: string }) => {
            // Check if the received version is greater than the one we have
            if (data.version && data.version > currentVersion) {
                setOpen(true);
            }
        };

        socket.on('permissions:updated', handlePermissionsUpdated);

        return () => {
            socket.off('permissions:updated', handlePermissionsUpdated);
        };
    }, [currentVersion]);

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Permissions Updated</AlertDialogTitle>
                    <AlertDialogDescription>
                        An administrator has recently updated your account permissions.
                        Please reload the application to apply the changes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleReload}>
                        Reload Now
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
