import re
from typing import Dict, Any
import random

FILLER_WORDS = ["um", "uh", "like", "you know", "so", "actually", "basically", "literally", "i mean", "kind of", "sort of"]

class SpeechEngine:
    def analyze_speech(self, text: str, audio_duration_seconds: float = 60.0) -> Dict[str, Any]:
        words = re.findall(r'\b\w+\b', text.lower())
        total_words = len(words)
        
        # Duration in minutes
        duration_minutes = max(0.1, audio_duration_seconds / 60.0)
        wpm = round(total_words / duration_minutes, 1)
        
        # Filler words analysis
        filler_counts = {}
        total_fillers = 0
        for word in words:
            if word in FILLER_WORDS:
                filler_counts[word] = filler_counts.get(word, 0) + 1
                total_fillers += 1
                
        for phrase in ["you know", "i mean", "kind of", "sort of"]:
            matches = len(re.findall(rf'\b{phrase}\b', text.lower()))
            if matches > 0:
                filler_counts[phrase] = matches
                total_fillers += matches

        filler_str = ", ".join([f"{k}:{v}" for k, v in filler_counts.items()]) if filler_counts else "None"
        
        # Enhanced Pace scoring: Ideal WPM for debate/speech is 130 - 160 WPM
        if 130 <= wpm <= 160:
            pace_score = 95.0
            pace_feedback = "Optimal pacing for debate"
        elif 110 <= wpm < 130:
            pace_score = 82.0
            pace_feedback = "Slightly slow - increase pace"
        elif 160 < wpm <= 180:
            pace_score = 85.0
            pace_feedback = "Slightly fast - moderate pace"
        elif wpm < 110:
            pace_score = 65.0
            pace_feedback = "Too slow - significantly increase pace"
        else:
            pace_score = 70.0
            pace_feedback = "Too fast - slow down for clarity"
            
        # Enhanced Confidence score based on filler word density & text structure
        filler_density = (total_fillers / max(1, total_words)) * 100
        base_confidence = 95.0 - (filler_density * 10.0)
        
        # Sentence structure analysis
        sentences = re.split(r'[.!?]+', text)
        avg_sentence_length = len(words) / max(1, len(sentences))
        
        if avg_sentence_length > 20:
            base_confidence -= 5  # Too complex
        elif avg_sentence_length < 8:
            base_confidence -= 3  # Too simple
            
        confidence_score = max(35.0, min(98.0, base_confidence))
        
        # Enhanced clarity score
        clarity_factors = []
        clarity_score = pace_score * 0.4 + confidence_score * 0.4
        
        # Vocabulary diversity
        unique_words = len(set(words))
        vocabulary_diversity = (unique_words / max(1, total_words)) * 100
        clarity_score += vocabulary_diversity * 0.1
        
        clarity_score = min(98.0, max(40.0, clarity_score))
        
        # Enhanced engagement score
        engagement_factors = []
        engagement_score = 75.0
        
        # Word count impact
        if total_words > 100:
            engagement_score += 10
        elif total_words > 50:
            engagement_score += 5
            
        # Filler word penalty
        engagement_score -= total_fillers * 3
        
        # Question usage (engagement indicator)
        question_count = len(re.findall(r'\?', text))
        engagement_score += question_count * 2
        
        engagement_score = min(98.0, max(45.0, engagement_score))
        
        # Prosody analysis (simulated based on text patterns)
        prosody_score = self._analyze_prosody(text, wpm, filler_density)
        
        # Vocal variety indicators
        vocal_variety = self._analyze_vocal_variety(text)
        
        return {
            "speech_pace_wpm": wpm,
            "filler_words_count": total_fillers,
            "filler_words_list": filler_str,
            "confidence_score": round(confidence_score, 1),
            "clarity_score": round(clarity_score, 1),
            "engagement_score": round(engagement_score, 1),
            "prosody_score": round(prosody_score, 1),
            "vocal_variety": round(vocal_variety, 1),
            "pace_feedback": pace_feedback,
            "vocabulary_diversity": round(vocabulary_diversity, 1),
            "avg_sentence_length": round(avg_sentence_length, 1)
        }
    
    def _analyze_prosody(self, text: str, wpm: float, filler_density: float) -> float:
        """Analyze prosody patterns based on text characteristics"""
        prosody_score = 80.0
        
        # Punctuation variety indicates prosody variation
        punctuation_variety = len(set(re.findall(r'[.,!?;:]', text)))
        prosody_score += punctuation_variety * 2
        
        # Pace consistency
        if 130 <= wpm <= 160:
            prosody_score += 10
        elif 110 <= wpm <= 180:
            prosody_score += 5
            
        # Filler word impact on prosody
        prosody_score -= filler_density * 5
        
        return min(98.0, max(40.0, prosody_score))
    
    def _analyze_vocal_variety(self, text: str) -> float:
        """Analyze vocal variety indicators from text"""
        variety_score = 75.0
        
        # Sentence length variation
        sentences = re.split(r'[.!?]+', text)
        sentence_lengths = [len(s.split()) for s in sentences if s.strip()]
        
        if len(sentence_lengths) > 1:
            length_variance = max(sentence_lengths) - min(sentence_lengths)
            variety_score += min(15, length_variance)
            
        # Emphasis indicators (capitalization, exclamation)
        emphasis_count = len(re.findall(r'[A-Z]{2,}|!', text))
        variety_score += emphasis_count * 3
        
        return min(95.0, max(50.0, variety_score))

speech_engine_service = SpeechEngine()
