import re

file_path = r"d:\AKSHAT\START\erp-software\erp-fe\src\components\common\SharedAdmissionForm.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Props
content = content.replace(
"""interface AdmissionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editTarget: Student | null;
    onSuccess: () => void;
}""",
"""export interface SharedAdmissionFormProps {
    isPublic?: boolean;
    isEdit?: boolean;
    editTarget?: any;
    classrooms?: Classroom[];
    onSubmitData: (fd: FormData, rawValues: any) => Promise<void>;
    onCancel?: () => void;
    customFields?: any[]; // Array of custom field configs
}"""
)

# 2. Update Component Signature
content = content.replace(
"""export default function AdmissionFormDialog({
    open, onOpenChange, editTarget, onSuccess,
}: AdmissionFormDialogProps) {""",
"""export default function SharedAdmissionForm({
    isPublic = false,
    isEdit = false,
    editTarget,
    classrooms = [],
    onSubmitData,
    onCancel,
    customFields = []
}: SharedAdmissionFormProps) {"""
)

# 3. Remove Dialog logic
content = content.replace(
"""    const isEdit = !!editTarget;""",
""""""
)

# Replace the fetching of classrooms since parent passes it
fetch_classrooms_code = """    // Fetch active classrooms for the selector
    const { data: classrooms = [] } = useQuery<Classroom[]>({
        queryKey: ["classrooms-active"],
        queryFn: async () => {
            const { data } = await api.get("/classrooms?status=ACTIVE&limit=100");
            return data.data.classrooms as Classroom[];
        },
        enabled: open,
        staleTime: 120_000,
    });"""

content = content.replace(fetch_classrooms_code, "")

# Reset logic
content = content.replace(
"""    useEffect(() => {
        if (open) {
            form.reset(buildDefaults(editTarget));
            setActiveTab("account");
            setShowPassword(false);
            setPhotoFile(null);
            setTcFile(null);
            setBirthCertFile(null);
            setIdProofFile(null);
            setPhotoError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editTarget?.id]);""",
"""    useEffect(() => {
        form.reset(buildDefaults(editTarget));
        setActiveTab("account");
        setShowPassword(false);
        setPhotoFile(null);
        setTcFile(null);
        setBirthCertFile(null);
        setIdProofFile(null);
        setPhotoError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editTarget?.id]);"""
)

# Submit logic
old_submit_end = """            const config = { headers: { "Content-Type": "multipart/form-data" } };

            if (isEdit) {
                await api.put(`/students/${editTarget!.id}`, fd, config);
                toast.success("Student profile updated");
            } else {
                await api.post("/students", fd, config);
                toast.success("Student enrolled — admission number auto-generated");
            }

            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Operation failed"
            );
        }
    };"""

new_submit_end = """            await onSubmitData(fd, values);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Operation failed"
            );
        }
    };"""
content = content.replace(old_submit_end, new_submit_end)

# Dialog replacement
# Find the start of the return statement
return_start = content.find("return (\n        <Dialog")
return_end = content.find("</Dialog>\n    );\n}") + len("</Dialog>\n    );\n}")

old_return_block = content[return_start:return_end]

new_return_block = old_return_block.replace(
"""<Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-zinc-950"
                style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
            >
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        {isEdit ? "Edit Student Profile" : "Enroll New Student"}
                    </DialogTitle>
                    {isEdit && editTarget?.admissionNumber && (
                        <p className="text-xs text-purple-700 dark:text-purple-400 font-mono mt-0.5">
                            {editTarget.admissionNumber}
                        </p>
                    )}
                </DialogHeader>""",
"""<div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden">"""
)

new_return_block = new_return_block.replace(
"""                                    <Button type="button" variant="outline"
                                        className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl"
                                        onClick={() => onOpenChange(false)}>Cancel</Button>""",
"""                                    {onCancel && (
                                        <Button type="button" variant="outline"
                                            className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl"
                                            onClick={onCancel}>Cancel</Button>
                                    )}"""
)

new_return_block = new_return_block.replace(
"""            </DialogContent>
        </Dialog>""",
"""</div>"""
)

content = content.replace(old_return_block, new_return_block)

# Add import for dynamic fields if needed later, and remove Dialog imports
content = content.replace(
"""import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";""",
""""""
)

# Custom fields rendering: add a new tab if customFields length > 0
# 1. Update TAB_ORDER
content = content.replace(
"""const TAB_ORDER = ["account", "academic", "guardian", "logistics"] as const;""",
"""const TAB_ORDER = ["account", "academic", "guardian", "logistics", "additional"] as const;"""
)
content = content.replace(
"""    account: "Account", academic: "Academic", guardian: "Guardian", logistics: "Logistics",""",
"""    account: "Account", academic: "Academic", guardian: "Guardian", logistics: "Logistics", additional: "Additional","""
)

# Hide non-public fields when isPublic
content = content.replace(
"""<FField control={form.control} name="status" label="Student Status">""",
"""{!isPublic && (<FField control={form.control} name="status" label="Student Status">"""
)
content = content.replace(
"""</SelectContent>
                                        </Select>
                                    </FField>""",
"""</SelectContent>
                                        </Select>
                                    </FField>)}"""
)
content = content.replace(
"""<FField control={form.control} name="feeQuota" label="Fee Quota">""",
"""{!isPublic && (<FField control={form.control} name="feeQuota" label="Fee Quota">"""
)
content = content.replace(
"""<SelectItem value="SCHOLARSHIP_FULL">Scholarship (Full)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FField>""",
"""<SelectItem value="SCHOLARSHIP_FULL">Scholarship (Full)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FField>)}"""
)
content = content.replace(
"""{!isEdit && (
                                        <FField control={form.control} name="password" label="Login Password *">""",
"""{!isEdit && !isPublic && (
                                        <FField control={form.control} name="password" label="Login Password *">"""
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
