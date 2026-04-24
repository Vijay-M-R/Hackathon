import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Plus, CalendarDays, MapPin, Users, Briefcase, Send, 
  Clock, CheckCircle2, XCircle, IndianRupee, Eye, Building2
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CompanyAPI, PlacementAPI, AuthAPI } from "@/api";
import { toast } from "sonner";

interface Props {
  view: "overview" | "requests" | "drives";
}

const STATUS_CLASS = {
  APPLIED: "bg-info/15 text-info border-info/30",
  SHORTLISTED: "bg-primary/15 text-primary border-primary/30",
  INTERVIEWED: "bg-warning/15 text-warning border-warning/30",
  OFFERED: "bg-success/15 text-success border-success/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

const CompanyDashboard = ({ view }: Props) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeDrive, setActiveDrive] = useState<any | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    ctc: "",
    minCgpa: "7.0",
    minReadiness: "70.0",
    requiredSkills: "",
    targetCollege: ""
  });

  const [selectedDrive, setSelectedDrive] = useState<any>(null);

  const fetchRequests = () => CompanyAPI.myRequests().then(setRequests);
  const fetchDrives = () => CompanyAPI.myDrives().then(setDrives);
  const fetchColleges = () => PlacementAPI.colleges().then(setColleges);

  useEffect(() => {
    fetchRequests();
    fetchDrives();
    fetchColleges();
  }, []);

  const fetchApplicants = async (driveId: string) => {
    setLoadingApplicants(true);
    try {
      const res = await CompanyAPI.driveApplicants(driveId);
      setApplicants(res.applicants || []);
      setActiveDrive(res.drive);
    } catch (err) {
      toast.error("Failed to load applicants");
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleUpdateDrive = async (id: string, updates: any) => {
    try {
      await CompanyAPI.updateDrive(id, updates);
      toast.success("Drive updated successfully");
      setSelectedDrive(null);
      fetchDrives();
    } catch (err) {
      toast.error("Failed to update drive");
    }
  };

  const updateApplicantStatus = async (driveId: string, studentId: string, status: string) => {
    try {
      await PlacementAPI.updateApplicantStatus(driveId, studentId, status);
      toast.success(`Updated status to ${status}`);
      setApplicants(prev => prev.map(a => a.id === studentId ? { ...a, placementStatus: status } : a));
      fetchDrives(); // Update main counts
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await CompanyAPI.sendRequest({
        ...formData,
        minCgpa: parseFloat(formData.minCgpa),
        minReadiness: parseFloat(formData.minReadiness),
        requiredSkills: formData.requiredSkills.split(",").map(s => s.trim())
      });
      toast.success("Request sent to " + (formData.targetCollege || "Placement Officer"));
      setShowForm(false);
      fetchRequests();
    } catch (err) {
      toast.error("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  const approvedCount = requests.filter(r => r.status === "APPROVED").length;
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    AuthAPI.me().then(setUser);
    fetchRequests();
    fetchDrives();
    fetchColleges();
  }, []);

  if (user && user.role === "COMPANY" && !user.companyId) {
    return (
      <DashboardLayout role="company" title="Account Setup Required" subtitle="Your account is not linked to a company.">
        <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl border-dashed">
          <Building2 className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
          <h2 className="text-xl font-bold">Incomplete Recruiter Profile</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-center">
            Your account exists but is not yet associated with a specific company in our database. 
            Please contact the Placement Officer to link your account.
          </p>
          <Button className="mt-8" onClick={() => { localStorage.removeItem("accessToken"); window.location.href = "/login"; }}>
            Logout and Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout
      role="company"
      title={view === "overview" ? "Recruiter Overview" : view === "requests" ? "Partnership Requests" : "Active Placement Drives"}
      subtitle={view === "overview" ? "Your hiring pipeline at a glance." : view === "requests" ? "Manage and track your campus drive requests." : "Track applicants and manage hiring outcomes."}
      actions={
        view === "requests" && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow font-bold">
                <Plus className="h-4 w-4 mr-2" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-popover border-border shadow-elevated">
              <DialogHeader>
                <DialogTitle>Drive Requirements</DialogTitle>
                <DialogDescription>Submit your requirements to the placement officer for approval.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Target College</Label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                    required
                    value={formData.targetCollege}
                    onChange={e => setFormData({...formData, targetCollege: e.target.value})}
                  >
                    <option value="" disabled>Select College</option>
                    {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Job Title / Role</Label>
                  <Input 
                    placeholder="e.g. Software Engineer" 
                    required 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="bg-secondary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Salary (LPA)</Label>
                    <Input 
                      placeholder="12.5" 
                      required 
                      value={formData.ctc}
                      onChange={e => setFormData({...formData, ctc: e.target.value})}
                      className="bg-secondary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Min CGPA</Label>
                    <Input 
                      type="number" step="0.1" required 
                      value={formData.minCgpa}
                      onChange={e => setFormData({...formData, minCgpa: e.target.value})}
                      className="bg-secondary/40"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary font-bold shadow-glow" disabled={loading}>
                  {loading ? "Sending..." : "Submit Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={Building2} label="Total Requests" value={requests.length} delay={0} />
        <StatCard icon={CheckCircle2} label="Active Drives" value={drives.length} accent="success" delay={0.1} />
        <StatCard icon={Users} label="Total Applicants" value={drives.reduce((acc, d) => acc + (d.applicantCount || 0), 0)} accent="primary" delay={0.2} />
      </div>

      {view === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-glow">
                <Briefcase className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-display font-bold">Recruiter Portal</h3>
              <p className="text-muted-foreground mt-2 text-sm max-w-xs">
                Welcome to your command center. Manage campus requests and track student progress in real-time.
              </p>
              <div className="flex gap-3 mt-6">
                <Link to="/company/requests"><Button size="sm" variant="outline">View Requests</Button></Link>
                <Link to="/company/drives"><Button size="sm">Manage Drives</Button></Link>
              </div>
           </motion.div>

           <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 rounded-2xl">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                <Clock className="h-4 w-4" /> Recent Activity
              </h3>
              <div className="space-y-3">
                {requests.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <div>
                      <p className="text-sm font-bold">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{r.targetCollege || "General Request"}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] font-bold", 
                      r.status === "APPROVED" ? "text-success border-success/30 bg-success/5" : 
                      r.status === "REJECTED" ? "text-destructive border-destructive/30 bg-destructive/5" : 
                      "text-warning border-warning/30 bg-warning/5"
                    )}>{r.status}</Badge>
                  </div>
                ))}
                {requests.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">No activity yet.</p>}
              </div>
           </motion.div>
        </div>
      )}

      {view === "requests" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary/40 border-b border-border">
                  <th className="px-6 py-4 font-bold">Position / Request</th>
                  <th className="px-6 py-4 font-bold">Target Institution</th>
                  <th className="px-6 py-4 font-bold">Compensation</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Officer Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {requests.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No requests found.</td></tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{r.title}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">{r.targetCollege || "General"}</td>
                      <td className="px-6 py-4 font-display font-bold text-primary">₹ {r.ctc} LPA</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", 
                          r.status === "APPROVED" ? "text-success border-success/30 bg-success/5" : 
                          r.status === "REJECTED" ? "text-destructive border-destructive/30 bg-destructive/5" : 
                          "text-warning border-warning/30 bg-warning/5"
                        )}>{r.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-[11px] italic text-muted-foreground max-w-[200px] truncate">
                        {r.poFeedback || "Waiting for review..."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {view === "drives" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drives.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => fetchApplicants(d.id)}
              className="glass-card rounded-2xl p-6 hover:shadow-elevated transition-all cursor-pointer border border-border/50 hover:border-primary/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-glow">
                    {d.title?.[0] || d.role?.[0] || "D"}
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] h-5 font-bold uppercase", 
                    d.status === "ACTIVE" ? "text-success border-success/30 bg-success/5" : "text-warning border-warning/30 bg-warning/5"
                  )}>
                    {d.status?.toLowerCase()}
                  </Badge>
                </div>
                <h3 className="font-display font-bold text-lg mb-1">{d.title || d.role}</h3>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-4">{d.role} · ₹ {d.salary}</p>
                
                <div className="space-y-2 mb-6">
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> {new Date(d.date).toLocaleDateString()}
                   </div>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {d.location || d.venue || "TBD"}
                   </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-primary font-bold text-sm">{d.applicantCount || 0}</span>
                  <span className="text-muted-foreground text-[9px] uppercase tracking-widest font-bold">Applicants</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-success font-bold text-sm">{d.offersCount || 0}</span>
                  <span className="text-muted-foreground text-[9px] uppercase tracking-widest font-bold">Offers</span>
                </div>
              </div>
            </motion.div>
          ))}
          {drives.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card rounded-2xl border-dashed">
              <Briefcase className="h-12 w-12 text-muted-foreground opacity-10 mx-auto mb-4" />
              <p className="text-muted-foreground">No active drives found. Start by requesting one!</p>
            </div>
          )}
        </div>
      )}

      {/* Applicants Dialog */}
      <Dialog open={!!activeDrive} onOpenChange={(o) => !o && setActiveDrive(null)}>
        <DialogContent className="max-w-4xl bg-popover shadow-elevated border-border">
          {activeDrive && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Users className="h-6 w-6" /></div>
                  <div>
                    <DialogTitle className="text-xl font-display">{activeDrive.role} Applicants</DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-widest font-semibold">{activeDrive.location} · {new Date(activeDrive.date).toLocaleDateString()}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="max-h-[450px] overflow-y-auto rounded-xl border border-border/60 bg-secondary/10">
                {loadingApplicants ? (
                  <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Synchronizing applicant data...</div>
                ) : applicants.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Users className="h-10 w-10 opacity-10" />
                    <p className="text-sm font-medium italic">The applicant pool is currently empty.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary/90 backdrop-blur-md border-b border-border/60 z-10">
                      <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                        <th className="p-4 font-bold">Candidate</th>
                        <th className="p-4 font-bold text-center">Score</th>
                        <th className="p-4 font-bold text-center">CGPA</th>
                        <th className="p-4 font-bold text-right">Hiring Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {applicants.map((a) => (
                        <tr key={a.id} className="group hover:bg-primary/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">{a.name?.[0]}</div>
                              <div>
                                <p className="font-bold text-sm text-foreground">{a.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{a.roll || a.usn}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">{a.readiness}%</Badge>
                          </td>
                          <td className="p-4 text-center font-bold font-display">{a.cgpa}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/company/students/${a.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-md hover:bg-primary/10 hover:text-primary">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Select 
                                value={a.placementStatus} 
                                onValueChange={(v) => updateApplicantStatus(activeDrive.id, a.id, v)}
                              >
                                <SelectTrigger className={cn("h-8 w-32 text-[10px] font-bold uppercase tracking-tighter", STATUS_CLASS[a.placementStatus as keyof typeof STATUS_CLASS])}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(STATUS_CLASS).map((k) => (
                                    <SelectItem key={k} value={k} className="text-xs font-semibold">{k.replace("_", " ")}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CompanyDashboard;
