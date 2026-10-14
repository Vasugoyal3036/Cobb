import sys
import asyncio
import edge_tts

async def generate_speech(text, voice, output_path):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python neural_tts.py <text> <voice> <output_path>")
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2]
    output_path = sys.argv[3]

    asyncio.run(generate_speech(text, voice, output_path))
    print("SUCCESS")
