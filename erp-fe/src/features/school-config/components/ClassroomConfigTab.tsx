import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DoorOpen, School } from "lucide-react";
import { DepartmentsConfigSection } from "./DepartmentsConfigSection";
import { BlocksAndRoomsSection } from "./BlocksAndRoomsSection";
import { CreateClassroomWizardSection } from "./CreateClassroomWizardSection";

export function ClassroomConfigTab() {
    const [subTab, setSubTab] = useState("classrooms");

    return (
        <div className="space-y-6">
            <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[580px] bg-muted/60 p-1 rounded-2xl">
                    <TabsTrigger value="classrooms" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-bold">
                        <School className="w-3.5 h-3.5" /> Classrooms
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-bold">
                        <Building2 className="w-3.5 h-3.5" /> Departments & Rules
                    </TabsTrigger>
                    <TabsTrigger value="infrastructure" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-bold">
                        <DoorOpen className="w-3.5 h-3.5" /> Blocks & Rooms
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="classrooms" className="m-0">
                        <CreateClassroomWizardSection />
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
