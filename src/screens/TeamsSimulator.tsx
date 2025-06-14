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
  Grid3X3,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DailyProvider, DailyAudio, useDaily, useLocalSessionId, useParticipantIds, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import Video from '@/components/Video';

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
  conversation?: any;
}> = ({ participant, isActive = false, isTavusMode = false, conversation }) => {
  const daily = useDaily();
  const remoteParticipantIds = useParticipantIds({ filter: "remote" });
  
  // If this is Charlie and we're in Tavus mode with a conversation, show the actual video
  if (isTavusMode && participant.id === 'charlie' && conversation?.conversation_url) {
    // Join the Daily call if not already joined
    useEffect(() => {
      if (conversation?.conversation_url && daily) {
        daily.join({
          url: conversation.conversation_url,
          startVideoOff: false,
          startAudioOff: true,
        }).then(() => {
          daily.setLocalVideo(true);
          daily.setLocalAudio(false);
        });
      }
    }, [conversation?.conversation_url, daily]);

    // Show the remote participant video if available
    if (remoteParticipantIds.length > 0) {
      return (
        <div className={cn(
          "relative bg-gray-900 rounded-lg overflow-hidden border-2 transition-all duration-300",
          "border-blue-500 shadow-lg shadow-blue-500/30"
        )}>
          <Video
            id={remoteParticipantIds[0]}
            className="aspect-video w-full h-full"
            tileClassName="!object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            Tavus AI (Charlie)
          </div>
        </div>
      );
    }
  }

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
              <p className="font-medium">Connecting...</p>
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
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const localVideo = useVideoTrack(localSessionId);
  const localAudio = useAudioTrack(localSessionId);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-green-500 shadow-lg shadow-green-500/30">
      <div className="aspect-video w-full h-full">
        {localSessionId && daily ? (
          <Video
            id={localSessionId}
            className="w-full h-full"
            tileClassName="!object-cover"
          />
        ) : isVideoOff ? (
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

const TeamsSimulatorContent: React.FC = () => {
  const [, setScreenState] = useAtom(screenAtom);
  const [conversation, setConversation] = useAtom(conversationAtom);
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
  
  // Speech recognition support and error states
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Daily.co integration
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const localVideo = useVideoTrack(localSessionId);
  const localAudio = useAudioTrack(localSessionId);
  const isCameraEnabled = !localVideo.isOff;
  const isMicEnabled = !localAudio.isOff;
  
  // Check Speech Recognition support on mount
  useEffect(() => {
    const checkSpeechRecognitionSupport = () => {
      const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setSpeechRecognitionSupported(isSupported);
      
      if (!isSupported) {
        setErrorMessage('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari for the best experience.');
      }
    };
    
    checkSpeechRecognitionSupport();
  }, []);
  
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
      setErrorMessage('Unable to access camera and microphone. Please allow permissions and refresh the page.');
    }
  };
  
  const initializeSpeechRecognition = () => {
    if (!speechRecognitionSupported) {
      setErrorMessage('Speech recognition is not supported in your browser.');
      return false;
    }
    
    try {
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
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please speak clearly into your microphone.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}. Please try again.`);
        }
      };
      
      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start(); // Restart if still recording
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
            setErrorMessage('Speech recognition stopped unexpectedly. Please try again.');
          }
        }
      };
      
      recognitionRef.current = recognition;
      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setErrorMessage('Failed to initialize speech recognition. Please refresh the page and try again.');
      return false;
    }
  };
  
  const startPresentation = () => {
    // Clear any previous error messages
    setErrorMessage(null);
    
    // Check if API token is available
    if (!token) {
      setErrorMessage('API token is missing. Please check your settings and ensure you have a valid token.');
      return;
    }
    
    // Check speech recognition support
    if (!speechRecognitionSupported) {
      setErrorMessage('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    setIsPresenting(true);
    setPresentationStartTime(new Date());
    setIsRecording(true);
    setTranscript('');
    
    const initialized = initializeSpeechRecognition();
    if (initialized && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setErrorMessage('Failed to start speech recognition. Please check your microphone permissions.');
        setIsPresenting(false);
        setIsRecording(false);
      }
    } else {
      setIsPresenting(false);
      setIsRecording(false);
    }
  };
  
  const endPresentation = async () => {
    setIsPresenting(false);
    setIsRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Clean and prepare the transcript
    const cleanTranscript = transcript.trim();
    
    console.log('=== PRESENTATION ENDED ===');
    console.log('Raw transcript:', transcript);
    console.log('Clean transcript length:', cleanTranscript.length);
    console.log('Word count:', cleanTranscript.split(' ').filter(word => word.length > 0).length);
    console.log('Duration:', presentationDuration, 'seconds');
    
    // Check for missing token
    if (!token) {
      setErrorMessage('Cannot create conversation: API token is missing. Please check your settings and ensure you have a valid token.');
      return;
    }
    
    // Check for empty transcript
    if (cleanTranscript.length === 0) {
      setErrorMessage('Cannot create conversation: No speech was detected during your presentation. Please ensure your microphone is working and try presenting again.');
      return;
    }
    
    // Check for very short transcript (likely insufficient content)
    const wordCount = cleanTranscript.split(' ').filter(word => word.length > 0).length;
    if (wordCount < 5) {
      setErrorMessage(`Cannot create conversation: Only ${wordCount} words were detected. Please speak more during your presentation to provide enough content for the AI to discuss.`);
      return;
    }
    
    // Transition to Tavus mode
    setShowTavusMode(true);
    setIsLoadingQuestions(true);
    
    // Generate contextual questions based on transcript
    const questions = generateQuestionsFromTranscript(cleanTranscript);
    setGeneratedQuestions(questions);
    
    // Update settings with the transcript as conversational context
    const updatedSettings = {
      ...settings,
      // CRITICAL: Send ONLY the presentation transcript as conversational context
      context: cleanTranscript,
      greeting: "Hi! I just listened to your presentation and I'm curious to learn more about it. I have some questions I'd love to ask you about what you shared.",
      // Use the correct Persona ID as specified
      persona: "pcce34deac2a",
      // Use the correct Replica ID as specified  
      replica: "rb17cf590e15"
    };
    
    console.log('=== UPDATING SETTINGS FOR TAVUS ===');
    console.log('Settings being saved:', {
      contextLength: updatedSettings.context.length,
      personaId: updatedSettings.persona,
      replicaId: updatedSettings.replica,
      greeting: updatedSettings.greeting
    });
    
    // Update the settings atom with the new context
    setSettings(updatedSettings);
    
    // Also save to localStorage for persistence
    localStorage.setItem('tavus-settings', JSON.stringify(updatedSettings));
    
    // Verify the settings were saved correctly
    const savedSettings = localStorage.getItem('tavus-settings');
    console.log('Verified saved settings:', JSON.parse(savedSettings || '{}'));
    
    try {
      console.log('=== CREATING TAVUS CONVERSATION ===');
      console.log('Token available:', !!token);
      console.log('Transcript ready for API:', cleanTranscript.substring(0, 100) + '...');
      
      // Create conversation with the updated context
      const conversation = await createConversation(token);
      setConversation(conversation);
      setIsLoadingQuestions(false);
      
      console.log('=== CONVERSATION CREATED SUCCESSFULLY ===');
      console.log('Conversation ID:', conversation.conversation_id);
      
      // Don't transition to conversation screen - stay in Teams mode
      // The conversation will appear in Charlie's video box
    } catch (error) {
      console.error('Error creating conversation:', error);
      setErrorMessage('Failed to create conversation with the AI. Please try again or check your internet connection.');
      setIsLoadingQuestions(false);
      setShowTavusMode(false);
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
    if (daily) {
      daily.setLocalAudio(!isMicEnabled);
    } else if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };
  
  const toggleVideo = () => {
    if (daily) {
      daily.setLocalVideo(!isCameraEnabled);
    } else if (stream) {
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
  
  const dismissError = () => {
    setErrorMessage(null);
  };
  
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Teams Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setScreenState({ currentScreen: 'intro' })}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
          <Button 
            onClick={() => setScreenState({ currentScreen: 'settings' })}
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Error Message Banner */}
      {errorMessage && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">{errorMessage}</span>
          </div>
          <Button
            onClick={dismissError}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-700"
          >
            ✕
          </Button>
        </div>
      )}
      
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-3 gap-4 h-full max-w-6xl mx-auto">
          {/* Top Row */}
          <UserVideo 
            videoRef={videoRef}
            isMuted={isMuted || !isMicEnabled}
            isVideoOff={isVideoOff || !isCameraEnabled}
          />
          <ParticipantVideo 
            participant={aiParticipants[0]} 
            isActive={showTavusMode && aiParticipants[0].id === 'charlie'}
            isTavusMode={showTavusMode}
            conversation={conversation}
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
      
      {/* Controls Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleMute}
            variant={isMuted || !isMicEnabled ? "destructive" : "secondary"}
            size="icon"
            className="rounded-full"
          >
            {isMuted || !isMicEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            variant={isVideoOff || !isCameraEnabled ? "destructive" : "secondary"}
            size="icon"
            className="rounded-full"
          >
            {isVideoOff || !isCameraEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
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
              disabled={!speechRecognitionSupported || !token}
              className={cn(
                "px-6 py-2 rounded-full font-semibold",
                speechRecognitionSupported && token
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              )}
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
        
        {/* Status Messages */}
        {!speechRecognitionSupported && (
          <div className="mt-2 text-center">
            <p className="text-sm text-red-400 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Speech recognition not supported. Please use Chrome, Edge, or Safari.
            </p>
          </div>
        )}
        
        {!token && speechRecognitionSupported && (
          <div className="mt-2 text-center">
            <p className="text-sm text-yellow-400 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              API token required. Please check your settings.
            </p>
          </div>
        )}
        
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
      
      <DailyAudio />
    </div>
  );
};

export const TeamsSimulator: React.FC = () => {
  return (
    <DailyProvider>
      <TeamsSimulatorContent />
    </DailyProvider>
  );
};