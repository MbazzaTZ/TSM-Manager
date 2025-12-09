import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  role: string;
  created_at: string;
}

export default function AdminUsers() {
  // Create user form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("dsr");
  const [password, setPassword] = useState("");
  const [tlId, setTlId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tls, setTls] = useState<{ id: string; full_name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);

  // Users list state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchTLs() {
      const { data } = await supabase.from("users").select("id, full_name").eq("role", "team_leader");
      setTls(data || []);
    }
    async function fetchRegions() {
      const { data } = await supabase.from("regions").select("id, name");
      setRegions(data || []);
    }
    fetchTLs();
    fetchRegions();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    const { data, error } = await supabase.from("users").select("id, full_name, email, mobile, role, created_at").order("created_at", { ascending: false });
    if (!error && data) setUsers(data as User[]);
    setUsersLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    if (role === "dsr" && !tlId) {
      setError("Please select a Team Leader for this DSR.");
      setLoading(false);
      return;
    }
    if (role === "team_leader" && !regionId) {
      setError("Please select a Region for this Team Leader.");
      setLoading(false);
      return;
    }
    const insertData: any = {
      full_name: fullName,
      email,
      mobile,
      role,
      password, // Store hashed in production!
    };
    if (role === "dsr") insertData.tl_id = tlId;
    if (role === "team_leader") insertData.region_id = regionId;
    const { error } = await supabase.from("users").insert(insertData);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("User created successfully!");
      setFullName("");
      setEmail("");
      setMobile("");
      setRole("dsr");
      setPassword("");
      setTlId("");
      setRegionId("");
      fetchUsers();
    }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.mobile || "").toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto mt-10 space-y-10">


      {/* Users Table */}
      <Card className="p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">All Users</h2>
          <Input
            placeholder="Search users..."
            className="w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {usersLoading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.mobile || "-"}</TableCell>
                  <TableCell className="capitalize">{user.role.replace("_", " ")}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
