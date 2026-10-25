'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Mic, MicOff, Radio, ShieldCheck, FileText, Square,
  MessageSquare, AlertTriangle, ExternalLink,
  Volume2, VolumeX, Send, Loader2, Sparkles, Building2, Globe,
  Activity, Check, Layers, BarChart2, SplitSquareVertical, ArrowRight, RefreshCw, Cpu
} from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { MarkdownContent } from '@/components/MarkdownContent';
import { api, CollegeWebSearchProject, VoiceSourceItem } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  markdown?: string;
  spokenSummary?: string;
  sources?: VoiceSourceItem[];
  detectedIntent?: string;
  tone?: 'blue' | 'error' | 'amber';
}

const VOICE_OPTIONS = [
  { id: 'verse', label: 'Verse (Warm & Natural)' },
  { id: 'alloy', label: 'Alloy (Clear & Neutral)' },
  { id: 'coral', label: 'Coral (Friendly Counselor)' },
  { id: 'sage', label: 'Sage (Calm & Academic)' },
  { id: 'shimmer', label: 'Shimmer (Bright & Helpful)' },
];

type TranscriptionTestMode = 'baseline' | 'candidate' | 'native' | 'compare';

interface TranscriptMetric {
  partialText: string;
  finalText: string;
  firstDeltaMs: number | null;
  completionMs: number | null;
  speechDurationMs: number | null;
  isStreaming: boolean;
  isEmpty: boolean;
  error?: string | null;
}

interface WerResult {
  referenceWords: number;
  hypothesisWords: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  werPercent: number;
}

function computeWER(reference: string, hypothesis: string): WerResult {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const refWords = clean(reference).split(' ').filter(Boolean);
  const hypWords = clean(hypothesis).split(' ').filter(Boolean);

  const n = refWords.length;
  const m = hypWords.length;

  if (n === 0) {
    return {
      referenceWords: 0,
      hypothesisWords: m,
      substitutions: 0,
      deletions: 0,
      insertions: m,
      werPercent: m === 0 ? 0 : 100,
    };
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1      // insertion
        );
      }
    }
  }

  let i = n;
  let j = m;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refWords[i - 1] === hypWords[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++;
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      insertions++;
      j--;
    } else {
      break;
    }
  }

  const totalErrors = substitutions + deletions + insertions;
  const wer = (totalErrors / n) * 100;
  return {
    referenceWords: n,
    hypothesisWords: m,
    substitutions,
    deletions,
    insertions,
    werPercent: Math.round(wer * 10) / 10,
  };
}

const REPRESENTATIVE_QUERIES = [
  { id: 'en', label: '1. English (Fees)', text: 'What is the B.Tech CSE fee at Poornima University?' },
  { id: 'hi_roman', label: '2. Roman Hinglish', text: 'Poornima University mein B.Tech CSE ki fees kitni hai?' },
  { id: 'hi_dev', label: '3. Hindi Devanagari', text: 'मुझे बीटेक कंप्यूटर साइंस की फीस बताइए।' },
  { id: 'tech', label: '4. Mixed Technical', text: 'B.Tech Artificial Intelligence and Data Science ka admission process kya hai?' },
  { id: 'num', label: '5. Numbers / Lakhs', text: 'First year fee one lakh twenty thousand rupees hai kya?' },
  { id: 'acronym', label: '6. Acronyms (REAP/CUET)', text: 'REAP, CSE, AI aur CUET ke baare mein batao.' },
  { id: 'followup', label: '7. Follow-up Turn', text: 'Aur hostel fees kitni hai?' },
  { id: 'long', label: '8. Pauses & Natural Speech', text: 'Mujhe admission lena hai lekin mujhe pehle scholarship aur hostel ka fee structure dekhna hai' },
  { id: 'bilingual', label: '9. Bilingual Engineering', text: 'Civil and Mechanical engineering seats available hai kya?' },
  { id: 'transport', label: '10. Campus Services', text: 'Transport facility charges aur bus routes bataiye' },
];

