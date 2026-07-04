'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Status of the speech recognition session.
 * - idle: not recording
 * - listening: actively capturing speech
 * - error: an error occurred (auto-resets to idle after a timeout)
 */
type SpeechStatus = 'idle' | 'listening' | 'error';

interface UseSpeechToTextReturn {
  /** Whether the browser supports the Web Speech API */
  isSupported: boolean;
  /** Current status of the recognition session */
  status: SpeechStatus;
  /** Accumulated transcript text from the current session */
  transcript: string;
  /** Human-readable error message (null when no error) */
  error: string | null;
  /** Begin speech recognition */
  startListening: () => void;
  /** Stop recognition and keep the transcript */
  stopListening: () => void;
  /** Stop recognition and discard the transcript */
  cancelListening: () => void;
  /** Clear the transcript text */
  resetTranscript: () => void;
}

/** Map SpeechRecognition error codes to user-friendly messages */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
      return 'Microphone access denied. Please allow microphone permissions.';
    case 'no-speech':
      return 'No speech detected. Please try again.';
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone.';
    case 'network':
      return 'Network error. Speech recognition requires an internet connection.';
    case 'aborted':
      return ''; // user-initiated cancel — not a real error
    default:
      return 'Speech recognition failed. Please try again.';
  }
}

/** Check if the Web Speech API is available in the current browser */
function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Custom hook for Speech-to-Text using the browser's native Web Speech API.
 *
 * Privacy: No audio is stored, persisted, or sent to any backend.
 * The browser handles all audio processing internally.
 */
export function useSpeechToText(): UseSpeechToTextReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isCancellingRef = useRef(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionConstructor() !== null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    // Stop any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    isCancellingRef.current = false;
    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isCancellingRef.current) return;

      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Show final + interim so user sees real-time feedback
      setTranscript(finalText + interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error;

      // 'aborted' is triggered by our own cancel/stop — not a real error
      if (code === 'aborted') return;

      // 'no-speech' can fire intermittently during continuous mode — ignore if still listening
      if (code === 'no-speech' && !isCancellingRef.current) {
        // Don't stop, just let it continue listening
        return;
      }

      const message = getErrorMessage(code);
      if (message) {
        setError(message);
        setStatus('error');

        // Auto-reset to idle after 4 seconds
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
          setError(null);
        }, 4000);
      }
    };

    recognition.onend = () => {
      // Only reset to idle if we didn't already set an error state
      if (!isCancellingRef.current) {
        setStatus((prev) => (prev === 'error' ? prev : 'idle'));
      } else {
        setStatus('idle');
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError('Failed to start speech recognition.');
      setStatus('error');
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 4000);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      isCancellingRef.current = false;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  }, []);

  const cancelListening = useCallback(() => {
    isCancellingRef.current = true;
    setTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isSupported,
    status,
    transcript,
    error,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  };
}
