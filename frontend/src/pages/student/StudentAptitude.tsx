import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AptitudeAPI } from "@/api";
import {
  Upload, Brain, Zap, Clock, CheckCircle2, XCircle, RotateCcw,
  BookOpen, ChevronRight, ChevronLeft, CheckCheck, Loader2, Sparkles,
  FileText, ArrowLeft, Trophy
} from "lucide-react";

type MCQQuestion = {
  id?: string;
  text: string;
  options: string[];
  answer: string;
  difficulty: string;
  subject: string;
  topic: string;
};

const StudentAptitude = () => {
  const [phase, setPhase] = useState<"idle" | "loading" | "preview" | "active" | "submitting" | "result" | "review">("idle");
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [score, setScore] = useState<{ correct: number; total: number; pct: number } | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [reviewData, setReviewData] = useState<any>(null);

  const fetchReview = async (id: string) => {
    setPhase("loading");
    try {
      const { StudentAPI } = await import("@/api");
      const data = await StudentAPI.getAttempt(id);
      setReviewData(data);
      setPhase("review");
    } catch (err) {
      toast.error("Failed to load review details");
      setPhase("idle");
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await AptitudeAPI.history();
      setHistory(res || []);
    } catch (err) {
      console.error("Failed to fetch aptitude history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (phase === "idle") {
      fetchHistory();
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const generateAIQuestions = async () => {
    setPhase("loading");
    try {
      const res = await AptitudeAPI.generate("General Aptitude");
      if (res.data && res.data.length > 0) {
        setQuestions(res.data);
        toast.success("AI generated 10 aptitude questions!");
        setPhase("preview");
      } else {
        toast.error("Failed to generate questions.");
        setPhase("idle");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions");
      setPhase("idle");
    }
  };

  const addAIQuestions = async () => {
    setGeneratingMore(true);
    try {
      const res = await AptitudeAPI.generate("General Aptitude");
      if (res.data && res.data.length > 0) {
        setQuestions([...questions, ...res.data]);
        toast.success(`Added ${res.data.length} more AI questions!`);
      }
    } catch (err: any) {
      toast.error("Failed to add AI questions");
    } finally {
      setGeneratingMore(false);
    }
  };

  const startTest = () => {
    setCurrent(0);
    setAnswers({});
    setTimeLeft(questions.length * 60); 
    setPhase("active");
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);
  };

  const submitTest = async () => {
    if (timerInterval) clearInterval(timerInterval);
    setPhase("submitting");

    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.answer) {
        correct++;
      }
    });

    const pct = Math.round((correct / questions.length) * 100);
    
    try {
      // Save to database
      await AptitudeAPI.submitPractice({
        score: pct,
        correctCount: correct,
        totalCount: questions.length,
        answers,
        questions,
        subject: "General Aptitude",
        topic: questions[0]?.topic || "General Practice",
        timeTaken: (questions.length * 60) - timeLeft
      });
      
      setScore({
        correct,
        total: questions.length,
        pct
      });
      setPhase("result");
      toast.success("Practice results saved to your profile!");
    } catch (err) {
      console.error(err);
      toast.error("Results calculated but failed to save to database.");
      // Still show results to user even if save fails
      setScore({
        correct,
        total: questions.length,
        pct
      });
      setPhase("result");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, "0")}`;
  };

  if (phase === "idle") {
    return (
      <DashboardLayout role="student" title="Aptitude Hub" subtitle="Master your skills with AI-generated practice sessions.">
        <div className="grid lg:grid-cols-3 gap-8 mt-10">
          {/* Main Action Card */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-10 rounded-3xl border border-primary/20 flex flex-col items-center space-y-8 bg-primary/5 shadow-glow"
            >
              <div className="h-20 w-20 rounded-3xl bg-primary/20 flex items-center justify-center">
                <Brain className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-3xl font-bold tracking-tight">Personalized AI Practice</h3>
                <p className="text-muted-foreground text-base max-w-md mx-auto">
                  Generate dynamic aptitude tests tailored to your preparation needs. 
                </p>
              </div>
              
              <Button onClick={generateAIQuestions} size="lg" className="w-full max-w-xs gap-2 py-8 text-lg font-bold shadow-glow transition-all hover:scale-[1.02]">
                <Zap className="h-6 w-6" /> Start New Test
              </Button>

              <div className="grid grid-cols-3 gap-6 w-full pt-8 border-t border-primary/10">
                <div className="space-y-1 text-center">
                  <p className="text-2xl font-bold text-primary">10</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Questions</p>
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-2xl font-bold text-primary">10m</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Duration</p>
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-2xl font-bold text-primary">AI</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Adaptive</p>
                </div>
              </div>
            </motion.div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground italic">
                "Practice makes perfect. Your scores directly impact your placement readiness score."
              </p>
            </div>
          </div>

          {/* Previous Attempts Sidebar */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                Recent History
              </h3>
            </div>

            <div className="space-y-4">
              {historyLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 w-full rounded-2xl bg-secondary/20 animate-pulse" />
                ))
              ) : history.length === 0 ? (
                <div className="glass-card p-6 rounded-2xl border border-dashed border-border/50 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No attempts yet. Take your first test!</p>
                </div>
              ) : (
                history.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => fetchReview(h.id)}
                    className="glass-card p-4 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <p className="text-sm font-bold truncate max-w-[120px]">{h.topic}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {h.date}
                        </p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold px-2 py-0",
                        h.score >= 70 ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {h.score}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                      <div className="flex gap-3 text-[10px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {h.correct}</span>
                        <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-rose-400" /> {h.total - h.correct}</span>
                      </div>
                      <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">Review →</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === "loading") {
    return (
      <DashboardLayout role="student" title="Processing..." subtitle="">
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <p className="text-muted-foreground text-lg">AI is preparing your aptitude test...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === "preview") {
    return (
      <DashboardLayout role="student" title="Review Questions" subtitle={`${questions.length} questions ready for your test.`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setPhase("idle")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={addAIQuestions} disabled={generatingMore} className="gap-2">
                {generatingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                Add 10 AI Questions
              </Button>
              <Button onClick={startTest} className="gap-2 bg-primary px-8">
                <Zap className="h-4 w-4" /> Start Test
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 rounded-xl border border-border/50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-primary">Q{i + 1}</span>
                  <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
                </div>
                <p className="text-sm font-medium">{q.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === "active") {
    const q = questions[current];
    const progress = Math.round(((Object.keys(answers).length) / questions.length) * 100);

    return (
      <DashboardLayout role="student" title="Aptitude Test" subtitle={`Question ${current + 1} of ${questions.length}`}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass-card p-4 rounded-xl border flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <span className="text-xs font-bold text-muted-foreground">Progress</span>
              <Progress value={progress} className="h-2" />
              <span className="text-xs font-bold">{progress}%</span>
            </div>
            <div className={cn(
              "ml-6 flex items-center gap-2 font-mono font-bold text-lg px-4 py-1.5 rounded-lg",
              timeLeft < 60 ? "text-rose-400 bg-rose-400/10 animate-pulse" : "bg-secondary/50"
            )}>
              <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
            </div>
          </div>

          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 rounded-2xl border border-primary/10 space-y-6"
          >
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/10 text-primary border-primary/20">{q.difficulty}</Badge>
              <Badge variant="outline">{q.topic || "General"}</Badge>
            </div>
            <h2 className="text-xl font-medium leading-relaxed">{q.text}</h2>
            
            <div className="grid gap-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [current]: opt })}
                  className={cn(
                    "w-full p-4 rounded-xl text-left border transition-all flex items-center gap-4",
                    answers[current] === opt 
                      ? "bg-primary/10 border-primary text-primary shadow-sm" 
                      : "bg-secondary/20 border-border/50 hover:bg-secondary/40"
                  )}
                >
                  <span className={cn(
                    "h-8 w-8 rounded-lg border flex items-center justify-center font-bold",
                    answers[current] === opt ? "bg-primary text-white" : "text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            {current === questions.length - 1 ? (
              <Button onClick={submitTest} className="bg-emerald-600 hover:bg-emerald-500 gap-2">
                <CheckCheck className="h-4 w-4" /> Finish Test
              </Button>
            ) : (
              <Button onClick={() => setCurrent(current + 1)}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === "submitting") {
    return (
      <DashboardLayout role="student" title="Grading..." subtitle="">
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <p className="text-muted-foreground text-lg">AI is evaluating your performance...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === "result" && score) {
    return (
      <DashboardLayout role="student" title="Test Results" subtitle="Aptitude Practice Summary">
        <div className="max-w-3xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 rounded-2xl border text-center space-y-6"
          >
            <div className={cn(
              "h-24 w-24 rounded-full border-4 flex items-center justify-center mx-auto text-3xl font-bold",
              score.pct >= 70 ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" : "border-warning text-warning bg-warning/10"
            )}>
              {score.pct}%
            </div>
            <div>
              <h2 className="text-3xl font-bold">{score.pct >= 70 ? "Excellent Work!" : "Keep it up!"}</h2>
              <p className="text-muted-foreground mt-2">You got {score.correct} out of {score.total} questions correct.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-2xl font-bold text-emerald-500">{score.correct}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-2xl font-bold text-rose-500">{score.total - score.correct}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Incorrect</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-2xl font-bold">{score.total}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p>
              </div>
            </div>
            <Button onClick={() => setPhase("idle")} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Start New Session
            </Button>
          </motion.div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Detailed Review
            </h3>
            {questions.map((q, i) => (
              <div key={i} className={cn(
                "glass-card p-6 rounded-xl border flex gap-4",
                answers[i] === q.answer ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
              )}>
                <div className="shrink-0">
                  {answers[i] === q.answer ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <XCircle className="h-6 w-6 text-rose-500" />}
                </div>
                <div className="space-y-3 flex-1">
                  <p className="font-medium">{q.text}</p>
                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={cn(
                        "text-sm p-2 rounded-lg border",
                        opt === q.answer ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                        opt === answers[i] && opt !== q.answer ? "bg-rose-500/10 border-rose-500/30 text-rose-600" :
                        "bg-secondary/10 border-border/30 text-muted-foreground"
                      )}>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === "review" && reviewData) {
    const qs = reviewData.questions || [];
    const studentAns = reviewData.answers || {};

    return (
      <DashboardLayout role="student" title="Review Attempt" subtitle={reviewData.assessment?.title}>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setPhase("idle")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Hub
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Score</p>
              <p className="text-2xl font-bold text-primary">{Math.round(reviewData.score)}%</p>
            </div>
          </div>

          <div className="space-y-6">
            {qs.map((q: any, i: number) => {
              const isCorrect = studentAns[i] === q.answer;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "glass-card p-6 rounded-2xl border flex gap-4",
                    isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
                  )}
                >
                  <div className="shrink-0 mt-1">
                    {isCorrect ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <XCircle className="h-6 w-6 text-rose-500" />}
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">Question {i + 1}</Badge>
                        {q.difficulty && <Badge className="text-[10px]">{q.difficulty}</Badge>}
                      </div>
                      <p className="text-lg font-medium leading-relaxed">{q.text}</p>
                    </div>

                    <div className="grid gap-2">
                      {(q.options || []).map((opt: string, oi: number) => (
                        <div key={oi} className={cn(
                          "text-sm p-3 rounded-xl border flex items-center gap-3",
                          opt === q.answer ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-semibold shadow-sm" :
                          opt === studentAns[i] && opt !== q.answer ? "bg-rose-500/10 border-rose-500/30 text-rose-600" :
                          "bg-secondary/10 border-border/30 text-muted-foreground/60"
                        )}>
                          <span className={cn(
                            "h-6 w-6 rounded-md border flex items-center justify-center text-[10px] font-bold",
                            opt === q.answer ? "bg-emerald-500 text-white border-emerald-500" : 
                            opt === studentAns[i] ? "bg-rose-500 text-white border-rose-500" : "border-border"
                          )}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Brain className="h-3.5 w-3.5" /> AI Explanation
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-center py-8">
            <Button onClick={() => setPhase("idle")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Return to Hub
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return null;
};

export default StudentAptitude;
