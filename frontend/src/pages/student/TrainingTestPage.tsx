import { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowLeft, Clock, CheckCircle2, XCircle, Trophy,
  ChevronRight, ChevronLeft, Brain, Zap, AlertCircle,
  RotateCcw, BookOpen, BarChart2, CheckCheck, Loader2
} from "lucide-react";

type MCQQuestion = {
  id: string;
  text: string;
  options: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  subject: string;
  topic: string;
};

type TestData = {
  moduleKey: string;
  subject: string;
  topic: string;
  totalQuestions: number;
  durationMinutes: number;
  questions: MCQQuestion[];
};

type ResultItem = {
  questionId: string;
  questionText: string;
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
  options: string[];
};

type TestResult = {
  score: number;
  correct: number;
  total: number;
  results: ResultItem[];
};

const DIFF_COLOR = {
  EASY:   "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  MEDIUM: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  HARD:   "text-rose-400 border-rose-400/30 bg-rose-400/10",
};

const TrainingTestPage = () => {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const navigate = useNavigate();

  /* ── State: loading / data ── */
  const [phase, setPhase] = useState<"loading" | "ready" | "active" | "submitting" | "result">("loading");
  const [testData, setTestData] = useState<TestData | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  /* ── State: active test ── */
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load test + history ── */
  useEffect(() => {
    if (!moduleKey) return;
    Promise.all([
      TrainingAPI.generateTest(moduleKey),
      TrainingAPI.testHistory(moduleKey),
    ]).then(([test, hist]) => {
      if (!test) { toast.error("Could not generate test"); navigate(`/student/training/${moduleKey}`); return; }
      setTestData(test);
      setHistory(hist || []);
      setTimeLeft((test.durationMinutes || 10) * 60);
      setPhase("ready");
    }).catch(() => {
      toast.error("Failed to load test");
      navigate(`/student/training/${moduleKey}`);
    });
  }, [moduleKey]);

  /* ── Countdown ── */
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTest = () => {
    setPhase("active");
    startTimer();
  };

  /* ── Answer selection ── */
  const selectOption = (qId: string, idx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: idx }));
  };

  /* ── Submit ── */
  const handleSubmit = async (auto = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!auto && Object.keys(answers).length === 0) {
      toast.warning("Please answer at least one question before submitting.");
      return;
    }
    setPhase("submitting");
    try {
      const res = await TrainingAPI.submitTest(moduleKey!, answers);
      setResult(res.data || res);
      setPhase("result");
      const score = (res.data || res).score;
      if (score >= 70) toast.success(`🎉 Passed! Score: ${score}% — module marked complete`);
      else toast.info(`Score: ${score}% — review the module and try again`);
    } catch {
      toast.error("Failed to submit test");
      setPhase("active");
    }
  };

  /* ── Helpers ── */
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const answered = Object.keys(answers).length;
  const total = testData?.questions.length ?? 0;
  const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;
  const timerWarning = timeLeft < 60;

  /* ─────────── LOADING ─────────── */
  if (phase === "loading") {
    return (
      <DashboardLayout role="student" title="Generating Test..." subtitle="">
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
            <Brain className="h-16 w-16 text-primary/40" />
          </motion.div>
          <p className="text-muted-foreground text-lg">Preparing your test questions...</p>
        </div>
      </DashboardLayout>
    );
  }

  /* ─────────── READY ─────────── */
  if (phase === "ready" && testData) {
    const bestHistory = history.length > 0 ? Math.max(...history.map((h: any) => h.score)) : null;
    return (
      <DashboardLayout role="student" title="Module Test" subtitle={`${testData.subject} · ${testData.topic}`}>
        <div className="max-w-xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/student/training/${moduleKey}`)} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Module
          </Button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 border border-primary/20 text-center space-y-6"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">{testData.topic || testData.subject}</h2>
              <p className="text-muted-foreground mt-1">Module Assessment</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <BookOpen className="h-5 w-5 text-primary" />, label: "Questions", val: testData.totalQuestions },
                { icon: <Clock className="h-5 w-5 text-warning" />, label: "Duration", val: `${testData.durationMinutes} min` },
                { icon: <Trophy className="h-5 w-5 text-emerald-400" />, label: "Pass Score", val: "70%" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-secondary/30 p-3 text-center">
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="font-bold text-sm">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {bestHistory !== null && (
              <div className={cn(
                "rounded-xl px-4 py-2.5 border text-sm flex items-center justify-center gap-2",
                bestHistory >= 70 ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" : "bg-warning/10 border-warning/20 text-warning"
              )}>
                <BarChart2 className="h-4 w-4" />
                Best previous score: <span className="font-bold">{Math.round(bestHistory)}%</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl px-4 py-3 text-left space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-warning" /> Instructions</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Select the best answer for each question</li>
                <li>Timer starts when you press Start</li>
                <li>Test auto-submits when time runs out</li>
                <li>Score ≥ 70% marks the module as complete</li>
              </ul>
            </div>

            {total === 0 ? (
              <div className="text-sm text-rose-400 bg-rose-400/10 rounded-xl px-4 py-3 font-semibold">
                No questions available yet. Please try again later.
              </div>
            ) : (
              <Button onClick={startTest} size="lg" className="w-full gap-2 font-bold text-base">
                <Zap className="h-5 w-5" /> Start Test
              </Button>
            )}
          </motion.div>

          {/* Past results */}
          {history.length > 0 && (
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Past Attempts
              </h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-secondary/20 rounded-lg px-3 py-2">
                    <span className="text-muted-foreground text-xs">{new Date(h.createdAt).toLocaleDateString()}</span>
                    <span className="font-bold text-xs">{h.correctCount}/{h.totalCount}</span>
                    <Badge variant="outline" className={cn("text-[10px]",
                      h.score >= 70 ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" : "text-warning border-warning/30 bg-warning/10"
                    )}>
                      {Math.round(h.score)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ─────────── SUBMITTING ─────────── */
  if (phase === "submitting") {
    return (
      <DashboardLayout role="student" title="Grading..." subtitle="">
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Loader2 className="h-14 w-14 text-primary animate-spin" />
          <p className="text-muted-foreground text-lg">Calculating your score...</p>
        </div>
      </DashboardLayout>
    );
  }

  /* ─────────── RESULT ─────────── */
  if (phase === "result" && result) {
    const passed = result.score >= 70;
    return (
      <DashboardLayout role="student" title="Test Results" subtitle={testData?.topic || ""}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score Hero */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "glass-card rounded-2xl p-8 border text-center space-y-4",
              passed ? "border-emerald-400/30 bg-emerald-400/5" : "border-warning/30 bg-warning/5"
            )}
          >
            <div className={cn(
              "h-20 w-20 rounded-full border-4 flex items-center justify-center mx-auto text-3xl font-display font-black",
              passed ? "border-emerald-400 text-emerald-400 bg-emerald-400/10" : "border-warning text-warning bg-warning/10"
            )}>
              {Math.round(result.score)}%
            </div>
            <div>
              <h2 className={cn("text-2xl font-display font-bold", passed ? "text-emerald-400" : "text-warning")}>
                {passed ? "🎉 Passed!" : "Keep Practicing"}
              </h2>
              <p className="text-muted-foreground mt-1">
                {passed ? "Great job! This module is marked as complete." : "Review the module and try again to pass."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Correct", val: result.correct, color: "text-emerald-400" },
                { label: "Wrong", val: result.total - result.correct, color: "text-rose-400" },
                { label: "Total", val: result.total, color: "text-foreground" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-secondary/30 p-3 text-center">
                  <p className={cn("font-bold text-xl", s.color)}>{s.val}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <Progress value={result.score} className="h-3" />
          </motion.div>

          {/* Per-question breakdown */}
          <div className="space-y-3">
            <h3 className="font-display font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Answer Breakdown
            </h3>
            {result.results.map((r, i) => (
              <motion.div
                key={r.questionId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "glass-card rounded-xl p-4 border",
                  r.isCorrect ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {r.isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      : <XCircle className="h-5 w-5 text-rose-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed">{r.questionText}</p>

                    {/* Options grid if MCQ */}
                    {Array.isArray(r.options) && r.options.length > 0 && (
                      <div className="mt-3 grid gap-1.5">
                        {r.options.map((opt, oi) => {
                          const isCorrect = opt === r.correctAnswer;
                          const isStudentPick = opt === r.studentAnswer;
                          return (
                            <div key={oi} className={cn(
                              "rounded-lg px-3 py-2 text-xs border flex items-center gap-2",
                              isCorrect ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300" :
                              isStudentPick && !isCorrect ? "bg-rose-400/10 border-rose-400/30 text-rose-300" :
                              "bg-secondary/20 border-border/30 text-muted-foreground"
                            )}>
                              <span className="font-bold shrink-0">{String.fromCharCode(65 + oi)}.</span>
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0 text-emerald-400" />}
                              {isStudentPick && !isCorrect && <XCircle className="h-3.5 w-3.5 ml-auto shrink-0 text-rose-400" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text answer */}
                    {(!Array.isArray(r.options) || r.options.length === 0) && (
                      <div className="mt-2 grid gap-1.5">
                        {!r.isCorrect && r.studentAnswer && (
                          <div className="rounded-lg px-3 py-2 text-xs bg-rose-400/10 border border-rose-400/30 text-rose-300">
                            <span className="font-bold">Your answer: </span>{r.studentAnswer}
                          </div>
                        )}
                        <div className="rounded-lg px-3 py-2 text-xs bg-emerald-400/10 border border-emerald-400/30 text-emerald-300">
                          <span className="font-bold">Correct: </span>{r.correctAnswer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center pb-6">
            <Button variant="outline" onClick={() => { setPhase("ready"); setAnswers({}); setCurrent(0); }} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Retry Test
            </Button>
            <Button variant="outline" onClick={() => navigate(`/student/training/${moduleKey}`)} className="gap-2">
              <BookOpen className="h-4 w-4" /> Back to Module
            </Button>
            <Button onClick={() => navigate("/student/training")} className="gap-2">
              <ChevronRight className="h-4 w-4" /> All Modules
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ─────────── ACTIVE TEST ─────────── */
  if (phase === "active" && testData && total > 0) {
    const q = testData.questions[current];
    const selectedOption = answers[q?.id] as number | undefined;

    return (
      <DashboardLayout role="student" title="Module Test" subtitle={`${testData.topic} · Question ${current + 1} of ${total}`}>
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Timer + Progress bar */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">
                Q{current + 1} / {total} &nbsp;·&nbsp; {answered} answered
              </span>
              <div className={cn(
                "flex items-center gap-2 font-mono font-bold text-base px-3 py-1 rounded-lg",
                timerWarning ? "text-rose-400 bg-rose-400/10 animate-pulse" : "text-foreground bg-secondary/30"
              )}>
                <Clock className="h-4 w-4" />
                {fmt(timeLeft)}
              </div>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {/* Question Navigator dots */}
          <div className="flex flex-wrap gap-1.5 justify-center px-2">
            {testData.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-7 w-7 rounded-lg text-[11px] font-bold border transition-all",
                  i === current ? "bg-primary border-primary text-primary-foreground scale-110" :
                  answers[testData.questions[i].id] !== undefined ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400" :
                  "bg-secondary/30 border-border/40 text-muted-foreground hover:bg-secondary"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="glass-card rounded-2xl p-6 border border-border/50 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {current + 1}
                </div>
                <Badge variant="outline" className={cn("text-[10px]", DIFF_COLOR[q.difficulty])}>
                  {q.difficulty}
                </Badge>
                {q.topic && <span className="text-xs text-muted-foreground ml-auto">{q.topic}</span>}
              </div>

              {/* Question text */}
              <p className="text-lg font-medium leading-relaxed">{q.text}</p>

              {/* Options */}
              {Array.isArray(q.options) && q.options.length > 0 ? (
                <div className="grid gap-3">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => selectOption(q.id, oi)}
                      className={cn(
                        "w-full rounded-xl px-4 py-3.5 text-left text-sm border transition-all duration-200 flex items-center gap-3",
                        selectedOption === oi
                          ? "bg-primary/10 border-primary/50 text-foreground shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                          : "bg-secondary/20 border-border/40 text-foreground hover:bg-secondary/40 hover:border-border/60"
                      )}
                    >
                      <span className={cn(
                        "h-7 w-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                        selectedOption === oi ? "bg-primary border-primary text-primary-foreground" : "border-border/60 text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={3}
                  placeholder="Type your answer here..."
                  value={(answers[q.id] as string) || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full rounded-xl bg-secondary/30 border border-border/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            {current < total - 1 ? (
              <Button onClick={() => setCurrent(c => c + 1)} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <CheckCheck className="h-4 w-4" />
                Submit Test
              </Button>
            )}
          </div>

          {/* Submit from any question */}
          {answered > 0 && current < total - 1 && (
            <div className="text-center">
              <button
                onClick={() => handleSubmit()}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
              >
                Submit early ({answered}/{total} answered)
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return null;
};

export default TrainingTestPage;
