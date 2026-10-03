'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Mic, MicOff, Volume2, Globe, Sparkles, ExternalLink, ShieldCheck,
  RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Zap, PhoneOff,
  Radio, BookOpen, GraduationCap, Building2, Layers, MessageSquare,
  ArrowRight, Languages, Sparkle, FileText, Check
} from 'lucide-react';
import {
  api, CollegeWebSearchProject, VoiceSourceItem,
  VoiceSearchToolResponse
} from '@/lib/api';
import { MarkdownContent } from '@/components/MarkdownContent';

interface VoiceMessageItem {
  id: string;
  role: 'user' | 'assistant';
  spokenText?: string;
  content: string; // Detailed grounded markdown text with tables/lists
  sources?: VoiceSourceItem[];
  sources_count?: number;
  timestamp: string;
}

type VoiceState = 'ready' | 'connecting' | 'listening' | 'searching' | 'speaking' | 'error' | 'disconnected';

function CollegeVoiceSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProjectId = searchParams.get('project_id') || '';

  // Project state
  const [projects, setProjects] = useState<CollegeWebSearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectId);
  const [activeProject, setActiveProject] = useState<CollegeWebSearchProject | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Language & Voice State
  const [language, setLanguage] = useState<'en-IN' | 'hi'>('en-IN');
  const [selectedVoice, setSelectedVoice] = useState('verse'); // Verse/Alloy with Indian prompt
  const [voiceMode, setVoiceMode] = useState<'hands_free' | 'push_to_talk'>('hands_free');
  const [isPushTalking, setIsPushTalking] = useState(false);
  const isPushTalkingRef = useRef(false);

  // Realtime Voice Session State
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [statusDetail, setStatusDetail] = useState<string>('Ready to start voice conversation');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Conversation Transcripts & Sources
  const [messages, setMessages] = useState<VoiceMessageItem[]>([]);
  const [currentAssistantText, setCurrentAssistantText] = useState<string>('');
  const [pendingToolResult, setPendingToolResult] = useState<VoiceSearchToolResponse | null>(null);

  // WebRTC Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedCallIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAssistantText, statusDetail]);

  // Push-to-Talk Spacebar support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && voiceMode === 'push_to_talk' && voiceState !== 'disconnected' && voiceState !== 'error' && voiceState !== 'connecting') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          return;
        }
        e.preventDefault();
        handlePushTalkStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && voiceMode === 'push_to_talk') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          return;
        }
        e.preventDefault();
        handlePushTalkEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [voiceMode, voiceState]);

  // Load college projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const current = projects.find(p => p.id === activeProjectId) || projects[0];
      if (current) {
        setActiveProjectId(current.id);
        setActiveProject(current);
      }
    }
  }, [activeProjectId, projects]);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const list = await api.listCollegeProjects();
      setProjects(list);
      if (list.length > 0) {
        const targetId = initialProjectId && list.some(p => p.id === initialProjectId)
          ? initialProjectId
          : list[0].id;
        setActiveProjectId(targetId);
        setActiveProject(list.find(p => p.id === targetId) || list[0]);
      }
    } catch (err) {
      console.error('Failed to load college projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleEndSession = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    processedCallIdsRef.current.clear();
    setIsPushTalking(false);
    isPushTalkingRef.current = false;
    setVoiceState('disconnected');
    setStatusDetail(
      language === 'hi'
        ? 'वॉयस सेशन समाप्त हुआ। दोबारा बात करने के लिए स्टार्ट पर क्लिक करें।'
        : 'Voice session ended. Click Start Voice Search to speak again.'
    );
  };

  const handlePushTalkStart = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (voiceMode !== 'push_to_talk' || voiceState === 'disconnected' || voiceState === 'connecting' || voiceState === 'error') return;
    if (isPushTalkingRef.current) return;

    isPushTalkingRef.current = true;
    setIsPushTalking(true);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
    setVoiceState('listening');
    setStatusDetail(
      language === 'hi' ? '🎙️ बोलिए... सवाल खत्म होने पर बटन छोड़ें' : '🎙️ Recording... Release button when you finish speaking'
    );
  };

  const handlePushTalkEnd = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (voiceMode !== 'push_to_talk') return;
    if (!isPushTalkingRef.current) return;

    isPushTalkingRef.current = false;
    setIsPushTalking(false);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }

    setVoiceState('searching');
    setStatusDetail(
      language === 'hi' ? '⏳ आवाज़ प्रोसेस की जा रही है...' : '⏳ Processing speech & searching...'
    );

    // Commit buffer and request model response
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
      } catch (err) {
        console.error('Failed to commit push-to-talk buffer:', err);
      }
    }
  };

  const handleStartVoice = async () => {
    if (voiceState !== 'disconnected' && voiceState !== 'error') {
      handleEndSession();
      return;
    }

    setErrorMessage('');
    processedCallIdsRef.current.clear();
    setVoiceState('connecting');
    setStatusDetail(
      language === 'hi'
        ? 'माइक्रोफ़ोन अनुमति और रियल-टाइम वॉइस सेशन शुरू हो रहा है...'
        : 'Requesting microphone permission & creating Indian tone realtime session...'
    );

    try {
      // 1. Get user media (microphone access) with clean audio processing
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        localStreamRef.current = stream;

        // In Push-to-Talk mode, mute mic track immediately until user holds button
        if (voiceMode === 'push_to_talk') {
          stream.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      } catch (micErr: any) {
        setVoiceState('error');
        setErrorMessage(
          language === 'hi'
            ? 'माइक्रोफ़ोन अनुमति अस्वीकृत है। कृपया ब्राउज़र में माइक की अनुमति दें।'
            : 'Microphone access denied or unavailable. Please enable microphone permissions in your browser to use College Voice Search.'
        );
        setStatusDetail('Microphone permission required');
        return;
      }

      // 2. Obtain short-lived ephemeral session token from backend with calibrated VAD / Mode params
      const sessionData = await api.createVoiceSession(
        activeProjectId,
        selectedVoice,
        language,
        voiceMode,
        0.5,
        650
      );
      const ephemeralKey = sessionData.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error('Backend did not return ephemeral client secret for OpenAI Realtime.');
      }

      // 3. Initialize WebRTC Peer Connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Attach audio element to play remote stream
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = document.createElement('audio');
        remoteAudioRef.current.autoplay = true;
      }
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
        }
      };

      // Add local microphone audio track to WebRTC
      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Set up Realtime Data Channel for event handling
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => {
        setVoiceState('listening');
        if (voiceMode === 'push_to_talk') {
          setStatusDetail(
            language === 'hi'
              ? `पुश-टू-टॉक सक्रिय! ${activeProject?.college_name || 'कॉलेज'} से बात करने के लिए नीचे बटन दबाकर रखें (या Space दबाएं)।`
              : `Push-to-Talk active! Hold the button below (or Spacebar) to speak to ${activeProject?.college_name || 'the college'}.`
          );
        } else {
          setStatusDetail(
            language === 'hi'
              ? `${activeProject?.college_name || 'कॉलेज'} वॉइस असिस्टेंट तैयार है। अपना सवाल पूछें!`
              : `Connected to ${activeProject?.college_name || 'College'} Voice Agent. Speak your question in Indian English or Hindi!`
          );
        }
      };

      dc.onclose = () => {
        setVoiceState('disconnected');
        setStatusDetail('Session disconnected.');
      };

      dc.onerror = (err) => {
        console.error('DataChannel error:', err);
      };

      dc.onmessage = async (event) => {
        try {
          const realtimeEvent = JSON.parse(event.data);
          handleRealtimeEvent(realtimeEvent, dc);
        } catch (e) {
          console.error('Failed to parse realtime event JSON:', e);
        }
      };

      // 5. Create WebRTC offer and exchange SDP with OpenAI Realtime GA Calls endpoint
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime/calls';

      const sdpResponse = await fetch(baseUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        }
      });

      if (!sdpResponse.ok) {
        const sdpErr = await sdpResponse.text();
        throw new Error(`OpenAI Realtime SDP Handshake failed: ${sdpErr}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      };
      await pc.setRemoteDescription(answer);

      // Connection established
      setVoiceState('listening');
      if (voiceMode === 'push_to_talk') {
        setStatusDetail(
          language === 'hi'
            ? `कनेक्टेड! बोलने के लिए होल्ड करें (या Space दबाएं)...`
            : `Connected! Hold button or press Space to speak...`
        );
      } else {
        setStatusDetail(
          language === 'hi'
            ? `कनेक्टेड! ${activeProject?.college_name || 'कॉलेज'} के बारे में अपना सवाल बोलें...`
            : `Connected! Listening for your question about ${activeProject?.college_name || 'the college'}...`
        );
      }

    } catch (err: any) {
      console.error('Failed to start voice session:', err);
      setVoiceState('error');
      setErrorMessage(err.message || 'Failed to establish Realtime Voice WebRTC connection.');
      setStatusDetail('Connection failed. Please retry.');
      handleEndSession();
    }
  };

  const setMicrophoneMuted = (muted: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  };

  // Realtime Event Dispatcher
  const handleRealtimeEvent = async (event: any, dc: RTCDataChannel) => {
    console.log('[Realtime Event]', event.type, event);

    switch (event.type) {
      // User speech detected by Server VAD
      case 'input_audio_buffer.speech_started':
        setVoiceState('listening');
        setStatusDetail(
          language === 'hi' ? '🎙 आपकी आवाज़ सुन रहे हैं...' : '🎙 Listening to your speech...'
        );
        break;

      case 'input_audio_buffer.speech_stopped':
        setVoiceState('searching');
        setStatusDetail(
          language === 'hi' ? '⏳ सवाल समझा जा रहा है...' : '⏳ Processing speech...'
        );
        break;

      // User speech transcription completed
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && event.transcript.trim()) {
          const rawText = event.transcript.trim();
          const userText = rawText.replace(/[\uFFFD\u0000-\u001F]/g, '').trim();
          if (userText) {
            setMessages(prev => {
              // Avoid duplicate user message if already added
              if (prev.length > 0 && prev[prev.length - 1].role === 'user' && prev[prev.length - 1].content === userText) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: `user_${Date.now()}`,
                  role: 'user',
                  content: userText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ];
            });
          }
        }
        break;

      // AI Function Tool Calling: College Web Search (supports both function_call_arguments.done and output_item.done)
      case 'response.function_call_arguments.done':
      case 'response.output_item.done':
        const funcName = event.name || event.item?.name;
        const funcArgs = event.arguments || event.item?.arguments;
        const callId = event.call_id || event.item?.call_id || `call_${Date.now()}`;

        if (funcName === 'college_web_search') {
          if (processedCallIdsRef.current.has(callId)) {
            // Already processed this tool call ID to prevent double execution
            break;
          }
          processedCallIdsRef.current.add(callId);

          try {
            // Ensure mic stays locked
            setMicrophoneMuted(true);
            const args = JSON.parse(funcArgs || '{}');
            const query = args.query || 'general college info';
            setVoiceState('searching');
            setStatusDetail(
              language === 'hi'
                ? `🔎 ${activeProject?.base_domain || 'कॉलेज वेबसाइट'} पर "${query}" खोजा जा रहा है...`
                : `🔎 Searching ${activeProject?.base_domain || 'college website'} for "${query}"...`
            );

            // 1. EXECUTE EXISTING COLLEGE SEARCH BACKEND ENGINE + SYNTHESIZE DETAILED TEXT
            const searchResult: VoiceSearchToolResponse = await api.executeVoiceSearchTool(
              activeProjectId,
              query,
              3,
              language
            );

            setPendingToolResult(searchResult);

            // 2. IMMEDIATELY RENDER DETAILED MARKDOWN & SOURCES CARD ON SCREEN
            const assistantMsgId = `assistant_${Date.now()}`;
            setMessages(prev => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                spokenText: searchResult.summary_for_voice || `Found verified information for "${query}".`,
                content: searchResult.detailed_answer || searchResult.context,
                sources: searchResult.sources && searchResult.sources.length > 0 ? searchResult.sources : undefined,
                sources_count: searchResult.sources_used_count || (searchResult.sources ? searchResult.sources.length : 0),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);

            // 3. Send tool result back to OpenAI Realtime session so model speaks concise summary
            const toolOutputEvent = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify({
                  college_name: searchResult.college_name,
                  sources_count: searchResult.sources_used_count,
                  sources: searchResult.sources.map(s => ({ title: s.title, url: s.url })),
                  context: searchResult.context,
                  note: "Full breakdown tables and detailed course/fee lists are already displayed on the user's screen. Speak only a 1-3 sentence polite spoken summary."
                })
              }
            };

            if (dc.readyState === 'open') {
              dc.send(JSON.stringify(toolOutputEvent));
              dc.send(JSON.stringify({ type: 'response.create' }));
            }
          } catch (toolErr) {
            console.error('Failed to execute college web search tool:', toolErr);
            if (dc.readyState === 'open' && callId) {
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: callId,
                  output: JSON.stringify({
                    error: 'Could not fetch web page data.',
                    message: 'Please state information was not found in available official sources.'
                  })
                }
              }));
              dc.send(JSON.stringify({ type: 'response.create' }));
            }
          }
        } else if (event.type === 'response.output_item.done' && event.item?.role === 'assistant') {
          // Non-tool direct message (e.g. greeting "Hello")
          const textContent = event.item.content?.map((c: any) => c.transcript || c.text).filter(Boolean).join(' ') || '';
          if (textContent && textContent.trim()) {
            setMessages(prev => {
              // If last message is already assistant with this text, ignore
              if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
                return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, spokenText: textContent.trim() } : m);
              }
              return [
                ...prev,
                {
                  id: `assistant_${Date.now()}`,
                  role: 'assistant',
                  spokenText: textContent.trim(),
                  content: textContent.trim(),
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ];
            });
          }
        }
        break;

      // Streaming Spoken Answer Text
      case 'response.audio_transcript.delta':
      case 'response.text.delta':
        const delta = event.delta || event.text || '';
        setVoiceState('speaking');
        setStatusDetail(
          language === 'hi' ? '🔊 उत्तर दिया जा रहा है... (माइक रुका हुआ है)' : '🔊 Speaking answer... (Mic on hold)'
        );
        setCurrentAssistantText(prev => prev + delta);
        break;

      case 'response.audio_transcript.done':
      case 'response.text.done':
        const spokenDone = (event.transcript || event.text || '').trim();
        if (spokenDone) {
          setMessages(prev => {
            if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
              // Update last assistant message's spokenText
              return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, spokenText: spokenDone } : m);
            }
            // Add as new assistant message if none exists
            return [
              ...prev,
              {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                spokenText: spokenDone,
                content: pendingToolResult?.detailed_answer || spokenDone,
                sources: pendingToolResult?.sources,
                sources_count: pendingToolResult?.sources_used_count,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ];
          });
          setCurrentAssistantText('');
          setPendingToolResult(null);
        }
        break;

      case 'response.audio.done':
      case 'response.done':
        setVoiceState('listening');
        if (voiceMode === 'push_to_talk') {
          // Keep mic muted in push to talk until button is held
          setMicrophoneMuted(true);
          setIsPushTalking(false);
          isPushTalkingRef.current = false;
          setStatusDetail(
            language === 'hi'
              ? `🎙️ अगला सवाल पूछने के लिए बटन दबाकर रखें (या Space दबाएं)...`
              : `🎙️ Hold button or press Space to ask your next question...`
          );
        } else {
          // Re-enable microphone ONLY after full answer and audio are completely finished
          if (!isMuted) {
            setMicrophoneMuted(false);
          }
          setStatusDetail(
            language === 'hi'
              ? `🎙 सुन रहे हैं... ${activeProject?.college_name || 'कॉलेज'} के बारे में अगला सवाल पूछें।`
              : `🎙 Listening... Ask your next question about ${activeProject?.college_name || 'the college'}.`
          );
        }
        // If there is any leftover currentAssistantText that wasn't committed
        if (currentAssistantText && currentAssistantText.trim()) {
          const txt = currentAssistantText.trim();
          setMessages(prev => {
            if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
              return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, spokenText: txt } : m);
            }
            return [
              ...prev,
              {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                spokenText: txt,
                content: pendingToolResult?.detailed_answer || txt,
                sources: pendingToolResult?.sources,
                sources_count: pendingToolResult?.sources_used_count,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ];
          });
          setCurrentAssistantText('');
        }
        break;

      case 'error':
        if (!isMuted) {
          setMicrophoneMuted(false);
        }
        console.error('Realtime Server Error Event:', event);
        if (event.error?.message) {
          setStatusDetail(`Error: ${event.error.message}`);
        }
        break;

      default:
        break;
    }
  };

  const askQuery = async (queryText: string) => {
    // Add user message
    const userMsgId = `user_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // If active WebRTC data channel is open, send to OpenAI Realtime
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      setVoiceState('searching');
      setStatusDetail(
        language === 'hi'
          ? `🔎 "${queryText}" खोजा जा रहा है...`
          : `🔎 Searching for "${queryText}"...`
      );
      const event = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: queryText }]
        }
      };
      dataChannelRef.current.send(JSON.stringify(event));
      dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
    } else {
      // Execute backend search tool directly to display rich response & sources immediately
      setVoiceState('searching');
      setStatusDetail(
        language === 'hi'
          ? `🔎 ${activeProject?.college_name || 'कॉलेज'} की वेबसाइट पर खोजा जा रहा है...`
          : `🔎 Searching ${activeProject?.college_name || 'college'} website for "${queryText}"...`
      );
      try {
        const searchResult = await api.executeVoiceSearchTool(
          activeProjectId,
          queryText,
          3,
          language
        );
        setMessages(prev => [
          ...prev,
          {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            spokenText: searchResult.summary_for_voice || `Found verified information for "${queryText}".`,
            content: searchResult.detailed_answer || searchResult.context,
            sources: searchResult.sources,
            sources_count: searchResult.sources_used_count,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setVoiceState('disconnected');
        setStatusDetail('Verified details loaded from official college website.');
      } catch (err: any) {
        console.error('Direct search error:', err);
        setVoiceState('disconnected');
        setStatusDetail('Could not fetch results. Please retry.');
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const suggestedQuestions = language === 'hi' ? [
    'B.Tech CSE ki total fees structure kya hai?',
    'Engineering admission process aur eligibility criteria kya hai?',
    'Campus placements aur highest package kitna gaya hai?',
    'Hostel aur mess ki kya facilities aur room charges hain?',
    'Kaun-kaun si engineering branches aur courses available hain?'
  ] : [
    'What B.Tech courses are available?',
    'What is the detailed fee structure for engineering?',
    'Tell me about campus placements & highest package.',
    'What are the hostel and dining facilities?',
    'What is the admission procedure & eligibility criteria?'
  ];

  if (projectsLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
        </div>
        <div className="text-sm font-bold text-slate-800">Loading College Voice Search...</div>
        <p className="text-xs text-slate-500">Preparing Indian tone realtime voice session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-3 sm:py-5 px-2 sm:px-4 space-y-4 sm:space-y-5">
      {/* SINGLE UNIFIED WINDOW CONTAINER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col divide-y divide-slate-100">
        
        {/* WINDOW HEADER: Controls, Language, College & BETA Badge */}
        <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40 text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-300" /> Voice Web Search
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-[11px] font-black tracking-wider uppercase flex items-center gap-1">
                <Sparkle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300 fill-amber-300" /> BETA
              </span>
              <span className="px-2 py-0.5 sm:px-2.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5">
                <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 animate-pulse" />
                Indian Accent &bull; WebRTC
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
              {activeProject ? activeProject.college_name : 'College Voice Search'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              Voice answers concisely in natural Indian English/Hindi &bull; Full tables, fee breakdowns &amp; verified sources show on screen.
            </p>
          </div>

          {/* Controls: College Selector, Language Toggle, Voice Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto shrink-0">
            {/* College Project Selector */}
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-teal-500/30 flex items-center gap-2 min-w-0">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" />
              <select
                value={activeProjectId}
                onChange={(e) => {
                  const pId = e.target.value;
                  if (voiceState !== 'disconnected') handleEndSession();
                  setActiveProjectId(pId);
                  router.push(`/college-voice-search?project_id=${pId}`);
                }}
                className="bg-transparent text-xs font-bold text-teal-100 focus:outline-none cursor-pointer truncate w-full"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.college_name} ({p.base_domain})
                  </option>
                ))}
              </select>
            </div>

            {/* Language Toggle: English (India) / Hindi */}
            <div className="bg-slate-900/90 p-1 rounded-xl border border-teal-500/30 flex items-center justify-between sm:justify-start gap-1">
              <button
                type="button"
                onClick={() => {
                  if (voiceState !== 'disconnected') handleEndSession();
                  setLanguage('en-IN');
                }}
                className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  language === 'en-IN'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇮🇳 English</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (voiceState !== 'disconnected') handleEndSession();
                  setLanguage('hi');
                }}
                className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  language === 'hi'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇮🇳 Hinglish / हिंदी</span>
              </button>
            </div>

            {/* Voice Tone Selector */}
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-teal-500/30 flex items-center gap-1.5 text-xs font-bold text-teal-200">
              <Volume2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={voiceState !== 'disconnected' && voiceState !== 'error'}
                className="bg-transparent text-xs font-bold text-teal-100 focus:outline-none cursor-pointer disabled:opacity-50 truncate w-full"
              >
                <option value="verse" className="bg-slate-900 text-white">Indian Tone (Verse)</option>
                <option value="coral" className="bg-slate-900 text-white">Warm Tone (Coral)</option>
                <option value="alloy" className="bg-slate-900 text-white">Balanced (Alloy)</option>
                <option value="sage" className="bg-slate-900 text-white">Direct (Sage)</option>
                <option value="shimmer" className="bg-slate-900 text-white">Clear (Shimmer)</option>
              </select>
            </div>

            {/* Switch to Text Search Link */}
            <Link
              href={`/college-web-search?project_id=${activeProjectId || ''}`}
              className="bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-teal-500/30 text-xs font-bold text-teal-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Switch to Text Live Web Search"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Text Chat</span>
            </Link>
          </div>
        </div>

        {/* DUAL MODE SELECTOR BAR (Hands-Free vs Push-to-Talk) */}
        <div className="bg-slate-900 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Voice Mode:
            </span>
            <div className="inline-flex rounded-xl bg-slate-800/90 p-1 border border-teal-500/20 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  if (voiceState !== 'disconnected') handleEndSession();
                  setVoiceMode('hands_free');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  voiceMode === 'hands_free'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>⚡ Hands-Free Auto</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (voiceState !== 'disconnected') handleEndSession();
                  setVoiceMode('push_to_talk');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  voiceMode === 'push_to_talk'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>🎙️ Push-to-Talk (Hold)</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
            {voiceMode === 'hands_free' ? (
              <span className="flex items-center gap-1.5 text-teal-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Calibrated VAD (0.85 Threshold &bull; 450ms Silence Gate)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                100% Zero Background Voice &bull; Hold button or [Spacebar] to speak
              </span>
            )}
          </div>
        </div>

        {/* VOICE CONTROL ISLAND (Single Unified Window Top Section) */}
        <div className="p-4 sm:p-7 bg-gradient-to-b from-slate-50/80 to-white flex flex-col items-center text-center relative overflow-hidden space-y-4 sm:space-y-5">
          {/* Ambient Wave FX when active */}
          {(voiceState === 'listening' || voiceState === 'speaking' || isPushTalking) && (
            <div className={`absolute inset-0 pointer-events-none animate-pulse ${isPushTalking ? 'bg-red-50/60' : 'bg-teal-50/50'}`} />
          )}

          {/* Status Badge */}
          <div className="flex flex-wrap items-center justify-center gap-2 z-10">
            <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all ${
              isPushTalking
                ? 'bg-red-100 text-red-800 border border-red-300 ring-4 ring-red-500/30 animate-pulse'
                : voiceState === 'speaking'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-500/20 animate-pulse'
                : voiceState === 'listening'
                ? 'bg-teal-100 text-teal-800 border border-teal-300 ring-2 ring-teal-500/20'
                : voiceState === 'searching'
                ? 'bg-amber-100 text-amber-800 border border-amber-300 ring-2 ring-amber-500/20'
                : voiceState === 'connecting'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : voiceState === 'error'
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {isPushTalking && <Mic className="w-4 h-4 animate-bounce text-red-600" />}
              {!isPushTalking && voiceState === 'speaking' && <Volume2 className="w-4 h-4 animate-bounce text-emerald-600" />}
              {!isPushTalking && voiceState === 'listening' && <Mic className="w-4 h-4 animate-pulse text-teal-600" />}
              {!isPushTalking && voiceState === 'searching' && <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />}
              {!isPushTalking && voiceState === 'connecting' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
              {!isPushTalking && voiceState === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
              {!isPushTalking && voiceState === 'disconnected' && <Radio className="w-4 h-4 text-slate-400" />}
              
              <span className="uppercase tracking-wider">
                {isPushTalking && (language === 'hi' ? 'बोल रहे हैं... छोड़ते ही जवाब आएगा' : 'Recording Voice... Release to Send')}
                {!isPushTalking && voiceState === 'speaking' && (language === 'hi' ? 'उत्तर दिया जा रहा है' : 'Speaking Spoken Answer')}
                {!isPushTalking && voiceState === 'listening' && (
                  voiceMode === 'push_to_talk'
                    ? (language === 'hi' ? 'पुश-टू-टॉक: बोलने के लिए होल्ड करें' : 'Push-to-Talk: Hold to Speak')
                    : (language === 'hi' ? 'सुन रहे हैं... बोलिए' : 'Listening... Speak Now')
                )}
                {!isPushTalking && voiceState === 'searching' && (language === 'hi' ? 'वेबसाइट पर खोज जारी है' : 'Searching College Website')}
                {!isPushTalking && voiceState === 'connecting' && (language === 'hi' ? 'रियलटाइम कनेक्ट हो रहा है...' : 'Connecting Realtime')}
                {!isPushTalking && voiceState === 'error' && 'Session Error'}
                {!isPushTalking && voiceState === 'disconnected' && (language === 'hi' ? 'तैयार / Idle' : 'Ready / Idle')}
              </span>
            </span>

            {voiceMode === 'push_to_talk' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <span>Hold to speak &bull; [SPACE]</span>
              </span>
            )}
          </div>

          {/* Central Interactive Mic / Push-to-Talk Button */}
          <div className="relative z-10 py-1">
            {/* Ambient pulse rings */}
            {(voiceState === 'listening' || voiceState === 'speaking' || isPushTalking) && (
              <>
                <div className={`absolute inset-0 rounded-full animate-ping ${isPushTalking ? 'bg-red-400/30' : 'bg-teal-400/20'}`} />
                <div className={`absolute -inset-3 rounded-full animate-pulse ${isPushTalking ? 'bg-red-500/20' : 'bg-teal-500/10'}`} />
              </>
            )}

            {/* If DISCONNECTED: Start Button */}
            {(voiceState === 'disconnected' || voiceState === 'error') && (
              <button
                type="button"
                onClick={handleStartVoice}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-xl select-none group bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white ring-4 ring-teal-200 shadow-teal-600/30 hover:scale-105 active:scale-95"
              >
                <Mic className="w-9 h-9 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-extrabold mt-1 uppercase tracking-wider">
                  {voiceMode === 'push_to_talk' ? 'Start PTT' : 'Start Voice'}
                </span>
              </button>
            )}

            {/* If CONNECTING: Spinner */}
            {voiceState === 'connecting' && (
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center bg-teal-700 text-white ring-4 ring-teal-300/40 shadow-xl">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-[9px] font-extrabold mt-1 uppercase tracking-wider">Connecting</span>
              </div>
            )}

            {/* If CONNECTED in PUSH-TO-TALK MODE: Hold-to-speak Button */}
            {voiceMode === 'push_to_talk' && (voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'searching') && (
              <button
                type="button"
                onMouseDown={handlePushTalkStart}
                onMouseUp={handlePushTalkEnd}
                onMouseLeave={handlePushTalkEnd}
                onTouchStart={handlePushTalkStart}
                onTouchEnd={handlePushTalkEnd}
                onTouchCancel={handlePushTalkEnd}
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl select-none cursor-pointer group ${
                  isPushTalking
                    ? 'bg-gradient-to-tr from-red-600 to-rose-600 text-white ring-8 ring-red-400/50 scale-105 shadow-red-600/40'
                    : 'bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 ring-4 ring-amber-300 shadow-amber-500/30 hover:scale-105 active:scale-95'
                }`}
              >
                {isPushTalking ? (
                  <>
                    <Volume2 className="w-10 h-10 animate-pulse text-white" />
                    <span className="text-[10px] font-black mt-1 uppercase tracking-wider text-white">Release to Send</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10 text-slate-950 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black mt-1 uppercase tracking-wider">Hold to Speak</span>
                    <span className="text-[8px] font-bold text-slate-800/80 -mt-0.5">[Spacebar]</span>
                  </>
                )}
              </button>
            )}

            {/* If CONNECTED in HANDS-FREE MODE: Click to End Call */}
            {voiceMode === 'hands_free' && (voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'searching') && (
              <button
                type="button"
                onClick={handleEndSession}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-xl select-none group bg-gradient-to-tr from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white ring-4 ring-rose-300/50 shadow-rose-500/30 active:scale-95"
              >
                <PhoneOff className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-extrabold mt-1 uppercase tracking-wider">End Voice</span>
              </button>
            )}
          </div>

          {/* Status Subtitle */}
          <div className="space-y-1 max-w-xl z-10">
            <p className="text-sm font-semibold text-slate-800 transition-all">
              {statusDetail}
            </p>
            <p className="text-xs text-slate-500">
              {voiceState === 'disconnected'
                ? (voiceMode === 'push_to_talk'
                    ? (language === 'hi' ? 'पुश-टू-टॉक शुरू करें। बातचीत के दौरान बटन दबाकर रखेंगे तभी आपकी आवाज़ जाएगी।' : 'Start Push-to-Talk. Microphone only transmits while you hold the button or spacebar.')
                    : (language === 'hi' ? 'हैंड्स-फ्री वॉयस शुरू करें। बेहतर बैकग्राउंड नॉइज़ फिल्टर एक्टिव है।' : 'Start Hands-Free Voice. Realtime calibrated background noise filter active.'))
                : `${activeProject?.college_name} (${activeProject?.base_domain}) &bull; Indian Tone`}
            </p>
          </div>

          {/* Mute & Disconnect controls when active */}
          {(voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'searching') && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 z-10">
              {voiceMode === 'hands_free' && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    isMuted
                      ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-400/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-600" /> : <Mic className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleEndSession}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Voice Session</span>
              </button>
            </div>
          )}

          {/* Error alert if any */}
          {errorMessage && (
            <div className="w-full max-w-lg p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 text-left flex items-start gap-3 z-10">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block font-bold">Voice Error:</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* HORIZONTAL SUGGESTED QUESTIONS CHIPS */}
          <div className="w-full max-w-3xl pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none text-left z-10 pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Try:
            </span>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => askQuery(q)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:border-teal-300 text-slate-700 hover:text-teal-900 text-[11px] sm:text-xs whitespace-nowrap font-medium border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Mic className="w-3 h-3 text-teal-600" />
                <span>"{q}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* INTEGRATED LIVE RESPONSE & CONVERSATION FEED */}
        <div className="p-3.5 sm:p-6 bg-slate-50/50 flex flex-col space-y-4 sm:space-y-5 min-h-[350px] sm:min-h-[420px]">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MessageSquare className="w-4 h-4 text-teal-700 shrink-0" />
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Live Voice &amp; Detailed Output
              </h3>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[9px] sm:text-[10px] font-bold">
                Spoken + Tables
              </span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-[11px] sm:text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="space-y-4 sm:space-y-5 overflow-y-auto max-h-[550px] pr-0.5 sm:pr-1">
            {messages.length === 0 && !currentAssistantText && (
              <div className="text-center py-8 sm:py-12 text-slate-400 text-xs space-y-2 px-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-teal-600 shadow-sm">
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                </div>
                <div className="font-bold text-slate-700 text-xs sm:text-sm">No spoken messages yet</div>
                <p className="max-w-md mx-auto text-[11px] sm:text-xs text-slate-500">
                  Click <strong>Start Voice</strong> above and speak. The AI will speak a concise summary aloud, and all full detail tables (tuition fees, courses, hostel rates, criteria) will automatically appear right here!
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5 w-full`}
              >
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {m.role === 'user' ? 'You (Spoken)' : `${activeProject?.college_name || 'College'} AI`}
                  </span>
                  <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 sm:p-5 rounded-2xl max-w-full sm:max-w-3xl text-xs sm:text-sm leading-relaxed overflow-hidden ${
                    m.role === 'user'
                      ? 'bg-gradient-to-tr from-teal-800 to-emerald-800 text-white rounded-br-sm shadow-md'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {/* If assistant turn, show spoken headline + full rich markdown details */}
                  {m.role === 'assistant' ? (
                    <div className="space-y-3">
                      {/* Only display separate Spoken Answer callout if spokenText is distinctly different from content */}
                      {m.spokenText && m.content && m.content.trim() !== m.spokenText.trim() && (m.sources?.length || m.content.length > m.spokenText.length + 30) ? (
                        <div className="p-2.5 sm:p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 font-medium text-xs flex items-start gap-2">
                          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold text-teal-900 text-xs">Spoken Answer:</strong>
                            <p className="italic text-xs">"{m.spokenText}"</p>
                          </div>
                        </div>
                      ) : null}

                      {/* FULL DETAILED MARKDOWN CONTENT (Tables, Lists, Numbers) */}
                      <div className="pt-1 overflow-x-auto">
                        <MarkdownContent
                          content={m.content || m.spokenText || ''}
                          isUser={false}
                          className="text-slate-800"
                        />
                      </div>

                      {/* VERIFIED SOURCES TRANSPARENCY SECTION */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-teal-600" />
                              Sources used: <strong className="text-teal-800">{m.sources.length} official pages</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold">
                              Verified Official Site
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all flex items-start justify-between gap-2 group text-left"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-slate-800 group-hover:text-teal-800 truncate">
                                    {src.title}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                    {src.url.replace(/^https?:\/\/(www\.)?/, '')}
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 shrink-0 mt-0.5 transition-colors" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming assistant turn while speaking */}
            {currentAssistantText && (
              <div className="flex flex-col items-start space-y-1.5 animate-in fade-in duration-150">
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-teal-600 animate-bounce" />
                  Speaking Aloud...
                </span>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50 border border-teal-200 text-slate-800 text-xs sm:text-sm max-w-full sm:max-w-xl shadow-xs">
                  <p className="whitespace-pre-wrap font-medium">{currentAssistantText}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* BOTTOM HELPER BAR */}
        <div className="p-3 sm:p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-slate-500">
          <div className="flex items-center gap-1.5 sm:gap-2 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Domain-bound strictly to <strong>{activeProject?.base_domain}</strong>.</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/college-web-search?project_id=${activeProjectId}`}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>Switch to Text Search</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CollegeVoiceSearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto py-20 flex justify-center text-sm font-bold text-slate-600">
        Loading College Voice Search...
      </div>
    }>
      <CollegeVoiceSearchContent />
    </Suspense>
  );
}
