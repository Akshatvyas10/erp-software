import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ClassroomOption {
  id: string;
  name: string;
  section?: string;
  grade?: number | string;
}

interface ClassroomSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  classrooms: ClassroomOption[];
  isLoading?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  className?: string;
}

export const ClassroomSelect: React.FC<ClassroomSelectProps> = ({
  value,
  onValueChange,
  classrooms = [],
  isLoading = false,
  includeAllOption = true,
  allOptionLabel = 'All Classrooms',
  placeholder = 'Select Classroom',
  className = 'w-44 h-9 text-xs bg-background',
}) => {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && (
          <SelectItem value="ALL">{allOptionLabel}</SelectItem>
        )}
        {classrooms.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} {c.section ? `(${c.section})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ClassroomSelect;

