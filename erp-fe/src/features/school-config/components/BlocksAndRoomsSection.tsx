import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building, DoorOpen, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getBuildingBlocks,
    createBuildingBlock,
    deleteBuildingBlock,
    getClassroomRooms,
    createClassroomRoom,
    deleteClassroomRoom,
} from "../api/classroomConfigApi";

export function BlocksAndRoomsSection() {
    const queryClient = useQueryClient();

    // Block dialog state
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [blockName, setBlockName] = useState("");
    const [blockCode, setBlockCode] = useState("");
    const [blockDesc, setBlockDesc] = useState("");

    // Helper to generate a clean uppercase slug code from block name (e.g. "Science Wing" -> "SCIENCE-WING")
    const generateBlockSlug = (name: string) => {
        return name
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 20);
    };

    const handleBlockNameChange = (val: string) => {
        setBlockName(val);
        setBlockCode(generateBlockSlug(val));
    };

    // Room dialog state
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedBlockId, setSelectedBlockId] = useState("");
    const [roomNumber, setRoomNumber] = useState("");
    const [capacity, setCapacity] = useState(40);
    const [roomType, setRoomType] = useState<'CLASSROOM' | 'LAB' | 'LIBRARY' | 'AUDITORIUM' | 'ACTIVITY_ROOM'>("CLASSROOM");
    const [floor, setFloor] = useState("Ground Floor");

    // Fetch Blocks
    const { data: blocks = [], isLoading: isLoadingBlocks } = useQuery({
        queryKey: ["building-blocks"],
        queryFn: getBuildingBlocks,
    });

    // Fetch Rooms
    const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
        queryKey: ["classroom-rooms"],
        queryFn: () => getClassroomRooms(),
    });

    // Create Block Mutation
    const createBlockMutation = useMutation({
        mutationFn: async () => {
            return await createBuildingBlock({
                name: blockName,
                code: blockCode,
                description: blockDesc,
                status: 'ACTIVE'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
            toast.success("Building Block created");
            setIsBlockModalOpen(false);
            setBlockName("");
            setBlockCode("");
            setBlockDesc("");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create block");
        }
    });

    // Delete Block Mutation
    const deleteBlockMutation = useMutation({
        mutationFn: async (id: string) => {
            return await deleteBuildingBlock(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
            queryClient.invalidateQueries({ queryKey: ["classroom-rooms"] });
            toast.success("Block deleted");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete block");
        }
    });

    // Create Room Mutation
    const createRoomMutation = useMutation({
        mutationFn: async () => {
            return await createClassroomRoom({
                blockId: selectedBlockId,
                roomNumber,
                capacity,
                roomType,
                floor,
                status: 'ACTIVE'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classroom-rooms"] });
            queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
            toast.success("Room created");
            setIsRoomModalOpen(false);
            setRoomNumber("");
            setCapacity(40);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create room");
        }
    });

    // Delete Room Mutation
    const deleteRoomMutation = useMutation({
        mutationFn: async (id: string) => {
            return await deleteClassroomRoom(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classroom-rooms"] });
            queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
            toast.success("Room deleted");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete room");
        }
    });

    const handleOpenRoomModal = (blockId?: string) => {
        if (blockId) setSelectedBlockId(blockId);
        else if (blocks.length > 0) setSelectedBlockId(blocks[0].id);
        setIsRoomModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            Campus Building Blocks & Rooms
                        </CardTitle>
                        <CardDescription>
                            Configure physical infrastructure, classroom rooms, and seat capacities.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsBlockModalOpen(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Block
                        </Button>
                        <Button onClick={() => handleOpenRoomModal()} disabled={blocks.length === 0} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Room
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {isLoadingBlocks || isLoadingRooms ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-44 w-full rounded-2xl" />
                            <Skeleton className="h-44 w-full rounded-2xl" />
                        </div>
                    ) : blocks.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                            <Building className="w-10 h-10 mb-2 opacity-30" />
                            <p className="font-semibold text-base">No building blocks found</p>
                            <p className="text-sm">Create building blocks (e.g. "Main Wing", "Science Block") to start organizing rooms.</p>
                            <Button className="mt-4 gap-2" onClick={() => setIsBlockModalOpen(true)}>
                                <Plus className="w-4 h-4" /> Add First Block
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {blocks.map((block) => {
                                const blockRooms = rooms.filter(r => r.blockId === block.id);
                                return (
                                    <div key={block.id} className="p-5 rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-foreground text-base">{block.name}</h3>
                                                        <Badge variant="outline" className="text-xs uppercase font-bold tracking-wider">
                                                            {block.code}
                                                        </Badge>
                                                    </div>
                                                    {block.description && (
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{block.description}</p>
                                                    )}
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Delete block ${block.name} and all its rooms?`)) {
                                                            deleteBlockMutation.mutate(block.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>

                                            {/* Rooms list */}
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                                                    <span>Rooms ({blockRooms.length})</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenRoomModal(block.id)}
                                                        className="text-primary hover:underline font-bold flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Room
                                                    </button>
                                                </div>

                                                {blockRooms.length === 0 ? (
                                                    <div className="p-3 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                                                        No rooms in this block yet.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {blockRooms.map((room) => (
                                                            <div key={room.id} className="p-2.5 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                                                        <DoorOpen className="w-3.5 h-3.5 text-primary" />
                                                                        <span>Room {room.roomNumber}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                                        <Users className="w-3 h-3" />
                                                                        <span>Cap: {room.capacity}</span>
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => {
                                                                        if (confirm(`Delete room ${room.roomNumber}?`)) {
                                                                            deleteRoomMutation.mutate(room.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Create Building Block */}
            <ResponsiveModal
                open={isBlockModalOpen}
                onOpenChange={setIsBlockModalOpen}
                title="Add Building Block"
                description="Create a physical building block or campus wing."
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Block Name</label>
                        <Input
                            placeholder="e.g. Science Wing, Block A, Senior Block"
                            value={blockName}
                            onChange={(e) => handleBlockNameChange(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Block Code (Unique Identifier)</label>
                            <span className="text-[10px] text-muted-foreground italic">Auto-generated slug</span>
                        </div>
                        <Input
                            placeholder="e.g. BLK-A, SCI-WING"
                            value={blockCode}
                            onChange={(e) => setBlockCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
                        <Input
                            placeholder="e.g. Houses laboratories and High Secondary classrooms"
                            value={blockDesc}
                            onChange={(e) => setBlockDesc(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createBlockMutation.mutate()}
                            disabled={!blockName.trim() || !blockCode.trim() || createBlockMutation.isPending}
                        >
                            {createBlockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Create Block
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>

            {/* Modal: Create Room */}
            <ResponsiveModal
                open={isRoomModalOpen}
                onOpenChange={setIsRoomModalOpen}
                title="Add Room to Block"
                description="Configure room details and seating capacity."
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Building Block</label>
                        <Select value={selectedBlockId} onValueChange={setSelectedBlockId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a block" />
                            </SelectTrigger>
                            <SelectContent>
                                {blocks.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Number</label>
                            <Input
                                placeholder="e.g. 101, Lab-2, B-204"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seating Capacity</label>
                            <Input
                                type="number"
                                min="1"
                                max="200"
                                value={capacity}
                                onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 40)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Type</label>
                            <Select value={roomType} onValueChange={(v: any) => setRoomType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLASSROOM">Standard Classroom</SelectItem>
                                    <SelectItem value="LAB">Science / Computer Lab</SelectItem>
                                    <SelectItem value="LIBRARY">Library</SelectItem>
                                    <SelectItem value="ACTIVITY_ROOM">Activity Room</SelectItem>
                                    <SelectItem value="AUDITORIUM">Auditorium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floor</label>
                            <Select value={floor} onValueChange={setFloor}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Floor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ground Floor">Ground Floor</SelectItem>
                                    <SelectItem value="1st Floor">1st Floor</SelectItem>
                                    <SelectItem value="2nd Floor">2nd Floor</SelectItem>
                                    <SelectItem value="3rd Floor">3rd Floor</SelectItem>
                                    <SelectItem value="4th Floor">4th Floor</SelectItem>
                                    <SelectItem value="5th Floor">5th Floor</SelectItem>
                                    <SelectItem value="6th Floor">6th Floor</SelectItem>
                                    <SelectItem value="7th Floor">7th Floor</SelectItem>
                                    <SelectItem value="8th Floor">8th Floor</SelectItem>
                                    <SelectItem value="Basement">Basement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsRoomModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createRoomMutation.mutate()}
                            disabled={!selectedBlockId || !roomNumber.trim() || createRoomMutation.isPending}
                        >
                            {createRoomMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Create Room
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>
        </div>
    );
}
