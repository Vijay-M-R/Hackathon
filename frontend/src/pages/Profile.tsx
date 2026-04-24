import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAPI } from "@/api";
import { toast } from "sonner";
import { User, Building2, School, GraduationCap, Mail, Save, ShieldCheck } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    AuthAPI.me().then(data => {
      setUser(data);
      setFormData({
        fullName: data.fullName || "",
        department: data.department || "",
        collegeName: data.collegeName || "",
        studentProfile: data.StudentProfile || {},
        companyDetails: data.company || {}
      });
      setLoading(false);
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const role = user.role.toLowerCase();
    const payload: any = {
      fullName: formData.fullName,
      department: formData.department,
      collegeName: formData.collegeName,
    };

    if (role === "student") {
      payload.studentProfile = formData.studentProfile;
    }
    if (role === "company") {
      payload.companyDetails = formData.companyDetails;
    }

    try {
      await AuthAPI.updateProfile(payload);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const role = user.role.toLowerCase();
  const canEdit = role === "placement" || role === "company";

  return (
    <DashboardLayout
      role={role as any}
      title="User Profile"
      subtitle={canEdit ? "Manage your personal information and credentials." : "View your official profile details."}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-2xl border border-border/50 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 bg-primary h-full" />
          
          <div className="flex items-center gap-6 mb-8">
            <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">{user.fullName || user.email.split("@")[0]}</h2>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user.email}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 uppercase tracking-widest text-[10px]">
                  {user.role}
                </Badge>
                {!canEdit && (
                   <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 bg-muted/20">Read Only</Badge>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  disabled={!canEdit}
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>

              {(role === "faculty" || role === "student") && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input 
                    disabled={!canEdit}
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    placeholder="e.g. Computer Science"
                  />
                </div>
              )}

              {(role === "placement" || role === "faculty") && (
                <div className="space-y-2">
                  <Label>College Name</Label>
                  <Input 
                    disabled={!canEdit}
                    value={formData.collegeName}
                    onChange={e => setFormData({...formData, collegeName: e.target.value})}
                    placeholder="e.g. Stanford University"
                  />
                </div>
              )}

              {role === "student" && (
                <>
                  <div className="space-y-2">
                    <Label>USN / Roll Number</Label>
                    <Input value={user.usn} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Current CGPA</Label>
                    <Input 
                      disabled={!canEdit}
                      type="number" step="0.01"
                      value={formData.studentProfile?.cgpa || ""}
                      onChange={e => setFormData({
                        ...formData, 
                        studentProfile: { ...formData.studentProfile, cgpa: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </>
              )}
            </div>

            {role === "company" && (
              <div className="space-y-6 pt-4 border-t border-border/50">
                <h3 className="font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      disabled={!canEdit}
                      value={formData.companyDetails?.name || ""}
                      onChange={e => setFormData({
                        ...formData, 
                        companyDetails: { ...formData.companyDetails, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input 
                      disabled={!canEdit}
                      value={formData.companyDetails?.website || ""}
                      onChange={e => setFormData({
                        ...formData, 
                        companyDetails: { ...formData.companyDetails, website: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <textarea 
                      disabled={!canEdit}
                      className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-80"
                      value={formData.companyDetails?.description || ""}
                      onChange={e => setFormData({
                        ...formData, 
                        companyDetails: { ...formData.companyDetails, description: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {canEdit && (
              <div className="pt-6 border-t border-border/50 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-primary shadow-glow font-bold">
                  {saving ? "Saving Changes..." : <><Save className="h-4 w-4 mr-2" /> Save Profile</>}
                </Button>
              </div>
            )}
          </form>
        </motion.div>

        {role === "student" && (
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between"
           >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold">AI Readiness Verification</h4>
                  <p className="text-xs text-muted-foreground">Your readiness score is calculated based on your performance in mock tests and interviews.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{user.StudentProfile?.readinessScore || 0}%</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Current Score</div>
              </div>
           </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;

import { Badge } from "@/components/ui/badge";
