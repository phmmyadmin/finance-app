import json
import os
import urllib.request
import sys

token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "")
if not token:
    print("Error: missing token")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python update_task_status.py <ITEM_ID>")
    sys.exit(1)

item_id = sys.argv[1]
url = "https://api.github.com/graphql"
project_id = "PVT_kwHOAkgXus4BfhjX"
status_field_id = "PVTSSF_lAHOAkgXus4BfhjXzhZz28U"
in_progress_option_id = "47fc9ee4"

mutation = f"""mutation {{
  updateProjectV2ItemFieldValue(
    input: {{
      projectId: "{project_id}"
      itemId: "{item_id}"
      fieldId: "{status_field_id}"
      value: {{
        singleSelectOptionId: "{in_progress_option_id}"
      }}
    }}
  ) {{
    projectV2Item {{
      id
    }}
  }}
}}"""

req = urllib.request.Request(
    url,
    data=json.dumps({"query": mutation}).encode("utf-8"),
    headers={
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Antigravity",
    },
)

with urllib.request.urlopen(req) as resp:
    print(resp.read().decode("utf-8"))