export default function CollegeVoiceSearchPage() {
  // College Projects & Voice Configuration
  const [projects, setProjects] = useState<CollegeWebSearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('proj_poornima');
  const [selectedVoice, setSelectedVoice] = useState<string>('verse');
  const [lang, setLang] = useState<'en-IN' | 'hi'>('en-IN');
  const [voiceMode, setVoiceMode] = useState<'hands_free' | 'push_to_talk'>('push_to_talk');
  const [micProfile, setMicProfile] = useState<'near_field' | 'far_field'>('near_field');
  const [bargeIn, setBargeIn] = useState<boolean>(false);

  // WebRTC & Realtime Session State
  const [voiceState, setVoiceState] = useState<'off' | 'connecting' | 'live' | 'error'>('off');
  const [agentState, setAgentState] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'ignored'>('idle');
  const [statusText, setStatusText] = useState('Ready / idle');
  const [statusTone, setStatusTone] = useState<'slate' | 'live' | 'error' | 'connecting'>('slate');
  const [sessionId, setSessionId] = useState('');

  // Audio Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isPttHolding, setIsPttHolding] = useState(false);

  // Transcripts & Screen Output
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveAiSubtitle, setLiveAiSubtitle] = useState<string>('');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // WebRTC Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isManualMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const isPttHoldingRef = useRef<boolean>(false);
  const utteranceRef = useRef<any>(null);
  const activeProjectIdRef = useRef<string>(activeProjectId);
  const langRef = useRef<'en-IN' | 'hi'>(lang);
  const voiceModeRef = useRef<'hands_free' | 'push_to_talk'>(voiceMode);
  const micProfileRef = useRef<'near_field' | 'far_field'>(micProfile);
  const bargeInRef = useRef<boolean>(bargeIn);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  // Stable conversation history ref (avoids stale closures in handleRealtimeEvent)
  const messagesRef = useRef<ChatMessage[]>(messages);
  // Request deduplication sets (bounded to prevent unbounded growth)
  const inFlightItemIdsRef = useRef<Set<string>>(new Set());
  const completedItemIdsRef = useRef<Set<string>>(new Set());
  // Realtime audio response state tracking
  const isResponseActiveRef = useRef<boolean>(false);
  const unmuteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Session State Ref for Web Speech lifecycle
  const voiceStateRef = useRef<'off' | 'connecting' | 'live' | 'error'>(voiceState);

  // STT Engine State - Web Speech API set as primary baseline
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionTestMode>('native');
  const transcriptionModeRef = useRef<TranscriptionTestMode>('native');
  const [activeChatSource, setActiveChatSource] = useState<'baseline' | 'candidate' | 'native'>('native');
  const activeChatSourceRef = useRef<'baseline' | 'candidate' | 'native'>('native');
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [referenceText, setReferenceText] = useState<string>('');

  // Candidate (gpt-live-transcribe) WebRTC State & Refs
  const candidatePcRef = useRef<RTCPeerConnection | null>(null);
  const candidateDcRef = useRef<RTCDataChannel | null>(null);
  const [candidateStatus, setCandidateStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [candidateError, setCandidateError] = useState<string | null>(null);

  // Native Web Speech Recognition Ref & Browser Compatibility
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pttGraceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPttDrainingRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');
  const isProcessingTurnRef = useRef<boolean>(false);
  const [hasNativeSpeechSupport, setHasNativeSpeechSupport] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setHasNativeSpeechSupport(supported);
    }
  }, []);

  // Transcription Timing & Metric State
  const speechStartTimeRef = useRef<number | null>(null);
  const [baselineMetric, setBaselineMetric] = useState<TranscriptMetric>({
    partialText: '',
    finalText: '',
    firstDeltaMs: null,
    completionMs: null,
    speechDurationMs: null,
    isStreaming: false,
    isEmpty: false,
  });
  const [candidateMetric, setCandidateMetric] = useState<TranscriptMetric>({
    partialText: '',
    finalText: '',
    firstDeltaMs: null,
    completionMs: null,
    speechDurationMs: null,
    isStreaming: false,
    isEmpty: false,
  });
  const [nativeMetric, setNativeMetric] = useState<TranscriptMetric>({
    partialText: '',
    finalText: '',
    firstDeltaMs: null,
    completionMs: null,
    speechDurationMs: null,
    isStreaming: false,
    isEmpty: false,
  });

  useEffect(() => {
    transcriptionModeRef.current = transcriptionMode;
    if (transcriptionMode === 'candidate') {
      activeChatSourceRef.current = 'candidate';
      setActiveChatSource('candidate');
    } else if (transcriptionMode === 'native') {
      activeChatSourceRef.current = 'native';
      setActiveChatSource('native');
    } else if (transcriptionMode === 'baseline') {
      activeChatSourceRef.current = 'baseline';
      setActiveChatSource('baseline');
    }
  }, [transcriptionMode]);

  useEffect(() => {
    activeChatSourceRef.current = activeChatSource;
  }, [activeChatSource]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    micProfileRef.current = micProfile;
  }, [micProfile]);

  useEffect(() => {
    bargeInRef.current = bargeIn;
  }, [bargeIn]);

  useEffect(() => {
    isPttHoldingRef.current = isPttHolding;
  }, [isPttHolding]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const rawCollegeName = activeProject?.college_name || 'College / University';
  const collegeName = rawCollegeName.startsWith('http://') || rawCollegeName.startsWith('https://')
    ? (activeProject?.base_domain || rawCollegeName.replace(/^https?:\/\//, '').replace(/\/+$/, ''))
    : rawCollegeName;
  const domain = activeProject?.base_domain || 'college.edu';

  // Load real college projects on mount
  useEffect(() => {
    api.listCollegeProjects()
      .then((list) => {
        setProjects(list);
        if (list.length > 0 && !list.some((p) => p.id === activeProjectId)) {
          setActiveProjectId(list[0].id);
        }
      })
      .catch((err) => console.error('Failed to load college projects:', err));
  }, []);

  // Initial welcome screen message
  useEffect(() => {
    const hi = lang !== 'en-IN';
    setMessages([
      {
        id: 'init-' + activeProjectId + '-' + lang,
        role: 'assistant',
        markdown: `${hi ? 'नमस्ते! ' : 'Namaste! '}I am the **${collegeName}** real-time voice counselor. Tap the orb to start a live voice call, or tap a sample question on the left — verified fee tables, admission guidelines, and official sources appear right here.`
      }
    ]);
  }, [activeProjectId, collegeName, lang]);

  // Auto-scroll chat feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveAiSubtitle, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unmuteTimerRef.current) {
        clearTimeout(unmuteTimerRef.current);
        unmuteTimerRef.current = null;
      }
      stopVoiceSession();
    };
  }, []);

  // Gate or ungate physical microphone track (half-duplex / PTT)
  const setMicrophoneMuted = useCallback((muted: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, []);

  // Stop WebRTC session cleanly
  const stopVoiceSession = useCallback(() => {
    if (unmuteTimerRef.current) {
      clearTimeout(unmuteTimerRef.current);
      unmuteTimerRef.current = null;
    }
    inFlightItemIdsRef.current.clear();
    completedItemIdsRef.current.clear();
    isResponseActiveRef.current = false;

    // Teardown candidate WebRTC session if active
    if (candidateDcRef.current) {
      try {
        candidateDcRef.current.close();
      } catch (e) {}
      candidateDcRef.current = null;
    }
    if (candidatePcRef.current) {
      try {
        candidatePcRef.current.close();
      } catch (e) {}
      candidatePcRef.current = null;
    }
    setCandidateStatus('idle');

    // Teardown native Web Speech if running
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (pttGraceTimerRef.current) {
      clearTimeout(pttGraceTimerRef.current);
      pttGraceTimerRef.current = null;
    }
    isPttDrainingRef.current = false;
    accumulatedTranscriptRef.current = '';
    isProcessingTurnRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (e) {}
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceState('off');
    setAgentState('idle');
    setStatusText('Ready / idle');
    setStatusTone('slate');
    setSessionId('');
    setIsMuted(false);
    setIsPttHolding(false);
    isManualMutedRef.current = false;
    setActiveSearchQuery(null);
    setLiveAiSubtitle('');
  }, []);

  // Browser SpeechSynthesis audio engine - guarantees clear, audible spoken responses
  const speakWithSynthesis = useCallback((text: string, language: 'en-IN' | 'hi' = 'en-IN') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakerMutedRef.current) return;
    try {
      window.speechSynthesis.cancel();

      // Clean markdown tags & tables for natural audio narration
      const clean = text
        .replace(/\|.+?\|/g, ' ')
        .replace(/[-*#_`>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utteranceRef.current = utterance;
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) =>
        language === 'hi'
          ? (v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi'))
          : (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en-gb') || v.lang.toLowerCase().includes('en-us'))
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        isResponseActiveRef.current = true;
        setAgentState('speaking');
      };

      utterance.onend = () => {
        isResponseActiveRef.current = false;
        isProcessingTurnRef.current = false;
        setAgentState('idle');
        utteranceRef.current = null;
        if (voiceModeRef.current !== 'push_to_talk' && voiceStateRef.current === 'live' && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      };

      utterance.onerror = () => {
        isResponseActiveRef.current = false;
        isProcessingTurnRef.current = false;
        setAgentState('idle');
        utteranceRef.current = null;
        if (voiceModeRef.current !== 'push_to_talk' && voiceStateRef.current === 'live' && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      setAgentState('idle');
    }
  }, []);

  // Shared executor for final transcript (Web Speech API baseline / WebRTC Cloud fallback)
  const processFinalTranscript = useCallback(async (userText: string, msgId: string, source: 'baseline' | 'candidate' | 'native') => {
    // Deduplication check: prevent repeated processing of the same audio transcript event
    if (inFlightItemIdsRef.current.has(msgId) || completedItemIdsRef.current.has(msgId)) {
      console.warn(`[${source}] Skipping duplicate transcript event:`, msgId);
      return;
    }

    // Anti-echo filter: ignore bare URLs, domain names, or college name echoes from speakers
    const cleanT = userText.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').trim();
    const cleanD = (domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').trim();
    const cleanC = (collegeName || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').trim();

    // Whisper silence hallucinations filter (e.g., model outputs "Thank you." on zero audio)
    const WHISPER_HALLUCINATIONS = new Set([
      'thank you.',
      'thank you',
      'thanks.',
      'thanks',
      'thanks for watching.',
      'thanks for watching',
      'subtitles by the amara.org community',
      'you',
      'you.',
      'bye.',
      'bye',
      'okay.',
      'okay',
    ]);
    if (WHISPER_HALLUCINATIONS.has(cleanT)) {
      console.warn(`[${source}] Filtered Whisper silence hallucination artifact:`, userText);
      inFlightItemIdsRef.current.delete(msgId);
      completedItemIdsRef.current.add(msgId);
      setAgentState('idle');
      setStatusText('Live Voice Call Connected');
      return;
    }

    if (
      /^https?:\/\/[^\s]+$/i.test(userText) ||
      /^www\.[^\s]+$/i.test(userText) ||
      cleanT === cleanD ||
      cleanT === cleanC ||
      cleanT.replace(/\s+/g, '') === cleanD.replace(/\s+/g, '') ||
      cleanT.replace(/\s+/g, '') === cleanC.replace(/\s+/g, '')
    ) {
      console.warn(`[${source}] Ignored self-domain / URL echo transcript:`, userText);
      inFlightItemIdsRef.current.delete(msgId);
      completedItemIdsRef.current.add(msgId);
      return;
    }

    inFlightItemIdsRef.current.add(msgId);
    if (completedItemIdsRef.current.size > 100) {
      completedItemIdsRef.current.clear();
    }

    // 1. Show exact verbatim user speech transcript
    setMessages((prev) => {
      if (prev.some((m) => m.id === msgId)) return prev;
      return [
        ...prev,
        {
          id: msgId,
          role: 'user',
          text: userText,
        },
      ];
    });

    // 2. Set thinking & show "Checking official website..."
    setAgentState('thinking');
    setActiveSearchQuery(userText);
    setStatusText('Checking official website…');

    // 3. Build bounded conversation history from messagesRef
    const historyTurns = messagesRef.current
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.id !== msgId)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.role === 'user' ? (m.text || '') : (m.markdown || m.spokenSummary || ''),
      }))
      .filter((h) => h.content.trim().length > 0);

    try {
      // 4. Call POST /college-voice/turn
      const turnRes = await api.executeVoiceTurn({
        project_id: activeProjectIdRef.current,
        transcript: userText,
        language_hint: langRef.current,
        history: historyTurns,
        stt_meta: { source, model: source === 'native' ? 'web-speech-api' : (source === 'candidate' ? 'gpt-live-transcribe' : 'whisper-1') }
      });

      setActiveSearchQuery(null);

      // 5. Gating handling: if should_respond is false, keep user bubble, do NOT speak or create assistant card
      if (!turnRes.should_respond) {
        setAgentState('idle');
        setStatusText(voiceState === 'live' ? 'Live Voice Call Connected' : 'Ready / idle');
        if (voiceModeRef.current !== 'push_to_talk' && !isManualMutedRef.current) {
          setMicrophoneMuted(false);
        }
        completedItemIdsRef.current.add(msgId);
        inFlightItemIdsRef.current.delete(msgId);
        return;
      }

      const detailedAnswer = turnRes.display_markdown || 'Information verified from official website.';
      const spokenSummary = turnRes.spoken_summary || 'Here is the verified information.';
      const sources = turnRes.sources || [];
      const detectedIntent = turnRes.intent || 'general';

      // 6. Render full assistant card with detailed markdown and official sources
      const assistantTurnId = `turn-ai-${msgId}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantTurnId,
          role: 'assistant',
          markdown: detailedAnswer,
          spokenSummary: spokenSummary,
          sources: sources,
          detectedIntent: detectedIntent,
        },
      ]);

      // 7. Voice response: speak ONLY spoken_summary verbatim
      const activeDc = dataChannelRef.current;
      if (activeDc && activeDc.readyState === 'open' && spokenSummary) {
        setAgentState('speaking');
        if (!bargeInRef.current) {
          setMicrophoneMuted(true);
        }
        try {
          if (isResponseActiveRef.current) {
            try {
              activeDc.send(JSON.stringify({ type: 'response.cancel' }));
            } catch (e) {}
            isResponseActiveRef.current = false;
          }
          activeDc.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                conversation: 'none',
                instructions: `You are an audio text-to-speech reader. Speak the following text aloud word-for-word verbatim in a warm, polite Indian accent. Do not greet, do not add filler or commentary, do not answer questions on your own, and do not change any words:\n"${spokenSummary.replace(/"/g, "'")}"`,
              },
            })
          );
        } catch (e) {
          speakWithSynthesis(spokenSummary, langRef.current);
        }
      } else if (spokenSummary) {
        speakWithSynthesis(spokenSummary, langRef.current);
      } else {
        setStatusText('Live Voice Call Connected');
      }
    } catch (err: any) {
      console.error('Voice turn execution error:', err);
      setActiveSearchQuery(null);
      setAgentState('idle');
      setStatusText('Live Voice Call Connected');
      if (voiceModeRef.current !== 'push_to_talk' && !isManualMutedRef.current) {
        setMicrophoneMuted(false);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          tone: 'amber',
          markdown: 'Could not fetch details from the college website. Please try asking again.',
        },
      ]);
    } finally {
      completedItemIdsRef.current.add(msgId);
      inFlightItemIdsRef.current.delete(msgId);
    }
  }, [collegeName, domain, setMicrophoneMuted, speakWithSynthesis, voiceState]);

  // Handle incoming OpenAI Candidate (gpt-live-transcribe) DataChannel events
  const handleCandidateEvent = useCallback((event: any) => {
    const type = event.type;
    if (!type) return;

    switch (type) {
      case 'conversation.item.input_audio_transcription.delta': {
        const delta = event.delta || '';
        const now = Date.now();
        setCandidateMetric((prev) => ({
          ...prev,
          partialText: prev.partialText + delta,
          firstDeltaMs: prev.firstDeltaMs ?? (speechStartTimeRef.current ? now - speechStartTimeRef.current : null),
          isStreaming: true,
        }));
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const userText = (event.transcript || '').trim();
        const msgId = event.item_id || `turn-cand-${Date.now()}`;
        const now = Date.now();
        const completionMs = speechStartTimeRef.current ? now - speechStartTimeRef.current : null;

        setCandidateMetric((prev) => ({
          ...prev,
          finalText: userText,
          completionMs,
          isStreaming: false,
          isEmpty: !userText,
        }));

        // If candidate is active chat source, process for main chat & backend search
        if (
          transcriptionModeRef.current === 'candidate' ||
          (transcriptionModeRef.current === 'compare' && activeChatSourceRef.current === 'candidate')
        ) {
          processFinalTranscript(userText, msgId, 'candidate');
        }
        break;
      }

      case 'error':
        console.warn('[Candidate Event Error]', event.error);
        setCandidateError(event.error?.message || 'Candidate Realtime transcription error');
        break;

      default:
        break;
    }
  }, [processFinalTranscript]);

  // Handle incoming OpenAI Realtime WebRTC DataChannel events (Baseline)
  const handleRealtimeEvent = useCallback(async (realtimeEvent: any, dc: RTCDataChannel) => {
    const type = realtimeEvent.type;
    if (!type) return;

    switch (type) {
      case 'response.created':
        isResponseActiveRef.current = true;
        break;

      case 'input_audio_buffer.speech_started':
        speechStartTimeRef.current = Date.now();
        setBaselineMetric({
          partialText: '',
          finalText: '',
          firstDeltaMs: null,
          completionMs: null,
          speechDurationMs: null,
          isStreaming: true,
          isEmpty: false,
        });
        setCandidateMetric({
          partialText: '',
          finalText: '',
          firstDeltaMs: null,
          completionMs: null,
          speechDurationMs: null,
          isStreaming: true,
          isEmpty: false,
        });
        setAgentState('listening');
        setLiveAiSubtitle('');

        // Synchronize candidate buffer clear
        if (candidateDcRef.current && candidateDcRef.current.readyState === 'open') {
          try {
            candidateDcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
          } catch (e) {}
        }

        if (bargeInRef.current && isResponseActiveRef.current) {
          try {
            dc.send(JSON.stringify({ type: 'response.cancel' }));
          } catch (e) {}
          isResponseActiveRef.current = false;
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        setAgentState('thinking');
        // Synchronously commit candidate audio buffer if enough speech was captured (>=150ms)
        {
          const speechDur = speechStartTimeRef.current ? Date.now() - speechStartTimeRef.current : 0;
          if (candidateDcRef.current && candidateDcRef.current.readyState === 'open') {
            try {
              if (speechDur >= 150) {
                candidateDcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
              } else {
                // Discard sub-150ms noise click/pop to avoid OpenAI buffer too small error
                candidateDcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
              }
            } catch (e) {}
          }
        }
        break;

      case 'conversation.item.input_audio_transcription.delta': {
        const delta = realtimeEvent.delta || '';
        const now = Date.now();
        setBaselineMetric((prev) => ({
          ...prev,
          partialText: prev.partialText + delta,
          firstDeltaMs: prev.firstDeltaMs ?? (speechStartTimeRef.current ? now - speechStartTimeRef.current : null),
          isStreaming: true,
        }));
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const userText = (realtimeEvent.transcript || '').trim();
        const msgId = realtimeEvent.item_id || `turn-${Date.now()}`;
        const now = Date.now();
        const completionMs = speechStartTimeRef.current ? now - speechStartTimeRef.current : null;

        setBaselineMetric((prev) => ({
          ...prev,
          finalText: userText,
          completionMs,
          isStreaming: false,
          isEmpty: !userText,
        }));

        // If native speech recognition is not supported in this browser, process WebRTC fallback transcript
        const hasSpeech = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
        if (!hasSpeech || transcriptionModeRef.current === 'baseline') {
          processFinalTranscript(userText, msgId, 'baseline');
        }
        break;
      }

      case 'conversation.item.input_audio_transcription.failed':
        console.warn('Audio transcription failed:', realtimeEvent.error);
        setAgentState('idle');
        setStatusText('Live Voice Call Connected');
        break;

      case 'response.output_audio.delta':
      case 'response.audio.delta':
        isResponseActiveRef.current = true;
        setAgentState('speaking');
        if (voiceModeRef.current === 'push_to_talk') {
          setMicrophoneMuted(true);
        }
        break;

      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta': {
        isResponseActiveRef.current = true;
        const delta = realtimeEvent.delta || '';
        setAgentState('speaking');
        if (voiceModeRef.current === 'push_to_talk') {
          setMicrophoneMuted(true);
        }
        setLiveAiSubtitle((prev) => prev + delta);
        break;
      }

      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        setLiveAiSubtitle('');
        break;

      case 'response.output_audio.done':
      case 'response.audio.done':
      case 'response.done':
        // Immediately clear residual buffer on data channel to prevent echo ingestion
        if (dc && dc.readyState === 'open') {
          try {
            dc.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
          } catch (e) {}
        }
        if (unmuteTimerRef.current) {
          clearTimeout(unmuteTimerRef.current);
        }
        // Give 750ms buffer for device speakers to finish playing remote audio before opening mic
        unmuteTimerRef.current = setTimeout(() => {
          isResponseActiveRef.current = false;
          isProcessingTurnRef.current = false;
          setAgentState('idle');
          setStatusText('Live Voice Call Connected');
          if (voiceModeRef.current === 'push_to_talk') {
            setMicrophoneMuted(true);
          } else if (!isManualMutedRef.current) {
            setMicrophoneMuted(false);
          }
          // Resume speech recognition if call is still live so it is ready for next turn
          if (voiceStateRef.current === 'live' && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        }, 750);
        break;

      case 'error':
        isResponseActiveRef.current = false;
        console.warn('Realtime Event Notice:', realtimeEvent.error);
        if (realtimeEvent?.error?.code === 'conversation_already_has_active_response') {
          break; // Harmless in-flight collision, ignore
        }
        if (realtimeEvent?.error?.message && !realtimeEvent.error.message.includes('response in progress')) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'rt-err-' + Date.now(),
              role: 'system',
              tone: 'error',
              markdown: `**OpenAI Realtime Notice:** ${realtimeEvent.error.message}`,
            },
          ]);
        }
        break;

      default:
        break;
    }
  }, [setMicrophoneMuted]);

  // Start Realtime WebRTC Voice Session
  const startVoiceSession = async (
    overrideLang?: 'en-IN' | 'hi',
    overrideMode?: 'hands_free' | 'push_to_talk',
    overrideMicProfile?: 'near_field' | 'far_field',
    overrideBargeIn?: boolean,
    overrideProjectId?: string
  ) => {
    const sessionLang = overrideLang || lang;
    const sessionMode = overrideMode || voiceMode;
    const sessionMic = overrideMicProfile || micProfile;
    const sessionBargeIn = overrideBargeIn !== undefined ? overrideBargeIn : bargeIn;
    const sessionProjectId = overrideProjectId || activeProjectId;

    setVoiceState('connecting');
    setStatusText('Connecting WebRTC to Voice Desk…');
    setStatusTone('connecting');

    try {
      // Pre-unlock remote audio element on user click gesture
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch(() => {});
      }

      // 1. getUserMedia with strict constraints (echoCancellation, noiseSuppression, autoGainControl, channelCount 1)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      localStreamRef.current = stream;

      // In Push-to-Talk mode, mute mic until user holds PTT
      if (sessionMode === 'push_to_talk') {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      // 2. Request ephemeral token from FastAPI backend
      const vadThreshold = 0.5;
      const silenceMs = 650;

      const sessionData = await api.createVoiceSession(
        sessionProjectId,
        selectedVoice,
        sessionLang,
        sessionMode,
        sessionMic,
        sessionBargeIn,
        vadThreshold,
        silenceMs
      );

      const ephemeralKey = sessionData?.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error('Failed to obtain ephemeral client_secret from backend.');
      }

      // 3. Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('WebRTC peer connection closed/failed:', pc.connectionState);
          stopVoiceSession();
          setStatusText('Voice Connection Closed');
          setStatusTone('slate');
        }
      };

      // Add local microphone track (creates single primary audio transceiver)
      const audioTrack = stream.getAudioTracks()[0];
      pc.addTrack(audioTrack, stream);

      // Play remote audio from OpenAI Realtime
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          if (e.streams && e.streams[0]) {
            remoteAudioRef.current.srcObject = e.streams[0];
          } else if (e.track) {
            remoteAudioRef.current.srcObject = new MediaStream([e.track]);
          }
          remoteAudioRef.current.play().catch((err) => {
            console.warn('Autoplay waiting for user gesture:', err);
          });
        }
      };

      // 4. DataChannel
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => {
        const sid = (sessionData.session_id || 'rtc_live').slice(0, 12);
        setSessionId(sid);
        setVoiceState('live');
        setAgentState('idle');
        setStatusText('Live Voice Call Connected');
        setStatusTone('live');

        // Configure session with correct modalities and voice parameters
        try {
          const hasSpeechRecognition = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
          const collegePrompt = `${sessionData.college_name || collegeName}, Poornima University, Jaipur, B.Tech, BTech, M.Tech, BCA, MCA, MBA, CSE, AI, Data Science, Mechanical, Civil, Electrical, hostel fees, mess, tuition fee, admission, eligibility, scholarship, REAP, JEE, CUET`;
          const sessionUpdateMsg = {
            type: 'session.update',
            session: {
              type: 'realtime',
              instructions: `You are the official voice readout assistant for ${sessionData.college_name || collegeName}. Speak ONLY the text you are instructed to speak in response.create verbatim in a natural, polite Indian accent. Never answer on your own, and never add conversational filler.`,
              output_modalities: ['audio'],
              audio: {
                input: {
                  // If browser supports native Web Speech (Chrome, Edge, Safari, Android): use native (zero latency & 0 cost).
                  // If browser does NOT support native speech (e.g. Firefox): fallback to WebRTC Cloud Whisper STT.
                  transcription: hasSpeechRecognition ? null : {
                    model: 'whisper-1',
                    language: sessionLang === 'hi' ? 'hi' : 'en',
                    prompt: collegePrompt,
                  },
                  turn_detection: hasSpeechRecognition ? null : (
                    sessionMode === 'push_to_talk'
                      ? null
                      : {
                          type: 'server_vad',
                          threshold: 0.5,
                          prefix_padding_ms: 300,
                          silence_duration_ms: 650,
                          create_response: false,
                        }
                  ),
                },
                output: {
                  voice: selectedVoice,
                },
              },
            },
          };
          dc.send(JSON.stringify(sessionUpdateMsg));
        } catch (e) {}

        // Initial warm greeting directly from OpenAI Realtime model
        const greetingText =
          sessionLang === 'hi'
            ? `Namaste! Main ${sessionData.college_name || collegeName} ka official AI counselor hoon. Bataye main aapki kya madad kar sakta hoon?`
            : `Namaste! I am the official AI admission counselor for ${sessionData.college_name || collegeName}. How can I assist you with programs, admissions, or fees today?`;

        if (sessionMode === 'push_to_talk') {
          setMicrophoneMuted(true);
        } else {
          setMicrophoneMuted(false);
        }
        try {
          dc.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                conversation: 'none',
                instructions: `You are an audio text-to-speech reader. Speak the following greeting aloud word-for-word verbatim in a warm, polite Indian accent. Do not add any extra words, filler, or commentary:\n"${greetingText}"`,
              },
            })
          );
        } catch (e) {}
      };

      dc.onmessage = (e) => {
        try {
          const eventData = JSON.parse(e.data);
          handleRealtimeEvent(eventData, dc);
        } catch (parseErr) {
          console.error('Error parsing realtime event:', parseErr);
        }
      };

      dc.onclose = () => {
        stopVoiceSession();
      };

      // 5. SDP Offer/Answer with OpenAI Realtime endpoint
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      let sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        });
      }

      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(`Voice handshake failed (${sdpResponse.status}): ${errText}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      // 6. Initialize Native Web Speech API as Primary Baseline STT
      if (typeof window !== 'undefined') {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = sessionLang === 'hi' ? 'hi-IN' : 'en-IN';

            const commitSpeechTurn = (userText: string) => {
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              const cleanText = userText.trim();
              if (!cleanText || isProcessingTurnRef.current) return;

              isProcessingTurnRef.current = true;
              accumulatedTranscriptRef.current = '';
              setLiveAiSubtitle('');

              const turnId = `native-${Date.now()}`;
              processFinalTranscript(cleanText, turnId, 'native')
                .finally(() => {
                  isProcessingTurnRef.current = false;
                });
            };

            rec.onstart = () => {
              setAgentState('listening');
            };

            rec.onresult = (e: any) => {
              // 1. Echo suppression: do not transcribe speaker output when counselor is speaking (unless bargeIn OR actively holding PTT)
              if (isResponseActiveRef.current && !bargeInRef.current && !isPttHoldingRef.current) {
                return;
              }

              // 2. Push-to-Talk gate: only transcribe when user is actively holding PTT OR during trailing drain window
              if (voiceModeRef.current === 'push_to_talk' && !isPttHoldingRef.current && !isPttDrainingRef.current) {
                return;
              }

              // 3. Skip accumulating if currently searching / waiting for backend
              if (isProcessingTurnRef.current) {
                return;
              }

              let interim = '';
              let final = '';
              const now = Date.now();
              for (let i = 0; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                  final += e.results[i][0].transcript + ' ';
                } else {
                  interim += e.results[i][0].transcript + ' ';
                }
              }

              const latestSpeech = (final || interim || '').trim();
              if (!latestSpeech) return;

              accumulatedTranscriptRef.current = latestSpeech;

              setNativeMetric((prev) => ({
                ...prev,
                partialText: latestSpeech,
                firstDeltaMs: prev.firstDeltaMs ?? (speechStartTimeRef.current ? now - speechStartTimeRef.current : 80),
                isStreaming: true,
              }));

              // Show real-time streaming speech preview
              setLiveAiSubtitle(`🎙️ "${latestSpeech}"`);
              setAgentState('listening');

              // If browser marked it final, commit immediately!
              if (final.trim()) {
                commitSpeechTurn(final.trim());
                return;
              }

              // For hands-free: reset silence debounce timer (850ms) to auto-commit when user finishes speaking
              if (voiceModeRef.current !== 'push_to_talk') {
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                }
                silenceTimerRef.current = setTimeout(() => {
                  const speechToCommit = accumulatedTranscriptRef.current.trim();
                  if (speechToCommit) {
                    commitSpeechTurn(speechToCommit);
                  }
                }, 850);
              }
            };

            rec.onerror = (e: any) => {
              if (e.error !== 'no-speech') {
                console.warn('Native speech recognition notice:', e.error);
              }
            };

            rec.onend = () => {
              // Auto-restart if voice session is still live AND not currently processing turn
              if (
                voiceStateRef.current === 'live' &&
                recognitionRef.current &&
                !isProcessingTurnRef.current &&
                (!isResponseActiveRef.current || bargeInRef.current || isPttHoldingRef.current)
              ) {
                try {
                  rec.start();
                } catch (e) {}
              }
            };

            rec.start();
            recognitionRef.current = rec;
          } catch (srErr) {
            console.warn('Native speech recognition start error:', srErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to start voice session:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Could not establish voice connection. Check microphone permissions and backend API.';
      stopVoiceSession();
      setVoiceState('error');
      setStatusText('Voice Connection Notice');
      setStatusTone('error');
      setMessages((prev) => [
        ...prev,
        {
          id: 'sys-err-' + Date.now(),
          role: 'system',
          tone: 'error',
          markdown: `**Voice Connection Notice:** ${errMsg}`,
        },
      ]);
    }
  };

  const toggleVoiceSession = async () => {
    if (voiceState === 'live' || voiceState === 'connecting') {
      stopVoiceSession();
    } else {
      await startVoiceSession();
    }
  };

  // Push-to-Talk Press & Release handlers
  const startPttHold = useCallback(() => {
    if (voiceState !== 'live' || voiceMode !== 'push_to_talk') return;

    // 1. If counselor was actively speaking, cancel it immediately (barge-in on PTT hold)
    if (isResponseActiveRef.current) {
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        try {
          dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
        } catch (e) {}
      }
      isResponseActiveRef.current = false;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (pttGraceTimerRef.current) {
      clearTimeout(pttGraceTimerRef.current);
      pttGraceTimerRef.current = null;
    }
    isPttDrainingRef.current = false;

    setIsPttHolding(true);
    isPttHoldingRef.current = true;
    accumulatedTranscriptRef.current = '';
    setAgentState('listening');
    setLiveAiSubtitle('');
    speechStartTimeRef.current = Date.now();
    setBaselineMetric({
      partialText: '',
      finalText: '',
      firstDeltaMs: null,
      completionMs: null,
      speechDurationMs: null,
      isStreaming: true,
      isEmpty: false,
    });
    setCandidateMetric({
      partialText: '',
      finalText: '',
      firstDeltaMs: null,
      completionMs: null,
      speechDurationMs: null,
      isStreaming: true,
      isEmpty: false,
    });
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
    }
    if (candidateDcRef.current && candidateDcRef.current.readyState === 'open') {
      try {
        candidateDcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
      } catch (e) {}
    }
    setMicrophoneMuted(false);

    // Ensure native speech recognition is actively running whenever PTT is held
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }, [voiceState, voiceMode, setMicrophoneMuted]);

  const stopPttHold = useCallback(() => {
    if (voiceState !== 'live' || voiceMode !== 'push_to_talk' || !isPttHolding) return;
    setIsPttHolding(false);
    isPttHoldingRef.current = false;
    setMicrophoneMuted(true);
    setAgentState('thinking');

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Keep trailing drain window open for 250ms so in-flight speech chunk from browser recognizer arrives
    isPttDrainingRef.current = true;
    if (pttGraceTimerRef.current) {
      clearTimeout(pttGraceTimerRef.current);
    }

    pttGraceTimerRef.current = setTimeout(() => {
      isPttDrainingRef.current = false;
      const pttText = accumulatedTranscriptRef.current.trim();
      if (pttText && !isProcessingTurnRef.current) {
        accumulatedTranscriptRef.current = '';
        setLiveAiSubtitle('');
        isProcessingTurnRef.current = true;
        processFinalTranscript(pttText, `native-${Date.now()}`, 'native')
          .finally(() => {
            isProcessingTurnRef.current = false;
          });
      } else if (!pttText) {
        setAgentState('idle');
        setStatusText('Live Voice Call Connected');
      }
    }, 250);

    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    }
    if (candidateDcRef.current && candidateDcRef.current.readyState === 'open') {
      try {
        candidateDcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      } catch (e) {}
    }
  }, [voiceState, voiceMode, isPttHolding, setMicrophoneMuted, processFinalTranscript]);

  // Keyboard Spacebar shortcut for Push-to-Talk when connected
  useEffect(() => {
    if (voiceState !== 'live' || voiceMode !== 'push_to_talk') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        startPttHold();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        stopPttHold();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [voiceState, voiceMode, startPttHold, stopPttHold]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isManualMutedRef.current = nextMuted;
    setMicrophoneMuted(nextMuted);
  };

  const toggleSpeaker = () => {
    const nextMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextMuted);
    isSpeakerMutedRef.current = nextMuted;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextMuted;
    }
    if (nextMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setAgentState('idle');
    }
  };

  const setVoiceLanguage = (newLang: 'en-IN' | 'hi') => {
    if (newLang === lang) return;
    setLang(newLang);
    if (voiceState === 'live') {
      stopVoiceSession();
      setTimeout(() => {
        startVoiceSession(newLang, voiceMode, micProfile, bargeIn, activeProjectId);
      }, 250);
    }
  };

  const handleModeChange = (newMode: 'hands_free' | 'push_to_talk') => {
    if (newMode === voiceMode) return;
    setVoiceMode(newMode);
    if (voiceState === 'live') {
      stopVoiceSession();
      setTimeout(() => {
        startVoiceSession(lang, newMode, micProfile, bargeIn, activeProjectId);
      }, 250);
    }
  };

  const handleMicProfileChange = (newProfile: 'near_field' | 'far_field') => {
    if (newProfile === micProfile) return;
    setMicProfile(newProfile);
    if (voiceState === 'live') {
      stopVoiceSession();
      setTimeout(() => {
        startVoiceSession(lang, voiceMode, newProfile, bargeIn, activeProjectId);
      }, 250);
    }
  };

  const handleBargeInChange = (newBargeIn: boolean) => {
    setBargeIn(newBargeIn);
    bargeInRef.current = newBargeIn;
    if (voiceState === 'live') {
      stopVoiceSession();
      setTimeout(() => {
        startVoiceSession(lang, voiceMode, micProfile, newBargeIn, activeProjectId);
      }, 250);
    }
  };

  const handleTranscriptionModeChange = (newMode: TranscriptionTestMode) => {
    if (newMode === transcriptionMode) return;
    setTranscriptionMode(newMode);
    transcriptionModeRef.current = newMode;
    if (newMode === 'candidate') {
      setActiveChatSource('candidate');
      activeChatSourceRef.current = 'candidate';
    } else if (newMode === 'native') {
      setActiveChatSource('native');
      activeChatSourceRef.current = 'native';
    } else if (newMode === 'baseline') {
      setActiveChatSource('baseline');
      activeChatSourceRef.current = 'baseline';
    }
    if (voiceState === 'live') {
      stopVoiceSession();
      setTimeout(() => {
        startVoiceSession(lang, voiceMode, micProfile, bargeIn, activeProjectId);
      }, 250);
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId === activeProjectId) return;
    inFlightItemIdsRef.current.clear();
    completedItemIdsRef.current.clear();
    isResponseActiveRef.current = false;
    setActiveProjectId(newProjectId);
    if (voiceState === 'live') {
      stopVoiceSession();
      setTimeout(() => {
        startVoiceSession(lang, voiceMode, micProfile, bargeIn, newProjectId);
      }, 250);
    }
  };

  const clearFeed = () => {
    inFlightItemIdsRef.current.clear();
    completedItemIdsRef.current.clear();
    isResponseActiveRef.current = false;
    const hi = lang !== 'en-IN';
    setMessages([
      {
        id: 'clear-' + Date.now(),
        role: 'assistant',
        markdown: `${hi ? 'नमस्ते! ' : 'Namaste! '}I am the **${collegeName}** real-time voice counselor. Tap the orb to start a live voice call, or tap a sample question on the left — verified fee tables, admission guidelines, and official sources appear right here.`
      }
    ]);
  };

  // Run a voice turn for text input or sample questions
  const triggerVoiceQuery = async (q: string) => {
    const queryText = q.trim();
    if (!queryText || isTyping) return;

    const userMsgId = `u-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: queryText,
      },
    ]);
    setIsTyping(true);
    setActiveSearchQuery(queryText);
    setAgentState('thinking');
    setStatusText('Checking official website…');

    try {
      const searchRes = await api.executeVoiceSearchTool(
        activeProjectIdRef.current,
        queryText,
        5,
        langRef.current
      );

      setIsTyping(false);
      setActiveSearchQuery(null);

      const detailedAnswer = searchRes.detailed_answer || searchRes.context || 'Information verified from official website.';
      const spokenSummary = searchRes.summary_for_voice || searchRes.context || 'Here is the verified information.';
      const sources = searchRes.sources || [];
      const detectedIntent = searchRes.detected_intent || 'general';

      const assistantMsgId = `search-ai-${userMsgId}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          markdown: detailedAnswer,
          spokenSummary: spokenSummary,
          sources: sources,
          detectedIntent: detectedIntent,
        },
      ]);

      // Prefer WebRTC Realtime if live, otherwise fallback to browser speech synthesis
      if (voiceState === 'live' && dataChannelRef.current?.readyState === 'open' && spokenSummary) {
        setAgentState('speaking');
        if (!bargeInRef.current) {
          setMicrophoneMuted(true);
        }
        try {
          if (isResponseActiveRef.current) {
            try {
              dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
            } catch (e) {}
            isResponseActiveRef.current = false;
          }
          dataChannelRef.current.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                conversation: 'none',
                instructions: `You are an audio text-to-speech reader. Speak the following text aloud word-for-word verbatim in a warm, polite Indian accent. Do not greet, do not add filler or commentary, do not answer questions on your own, and do not change any words:\n"${spokenSummary.replace(/"/g, "'")}"`,
              },
            })
          );
        } catch (e) {
          speakWithSynthesis(spokenSummary, langRef.current);
        }
      } else if (spokenSummary) {
        speakWithSynthesis(spokenSummary, langRef.current);
      } else {
        setStatusText(voiceState === 'live' ? 'Live Voice Call Connected' : 'Ready / idle');
      }
    } catch (err: any) {
      console.error('Search tool execution error:', err);
      setIsTyping(false);
      setActiveSearchQuery(null);
      setAgentState('idle');
      setStatusText(voiceState === 'live' ? 'Live Voice Call Connected' : 'Ready / idle');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          tone: 'amber',
          markdown: 'Could not fetch details from the college website. Please try asking again.',
        },
      ]);
    }
  };

  const computedStatusBadge = () => {
    if (activeSearchQuery) {
      return { text: `⚡ Searching ${domain}…`, tone: 'badge-blue animate-pulse' };
    }
    if (agentState === 'speaking') {
      return { text: '🔊 Counselor Speaking…', tone: 'badge-emerald' };
    }
    if (agentState === 'listening') {
      return { text: '🎙️ Listening to you…', tone: 'badge-emerald animate-pulse' };
    }
    if (agentState === 'thinking') {
      return { text: '🧠 Checking official website…', tone: 'badge-blue animate-pulse' };
    }
    if (agentState === 'ignored') {
      return { text: '🔇 Ignored (noise / background speech)', tone: 'badge-amber' };
    }
    if (voiceState === 'live') {
      return { text: 'Live Voice Call Connected', tone: 'badge-emerald' };
    }
    if (statusTone === 'error') {
      return { text: statusText, tone: 'badge-danger' };
    }
    if (statusTone === 'connecting') {
      return { text: statusText, tone: 'badge-blue animate-pulse' };
    }
    return { text: statusText, tone: 'badge-slate' };
  };

  const statusInfo = computedStatusBadge();

  // Word Error Rate calculations for active reference ground-truth
  const baselineWer = computeWER(referenceText, baselineMetric.finalText || baselineMetric.partialText);
  const candidateWer = computeWER(referenceText, candidateMetric.finalText || candidateMetric.partialText);
  const nativeWer = computeWER(referenceText, nativeMetric.finalText || nativeMetric.partialText);

  return (
    <DashboardShell activeNav="college-voice-search">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b bd">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-teal">Live Voice Desk</span>
              <span className="badge !bg-emerald-500/15 !text-emerald-700 dark:!text-emerald-300 !border-emerald-500/30">
                <Globe className="w-3 h-3" /> {activeProject?.total_urls || 0} Sitemap URLs
              </span>
              {voiceState === 'live' && (
                <span className="badge badge-emerald flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Call Connected
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">College Voice Assistant</h1>
            <p className="text-xs t3 mt-0.5">
              Direct conversational voice assistant grounded in official website records.
            </p>
          </div>

          {/* Quick Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Switcher */}
            <div className="flex items-center gap-1.5 bg-[var(--surface-1)] border bd rounded-xl px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <select
                value={activeProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-[var(--text-1)] focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[var(--surface-1)] text-[var(--text-1)]">
                    {p.college_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Dropdown */}
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="select !text-xs !py-1.5 max-w-[150px]"
              disabled={voiceState === 'live'}
              title="Voice tone"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id} className="bg-[var(--surface-1)] text-[var(--text-1)]">
                  {v.label}
                </option>
              ))}
            </select>

            {/* Language Switcher */}
            <div className="inline-flex rounded-xl sf border bd p-1 gap-1">
              <button
                type="button"
                onClick={() => setVoiceLanguage('en-IN')}
                className={`lang-btn ${lang === 'en-IN' ? 'active' : ''}`}
              >
                English (IN)
              </button>
              <button
                type="button"
                onClick={() => setVoiceLanguage('hi')}
                className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
              >
                हिंदी / Hinglish
              </button>
            </div>

            <Link href="/college-web-search" className="btn btn-secondary btn-sm">
              <MessageSquare className="w-3.5 h-3.5" /> Text chat
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <div className="card overflow-hidden">
          {/* Settings UI Bar: Mode, Mic Profile, Barge-in */}
          <div className="px-4 sm:px-6 py-3 border-b bd sf2 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mode Selection */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold t3 uppercase tracking-wider">Mode</span>
                <div className="inline-flex rounded-xl sf border bd p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => handleModeChange('hands_free')}
                    className={`voice-mode-btn ${voiceMode === 'hands_free' ? 'active' : ''}`}
                  >
                    ⚡ Hands-free
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('push_to_talk')}
                    className={`voice-mode-btn ${voiceMode === 'push_to_talk' ? 'active' : ''}`}
                  >
                    🎙️ Push-to-Talk
                  </button>
                </div>
              </div>

              {/* Mic Type Selection */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold t3 uppercase tracking-wider">Mic Type</span>
                <div className="inline-flex rounded-xl sf border bd p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => handleMicProfileChange('near_field')}
                    className={`voice-mode-btn ${micProfile === 'near_field' ? 'active' : ''}`}
                  >
                    🎧 Headset (Close)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMicProfileChange('far_field')}
                    className={`voice-mode-btn ${micProfile === 'far_field' ? 'active' : ''}`}
                  >
                    🔊 Room (Far)
                  </button>
                </div>
              </div>

              {/* Barge-in Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold t2">
                <input
                  type="checkbox"
                  checked={bargeIn}
                  onChange={(e) => handleBargeInChange(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span>Allow interrupting</span>
              </label>

              {/* STT Engine Status Badge (Native with Universal Cross-Browser Fallback) */}
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-2.5 py-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  STT: {hasNativeSpeechSupport ? 'Web Speech API (Native Fast)' : 'WebRTC Cloud Speech (Universal Fallback)'}
                </span>
              </div>
            </div>

            <p className="text-[11px] t3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {voiceMode === 'push_to_talk'
                  ? 'Push-to-Talk: Hold button or Spacebar to speak'
                  : 'Hands-free: Native browser voice detection active'}
              </span>
            </p>
          </div>

          {/* A/B Transcription Test Panel - Commented out per user request: Web Speech API is baseline */}

          <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x bd">
            {/* Left Column: Voice Orb & Controls */}
            <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col items-center text-center gap-4 bg-gradient-to-b from-[var(--surface-2)] to-transparent">
              <span className={`badge text-xs ${statusInfo.tone}`}>
                <Radio className="w-3.5 h-3.5" />
                <span>{statusInfo.text}</span>
              </span>

              {/* Big Interactive WebRTC Orb */}
              <button
                type="button"
                onClick={toggleVoiceSession}
                disabled={voiceState === 'connecting'}
                className="voice-orb"
                data-state={voiceState}
                aria-label={voiceState === 'live' ? 'End voice call' : 'Start voice call'}
              >
                <div className="voice-orb-glow"></div>
                <div className="voice-orb-core">
                  {voiceState === 'connecting' ? (
                    <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
                  ) : voiceState === 'live' ? (
                    <Mic className={`w-10 h-10 ${agentState === 'speaking' ? 'animate-pulse text-emerald-400' : 'text-white'}`} />
                  ) : (
                    <Mic className="w-10 h-10 text-white/90" />
                  )}
                </div>
              </button>

              <div
                className={`voice-bars ${
                  agentState === 'speaking' ||
                  agentState === 'listening' ||
                  voiceState === 'live'
                    ? 'on'
                    : ''
                }`}
                aria-hidden="true"
              >
                <span></span><span></span><span></span><span></span><span></span>
              </div>

              {/* Live WebRTC Session Controls */}
              {voiceState === 'live' ? (
                <div className="flex flex-col items-center gap-2.5 w-full max-w-xs">
                  {/* Live AI Spoken Subtitle Banner */}
                  {liveAiSubtitle && (
                    <div className="w-full text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-xl px-3 py-2 text-xs">
                      🔊 <em>&ldquo;{liveAiSubtitle}&rdquo;</em>
                    </div>
                  )}

                  {/* Active Website Search Indicator */}
                  {activeSearchQuery && (
                    <div className="w-full text-center bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 text-xs flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-600" />
                      <span className="truncate">Searching <strong>{domain}</strong> sitemap: &ldquo;{activeSearchQuery}&rdquo;</span>
                    </div>
                  )}

                  {/* Push-to-Talk Hold Button OR Mute/Speaker Controls */}
                  {voiceMode === 'push_to_talk' ? (
                    <button
                      type="button"
                      onMouseDown={startPttHold}
                      onMouseUp={stopPttHold}
                      onMouseLeave={stopPttHold}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        startPttHold();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        stopPttHold();
                      }}
                      className={`btn btn-sm w-full py-2.5 font-bold select-none transition-all ${
                        isPttHolding ? 'btn-danger scale-[1.02] shadow-md' : 'btn-primary'
                      }`}
                    >
                      <Mic className={`w-4 h-4 ${isPttHolding ? 'animate-bounce' : ''}`} />
                      {isPttHolding
                        ? 'Recording… Release to Send'
                        : 'Hold to Speak (or Hold Spacebar)'}
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className={`btn btn-sm flex-1 ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
                      >
                        {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        {isMuted ? 'Mic Muted' : 'Mute Mic'}
                      </button>
                      <button
                        type="button"
                        onClick={toggleSpeaker}
                        className={`btn btn-sm ${isSpeakerMuted ? 'btn-danger' : 'btn-secondary'}`}
                        title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                      >
                        {isSpeakerMuted ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={stopVoiceSession}
                        className="btn btn-secondary btn-sm"
                      >
                        <Square className="w-3.5 h-3.5" /> End
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs t3 max-w-xs leading-relaxed">
                  Tap the orb to start a live voice call, or tap any sample question below.
                </p>
              )}

              {/* Sample Questions */}
              <div className="w-full text-left space-y-1.5 pt-3 border-t bd">
                <p className="text-[11px] font-bold uppercase tracking-wider t3">Sample questions</p>
                <button
                  type="button"
                  onClick={() => triggerVoiceQuery(`What is the B.Tech CSE total fee and semester breakdown at ${collegeName}?`)}
                  className="sample-q"
                >
                  🎓 “B.Tech CSE fees and payment breakdown?”
                </button>
                <button
                  type="button"
                  onClick={() => triggerVoiceQuery(`What are the hostel room options and mess charges at ${collegeName}?`)}
                  className="sample-q"
                >
                  🏠 “Hostel AC/Non-AC rooms and mess fees?”
                </button>
                <button
                  type="button"
                  onClick={() => triggerVoiceQuery(`What is the admission process, eligibility criteria, and scholarship at ${collegeName}?`)}
                  className="sample-q"
                >
                  📋 “Admission eligibility &amp; scholarships?”
                </button>
              </div>
            </div>

            {/* Right Column: Screen Output & Citations */}
            <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col h-[580px]">
              <div className="flex items-center justify-between border-b bd pb-3">
                <span className="font-bold text-xs uppercase tracking-wider t2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" /> Screen output &amp; citations
                </span>
                <span className="badge badge-teal">Grounded in {domain}</span>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto space-y-3 py-3" role="log" aria-live="polite">
                {messages.map((m) => {
                  if (m.role === 'system') {
                    const isOk = m.tone === 'blue';
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                          isOk
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-100'
                            : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
                        }`}
                      >
                        {isOk ? (
                          <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <MarkdownContent content={m.markdown || ''} />
                        </div>
                      </div>
                    );
                  }

                  if (m.role === 'user') {
                    const isIgnored = m.tone === 'amber';
                    return (
                      <div key={m.id} className="chat-msg user">
                        <div className="flex flex-col items-end max-w-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1 mr-1">
                            User
                          </span>
                          <div className={`chat-bubble ${isIgnored ? 'opacity-50 italic border-dashed border-amber-400' : ''}`}>
                            {m.text}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className="chat-msg assistant">
                      <div className="avatar avatar-bot">
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            {collegeName} Assistant
                          </span>
                          <span className="badge badge-emerald text-[10px]">
                            <Sparkles className="w-2.5 h-2.5" /> Live Grounded Output
                          </span>
                          {m.detectedIntent && (
                            <span className="badge badge-slate text-[10px] uppercase">
                              {m.detectedIntent}
                            </span>
                          )}
                        </div>

                        {m.spokenSummary && m.spokenSummary !== m.markdown && (
                          <div className="mb-2 px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                            <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div><strong>Spoken Summary:</strong> {m.spokenSummary}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                {voiceState === 'live' ? (
                                  <span className="badge badge-teal text-[10px]">
                                    <Radio className="w-2.5 h-2.5 animate-pulse text-teal-500" /> OpenAI Realtime Neural Voice
                                  </span>
                                ) : (
                                  <span className="badge badge-slate text-[10px]">
                                    <Volume2 className="w-2.5 h-2.5" /> Audio Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="chat-bubble md">
                          <MarkdownContent content={m.markdown || ''} />
                        </div>

                        {m.sources && m.sources.length > 0 ? (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <span className="text-[10px] t3 font-semibold uppercase tracking-wider">Verified Sources:</span>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {m.sources.map((s, idx) => {
                                const url = s.url;
                                const title = s.title || s.url.replace(/^https?:\/\//, '').slice(0, 35);
                                return (
                                  <a
                                    key={idx}
                                    href={url.startsWith('http') ? url : `https://${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="source-pill"
                                  >
                                    {title.slice(0, 45)}
                                    <ExternalLink className="w-2.5 h-2.5 ml-1 inline" />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] t3 font-semibold uppercase tracking-wider">Verified Domain:</span>
                            <a
                              href={`https://${domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-pill"
                            >
                              {domain}
                              <ExternalLink className="w-2.5 h-2.5 ml-1 inline" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="chat-msg assistant">
                    <div className="avatar avatar-bot">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                    <div className="chat-bubble flex items-center gap-2 text-xs t2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Searching <strong>{domain}</strong> sitemap for 3-5 relevant URLs & reading live content…</span>
                    </div>
                  </div>
                )}

                <div ref={feedEndRef} />
              </div>

              {/* Spoken & Text Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInput.trim()) {
                    triggerVoiceQuery(customInput.trim());
                    setCustomInput('');
                  }
                }}
                className="pt-2.5 border-t bd flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder={
                      voiceState === 'live'
                        ? 'Ask a question or speak into your mic…'
                        : `Type a question for ${collegeName} or tap Start Call to speak…`
                    }
                    className="input !text-xs !py-2 w-full"
                    disabled={isTyping}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customInput.trim() || isTyping}
                  className="btn btn-primary btn-sm !py-2 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-2 border-t bd flex items-center justify-between text-[11px] t3">
                <span>
                  Domain: <strong>{domain}</strong> · Verified Live Voice Desk
                </span>
                <button
                  type="button"
                  onClick={clearFeed}
                  className="hover:text-[var(--danger)] font-semibold transition-colors"
                >
                  Clear screen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Realtime WebRTC audio playback element */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />
    </DashboardShell>
  );
}
