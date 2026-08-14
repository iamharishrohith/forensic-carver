import os
import subprocess
import sys

# Script text
PITCH_SCRIPT = """
Every day, child protection investigators are drowning in a tsunami of digital evidence. 
A single case can involve terabytes of chat logs, device dumps, and geotagged files. 
The result? Severe backlogs while children remain at risk. 

But standard cloud-based AI tools are a legal and ethical dead end due to victim confidentiality regulations. 
That is why we built ACPIA—the Agentic Child Protection Investigation Assistant. 
ACPIA is an offline-first, air-gapped AI copilot designed to run directly inside secure forensic labs.

When evidence is loaded, a fast Tier 1 triage classifier scans text in under 5 milliseconds. 
If coercion is flagged, it escalates to Tier 2 CPU-bound NLP models to identify grooming patterns and extract key actors. 
A team of nine autonomous agents then maps relationships in Neo4j, plots geolocated movement timelines, 
and matches phone numbers and device IDs against active historical cases.

Crucially, ACPIA is built for the courtroom. Every AI suggestion requires human investigator approval, 
maintaining an immutable audit ledger protected by SHA-256 signatures. 

ACPIA turns days of manual evidence tracking into seconds of automated intelligence—protecting victims, 
empowering investigators, and keeping communities safe.
"""

def generate_voiceover():
    print("[*] Checking for Google Text-to-Speech (gTTS) package...")
    try:
        import gtts
    except ImportError:
        print("[*] Installing gtts library locally...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gTTS"])
        import gtts

    from gtts import gTTS
    
    output_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "acpia_pitch_voiceover.mp3"))
    
    print("[+] Synthesizing speech into MP3...")
    # Generate audio with English language and standard newsroom-like pace
    tts = gTTS(text=PITCH_SCRIPT, lang="en", slow=False)
    tts.save(output_file)
    
    print(f"[+] Success! Free audio voiceover file created at:\n    {output_file}")
    print("[*] Next Step: Upload this audio along with a portrait photo to SadTalker on Hugging Face Spaces (100% Free) to generate your video.")

if __name__ == "__main__":
    generate_voiceover()
