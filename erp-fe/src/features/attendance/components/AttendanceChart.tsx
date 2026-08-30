import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';

interface AttendanceChartProps {
    attendance: any[];
}

export function AttendanceChart({ attendance }: AttendanceChartProps) {
    const data = useMemo(() => {
        let present = 0;
        let absent = 0;
        let late = 0;

        attendance.forEach(record => {
            if (record.status === 'PRESENT') present++;
            else if (record.status === 'LATE') late++;
            else absent++; // Treats LEAVE, HALF_DAY, ABSENT all as absent in the simplified view
        });

        return [
            { name: 'Present', value: present, color: '#10b981', icon: UserCheck },
            { name: 'Absent', value: absent, color: '#ef4444', icon: UserX },
            { name: 'Late', value: late, color: '#f59e0b', icon: AlertTriangle }
        ];
    }, [attendance]);

    const total = attendance.length;

    if (total === 0) {
        return (
            <Card className="p-4 sm:p-12 flex flex-col items-center justify-center border-border/50 bg-card shadow-sm rounded-3xl h-[400px]">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground font-medium">No attendance records found for this date.</p>
            </Card>
        );
    }

    return (
        <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card p-6 flex flex-col items-center justify-center h-[500px]">
            <h3 className="text-lg font-bold text-foreground mb-4">Attendance Summary</h3>
            <div className="flex-1 w-full flex items-center justify-center min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span className="font-semibold text-foreground ml-2">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mt-6 max-w-md mx-auto">
                {data.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.name} className="flex flex-col items-center p-3 rounded-2xl bg-muted/30">
                            <Icon className="h-5 w-5 mb-1" style={{ color: item.color }} />
                            <span className="text-2xl font-black" style={{ color: item.color }}>{item.value}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{item.name}</span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
