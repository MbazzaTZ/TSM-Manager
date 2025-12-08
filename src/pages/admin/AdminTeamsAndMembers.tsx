import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeams, useRegions, useCreateTeam, useDeleteTeam } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Trash2, Loader2, Search } from "lucide-react";


// Unified Team & Member Management Page
const AdminTeamsAndMembers = () => {
  const { t } = useLanguage();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: regions } = useRegions();
  const { data: users } = useUsers();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", region_id: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Member management state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", phone: "", role: "dsr", team_id: "" });

  // Filtered teams
  const filteredTeams = teams?.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.regions?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Members for selected team
  const teamMembers = users?.filter((u) => u.team_id === selectedTeamId) || [];

  const handleCreateTeam = async () => {
    if (!form.name.trim()) return;
    await createTeam.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", region_id: "" });
  };

  // Add member logic (placeholder, should call backend or update state)
  const handleAddMember = () => {
    // TODO: Implement member creation logic
    setMemberDialogOpen(false);
    setNewMember({ name: "", phone: "", role: "dsr", team_id: selectedTeamId || "" });
  };

  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams & Members</h1>
          <p className="text-muted-foreground text-sm">Manage teams and their TL/DSR members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input placeholder="Enter team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region_id} onValueChange={(v) => setForm({ ...form, region_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTeam} className="w-full" disabled={!form.name.trim() || createTeam.isPending}>
                {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTeams?.map((team) => (
          <div key={team.id} className="glass rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-semibold text-lg">{team.name}</h2>
                <p className="text-xs text-muted-foreground">Region: {team.regions?.name || "-"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedTeamId(team.id)}>
                <Users className="w-4 h-4 mr-1" /> View Members
              </Button>
            </div>
            {selectedTeamId === team.id && (
              <div className="space-y-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Members</span>
                  <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Member
                  </Button>
                </div>
                <ul className="divide-y divide-border/50">
                  {teamMembers.length === 0 ? (
                    <li className="text-muted-foreground text-sm py-2">No members assigned.</li>
                  ) : (
                    teamMembers.map((member) => (
                      <li key={member.id} className="flex items-center justify-between py-2">
                        <span>
                          {member.full_name} <Badge className="ml-2">{member.role}</Badge>
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => {/* TODO: Remove member */}}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
                <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newMember.role} onValueChange={v => setNewMember({ ...newMember, role: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team_leader">Team Leader</SelectItem>
                            <SelectItem value="dsr">DSR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddMember} className="w-full">Add Member</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTeamsAndMembers;
