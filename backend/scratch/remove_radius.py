import re
from pathlib import Path

file_path = Path(r"c:\Users\nargi\OneDrive\Pictures\Desktop\MERAZ\Agentic AI Debate Coach\frontend\src\app\dashboard\page.js")
content = file_path.read_text(encoding="utf-8")

# Regex to match: borderRadius: 'anything' or borderRadius: anything
modified = re.sub(r"borderRadius:\s*['\"].*?['\"]", "borderRadius: 0", content)
modified = re.sub(r"borderRadius:\s*\d+", "borderRadius: 0", modified)

file_path.write_text(modified, encoding="utf-8")
print("SUCCESS: Removed all border-radius styling from dashboard/page.js!")
