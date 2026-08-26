import sounddevice as sd
import soundfile as sf
import speech_recognition as sr
import tempfile
import os


def record_audio(
    duration: int = 10,
    sample_rate: int = 16000
) -> str:
    """
    Record microphone audio and save it as a temporary WAV file.
    """

    print("🎤 Microphone started...")
    print(f"Speak for up to {duration} seconds...")

    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32"
    )

    sd.wait()

    temp_file = tempfile.NamedTemporaryFile(
        suffix=".wav",
        delete=False
    )

    temp_file.close()

    sf.write(
        temp_file.name,
        audio,
        sample_rate
    )

    print("⏹️ Recording stopped.")

    return temp_file.name


def speech_to_text(audio_file: str) -> str:
    """
    Convert recorded WAV audio into text.
    """

    recognizer = sr.Recognizer()

    try:
        with sr.AudioFile(audio_file) as source:
            audio = recognizer.record(source)

        print("📝 Converting speech to text...")

        text = recognizer.recognize_google(audio)

        return text

    except sr.UnknownValueError:
        return ""

    except sr.RequestError as error:
        print(f"❌ Speech recognition service error: {error}")
        return ""

    finally:
        if os.path.exists(audio_file):
            os.remove(audio_file)


def record_and_transcribe(duration: int = 10) -> str:
    """
    Record microphone audio and convert it into text.
    """

    audio_file = record_audio(duration)

    transcript = speech_to_text(audio_file)

    if transcript:
        print("\n📄 FINAL TRANSCRIPT:")
        print(transcript)
    else:
        print("\n❌ Could not understand the speech.")

    return transcript