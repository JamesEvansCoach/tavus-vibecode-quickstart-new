import { AnimatedWrapper } from "@/components/DialogWrapper";
import React from "react";
import { useAtom } from "jotai";
import { screenAtom } from "@/store/screens";
import { Presentation } from "lucide-react";
import AudioButton from "@/components/AudioButton";
import { apiTokenAtom } from "@/store/tokens";
import { Input } from "@/components/ui/input";
import gloriaVideo from "@/assets/video/gloria.mp4";

export const Intro: React.FC = () => {
  const [, setScreenState] = useAtom(screenAtom);
  const [token, setToken] = useAtom(apiTokenAtom);

  const handleStartDemo = () => {
    setScreenState({ currentScreen: "teamsSimulator" });
  };

  return (
    <AnimatedWrapper>
      <div className="flex size-full flex-col items-center justify-center">
        <video
          src={gloriaVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary-overlay backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center gap-2 py-4 px-4 rounded-xl border border-[rgba(255,255,255,0.2)]" 
          style={{ 
            fontFamily: 'Inter, sans-serif',
            background: 'rgba(0,0,0,0.3)'
          }}>
          <img src="/public/images/vector.svg" alt="Logo" className="mt-2 mb-1" style={{ width: '40px', height: 'auto' }} />

          <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Source Code Pro, monospace' }}>AI Presentation Coach</h1>
          <p className="text-sm text-gray-300 text-center mb-4 max-w-sm">
            Practice your presentations with AI participants, then get personalized feedback from Tavus AI
          </p>

          <div className="flex flex-col gap-2 items-center mt-4">
            <Input
              type="password"
              value={token || ""}
              onChange={(e) => {
                const newToken = e.target.value;
                setToken(newToken);
                localStorage.setItem('tavus-token', newToken);
              }}
              placeholder="Enter Tavus API Key"
              className="w-64 bg-[rgba(255,255,255,0.1)] text-white rounded-3xl border border-[rgba(255,255,255,0.3)] px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ 
                color: 'white', 
                fontFamily: 'Source Code Pro, monospace',
              }}
            />

            <p className="text-sm text-white transition-all duration-200">
              Don't have a key?{" "}
              <a
                href="https://platform.tavus.io/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Create an account.
              </a>
            </p>
          </div>

          <AudioButton 
            onClick={handleStartDemo}
            className="relative z-20 flex items-center justify-center gap-2 rounded-3xl border border-[rgba(255,255,255,0.3)] px-6 py-3 text-base text-white transition-all duration-200 hover:text-primary mt-6 disabled:opacity-50 font-semibold"
            disabled={!token}
            style={{
              height: '52px',
              transition: 'all 0.2s ease-in-out',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 254, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Presentation className="size-5" />
            Start Presentation Demo
          </AudioButton>
        </div>
      </div>
    </AnimatedWrapper>
  );
};