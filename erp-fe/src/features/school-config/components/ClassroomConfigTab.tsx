import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DoorOpen, Layers } from "lucide-react";
import { AcademicClassStructureSection } from "./AcademicClassStructureSection";
import { DepartmentsConfigSection } from "./DepartmentsConfigSection";
import { BlocksAndRoomsSection } from "./BlocksAndRoomsSection";

export function ClassroomConfigTab() {
    const [subTab, setSubTab] = useState("classes");

    return (
        <div className="space-y-6">
            <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[620px] bg-muted/60 p-1 rounded-2xl">
                    <TabsTrigger value="classes" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-bold">
                        <Layers className="w-3.5 h-3.5 text-primary" /> Class Structure
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-bold">
                        <Building2 className="w-3.5 h-3.5" /> Departments & Rules
                    </TabsTrigger>
                    <TabsTrigger value="infrastructure" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-bold">
                        <DoorOpen className="w-3.5 h-3.5" /> Blocks & Rooms
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="classes" className="m-0">
                        <AcademicClassStructureSection />
                    </TabsContent>

                    <TabsContent value="departments" className="m-0">
                        <DepartmentsConfigSection />
                    </TabsContent>

                    <TabsContent value="infrastructure" className="m-0">
                        <BlocksAndRoomsSection />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
