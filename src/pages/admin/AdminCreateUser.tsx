import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminCreateUser() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("dsr");
  const [password, setPassword] = useState("");
  const [tlId, setTlId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [tls, setTls] = useState<{ id: string; full_name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);

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
    }
  }

  return (
    <Card className="max-w-lg mx-auto mt-10 p-8 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Create New User</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block mb-1 font-medium">Full Name</label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Mobile</label>
          <Input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dsr">DSR</SelectItem>
              <SelectItem value="team_leader">Team Leader</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {role === "dsr" && (
          <div>
            <label className="block mb-1 font-medium">Team Leader</label>
            <Select value={tlId} onValueChange={setTlId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select TL" />
              </SelectTrigger>
              <SelectContent>
                {tls.map(tl => (
                  <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {role === "team_leader" && (
          <div>
            <label className="block mb-1 font-medium">Region</label>
            <Select value={regionId} onValueChange={setRegionId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(region => (
                  <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </Button>
      </form>
    </Card>
  );
}
