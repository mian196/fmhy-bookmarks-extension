import os
import sys
import json
import shutil
import zipfile

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    os.chdir(root_dir)

    manifest_path = os.path.join('platform', 'chromium', 'manifest.json')
    if not os.path.exists(manifest_path):
        print("Error: Chromium manifest.json not found!")
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest_data = json.load(f)

    version = manifest_data.get('version', '1.0.0')
    if len(sys.argv) > 1 and sys.argv[1]:
        version = sys.argv[1].lstrip('v')

    dist_dir = os.path.join(root_dir, 'dist')
    build_dir = os.path.join(dist_dir, 'build')
    
    chrome_build = os.path.join(build_dir, 'chromium')
    firefox_build = os.path.join(build_dir, 'firefox')

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    os.makedirs(chrome_build, exist_ok=True)
    os.makedirs(firefox_build, exist_ok=True)

    src_dir = os.path.join(root_dir, 'src')

    # Copy src files into both builds
    for item in os.listdir(src_dir):
        s = os.path.join(src_dir, item)
        d_chrome = os.path.join(chrome_build, item)
        d_firefox = os.path.join(firefox_build, item)
        
        if os.path.isdir(s):
            shutil.copytree(s, d_chrome)
            shutil.copytree(s, d_firefox)
        else:
            shutil.copy2(s, d_chrome)
            shutil.copy2(s, d_firefox)

    # Copy platform specific manifests
    shutil.copy2(os.path.join('platform', 'chromium', 'manifest.json'), os.path.join(chrome_build, 'manifest.json'))
    shutil.copy2(os.path.join('platform', 'firefox', 'manifest.json'), os.path.join(firefox_build, 'manifest.json'))

    # Package Chromium ZIP
    chrome_zip = os.path.join(dist_dir, f'fmhy-bookmarks-extension-v{version}.chromium.zip')
    if os.path.exists(chrome_zip):
        try:
            os.remove(chrome_zip)
        except OSError:
            pass

    with zipfile.ZipFile(chrome_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(chrome_build):
            for file in files:
                fp = os.path.join(root, file)
                rel = os.path.relpath(fp, chrome_build)
                zipf.write(fp, rel)

    # Package Firefox ZIP
    firefox_zip = os.path.join(dist_dir, f'fmhy-bookmarks-extension-v{version}.firefox.zip')
    if os.path.exists(firefox_zip):
        try:
            os.remove(firefox_zip)
        except OSError:
            pass

    with zipfile.ZipFile(firefox_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(firefox_build):
            for file in files:
                fp = os.path.join(root, file)
                rel = os.path.relpath(fp, firefox_build)
                zipf.write(fp, rel)

    print(f"Successfully built extension packages for v{version}:")
    print(f"  - Chromium: {chrome_zip} ({os.path.getsize(chrome_zip)} bytes)")
    print(f"  - Firefox:  {firefox_zip} ({os.path.getsize(firefox_zip)} bytes)")

if __name__ == '__main__':
    main()
