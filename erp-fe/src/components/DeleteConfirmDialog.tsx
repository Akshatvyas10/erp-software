import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// Separate Confirmation Box component accepting passed operational props
interface ConfirmBoxProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isLoading?: boolean;
}
function DeleteConfirmDialog({ isOpen, onOpenChange, onConfirm, title, description, isLoading }: ConfirmBoxProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white rounded-none border border-slate-200 p-6">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
                </DialogHeader>
                <div className="py-3 text-sm text-slate-600">
                    {description}
                </div>
                <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" className="rounded-none text-xs font-medium border-slate-300" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" className="rounded-none text-xs font-medium bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
export default DeleteConfirmDialog;