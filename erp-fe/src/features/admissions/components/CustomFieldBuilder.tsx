import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CustomFieldDefinition, CustomFieldType } from '../../../types/erp';
import { Plus, Trash2 } from 'lucide-react';

interface CustomFieldBuilderProps {
    fields: CustomFieldDefinition[];
    onChange: (fields: CustomFieldDefinition[]) => void;
}

export function CustomFieldBuilder({ fields, onChange }: CustomFieldBuilderProps) {
    const handleAddField = () => {
        onChange([
            ...fields,
            { name: '', label: '', type: 'text', required: false },
        ]);
    };

    const handleRemoveField = (index: number) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        onChange(newFields);
    };

    const handleChange = (index: number, key: keyof CustomFieldDefinition, value: any) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [key]: value };
        
        // Auto-generate name from label if name is empty
        if (key === 'label' && !newFields[index].name) {
             newFields[index].name = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        
        onChange(newFields);
    };

    const handleOptionsChange = (index: number, optionsString: string) => {
        const options = optionsString.split(',').map(o => o.trim()).filter(Boolean);
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], options };
        onChange(newFields);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Custom Fields (Optional)</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                </Button>
            </div>

            {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No custom fields added.</p>
            ) : (
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border p-4 rounded-md">
                            <div className="md:col-span-3 space-y-2">
                                <Label>Field Label</Label>
                                <Input 
                                    placeholder="e.g. Religion" 
                                    value={field.label} 
                                    onChange={(e) => handleChange(index, 'label', e.target.value)} 
                                />
                            </div>
                            
                            <div className="md:col-span-3 space-y-2">
                                <Label>Field Type</Label>
                                <Select 
                                    value={field.type} 
                                    onValueChange={(value) => handleChange(index, 'type', value as CustomFieldType)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Short Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="dropdown">Dropdown</SelectItem>
                                        <SelectItem value="checkbox">Checkbox</SelectItem>
                                        <SelectItem value="textarea">Long Text</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-3 space-y-2">
                                <Label>Required?</Label>
                                <div className="flex items-center h-10 space-x-2">
                                    <Switch 
                                        checked={field.required}
                                        onCheckedChange={(checked) => handleChange(index, 'required', checked)}
                                    />
                                    <span className="text-sm">{field.required ? 'Yes' : 'No'}</span>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2 flex items-end h-full">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    className="text-destructive w-full"
                                    onClick={() => handleRemoveField(index)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                </Button>
                            </div>

                            {field.type === 'dropdown' && (
                                <div className="md:col-span-12 space-y-2">
                                    <Label>Dropdown Options (comma separated)</Label>
                                    <Input 
                                        placeholder="e.g. Option 1, Option 2, Option 3" 
                                        value={field.options?.join(', ') || ''} 
                                        onChange={(e) => handleOptionsChange(index, e.target.value)} 
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
