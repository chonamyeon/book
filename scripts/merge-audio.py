
import os
import subprocess
import sys
import glob

# Constants
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INTRO_JINGLE = os.path.join(PROJECT_ROOT, 'public', 'music', 'intro_jingle.mp3')
AUDIO_OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'public', 'audio')
SYNC_SCRIPT = os.path.join(PROJECT_ROOT, 'scripts', 'sync-audio.js')

def process_file(wav_path):
    if not os.path.exists(wav_path):
        print(f"Error: {wav_path} not found.")
        return

    # Extract book id from wav file name (assuming format {id}_tts.wav or {id}.wav)
    base_name = os.path.basename(wav_path).replace('_tts.wav', '').replace('.wav', '')
    output_mp3 = os.path.join(AUDIO_OUTPUT_DIR, f"{base_name}.mp3")

    print(f"Processing: {wav_path} -> {output_mp3}")

    # FFmpeg command to merge intro + target + intro with 44.1kHz Stereo resampling
    # We use -filter_complex for concat and resampling
    cmd = [
        'ffmpeg', '-y',
        '-i', INTRO_JINGLE,
        '-i', wav_path,
        '-i', INTRO_JINGLE,
        '-filter_complex',
        '[0:a]aresample=44100:osr=44100:ochl=stereo[a0];'
        '[1:a]aresample=44100:osr=44100:ochl=stereo[a1];'
        '[2:a]aresample=44100:osr=44100:ochl=stereo[a2];'
        '[a0][a1][a2]concat=n=3:v=0:a=1[out]',
        '-map', '[out]',
        '-b:a', '192k',
        output_mp3
    ]

    try:
        subprocess.run(cmd, check=True)
        print(f"Successfully created {output_mp3}")
        
        # Run sync-audio.js
        print("Running sync-audio.js...")
        subprocess.run(['node', SYNC_SCRIPT], check=True)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        process_file(sys.argv[1])
    else:
        # Look for all .wav files in root (excluding jingles)
        wav_files = [f for f in glob.glob(os.path.join(PROJECT_ROOT, "*.wav")) if "jingle" not in f.lower()]
        
        if not wav_files:
            print("No pendings .wav files found in project root.")
        else:
            print(f"Found {len(wav_files)} files to process.")
            for wav in wav_files:
                process_file(wav)
            print("\nAll files processed successfully.")
