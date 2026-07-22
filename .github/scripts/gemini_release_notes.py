import os
import sys
import json
import urllib.request
import subprocess
import re

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

def extract_changelog_section(version):
    changelog_path = 'CHANGELOG.md'
    if not os.path.exists(changelog_path):
        return ""
    
    with open(changelog_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = rf"##\s*\[?{re.escape(version)}\]?.*?\n(.*?)(?=\n##\s*\[|\Z)"
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""

def main():
    gemini_key = os.environ.get('GEMINI_API_KEY')
    version = os.environ.get('VERSION', 'v1.4.0')
    clean_version = version.lstrip('v')
    
    changelog_text = extract_changelog_section(version) or extract_changelog_section(clean_version)
    git_log = get_git_log()

    notes = ""

    if gemini_key:
        prompt = (
            f"You are an expert AI release engineer drafting GitHub release notes for version {version} of a browser extension.\n"
            f"Below is the changelog section for this release:\n\n{changelog_text}\n\n"
            f"Below is the commit history:\n\n{git_log}\n\n"
            "Generate beautifully formatted, human-styled GitHub Release Notes in markdown containing:\n"
            "- 🚀 Key Highlights & Overview\n"
            "- ✨ Features & Enhancements\n"
            "- 🐛 Bug Fixes & Compatibility Improvements\n"
            "- 📦 Installation Instructions\n"
            "Do not wrap the entire response in outer markdown code blocks."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})

        try:
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                notes = res_data['candidates'][0]['content']['parts'][0]['text']
                print("Successfully generated Gemini AI Release Notes!")
        except Exception as e:
            print(f"Error calling Gemini API: {e}")

    if not notes:
        print("Generating structured CHANGELOG.md & commit log release notes.")
        notes = f"## 🌟 Release {version}\n\n"
        if changelog_text:
            notes += f"{changelog_text}\n\n"
        if git_log:
            notes += "### 📜 Commit History\n"
            for line in git_log.split('\n'):
                if line.strip():
                    notes += f"- {line.strip()}\n"

    with open('gemini_release_notes.md', 'w', encoding='utf-8') as f:
        f.write(notes)
    print("Release notes file `gemini_release_notes.md` created successfully!")

if __name__ == '__main__':
    main()
