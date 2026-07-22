import os
import sys
import json
import urllib.request
import subprocess

def get_git_log():
    try:
        tags_output = subprocess.check_output(['git', 'tag', '--sort=-creatordate']).decode('utf-8').strip().split('\n')
        tags = [t.strip() for t in tags_output if t.strip()]
        if len(tags) > 1:
            prev_tag = tags[1]
            cmd = ['git', 'log', f'{prev_tag}..HEAD', '--oneline']
        else:
            cmd = ['git', 'log', '-n', '25', '--oneline']
        return subprocess.check_output(cmd).decode('utf-8').strip()
    except Exception as e:
        print(f"Error fetching git log: {e}")
        return ""

def main():
    gemini_key = os.environ.get('GEMINI_API_KEY')
    version = os.environ.get('VERSION', 'v1.4.0')
    git_log = get_git_log()

    if not gemini_key:
        print("GEMINI_API_KEY secret not found. Skipping Gemini AI release notes generation.")
        sys.exit(0)

    prompt = (
        f"You are an expert AI release engineer drafting GitHub release notes for version {version} of a browser extension.\n"
        f"Below is the commit history for this release:\n\n"
        f"{git_log}\n\n"
        "Generate beautifully formatted, human-styled GitHub Release Notes in markdown containing:\n"
        "- 🚀 Key Highlights & Overview\n"
        "- ✨ Features & Enhancements\n"
        "- 🐛 Bug Fixes & Compatibility Improvements\n"
        "- 📦 Installation Instructions\n"
        "Do not wrap the entire response in outer markdown code blocks."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            notes = res_data['candidates'][0]['content']['parts'][0]['text']
            with open('gemini_release_notes.md', 'w', encoding='utf-8') as f:
                f.write(notes)
            print("Successfully generated Gemini AI Release Notes!")
    except Exception as e:
        print(f"Error calling Gemini API: {e}")

if __name__ == '__main__':
    main()
