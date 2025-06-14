import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { screenAtom } from '@/store/screens';
import { conversationAtom } from '@/store/conversation';
import { createConversation } from '@/api';
import { apiTokenAtom } from '@/store/tokens';
import { settingsAtom } from '@/store/settings';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MoreHorizontal,
  Phone,
  Users,
  MessageSquare,
  Hand,
  Settings,
  Grid3X3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Speech recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// AI Participants data
const aiParticipants = [
  { id: 'charlie', name: 'Charlie', position: 'top-center', avatar: '/images/avatars/charlie.jpg' },
  { id: 'mark', name: 'Mark', position: 'top-right', avatar: '/images/avatars/mark.jpg' },
  { id: 'rav', name: 'Rav', position: 'middle-left', avatar: '/images/avatars/rav.jpg' },
  { id: 'sarah', name: 'Sarah B', position: 'middle-center', avatar: '/images/avatars/sarah.jpg' },
  { id: 'matty', name: 'Matty', position: 'middle-right', avatar: '/images/avatars/matty.jpg' },
  { id: 'klaus', name: 'Klaus', position: 'bottom-left', avatar: '/images/avatars/klaus.jpg' },
];

// Participant video component
const ParticipantVideo: React.FC<{
  participant: typeof aiParticipants[0];
  isActive?: boolean;
  isTavusMode?: boolean;
}> = ({ participant, isActive = false, isTavusMode = false }) => {
  return (
    <div className={cn(
      "relative bg-gray-900 rounded-lg overflow-hidden border-2 transition-all duration-300",
      isActive ? "border-blue-500 shadow-lg shadow-blue-500/30" : "border-gray-700"
    )}>
      <div className="aspect-video w-full h-full flex items-center justify-center">
        {isTavusMode && participant.id === 'charlie' ? (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="text-2xl">🤖</span>
              </div>
              <p className="font-medium">Tavus AI</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="text-2xl">{participant.name.charAt(0)}</span>
              </div>
              <p className="font-medium">{participant.name}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Participant name overlay */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
        {isTavusMode && participant.id === 'charlie' ? 'Tavus AI' : participant.name}
      </div>
      
      {/* Mute indicator */}
      <div className="absolute top-2 right-2">
        <div className="bg-red-500 rounded-full p-1">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      </div>
    </div>
  );
};

// User video component
const UserVideo: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement>;
  isMuted: boolean;
  isVideoOff: boolean;
}> = ({ videoRef, isMuted, isVideoOff }) => {
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-green-500 shadow-lg shadow-green-500/30">
      <div className="aspect-video w-full h-full">
        {isVideoOff ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="text-2xl">👤</span>
              </div>
              <p className="font-medium">You</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      {/* User name overlay */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
        You (Presenter)
      </div>
      
      {/* Mute/Video indicators */}
      <div className="absolute top-2 right-2 flex gap-1">
        {isMuted && (
          <div className="bg-red-500 rounded-full p-1">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
        {isVideoOff && (
          <div className="bg-red-500 rounded-full p-1">
            <VideoOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export const TeamsSimulator: React.FC = () => {
  const [, setScreenState] = useAtom(screenAtom);
  const [, setConversation] = useAtom(conversationAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [token] = useAtom(apiTokenAtom);
  
  // Media states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Presentation states
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentationStartTime, setPresentationStartTime] = useState<Date | null>(null);
  const [presentationDuration, setPresentationDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  // Post-presentation states
  const [showTavusMode, setShowTavusMode] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // Speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPresenting && presentationStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - presentationStartTime.getTime()) / 1000);
        setPresentationDuration(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPresenting, presentationStartTime]);
  
  // Initialize media on component mount
  useEffect(() => {
    initializeMedia();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  const initializeMedia = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };
  
  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };
    
    recognition.onend = () => {
      if (isRecording) {
        recognition.start(); // Restart if still recording
      }
    };
    
    recognitionRef.current = recognition;
  };
  
  const startPresentation = () => {
    setIsPresenting(true);
    setPresentationStartTime(new Date());
    setIsRecording(true);
    setTranscript('');
    
    initializeSpeechRecognition();
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };
  
  const endPresentation = async () => {
    setIsPresenting(false);
    setIsRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Transition to Tavus mode
    setShowTavusMode(true);
    setIsLoadingQuestions(true);
    
    // Generate contextual questions based on transcript
    const questions = generateQuestionsFromTranscript(transcript);
    setGeneratedQuestions(questions);
    
    // Update settings with ONLY the presentation transcript as conversational context
    const updatedSettings = {
      ...settings,
      context: transcript.trim(), // Only the transcript, no additional formatting
      greeting: "Hi! I just listened to your presentation and I'm curious to learn more about it. I have some questions I'd love to ask you about what you shared.",
      persona: "rb17cf590e15" // Use the specified replica ID
    };
    
    // Update the settings atom with the new context
    setSettings(updatedSettings);
    
    // Also save to localStorage for persistence
    localStorage.setItem('tavus-settings', JSON.stringify(updatedSettings));
    
    console.log('Presentation transcript being sent to Tavus:', {
      transcriptLength: transcript.length,
      wordCount: transcript.split(' ').filter(word => word.length > 0).length,
      duration: presentationDuration,
      replicaId: 'rb17cf590e15',
      context: transcript.trim()
    });
    
    try {
      if (token) {
        // Create conversation with the updated context
        const conversation = await createConversation(token);
        setConversation(conversation);
        setIsLoadingQuestions(false);
        
        // Transition to conversation after a brief delay
        setTimeout(() => {
          setScreenState({ currentScreen: 'conversation' });
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsLoadingQuestions(false);
    }
  };
  
  const generateQuestionsFromTranscript = (transcript: string): string[] => {
    // Generate questions that Charlie would ask about the presentation content
    const wordCount = transcript.split(' ').filter(word => word.length > 0).length;
    
    let questions = [
      "What inspired you to choose this topic?",
      "Can you tell me more about your main points?",
      "What do you hope people will remember most?"
    ];
    
    if (wordCount > 50) {
      questions = [
        "I found your presentation really interesting! What's the key takeaway you want people to have?",
        "Can you elaborate on some of the points you made?",
        "What questions do you think your audience might have?"
      ];
    }
    
    if (wordCount > 150) {
      questions = [
        "That was a comprehensive presentation! Which part are you most passionate about?",
        "I'd love to hear more about the details you shared - what's most important?",
        "What aspects would you like to explore further in our discussion?"
      ];
    }
    
    return questions;
  };
  
  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };
  
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Teams Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold">AI Presentation Coach</h1>
          {isPresenting && (
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Recording • {formatDuration(presentationDuration)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-3 gap-4 h-full max-w-6xl mx-auto">
          {/* Top Row */}
          <UserVideo 
            videoRef={videoRef}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
          />
          <ParticipantVideo 
            participant={aiParticipants[0]} 
            isActive={showTavusMode && aiParticipants[0].id === 'charlie'}
            isTavusMode={showTavusMode}
          />
          <ParticipantVideo participant={aiParticipants[1]} />
          
          {/* Middle Row */}
          <ParticipantVideo participant={aiParticipants[2]} />
          <ParticipantVideo participant={aiParticipants[3]} />
          <ParticipantVideo participant={aiParticipants[4]} />
          
          {/* Bottom Row */}
          <ParticipantVideo participant={aiParticipants[5]} />
          <div className="bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white flex flex-col items-center gap-2"
            >
              <Grid3X3 className="w-8 h-8" />
              <span className="text-sm">Add participant</span>
            </Button>
          </div>
          <div className="bg-gray-800 rounded-lg border-2 border-gray-700"></div>
        </div>
      </div>
      
      {/* Tavus Questions Overlay */}
      {showTavusMode && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Presentation Complete!</h2>
              <p className="text-gray-300">Charlie is now ready to ask you questions about your presentation</p>
              <p className="text-sm text-gray-400 mt-2">
                Duration: {Math.floor(presentationDuration / 60)}:{(presentationDuration % 60).toString().padStart(2, '0')} • 
                Words: {transcript.split(' ').filter(word => word.length > 0).length}
              </p>
            </div>
            
            {isLoadingQuestions ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Charlie is reviewing your presentation...</p>
                <p className="text-sm text-gray-400 mt-2">Preparing questions about your content</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Charlie wants to ask about:</h3>
                <ul className="space-y-2 mb-6">
                  {generatedQuestions.map((question, index) => (
                    <li key={index} className="text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      {question}
                    </li>
                  ))}
                </ul>
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-200">
                    <strong>Ready for Q&A:</strong> Your presentation transcript has been shared with Charlie so he can ask relevant questions about your content.
                  </p>
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Starting conversation with Charlie...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Controls Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="rounded-full"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            className="rounded-full"
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
          >
            <Monitor className="w-5 h-5" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
          >
            <Hand className="w-5 h-5" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          
          {!isPresenting ? (
            <Button
              onClick={startPresentation}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold"
            >
              🎤 Start Presentation
            </Button>
          ) : (
            <Button
              onClick={endPresentation}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-semibold animate-pulse"
            >
              ⏹️ End Presentation & Chat with Charlie
            </Button>
          )}
          
          <Button
            onClick={() => setScreenState({ currentScreen: 'intro' })}
            variant="destructive"
            size="icon"
            className="rounded-full"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
          </Button>
        </div>
        
        {isRecording && (
          <div className="mt-2 text-center">
            <p className="text-sm text-gray-400">
              🎤 Speech-to-text active • {transcript.split(' ').filter(word => word.length > 0).length} words transcribed
            </p>
            {transcript.length > 0 && (
              <p className="text-xs text-gray-500 mt-1 max-w-2xl mx-auto truncate">
                Latest: "{transcript.slice(-100)}..."
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};