import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlacementAPI } from "@/api";
import { toast } from "sonner";
import { Building2, CheckCircle2, XCircle, Clock, Info, MessageSquare } from "lucide-react";

const InboundRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = () => {
    PlacementAPI.inboundRequests().then(setRequests);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedReq) return;
    try {
      await PlacementAPI.handleInboundRequest(selectedReq.id, { status, feedback });
      toast.success(`Request ${status.toLowerCase()} successfully`);
      setShowModal(false);
      setFeedback("");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to update request");
    }
  };

  return (
    <DashboardLayout
      role="placement"
      title="Inbound Requests"
      subtitle="Review and approve hiring requests from partner companies."
    >
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="glass-card p-20 rounded-2xl flex flex-col items-center justify-center text-muted-foreground gap-4 border border-border/50">
            <Building2 className="h-12 w-12 opacity-10" />
            <p>No pending recruitment requests from companies.</p>
          </div>
        ) : (
          requests.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-lg">{r.company.name}</h3>
                    <Badge className={
                      r.status === "APPROVED" ? "bg-success/10 text-success border-success/20" :
                      r.status === "REJECTED" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-warning/10 text-warning border-warning/20"
                    }>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground/80">{r.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Info className="h-3 w-3" /> {r.ctc} LPA</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Min {r.minCgpa} CGPA</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {r.status === "PENDING" ? (
                  <Button 
                    onClick={() => { setSelectedReq(r); setShowModal(true); }}
                    className="bg-primary text-primary-foreground font-bold shadow-glow"
                  >
                    Review Request
                  </Button>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1 italic">Decision on {new Date(r.poDecisionAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-2 text-sm font-bold">
                       {r.status === "APPROVED" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                       {r.status}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-popover border-border shadow-elevated">
          <DialogHeader>
            <DialogTitle>Recruitment Request Review</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                 <h4 className="font-bold text-primary mb-2">{selectedReq.company.name}</h4>
                 <p className="text-sm text-foreground mb-4">{selectedReq.description || "No description provided."}</p>
                 <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Salary Range</span>
                      <span className="font-bold">{selectedReq.ctc || "As per policy"} LPA</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Eligibility</span>
                      <span className="font-bold">Min {selectedReq.minCgpa || "7.0"} CGPA</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Feedback / Requirements for Company</Label>
                <textarea 
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Please share the detailed brochure or eligibility list."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => handleDecision("REJECTED")}>
              Reject
            </Button>
            <Button className="bg-success text-success-foreground hover:bg-success/90 font-bold" onClick={() => handleDecision("APPROVED")}>
              Approve & Create Drive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InboundRequests;
