import json
import os
import urllib.request
import sys

token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "")
item_id = sys.argv[1]
url = "https://api.github.com/graphql"
project_id = "PVT_kwHOAkgXus4BfhjX"
status_field_id = "PVTSSF_lAHOAkgXus4BfhjXzhZz28U"
done_option_id = "98236657"

mutation = f"""mutation {{
  updateProjectV2ItemFieldValue(
    input: {{
      projectId: "{project_id}"
      itemId: "{item_id}"
      fieldId: "{status_field_id}"
      value: {{
        singleSelectOptionId: "{done_option_id}"
      }}
    }}
  ) {{
    projectV2Item {{ id }}
  }}
}}"""

req = urllib.request.Request(
    url, data=json.dumps({"query": mutation}).encode("utf-8"),
    headers={
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Antigravity",
    },
)
with urllib.request.urlopen(req) as resp:
    print(resp.read().decode("utf-8"))
