import os
import sys
import json
import urllib.request

def main():
    gemini_key = os.environ.get('GEMINI_API_KEY')
    diff_text = os.environ.get('PR_DIFF', '')

    if not gemini_key:
        print("GEMINI_API_KEY secret not found. Skipping Gemini AI summary.")
        sys.exit(0)

    if not diff_text.strip():
        print("No diff text provided.")
        sys.exit(0)

    truncated_diff = diff_text[:12000]

    prompt = (
        "You are an expert AI release engineer reviewing changes for a browser extension.\n"
        "Analyze the following git diff and generate concise, professional release notes:\n\n"
        f"{truncated_diff}"
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
            summary_text = res_data['candidates'][0]['content']['parts'][0]['text']
            output_content = f"## ♊ Gemini AI Summary\n\n{summary_text}"
            print(output_content)
            with open('gemini_summary.md', 'w', encoding='utf-8') as f:
                f.write(output_content)
    except Exception as e:
        print(f"Error calling Gemini API: {e}")

if __name__ == '__main__':
    main()
