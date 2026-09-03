"use client";

import { useState, useRef, useEffect } from 'react';

/**
 * SpeechRecorder Component
 * Captures voice input using Web Speech API and converts to text
 * Supports real-time transcription and fallback for unsupported browsers
 */
export default function SpeechRecorder({ onTranscript, onComplete, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const interimTranscriptRef = useRef('');

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Web Speech API not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    setIsSupported(true);
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    // Configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Event: Speech recognition starts
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      interimTranscriptRef.current = '';
      setTranscript('');
      setIsFinal(false);
    };

    // Event: Results received
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Capitalize first letter and add to final transcript
          const capitalizedPart = transcriptPart.charAt(0).toUpperCase() + transcriptPart.slice(1);
          setTranscript(prev => prev + (prev ? ' ' : '') + capitalizedPart);
          setIsFinal(true);
        } else {
          interim += transcriptPart;
        }
      }
      interimTranscriptRef.current = interim;

      // Callback with current transcript
      if (onTranscript) {
        onTranscript(transcript + interim);
      }
    };

    // Event: Error handling
    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error: ' + event.error;
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please enable access.';
          break;
      }
      setError(errorMessage);
    };

    // Event: Recognition ends
    recognition.onend = () => {
      setIsListening(false);
      if (onComplete) {
        onComplete(transcript + interimTranscriptRef.current);
      }
    };

    return () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, [onTranscript, onComplete, transcript]);

  const startListening = () => {
    if (!isSupported || !recognitionRef.current) return;
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      setError('Failed to stop recording: ' + err.message);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    interimTranscriptRef.current = '';
    setError(null);
    setIsFinal(false);
  };

  const copyToClipboard = () => {
    const finalText = transcript + interimTranscriptRef.current;
    navigator.clipboard.writeText(finalText).then(() => {
      alert('Transcript copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  if (!isSupported) {
    return (
      <div className="speech-recorder speech-recorder-unsupported">
        <div className="recorder-error">
          <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>⚠️</span>
          <div>
            <strong>Voice input not supported</strong>
            <p>{error}</p>
            <small>Alternatively, type your argument manually in the text field below.</small>
          </div>
        </div>
      </div>
    );
  }

  const currentText = transcript + interimTranscriptRef.current;

  return (
    <div className="speech-recorder">
      <div className="recorder-header">
        <div className="recorder-status">
          <span className={`status-indicator ${isListening ? 'listening' : ''}`}></span>
          <span className="status-text">
            {isListening ? 'Listening...' : isFinal ? 'Ready to speak' : 'Click to start'}
          </span>
        </div>
      </div>

      <div className="recorder-controls">
        <button
          className={`recorder-btn ${isListening ? 'recording' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          title={isListening ? 'Stop recording (Shift+Escape)' : 'Start recording'}
        >
          <span className="btn-icon">
            {isListening ? '⏹️' : '🎤'}
          </span>
          <span className="btn-text">
            {isListening ? 'Stop Recording' : 'Start Recording'}
          </span>
        </button>

        <button
          className="recorder-btn secondary"
          onClick={clearTranscript}
          disabled={disabled || !currentText}
          title="Clear transcript"
        >
          <span className="btn-icon">🗑️</span>
          <span className="btn-text">Clear</span>
        </button>

        <button
          className="recorder-btn secondary"
          onClick={copyToClipboard}
          disabled={disabled || !currentText}
          title="Copy to clipboard"
        >
          <span className="btn-icon">📋</span>
          <span className="btn-text">Copy</span>
        </button>
      </div>

      {error && (
        <div className="recorder-error" style={{ marginTop: '0.75rem' }}>
          <span style={{ marginRight: '0.5rem' }}>❌</span>
          <span>{error}</span>
        </div>
      )}

      {currentText && (
        <div className="recorder-transcript">
          <div className="transcript-label">
            <strong>Transcribed Text:</strong>
            {!isFinal && interimTranscriptRef.current && (
              <span className="interim-indicator"> (listening...)</span>
            )}
          </div>
          <div className="transcript-text">
            <span className="final-text">{transcript}</span>
            {interimTranscriptRef.current && (
              <span className="interim-text">{interimTranscriptRef.current}</span>
            )}
          </div>
          <div className="transcript-hint">
            <small>💡 Tip: Speak clearly and pause between sentences for better results.</small>
          </div>
        </div>
      )}

      <style jsx>{`
        .speech-recorder {
          background: #f8f9fa;
          border: 1px solid #e0e1e6;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .speech-recorder-unsupported {
          background: #fff3cd;
          border-color: #ffc107;
        }

        .recorder-error {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: #dc3545;
          font-size: 0.875rem;
          padding: 0.75rem;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          line-height: 1.5;
        }

        .recorder-error p {
          margin: 0.25rem 0 0;
        }

        .recorder-header {
          margin-bottom: 1rem;
        }

        .recorder-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #666;
        }

        .status-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
          transition: all 0.3s ease;
        }

        .status-indicator.listening {
          background: #d90429;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }

        .recorder-controls {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .recorder-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #d90429;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .recorder-btn:hover:not(:disabled) {
          background: #b70321;
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(217, 4, 41, 0.3);
        }

        .recorder-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .recorder-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recorder-btn.recording {
          animation: record-pulse 1s infinite;
        }

        @keyframes record-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(217, 4, 41, 0.7);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(217, 4, 41, 0);
          }
        }

        .recorder-btn.secondary {
          background: #6c757d;
        }

        .recorder-btn.secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-icon {
          font-size: 1rem;
        }

        .btn-text {
          font-weight: 500;
        }

        .recorder-transcript {
          padding: 1rem;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }

        .transcript-label {
          font-size: 0.875rem;
          color: #495057;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .interim-indicator {
          font-size: 0.75rem;
          color: #6c757d;
          font-style: italic;
        }

        .transcript-text {
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 3px;
          line-height: 1.6;
          margin-bottom: 0.5rem;
          min-height: 2rem;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          word-break: break-word;
        }

        .final-text {
          color: #212529;
        }

        .interim-text {
          color: #999;
          font-style: italic;
        }

        .transcript-hint {
          color: #6c757d;
          text-align: right;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
