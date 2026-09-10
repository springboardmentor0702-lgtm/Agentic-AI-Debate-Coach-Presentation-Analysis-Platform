import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
export const VoiceInput = ({ onTranscript, className = '' }) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Web Speech API is not supported in this browser. You can type manually.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                currentTranscript += event.results[i][0].transcript;
            }
            if (currentTranscript) {
                onTranscript(currentTranscript);
            }
        };
        recognition.onerror = (event) => {
            console.warn('Speech recognition notice:', event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone permission blocked. Please enable microphone access in browser settings.');
            }
            setIsListening(false);
        };
        recognition.onend = () => {
            setIsListening(false);
        };
        recognitionRef.current = recognition;
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                }
                catch { }
            }
        };
    }, [onTranscript]);
    const toggleListening = () => {
        if (!recognitionRef.current)
            return;
        setError(null);
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
        else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            }
            catch (err) {
                console.error('Recognition start error:', err);
            }
        }
    };
    return (<div className={`flex items-center gap-2 ${className}`}>
      <button type="button" onClick={toggleListening} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${isListening
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-500/50'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`} title={isListening ? 'Stop Recording' : 'Dictate with Voice (Web Speech API)'}>
        {isListening ? (<>
            <MicOff className="w-3.5 h-3.5 text-white"/>
            <span>Listening...</span>
          </>) : (<>
            <Mic className="w-3.5 h-3.5 text-amber-400"/>
            <span>Voice Input</span>
          </>)}
      </button>

      {error && (<span className="text-[11px] text-amber-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0"/>
          {error}
        </span>)}
    </div>);
};
