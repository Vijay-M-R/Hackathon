import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  X, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  MessageSquare,
  ArrowLeft,
  Play,
  Trophy,
  Sparkles,
  BrainCircuit,
  ClipboardList,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

const API_BASE = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

const InterviewRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [interview, setInterview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sentiment, setSentiment] = useState({ label: "Neutral", score: 50, clarity: 80 });
  
  const scrollRef = useRef(null);
  const videoRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchInterview();
    startMedia();
    
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.emit("join_interview", id);

    newSocket.on("receive_message", (message) => {
      setMessages(prev => [...prev, message]);
      setIsTyping(false);
      if (message.senderRole === 'AI' || message.senderRole === 'FACULTY') {
        speakText(message.text);
      }
    });

    newSocket.on("interview_ended", () => {
      fetchInterview();
      toast({ title: "Interview Ended", description: "The session has been completed and analyzed." });
    });

    return () => {
      newSocket.disconnect();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, [id]);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
    } catch (err) {
      toast({ variant: "destructive", title: "Media Error", description: "Could not access camera or microphone." });
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Not Supported", description: "Your browser does not support voice recognition." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      analyzeSentiment(transcript);
    };
    recognition.start();
  };

  const analyzeSentiment = (text: string) => {
    const positiveWords = ['great', 'good', 'happy', 'confident', 'achieved', 'solved', 'efficient'];
    const negativeWords = ['difficult', 'hard', 'failed', 'unsure', 'problem', 'stuck'];
    
    let score = 50;
    const words = text.toLowerCase().split(' ');
    words.forEach(w => {
      if (positiveWords.includes(w)) score += 10;
      if (negativeWords.includes(w)) score -= 10;
    });

    score = Math.max(0, Math.min(100, score));
    setSentiment({
      label: score > 70 ? "Positive" : score < 40 ? "Concerned" : "Neutral",
      score,
      clarity: 85 + Math.random() * 10
    });
  };

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchInterview = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/interviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.data || response.data;
      setInterview(data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch interview", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load interview session." });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !socket) return;

    const messageData = {
      interviewId: id,
      senderRole: user.role,
      senderName: user.name || user.fullName || "Student",
      text: input
    };

    if (interview.type === 'AI') {
      setIsTyping(true);
      try {
        const token = localStorage.getItem('accessToken');
        setMessages(prev => [...prev, { ...messageData, createdAt: new Date() }]);
        setInput("");
        
        const response = await axios.post(`${API_BASE}/interviews/ai-respond`, 
          { interviewId: id, text: input },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setMessages(response.data.data?.messages || response.data.messages || []);
      } catch (error) {
        toast({ variant: "destructive", title: "AI Error", description: "AI failed to respond." });
      } finally {
        setIsTyping(false);
      }
    } else {
      socket.emit("send_message", messageData);
      setInput("");
    }
  };

  const finishInterview = async () => {
    setAnalyzing(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_BASE}/interviews/${id}/finish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterview(response.data.data || response.data);
      toast({ title: "Interview Completed", description: "Your performance has been analyzed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Analysis Error", description: "Failed to complete analysis." });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <DashboardLayout role={(user.role?.toLowerCase() || "student") as any}><div className="flex items-center justify-center h-[70vh]"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div></DashboardLayout>;

  if (interview?.status === 'COMPLETED') {
    return (
      <DashboardLayout role={(user.role?.toLowerCase() || "student") as any}>
        <div className="max-w-4xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
          <Button variant="ghost" onClick={() => navigate('/student/interview')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Interviews
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-primary/20 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Trophy className="h-64 w-64" />
              </div>
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/20">Final Report</Badge>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{new Date(interview.createdAt).toLocaleDateString()}</span>
                    </div>
                    <CardTitle className="text-4xl font-black tracking-tight mb-2">{interview.title}</CardTitle>
                    <CardDescription className="text-lg font-medium text-muted-foreground/80">Placement Readiness Intelligence Report</CardDescription>
                  </div>
                  <div className="bg-background/80 backdrop-blur-md p-6 rounded-2xl border-2 border-primary/20 shadow-xl text-center min-w-[180px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Readiness Score</div>
                    <div className="text-6xl font-black text-primary tabular-nums">
                      {Math.round(interview.overallScore)}<span className="text-2xl text-primary/60">%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${interview.overallScore}%` }} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-xl flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="text-green-500 h-5 w-5" /></div>
                      Key Strengths
                    </h3>
                    <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/10 text-sm leading-relaxed shadow-sm">
                      {interview.feedback || "AI is synthesizing your strengths based on the technical transcript..."}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-xl flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10"><AlertCircle className="text-amber-500 h-5 w-5" /></div>
                      Growth Areas
                    </h3>
                    <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm leading-relaxed shadow-sm">
                      Analyze the feedback for deep technical gaps. Focus on improving {interview.analysis?.problemSolving < 60 ? "Problem Solving" : "Communication"} skills for better placement chances.
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-dashed">
                  <h3 className="font-bold text-xl flex items-center gap-3">
                    <BarChart3 className="text-primary h-6 w-6" /> Performance Breakdown
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Technical", val: interview.analysis?.technical || 0, icon: <BrainCircuit className="h-4 w-4" /> },
                      { label: "Soft Skills", val: interview.analysis?.communication || 0, icon: <MessageSquare className="h-4 w-4" /> },
                      { label: "Confidence", val: interview.analysis?.confidence || 0, icon: <Sparkles className="h-4 w-4" /> },
                      { label: "Logic", val: interview.analysis?.problemSolving || 0, icon: <TrendingUp className="h-4 w-4" /> }
                    ].map(stat => (
                      <div key={stat.label} className="p-5 rounded-2xl bg-muted/30 border border-muted-foreground/5 hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          {stat.icon}
                          <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <div className="text-3xl font-black group-hover:text-primary transition-colors">{stat.val}%</div>
                        <div className="h-1 w-full bg-muted rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-primary/40 group-hover:bg-primary transition-all duration-500" style={{ width: `${stat.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-primary/10 shadow-xl flex flex-col h-[600px]">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Session Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-6">
                      {messages.map((m, idx) => (
                        <div key={idx} className={`flex flex-col ${m.senderRole === 'STUDENT' ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-2">
                            <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">{m.senderName}</span>
                          </div>
                          <div className={`p-4 rounded-2xl max-w-[90%] text-sm leading-relaxed shadow-sm ${
                            m.senderRole === 'STUDENT' 
                              ? 'bg-primary text-primary-foreground rounded-tr-none' 
                              : 'bg-muted/80 backdrop-blur-sm rounded-tl-none border'
                          }`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 bg-muted/30 border-t justify-center">
                  <p className="text-[10px] text-muted-foreground font-medium italic">Transcript generated by PlaceReady NLP Engine</p>
                </CardFooter>
              </Card>
              
              <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => navigate('/student/interview')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={(user.role?.toLowerCase() || "student") as any}>
      <div className="h-[calc(100vh-140px)] flex flex-col gap-4 max-w-6xl mx-auto">
        <header className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${interview.type === 'AI' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
              {interview.type === 'AI' ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="font-bold text-lg">{interview.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] uppercase">{interview.mode}</Badge>
                <span>• Session ID: {id?.slice(0,8)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={finishInterview} disabled={analyzing}>
              {analyzing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <X className="h-4 w-4 mr-2" />}
              End & Analyze
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex gap-4">
          <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/5 relative">
            {/* Live Video Overlay */}
            <div className="absolute top-4 right-4 w-48 h-32 rounded-xl overflow-hidden border-2 border-primary shadow-xl z-10 bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                muted={true} 
                playsInline 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} 
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <VideoOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex gap-3 ${m.senderRole === 'STUDENT' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
                      <div className={`mt-1 p-2 rounded-full h-fit ${m.senderRole === 'STUDENT' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {m.senderRole === 'STUDENT' ? <User className="h-4 w-4" /> : m.senderRole === 'AI' ? <Bot className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className={`flex flex-col max-w-[75%] ${m.senderRole === 'STUDENT' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          m.senderRole === 'STUDENT' 
                            ? 'bg-primary text-primary-foreground rounded-tr-none shadow-blue-500/10 shadow-lg' 
                            : 'bg-muted rounded-tl-none border shadow-sm'
                        }`}>
                          {m.text}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="mt-1 p-2 rounded-full h-fit bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted p-4 rounded-2xl rounded-tl-none">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 bg-muted/30 border-t">
              <form 
                className="flex w-full items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              >
                <div className="flex gap-1">
                  <Button 
                    type="button" 
                    variant={isListening ? "destructive" : "ghost"} 
                    size="icon" 
                    className={`rounded-full h-10 w-10 ${isListening ? 'animate-pulse' : ''}`}
                    onClick={startVoiceInput}
                  >
                    <Mic className={`h-5 w-5 ${isListening ? 'text-white' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                <Input 
                  placeholder="Type your response or use voice..." 
                  className="flex-1 h-12 rounded-full border-2 focus-visible:ring-primary px-6"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTyping}
                />
                <Button type="submit" size="icon" className="rounded-full h-12 w-12 shrink-0 shadow-lg shadow-primary/20" disabled={!input.trim() || isTyping}>
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </CardFooter>
          </Card>
          
          <div className="w-72 hidden lg:flex flex-col gap-4 animate-in slide-in-from-right duration-500">
            <Card className="border-primary/10 shadow-lg shadow-primary/5">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="h-3 w-3 text-primary" /> Interview Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Button 
                  variant={isVideoOff ? "destructive" : "outline"} 
                  className="w-full justify-start text-xs h-10 group transition-all hover:pl-5"
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4 text-primary" />}
                  {isVideoOff ? "Video Disabled" : "Video Enabled"}
                </Button>
                <Button 
                  variant={isMuted ? "destructive" : "outline"} 
                  className="w-full justify-start text-xs h-10 group transition-all hover:pl-5"
                  onClick={toggleMic}
                >
                  {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4 text-primary" />}
                  {isMuted ? "Muted" : "Unmuted"}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="flex-1 bg-gradient-to-b from-primary/5 via-transparent to-transparent border-primary/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <BrainCircuit className="h-32 w-32" />
              </div>
              <CardHeader className="p-4 border-b bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" /> Live Analysis
                    </CardTitle>
                    <CardDescription className="text-[10px]">Real-time NLP active</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] animate-pulse">LIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Emotion/Sentiment</span>
                    <span className={sentiment.score > 60 ? "text-green-500" : sentiment.score < 40 ? "text-red-500" : "text-amber-500"}>
                      {sentiment.label}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden p-0.5 border">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-in-out shadow-sm ${sentiment.score > 60 ? 'bg-gradient-to-r from-green-400 to-green-600' : sentiment.score < 40 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`} 
                      style={{ width: `${sentiment.score}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Speech Clarity</span>
                    <span className="text-primary font-bold">{Math.round(sentiment.clarity)}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden p-0.5 border">
                    <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-in-out shadow-sm" style={{ width: `${sentiment.clarity}%` }} />
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-background/80 border-2 border-primary/5 backdrop-blur-sm shadow-inner text-[11px] leading-relaxed font-medium italic text-muted-foreground relative group">
                  <div className="absolute -top-2 -left-2 bg-primary/10 rounded-full p-1 border">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  {sentiment.score > 70 
                    ? "Great confidence! Keep maintaining this tone." 
                    : sentiment.score < 40 
                      ? "You seem slightly unsure. Take a breath and focus on key points."
                      : "Maintaining a steady pace. Try to add more enthusiasm."}
                </div>

                <div className="pt-4 border-t border-dashed">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    Monitoring transcript for keywords...
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default InterviewRoom;
