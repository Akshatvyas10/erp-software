const fs = require('fs');

const filePath = 'd:\\AKSHAT\\START\\erp-software\\erp-fe\\src\\components\\common\\SharedAdmissionForm.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update Props
content = content.replace(
`interface AdmissionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editTarget: Student | null;
    onSuccess: () => void;
}`,
`export interface SharedAdmissionFormProps {
    isPublic?: boolean;
    isEdit?: boolean;
    editTarget?: any;
    classrooms?: Classroom[];
    onSubmitData: (fd: FormData, rawValues: any) => Promise<void>;
    onCancel?: () => void;
    customFields?: any[]; // Array of custom field configs
}`
);

// 2. Update Component Signature
content = content.replace(
`export default function AdmissionFormDialog({
    open, onOpenChange, editTarget, onSuccess,
}: AdmissionFormDialogProps) {`,
`export default function SharedAdmissionForm({
    isPublic = false,
    isEdit = false,
    editTarget,
    classrooms = [],
    onSubmitData,
    onCancel,
    customFields = []
}: SharedAdmissionFormProps) {`
);

// 3. Remove Dialog logic
content = content.replace(`    const isEdit = !!editTarget;`, ``);

const fetchClassroomsCode = `    // Fetch active classrooms for the selector
    const { data: classrooms = [] } = useQuery<Classroom[]>({
        queryKey: ["classrooms-active"],
        queryFn: async () => {
            const { data } = await api.get("/classrooms?status=ACTIVE&limit=100");
            return data.data.classrooms as Classroom[];
        },
        enabled: open,
        staleTime: 120_000,
    });`;

content = content.replace(fetchClassroomsCode, "");

const oldUseEffect = `    useEffect(() => {
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
    }, [open, editTarget?.id]);`;

const newUseEffect = `    useEffect(() => {
        form.reset(buildDefaults(editTarget));
        setActiveTab("account");
        setShowPassword(false);
        setPhotoFile(null);
        setTcFile(null);
        setBirthCertFile(null);
        setIdProofFile(null);
        setPhotoError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editTarget?.id]);`;

content = content.replace(oldUseEffect, newUseEffect);

const oldSubmitEnd = `            const config = { headers: { "Content-Type": "multipart/form-data" } };

            if (isEdit) {
                await api.put(\`/students/\${editTarget!.id}\`, fd, config);
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
    };`;

const newSubmitEnd = `            await onSubmitData(fd, values);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Operation failed"
            );
        }
    };`;

content = content.replace(oldSubmitEnd, newSubmitEnd);

const returnStart = content.indexOf("return (\n        <Dialog");
const returnEnd = content.indexOf("</Dialog>\n    );\n}") + "</Dialog>\n    );\n}".length;
const oldReturnBlock = content.substring(returnStart, returnEnd);

let newReturnBlock = oldReturnBlock.replace(
`<Dialog open={open} onOpenChange={onOpenChange}>
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
                </DialogHeader>`,
`<div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden w-full max-w-4xl mx-auto shadow-sm border border-border/40">
                {!isPublic && (
                <div className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border shrink-0">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                        {isEdit ? "Edit Student Profile" : "Enroll New Student"}
                    </h2>
                    {isEdit && editTarget?.admissionNumber && (
                        <p className="text-xs text-purple-700 dark:text-purple-400 font-mono mt-0.5">
                            {editTarget.admissionNumber}
                        </p>
                    )}
                </div>
                )}`
);

newReturnBlock = newReturnBlock.replace(
`                                    <Button type="button" variant="outline"
                                        className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl"
                                        onClick={() => onOpenChange(false)}>Cancel</Button>`,
`                                    {onCancel && (
                                        <Button type="button" variant="outline"
                                            className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl"
                                            onClick={onCancel}>Cancel</Button>
                                    )}`
);

newReturnBlock = newReturnBlock.replace(
`            </DialogContent>
        </Dialog>`,
`</div>`
);

content = content.replace(oldReturnBlock, newReturnBlock);

content = content.replace(
`import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";\n`,
``
);

// Tab changes
content = content.replace(
`const TAB_ORDER = ["account", "academic", "guardian", "logistics"] as const;`,
`const TAB_ORDER = ["account", "academic", "guardian", "logistics", "additional"] as const;`
);

content = content.replace(
`    account: "Account", academic: "Academic", guardian: "Guardian", logistics: "Logistics",`,
`    account: "Account", academic: "Academic", guardian: "Guardian", logistics: "Logistics", additional: "Additional",`
);

// Check if tab filtering is needed based on isPublic or customFields
// But here we'll just inject custom fields tab content dynamically at the end of tabs content
const customFieldsTabContent = `
                                {/* ── TAB 5: Additional ── */}
                                <TabsContent value="additional" className="mt-0 space-y-4">
                                    <p className={sectionHd}>Additional Information</p>
                                    {customFields && customFields.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {customFields.map((field, idx) => (
                                                <div key={idx} className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{field.label} {field.required && '*'}</label>
                                                    {field.type === 'text' || field.type === 'email' || field.type === 'number' || field.type === 'tel' ? (
                                                        <Input type={field.type} name={\`customField_\${field.name}\`} required={field.required} className={inputCls} />
                                                    ) : field.type === 'select' ? (
                                                        <Select name={\`customField_\${field.name}\`} required={field.required}>
                                                            <SelectTrigger className={inputCls}><SelectValue placeholder="Select..." /></SelectTrigger>
                                                            <SelectContent>
                                                                {field.options?.map((opt: string) => (
                                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : field.type === 'textarea' ? (
                                                        <Textarea name={\`customField_\${field.name}\`} required={field.required} className={inputCls} />
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No additional custom fields required.</p>
                                    )}
                                </TabsContent>
`;

content = content.replace(
`                            </div>

                            {/* Footer */}`,
customFieldsTabContent + `                            </div>

                            {/* Footer */}`
);

// We should properly handle formData for custom fields using form element since they are not in react-hook-form
// Actually it's easier to collect them in onSubmit if they are just basic inputs.
// In onSubmit:
const fdExtractCustomFields = `
            // Extract custom fields from the raw HTML form if present
            const formElement = document.getElementById("admission-form") as HTMLFormElement;
            const customFieldResponses: Record<string, any> = {};
            if (formElement) {
                const formData = new FormData(formElement);
                formData.forEach((value, key) => {
                    if (key.startsWith("customField_")) {
                        customFieldResponses[key.replace("customField_", "")] = value;
                    }
                });
            }
            if (Object.keys(customFieldResponses).length > 0) {
                fd.append("customFieldResponses", JSON.stringify(customFieldResponses));
            }
            // Append files if present
`;
content = content.replace(`            // Append files if present`, fdExtractCustomFields);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done refactoring via node script!');
