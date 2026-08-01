import re
from typing import Dict, Any

FILLER_WORDS = ["um", "uh", "like", "you know", "so", "actually", "basically", "literally", "i mean"]

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
                
        for phrase in ["you know", "i mean"]:
            matches = len(re.findall(rf'\b{phrase}\b', text.lower()))
            if matches > 0:
                filler_counts[phrase] = matches
                total_fillers += matches

        filler_str = ", ".join([f"{k}:{v}" for k, v in filler_counts.items()]) if filler_counts else "None"
        
        # Pace scoring: Ideal WPM for debate/speech is 130 - 160 WPM
        if 130 <= wpm <= 160:
            pace_score = 95.0
        elif 110 <= wpm < 130 or 160 < wpm <= 180:
            pace_score = 80.0
        else:
            pace_score = 65.0
            
        # Confidence score based on filler word density & text structure
        filler_density = (total_fillers / max(1, total_words)) * 100
        confidence_score = max(30.0, min(99.0, 95.0 - (filler_density * 8.0)))
        
        clarity_score = round(pace_score * 0.5 + confidence_score * 0.5, 1)
        engagement_score = round(min(98.0, max(50.0, 85.0 + (total_words > 50) * 10 - total_fillers * 2)), 1)

        return {
            "speech_pace_wpm": wpm,
            "filler_words_count": total_fillers,
            "filler_words_list": filler_str,
            "confidence_score": round(confidence_score, 1),
            "clarity_score": round(clarity_score, 1),
            "engagement_score": round(engagement_score, 1)
        }

speech_engine_service = SpeechEngine()
