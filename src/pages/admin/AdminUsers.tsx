import { useState, useEffect, ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeams } from "@/hooks/useTeams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, UserPlus, Users, Shield, Search, Loader2, Trash2, AlertCircle, Upload, Download, FileSpreadsheet } from "lucide-react";

// Type for team members (TL/DSR) - simple tracking entries, no login required
type MemberRole = "team_leader" | "dsr";

interface TeamMember {
  id: string;
  name: string;
  phone: string | null;
  role: MemberRole;
  team_id: string | null;
  team_name?: string;
  region_name?: string;
  created_at: string;
}

const AdminUsers = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: teams } = useTeams();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkRows, setBulkRows] = useState<{ name: string; phone: string; role: MemberRole; team: string }[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  
  // New member form state (simplified - no auth needed)
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>("dsr");
  const [newMemberTeam, setNewMemberTeam] = useState<string>("");

  const NO_TEAM_VALUE = "none";

  // Load team members from localStorage
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    setIsLoadingMembers(true);
    try {
      const stored = localStorage.getItem("tsm_team_members");
      if (stored) {
        setMembers(JSON.parse(stored) as TeamMember[]);
      }
    } catch (e) {
      console.error("Error loading members:", e);
    }
    setIsLoadingMembers(false);
  };

  // Enrich members with team/region names when teams data arrives
  const enrichedMembers = members.map(m => {
    const team = teams?.find(t => t.id === m.team_id);
    return {
      ...m,
      team_name: team?.name,
      region_name: team?.regions?.name,
    };
  });

  const saveMembers = (newMembers: TeamMember[]) => {
    localStorage.setItem("tsm_team_members", JSON.stringify(newMembers));
    setMembers(newMembers);
  };

  // Handle URL params for auto-opening dialog with role pre-selected
  useEffect(() => {
    const createParam = searchParams.get("create");
    if (createParam === "tl") {
      setNewMemberRole("team_leader");
      setDialogOpen(true);
      setSearchParams({});
    } else if (createParam === "dsr") {
      setNewMemberRole("dsr");
      setDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const roleLabels: Record<MemberRole, string> = { 
    team_leader: "Team Leader (TL)", 
    dsr: "DSR" 
  };

  const roleBadgeColors: Record<MemberRole, string> = {
    team_leader: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    dsr: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  // Filter members
  const filteredMembers = enrichedMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalMembers = members.length;
  const tlCount = members.filter(m => m.role === "team_leader").length;
  const dsrCount = members.filter(m => m.role === "dsr").length;
  const unassignedCount = members.filter(m => !m.team_id).length;

  const handleCreateMember = async () => {
    if (!newMemberName.trim()) {
      toast({ title: "Error", description: "Please enter a name", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const newMember: TeamMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newMemberName.trim(),
        phone: newMemberPhone.trim() || null,
        role: newMemberRole,
        team_id: newMemberTeam && newMemberTeam !== NO_TEAM_VALUE ? newMemberTeam : null,
        created_at: new Date().toISOString(),
      };

      const updatedMembers = [...members, newMember];
      saveMembers(updatedMembers);

      toast({ 
        title: "Member Added! ✅", 
        description: `${newMemberName} (${roleLabels[newMemberRole]}) has been added for tracking.` 
      });

      // Reset form
      setNewMemberName("");
      setNewMemberPhone("");
      setNewMemberRole("dsr");
      setNewMemberTeam("");
      setDialogOpen(false);

    } catch (error: any) {
      console.error("Error creating member:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Something went wrong", 
        variant: "destructive" 
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateMemberTeam = (memberId: string, teamId: string | null) => {
    const updatedMembers = members.map(m => 
      m.id === memberId ? { ...m, team_id: teamId } : m
    );
    saveMembers(updatedMembers);
    toast({ title: "Team Updated" });
  };

  const handleUpdateMemberRole = (memberId: string, role: MemberRole) => {
    const updatedMembers = members.map(m => 
      m.id === memberId ? { ...m, role } : m
    );
    saveMembers(updatedMembers);
    toast({ title: "Role Updated" });
  };

  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    const updatedMembers = members.filter(m => m.id !== memberId);
    saveMembers(updatedMembers);
    toast({ title: "Member Removed", description: `${member?.name} has been removed.` });
  };

  // Download sample CSV template
  const downloadTemplate = () => {
    const headers = "name,phone,role,team";
    const sampleRows = [
      "John Doe,+255712345678,dsr,Team Alpha",
      "Jane Smith,+255787654321,team_leader,Team Beta",
      "Mike Wilson,,dsr,",
    ];
    const csvContent = [headers, ...sampleRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dsr_upload_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Template Downloaded", description: "Fill in the CSV and upload it." });
  };

  // Parse CSV line handling quotes
  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Normalize role value
  const normalizeRole = (value: string): MemberRole | null => {
    const v = value.trim().toLowerCase();
    if (["dsr", "d", "sales", "sales rep", "sales representative"].includes(v)) return "dsr";
    if (["team_leader", "team leader", "tl", "leader", "t"].includes(v)) return "team_leader";
    return null;
  };

  // Handle bulk file upload
  const handleBulkFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkRows([]);
    setBulkErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length < 2) {
          setBulkErrors(["File must include a header row and at least one data row."]);
          return;
        }

        const rawHeaders = parseCsvLine(lines[0]).map(h => h.toLowerCase());
        const headerAliases: Record<string, string[]> = {
          name: ["name", "full_name", "full name", "member name"],
          phone: ["phone", "phone_number", "phone number", "mobile", "contact"],
          role: ["role", "type", "member_role", "member role"],
          team: ["team", "team_name", "team name", "assigned_team"],
        };

        const getValue = (row: string[], key: keyof typeof headerAliases) => {
          for (const alias of headerAliases[key]) {
            const index = rawHeaders.indexOf(alias);
            if (index !== -1) return row[index] ?? "";
          }
          return "";
        };

        const parsed: { name: string; phone: string; role: MemberRole; team: string }[] = [];
        const errors: string[] = [];

        lines.slice(1).forEach((line, idx) => {
          const row = parseCsvLine(line);
          if (row.every(cell => cell.length === 0)) return;

          const name = getValue(row, "name").trim();
          const phone = getValue(row, "phone").trim();
          const roleRaw = getValue(row, "role");
          const team = getValue(row, "team").trim();
          const role = normalizeRole(roleRaw);

          const rowNum = idx + 2;

          if (!name) {
            errors.push(`Row ${rowNum}: Name is required.`);
            return;
          }

          if (!role) {
            errors.push(`Row ${rowNum}: Invalid role "${roleRaw}". Use "dsr" or "team_leader".`);
            return;
          }

          parsed.push({ name, phone, role, team });
        });

        setBulkRows(parsed);
        setBulkErrors(errors);
      } catch (err) {
        console.error(err);
        setBulkErrors(["Failed to parse file. Ensure the file is CSV encoded in UTF-8."]);
      }
    };

    reader.readAsText(file);
  };

  // Process bulk upload
  const handleBulkUpload = () => {
    if (bulkRows.length === 0) {
      toast({ title: "No valid rows to import", variant: "destructive" });
      return;
    }

    setBulkUploading(true);

    try {
      // Build team lookup
      const teamLookup = new Map<string, string>();
      teams?.forEach(t => {
        teamLookup.set(t.name.toLowerCase(), t.id);
      });

      const newMembers: TeamMember[] = bulkRows.map((row) => {
        const teamId = row.team ? teamLookup.get(row.team.toLowerCase()) || null : null;
        
        return {
          id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: row.name,
          phone: row.phone || null,
          role: row.role,
          team_id: teamId,
          created_at: new Date().toISOString(),
        };
      });

      const updatedMembers = [...members, ...newMembers];
      saveMembers(updatedMembers);

      toast({ 
        title: "Bulk Upload Successful! ✅", 
        description: `${newMembers.length} members added.` 
      });

      setBulkRows([]);
      setBulkErrors([]);
      setBulkDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Members</h1>
          <p className="text-muted-foreground text-sm">Manage Team Leaders (TL) and DSRs for stock tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Upload Button */}
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload size={18} /> Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet size={20} /> Bulk Upload DSRs/TLs
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Download Template Button */}
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Download Sample Template</p>
                    <p className="text-xs text-muted-foreground">CSV file with required columns</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                    <Download size={16} /> Template
                  </Button>
                </div>

                {/* File Upload */}
                <div className="grid gap-2">
                  <Label>Upload CSV File</Label>
                  <Input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleBulkFile}
                    disabled={bulkUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required columns: name, phone, role (dsr/team_leader), team
                  </p>
                </div>

                {/* Errors */}
                {bulkErrors.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="font-medium text-sm text-destructive mb-2">Errors Found:</p>
                    <ul className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                      {bulkErrors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preview */}
                {bulkRows.length > 0 && (
                  <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                    <p className="font-medium text-sm text-success mb-2">
                      Ready to Import: {bulkRows.length} members
                    </p>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-1 px-2">Name</th>
                            <th className="text-left py-1 px-2">Role</th>
                            <th className="text-left py-1 px-2">Team</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkRows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="py-1 px-2">{row.name}</td>
                              <td className="py-1 px-2">
                                <Badge variant={row.role === "team_leader" ? "info" : "success"} className="text-xs">
                                  {row.role === "team_leader" ? "TL" : "DSR"}
                                </Badge>
                              </td>
                              <td className="py-1 px-2 text-muted-foreground">{row.team || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bulkRows.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          +{bulkRows.length - 10} more rows
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleBulkUpload} 
                  disabled={bulkUploading || bulkRows.length === 0} 
                  className="gap-2"
                >
                  {bulkUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {bulkUploading ? "Uploading..." : `Import ${bulkRows.length} Members`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Member Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <UserPlus size={18} /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus size={20} /> Add Team Member
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  value={newMemberName} 
                  onChange={(e) => setNewMemberName(e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input 
                  id="phone" 
                  placeholder="+255 xxx xxx xxx" 
                  value={newMemberPhone} 
                  onChange={(e) => setNewMemberPhone(e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Role *</Label>
                <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as MemberRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_leader">Team Leader (TL)</SelectItem>
                    <SelectItem value="dsr">DSR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assign to Team</Label>
                <Select value={newMemberTeam || NO_TEAM_VALUE} onValueChange={setNewMemberTeam}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEAM_VALUE}>No Team</SelectItem>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                TLs and DSRs are view-only roles for tracking stock flow. They don't require login credentials.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateMember} disabled={creating} className="gap-2">
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Shield size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tlCount}</p>
              <p className="text-xs text-muted-foreground">Team Leaders</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <UserPlus size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dsrCount}</p>
              <p className="text-xs text-muted-foreground">DSRs</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <AlertCircle size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unassignedCount}</p>
              <p className="text-xs text-muted-foreground">Unassigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-10 glass border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48 glass border-border/50">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="team_leader">Team Leaders</SelectItem>
            <SelectItem value="dsr">DSRs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="p-4 text-left font-medium">Name</th>
                <th className="p-4 text-left font-medium">Role</th>
                <th className="p-4 text-left font-medium">Team</th>
                <th className="p-4 text-left font-medium hidden md:table-cell">Region</th>
                <th className="p-4 text-center font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-t border-border/30 hover:bg-secondary/20 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <Select 
                      value={member.role} 
                      onValueChange={(v) => handleUpdateMemberRole(member.id, v as MemberRole)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs border-0 bg-transparent p-0">
                        <Badge 
                          variant="outline" 
                          className={`${roleBadgeColors[member.role]} font-medium`}
                        >
                          {roleLabels[member.role]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team_leader">Team Leader (TL)</SelectItem>
                        <SelectItem value="dsr">DSR</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Select 
                      value={member.team_id ?? NO_TEAM_VALUE} 
                      onValueChange={(v) => handleUpdateMemberTeam(member.id, v === NO_TEAM_VALUE ? null : v)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEAM_VALUE}>No Team</SelectItem>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-muted-foreground">
                      {member.region_name || "—"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && !isLoadingMembers && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {members.length === 0 
                      ? "No team members yet. Click 'Add Member' to create your first TL or DSR."
                      : "No members found matching your criteria"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isLoadingMembers && (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-primary" size={24} />
            <p className="mt-2 text-muted-foreground">{t("common.loading")}</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="glass rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Stock Tracking Hierarchy</p>
            <p className="text-muted-foreground">
              <strong>Admin</strong> assigns stock → <strong>Team</strong> → <strong>Team Leader (TL)</strong> → <strong>DSR</strong> makes the sale.
              TLs and DSRs are tracked here for reporting and accountability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
