import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Calendar, User, MessageSquare, Bot, Briefcase, Plus, BrainCircuit } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

const API_BASE = "http://localhost:3000/api";

const MockInterview = () => {
  const [interviews, setInterviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const userRole = (user.role || 'student').toLowerCase() as any;

  useEffect(() => {
    fetchInterviews();
    if (userRole === 'faculty') {
      fetchStudents();
    }
  }, [userRole]);

  const fetchInterviews = async () => {
    try {
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
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <CardHeader>
                <div className="p-2 w-fit rounded-lg bg-primary/10 mb-2">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI Technical Drill</CardTitle>
                <CardDescription>Focused on DSA, System Design, and Core CS subjects.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Real-time follow-up questions</li>
                  <li>• Instant readiness score impact</li>
                  <li>• Technical depth analysis</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => startAIInterview('TECHNICAL')}>
                  <Play className="mr-2 h-4 w-4" /> Start AI Interview
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 border-secondary/20 bg-gradient-to-br from-background to-secondary/5">
              <CardHeader>
                <div className="p-2 w-fit rounded-lg bg-secondary/10 mb-2">
                  <User className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>AI HR & Behavior</CardTitle>
                <CardDescription>Practice soft skills and common behavioral questions.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Communication clarity check</li>
                  <li>• Confidence & tone analysis</li>
                  <li>• Behavioral probing</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full" onClick={() => startAIInterview('HR')}>
                  <Play className="mr-2 h-4 w-4" /> Start HR Drill
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/50 transition-colors">
              <CardHeader>
                <div className="p-2 w-fit rounded-lg bg-muted mb-2">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle>Faculty Session</CardTitle>
                <CardDescription>Request a mock interview with your assigned mentor.</CardDescription>
              </CardHeader>
              <CardContent className="h-[92px] flex items-center justify-center">
                <p className="text-sm text-center text-muted-foreground">Ask your mentor to schedule a session from their dashboard.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  <Calendar className="mr-2 h-4 w-4" /> Request Faculty
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        <Tabs defaultValue={userRole === 'faculty' ? 'students' : 'upcoming'} className="w-full">
          <TabsList className="mb-4">
            {userRole === 'faculty' && <TabsTrigger value="students">My Students</TabsTrigger>}
            <TabsTrigger value="upcoming">Current & Upcoming</TabsTrigger>
            <TabsTrigger value="history">Interview History</TabsTrigger>
          </TabsList>

          {userRole === 'faculty' && (
            <TabsContent value="students">
              <div className="grid gap-4">
                {students.map((student) => (
                  <Card key={student.id} className="group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {student.name?.[0] || 'S'}
                          </div>
                          <div>
                            <h3 className="font-semibold">{student.name}</h3>
                            <p className="text-xs text-muted-foreground uppercase">{student.roll} • {student.branch}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-4 hidden md:block">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Readiness</p>
                            <p className="font-bold text-primary">{student.readiness}%</p>
                          </div>
                          <Button onClick={() => startInterview(student.id, student.name)}>
                            Conduct Interview
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="upcoming">
            <div className="grid gap-4">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading sessions...</div>
              ) : interviews.filter(i => i.status !== 'COMPLETED').length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10 opacity-60">
                    <MessageSquare className="h-10 w-10 mb-2" />
                    <p>No active sessions.</p>
                  </CardContent>
                </Card>
              ) : (
                interviews.filter(i => i.status !== 'COMPLETED').map((interview) => (
                  <Card key={interview.id} className="group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${interview.type === 'AI' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                            {interview.type === 'AI' ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{interview.title}</h3>
                              <Badge variant={interview.status === 'IN_PROGRESS' ? 'default' : 'outline'}>
                                {interview.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {interview.mode}</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(interview.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button onClick={() => navigate(`/${userRole}/interview/${interview.id}`)}>
                          {interview.type === 'AI' ? 'Start Session' : 'Join Room'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="grid gap-4">
              {interviews.filter(i => i.status === 'COMPLETED').length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No completed interviews yet.</div>
              ) : (
                interviews.filter(i => i.status === 'COMPLETED').map((interview) => (
                  <Card key={interview.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <div className={`p-3 rounded-full ${interview.type === 'AI' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                            {interview.type === 'AI' ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
                          </div>
                          <div>
                            <h3 className="font-semibold">{interview.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(interview.createdAt).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1 text-green-600 font-medium">Score: {Math.round(interview.overallScore)}%</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => navigate(`/${userRole}/interview/${interview.id}`)}>
                          View Analysis
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};


export default MockInterview;
