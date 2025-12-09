import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { User } from "@/integrations/supabase/types";

export default function AdminMembers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await supabase.from("users").select("id, full_name, email, mobile, role, created_at").order("created_at", { ascending: false });
      if (!error && data) setUsers(data as User[]);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.mobile || "").toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto mt-10 space-y-10 px-2 sm:px-4">
      <Card className="p-2 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Members</h2>
          <Input
            placeholder="Search members..."
            className="w-full sm:w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No members found.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">Name</TableHead>
                  <TableHead className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">Email</TableHead>
                  <TableHead className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">Mobile</TableHead>
                  <TableHead className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">Role</TableHead>
                  <TableHead className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">{user.full_name}</TableCell>
                    <TableCell className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">{user.email}</TableCell>
                    <TableCell className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">{user.mobile || "-"}</TableCell>
                    <TableCell className="capitalize px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">{user.role.replace("_", " ")}</TableCell>
                    <TableCell className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
