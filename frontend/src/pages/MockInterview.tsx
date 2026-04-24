import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Calendar, User, MessageSquare, Bot, Briefcase, Plus, BrainCircuit, Sparkles, Trophy, ClipboardList, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const API_BASE = "http://localhost:3000/api";

const MockInterview = () => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const userRole = (user.role || 'student').toLowerCase() as any;
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', mode: 'TECHNICAL', facultyId: '' });

  useEffect(() => {
    fetchInterviews();
    if (userRole === 'faculty') {
      fetchStudents();
    } else {
      fetchFaculties();
    }
  }, [userRole]);

  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/interviews/faculties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaculties(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch faculties", error);
    }
  };

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/interviews/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterviews(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch interviews", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/faculty/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch students", error);
    }
  };

  const handleSchedule = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const scheduledAt = new Date(`${scheduleData.date}T${scheduleData.time}`);
      
      const payload = { 
        title: `Mock Interview (${scheduleData.mode})`, 
        type: 'FACULTY', 
        mode: scheduleData.mode, 
        studentId: userRole === 'faculty' ? selectedStudent?.id : user.id,
        facultyId: userRole === 'faculty' ? user.id : scheduleData.facultyId,
        scheduledAt
      };

      await axios.post(`${API_BASE}/interviews/start`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ title: "Success", description: "Interview scheduled successfully." });
      setIsScheduleOpen(false);
      fetchInterviews();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to schedule interview." });
    }
  };

  const startInterview = async (studentId: string, studentName: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_BASE}/interviews/start`, 
        { title: `Mock Interview with ${studentName}`, type: 'FACULTY', mode: 'TECHNICAL', facultyId: user.id, studentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/faculty/interview/${response.data.data.id}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to start interview." });
    }
  };

  const startAIInterview = async (mode: 'TECHNICAL' | 'HR') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_BASE}/interviews/start`, 
        { title: `AI Mock Interview - ${mode}`, type: 'AI', mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/student/interview/${response.data.data.id}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to start AI interview." });
    }
  };

  if (loading) return <DashboardLayout role={userRole}><div>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout role={userRole}>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {userRole === 'faculty' ? 'Interview Management' : 'Mock Interviews'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {userRole === 'faculty' ? 'Conduct interviews with your assigned students.' : 'Practice with AI or schedule sessions with faculty.'}
            </p>
          </div>
        </div>

        {userRole === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="group border-primary/20 bg-gradient-to-br from-background via-primary/5 to-primary/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-700">
                <BrainCircuit className="h-32 w-32" />
              </div>
              <CardHeader>
                <div className="p-3 w-fit rounded-2xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">AI Technical Drill</CardTitle>
                <CardDescription className="font-medium text-muted-foreground/80">Simulate real technical rounds with Llama-3.3 70B</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {[
                    "Dynamic follow-up questions",
                    "Brutal technical evaluation",
                    "NLP-based sentiment tracking"
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" onClick={() => startAIInterview('TECHNICAL')}>
                  <Play className="mr-2 h-5 w-5" /> Launch Technical Session
                </Button>
              </CardFooter>
            </Card>

            <Card className="group border-secondary/20 bg-gradient-to-br from-background via-secondary/5 to-secondary/10 transition-all duration-500 hover:shadow-2xl hover:shadow-secondary/20 hover:-translate-y-1 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-700">
                <User className="h-32 w-32" />
              </div>
              <CardHeader>
                <div className="p-3 w-fit rounded-2xl bg-secondary/10 mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Sparkles className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">AI HR & Behavior</CardTitle>
                <CardDescription className="font-medium text-muted-foreground/80">Perfect your body language and soft skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {[
                    "Communication clarity analysis",
                    "Confidence score impact",
                    "Behavioral STAR method check"
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full h-12 text-lg font-bold shadow-lg shadow-secondary/20" onClick={() => startAIInterview('HR')}>
                  <Play className="mr-2 h-5 w-5" /> Launch HR Session
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-all duration-300 bg-muted/5 flex flex-col justify-center text-center p-6 group">
              <CardHeader>
                <div className="mx-auto p-4 rounded-full bg-muted mb-4 group-hover:bg-primary/10 transition-colors">
                  <Calendar className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-xl">Faculty Session</CardTitle>
                <CardDescription>Request a specialized 1-on-1 session with your mentor.</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col gap-3">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Dashboard Monitoring Active</p>
                <Button variant="outline" className="w-full font-bold" onClick={() => setIsScheduleOpen(true)}>
                  Book Session
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        <Tabs defaultValue={userRole === 'faculty' ? 'students' : 'upcoming'} className="w-full animate-in slide-in-from-bottom-4 duration-1000">
          <TabsList className="mb-8 p-1 bg-muted/50 rounded-xl">
            {userRole === 'faculty' && <TabsTrigger value="students" className="rounded-lg px-8">My Students</TabsTrigger>}
            <TabsTrigger value="upcoming" className="rounded-lg px-8">Active & Scheduled</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-8">Session History</TabsTrigger>
          </TabsList>

          {userRole === 'faculty' && (
            <TabsContent value="students" className="space-y-4">
              <div className="grid gap-4">
                {students.map((student) => (
                  <Card key={student.id} className="group border-primary/5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl group-hover:rotate-6 transition-transform">
                              {student.name?.[0] || 'S'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-background" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{student.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase font-black tracking-widest mt-1">
                              <span>{student.roll}</span>
                              <span className="opacity-20">•</span>
                              <span>{student.branch}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right hidden md:block">
                            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Readiness Index</p>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-2xl text-primary">{student.readiness}%</span>
                              <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${student.readiness}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" className="rounded-xl border-2 font-bold hover:bg-primary/5" onClick={() => { setSelectedStudent(student); setIsScheduleOpen(true); }}>
                              <Calendar className="mr-2 h-4 w-4" /> Schedule
                            </Button>
                            <Button className="rounded-xl font-black shadow-lg shadow-primary/20" onClick={() => startInterview(student.id, student.name)}>
                              Join Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="upcoming" className="space-y-4">
            <div className="grid gap-4">
              {interviews.filter(i => i.status !== 'COMPLETED').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl opacity-50 bg-muted/10">
                  <div className="p-4 rounded-full bg-muted mb-4"><MessageSquare className="h-10 w-10" /></div>
                  <p className="font-bold">No active interview sessions</p>
                  <p className="text-sm text-muted-foreground">Start an AI drill to begin practicing.</p>
                </div>
              ) : (
                interviews.filter(i => i.status !== 'COMPLETED').map((interview) => (
                  <Card key={interview.id} className="group border-primary/5 hover:border-primary/20 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${interview.type === 'AI' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'} group-hover:scale-110 transition-transform`}>
                            {interview.type === 'AI' ? <Bot className="h-7 w-7" /> : <User className="h-7 w-7" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-black text-xl">{interview.title}</h3>
                              <Badge variant={interview.status === 'IN_PROGRESS' ? 'default' : 'outline'} className="rounded-full px-3 text-[10px] font-black uppercase tracking-widest">
                                {interview.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-6 text-xs text-muted-foreground font-medium">
                              <span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-primary/60" /> {interview.mode}</span>
                              <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary/60" /> {new Date(interview.scheduledAt || interview.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                          </div>
                        </div>
                        <Button className="rounded-xl px-8 font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform" onClick={() => navigate(`/${userRole}/interview/${interview.id}`)}>
                          {interview.status === 'IN_PROGRESS' ? 'Continue' : 'Launch Session'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="grid gap-4">
              {interviews.filter(i => i.status === 'COMPLETED').length === 0 ? (
                <div className="p-20 text-center text-muted-foreground font-medium italic border-2 border-dashed rounded-3xl">No completed interviews yet. Finish a session to see your analysis.</div>
              ) : (
                interviews.filter(i => i.status === 'COMPLETED').map((interview) => (
                  <Card key={interview.id} className="group hover:border-primary/20 transition-all border-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-6 items-center">
                          <div className={`p-4 rounded-2xl ${interview.type === 'AI' ? 'bg-primary/5 text-primary/60' : 'bg-secondary/5 text-secondary/60'}`}>
                            {interview.type === 'AI' ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{interview.title}</h3>
                            <div className="flex items-center gap-6 text-xs text-muted-foreground font-black uppercase tracking-widest mt-1">
                              <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {new Date(interview.createdAt).toLocaleDateString()}</span>
                              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 rounded-full">
                                <Trophy className="h-3 w-3" />
                                <span>Score: {Math.round(interview.overallScore)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" className="rounded-xl border-2 font-black hover:bg-primary/5" onClick={() => navigate(`/${userRole}/interview/${interview.id}`)}>
                          Deep Analysis
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Schedule Interview Dialog */}
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl border-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                {userRole === 'faculty' ? 'Schedule Interview' : 'Book Faculty Session'}
              </DialogTitle>
              <CardDescription className="font-medium">
                {userRole === 'faculty' ? `Plan a session for ${selectedStudent?.name}` : 'Select a mentor and time for your mock interview'}
              </CardDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {userRole === 'student' && (
                <div className="grid gap-2">
                  <Label htmlFor="faculty" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Select Faculty</Label>
                  <Select value={scheduleData.facultyId} onValueChange={(v) => setScheduleData({...scheduleData, facultyId: v})}>
                    <SelectTrigger className="rounded-xl border-2 h-12">
                      <SelectValue placeholder="Choose a mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name || f.fullName} ({f.department || 'Expert'})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Date</Label>
                  <Input id="date" type="date" className="rounded-xl border-2 h-12" value={scheduleData.date} onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Time</Label>
                  <Input id="time" type="time" className="rounded-xl border-2 h-12" value={scheduleData.time} onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mode" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Interview Mode</Label>
                <Select value={scheduleData.mode} onValueChange={(v) => setScheduleData({...scheduleData, mode: v})}>
                  <SelectTrigger className="rounded-xl border-2 h-12">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TECHNICAL">Technical Round</SelectItem>
                    <SelectItem value="HR">HR / Behavioral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full h-12 rounded-xl font-black text-lg shadow-xl shadow-primary/20" onClick={handleSchedule} disabled={!scheduleData.date || !scheduleData.time || (userRole === 'student' && !scheduleData.facultyId)}>
                {userRole === 'faculty' ? 'Confirm Schedule' : 'Request Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default MockInterview;
