import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrainingAPI } from "@/api";
import {
  ArrowLeft, BookOpen, CheckCircle2, Eye, EyeOff,
  Sparkles, Trophy, ChevronRight, Brain, Zap, ClipboardList,
  Clock, BarChart2, AlertCircle, CheckCheck
} from "lucide-react";

type Question = {
  id: string;
  text: string;
  answer: string;
  options: string[] | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  subject: string;
  topic: string;
  tags: string[];
};

type Module = {
  id: string;
  subject: string;
  topic: string;
  avgScore: number;
  questionsTotal: number;
  questionsRead: number;
  progress: number;
  completed: boolean;
  questions: Question[];
};

const difficultyColor = {
  EASY: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  MEDIUM: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  HARD: "text-rose-400 border-rose-400/30 bg-rose-400/10",
};

const TrainingModulePage = () => {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const navigate = useNavigate();

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!moduleKey) return;
    loadModule();
  }, [moduleKey]);

  const loadModule = async () => {
    setLoading(true);
    try {
      const data = await TrainingAPI.module(moduleKey!);
      if (!data) { toast.error("Module not found"); navigate("/student/training"); return; }
      setModule(data);
      // Pre-seed already-read questions from DB (questionsRead count is tracked server-side)
    } catch {
      toast.error("Failed to load module");
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = async (q: Question) => {
    const alreadyRevealed = revealedIds.has(q.id);
    const newSet = new Set(revealedIds);

    if (alreadyRevealed) {
      newSet.delete(q.id);
    } else {
      newSet.add(q.id);
      // Mark as read in DB if not already
      if (!readIds.has(q.id) && module) {
        setMarkingId(q.id);
        try {
          const result = await TrainingAPI.markRead(moduleKey!, q.id, module.questionsTotal);
          const newRead = new Set(readIds);
          newRead.add(q.id);
          setReadIds(newRead);
          // Update local module progress
          setModule(prev => prev ? {
            ...prev,
            questionsRead: result.data?.questionsRead ?? prev.questionsRead + 1,
            progress: result.data?.progress ?? prev.progress,
            completed: result.data?.completed ?? prev.completed,
          } : prev);
        } catch {
          // Soft fail — don't block UX
        } finally {
          setMarkingId(null);
        }
      }
    }
    setRevealedIds(newSet);
  };

  const totalRead = Math.max(module?.questionsRead ?? 0, readIds.size);
  const progressPct = module
    ? Math.round((totalRead / Math.max(module.questionsTotal, 1)) * 100)
    : 0;

  if (loading) {
    return (
      <DashboardLayout role="student" title="Loading Module..." subtitle="">
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Brain className="h-16 w-16 text-primary/40" />
          </motion.div>
          <p className="text-muted-foreground text-lg">Preparing your module...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!module) return null;

  const easyQs = module.questions.filter(q => q.difficulty === "EASY");
  const mediumQs = module.questions.filter(q => q.difficulty === "MEDIUM");
  const hardQs = module.questions.filter(q => q.difficulty === "HARD");

  return (
    <DashboardLayout
      role="student"
      title={module.topic || module.subject}
      subtitle={`Training module · ${module.questionsTotal} questions to master`}
    >
      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        {/* ─── Main Content ─── */}
        <div className="space-y-6">

          {/* Back + Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/student/training")} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Modules
            </Button>
          </div>

          {/* Module Header Card */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 border border-primary/20 bg-primary/5 relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/70">{module.subject}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold">{module.topic}</h2>
                  {module.avgScore < 100 && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-warning" />
                      Your avg score: <span className="font-semibold text-warning">{module.avgScore}%</span> — this module targets your weak area
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => navigate(`/student/training/${moduleKey}/test`)}
                  className="gap-2 bg-primary text-primary-foreground shrink-0"
                >
                  <ClipboardList className="h-4 w-4" />
                  Take Module Test
                </Button>
              </div>

              {/* Progress */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reading Progress</span>
                  <span className="font-bold flex items-center gap-1.5">
                    {module.completed ? <><CheckCheck className="h-4 w-4 text-emerald-400" /> Completed</> : `${progressPct}%`}
                  </span>
                </div>
                <Progress value={progressPct} className="h-2.5" />
                <p className="text-xs text-muted-foreground">{totalRead} of {module.questionsTotal} questions revealed</p>
              </div>
            </div>
            <Sparkles className="absolute -bottom-4 -right-4 h-28 w-28 text-primary/5 -rotate-12" />
          </motion.div>

          {/* ── Questions grouped by difficulty ── */}
          {[
            { label: "Easy", qs: easyQs, color: "text-emerald-400", bg: "bg-emerald-400/5 border-emerald-400/20" },
            { label: "Medium", qs: mediumQs, color: "text-sky-400", bg: "bg-sky-400/5 border-sky-400/20" },
            { label: "Hard", qs: hardQs, color: "text-rose-400", bg: "bg-rose-400/5 border-rose-400/20" },
          ].filter(g => g.qs.length > 0).map((group, gi) => (
            <div key={group.label} className="space-y-4">
              <div className={cn("rounded-xl px-4 py-2.5 border flex items-center gap-2", group.bg)}>
                <Zap className={cn("h-4 w-4", group.color)} />
                <span className={cn("text-sm font-bold", group.color)}>{group.label} Questions</span>
                <Badge variant="outline" className={cn("ml-auto text-xs", group.color, `border-current`)}>{group.qs.length}</Badge>
              </div>

              <AnimatePresence mode="popLayout">
                {group.qs.map((q, idx) => {
                  const isRevealed = revealedIds.has(q.id);
                  const isRead = readIds.has(q.id) || (module.questionsRead > readIds.size && idx < module.questionsRead);
                  const isMarking = markingId === q.id;

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                      className={cn(
                        "glass-card rounded-2xl overflow-hidden border transition-all duration-300",
                        isRevealed ? "border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.08)]" : "border-border/50 hover:border-primary/20"
                      )}
                    >
                      {/* Question Header */}
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-4">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                            isRead ? "bg-emerald-400/15 text-emerald-400" : "bg-primary/10 text-primary"
                          )}>
                            {isRead ? <CheckCircle2 className="h-4 w-4" /> : gi * 10 + idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium leading-relaxed">{q.text}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="outline" className={cn("text-[10px] h-5", difficultyColor[q.difficulty])}>
                                {q.difficulty}
                              </Badge>
                              {q.topic && <span className="text-[10px] text-muted-foreground">{q.topic}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {q.tags?.map(t => (
                              <Badge key={t} variant="secondary" className="text-[10px] bg-secondary/40 text-muted-foreground">#{t}</Badge>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMarking}
                            onClick={() => toggleReveal(q)}
                            className={cn(
                              "text-xs font-semibold gap-2 shrink-0 transition-all",
                              isRevealed ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {isMarking ? (
                              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Saving...</>
                            ) : isRevealed ? (
                              <><EyeOff className="h-4 w-4" /> Hide Answer</>
                            ) : (
                              <><Eye className="h-4 w-4" /> Reveal Answer</>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Answer Reveal */}
                      <AnimatePresence>
                        {isRevealed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-primary/10 bg-primary/5 px-5 py-4"
                          >
                            {/* MCQ Options */}
                            {Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Options</span>
                                <div className="grid gap-2">
                                  {q.options.map((opt, oi) => {
                                    const isCorrect = opt === q.answer;
                                    return (
                                      <div key={oi} className={cn(
                                        "rounded-lg px-3 py-2.5 text-sm border flex items-center gap-2 transition-all",
                                        isCorrect
                                          ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
                                          : "bg-secondary/20 border-border/40 text-muted-foreground"
                                      )}>
                                        <div className={cn(
                                          "h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0",
                                          isCorrect ? "border-emerald-400 bg-emerald-400/20 text-emerald-400" : "border-muted-foreground/40"
                                        )}>
                                          {String.fromCharCode(65 + oi)}
                                        </div>
                                        <span>{opt}</span>
                                        {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto shrink-0" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Answer */}
                            <div className="flex gap-3">
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-1">
                                  {Array.isArray(q.options) && q.options.length > 0 ? "Correct Answer" : "Suggested Answer"}
                                </span>
                                <p className="text-sm leading-relaxed text-foreground/90 font-medium">{q.answer}</p>
                              </div>
                            </div>

                            {isRead && (
                              <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-2 text-xs text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Marked as read · progress saved</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}

          {module.questions.length === 0 && (
            <div className="glass-card rounded-2xl py-20 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No questions available yet</h3>
              <p className="text-muted-foreground mt-1">Questions will appear here once faculty uploads them for this topic.</p>
            </div>
          )}

          {/* CTA: Take Test */}
          {module.questions.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl p-6 border border-primary/20 bg-primary/5 flex items-center justify-between gap-4 flex-wrap"
            >
              <div>
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" /> Ready to test yourself?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Take the 10-question module test. Score ≥ 70% marks this module complete.
                </p>
              </div>
              <Button onClick={() => navigate(`/student/training/${moduleKey}/test`)} className="gap-2 shrink-0">
                <ClipboardList className="h-4 w-4" />
                Start Module Test
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-5">

          {/* Progress Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-5 rounded-2xl border border-primary/20"
          >
            <h3 className="font-display font-bold mb-4 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" /> Module Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Read</span>
                  <span className="font-bold">{totalRead} / {module.questionsTotal}</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Easy", count: easyQs.length, color: "text-emerald-400" },
                  { label: "Med", count: mediumQs.length, color: "text-sky-400" },
                  { label: "Hard", count: hardQs.length, color: "text-rose-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-secondary/30 p-2.5">
                    <p className={cn("font-bold text-base", s.color)}>{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {module.completed && (
                <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-3 py-2.5 flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400 font-semibold">Module Completed!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="glass-card p-5 rounded-2xl space-y-3">
            <h3 className="font-display font-bold text-sm">Quick Actions</h3>
            <Button variant="outline" className="w-full justify-start gap-2 text-sm"
              onClick={() => navigate(`/student/training/${moduleKey}/test`)}
            >
              <ClipboardList className="h-4 w-4 text-primary" />
              Take Module Test
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-muted-foreground"
              onClick={() => navigate("/student/training")}
            >
              <ArrowLeft className="h-4 w-4" />
              All Modules
            </Button>
          </div>

          {/* Tips */}
          <div className="glass-card p-5 rounded-2xl border border-warning/20 bg-warning/5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-warning flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Tips
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Reveal each answer to mark it as read</li>
              <li>For MCQ, try to answer mentally before revealing</li>
              <li>Take the test after reviewing all questions</li>
              <li>Score ≥ 70% to complete the module</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TrainingModulePage;
