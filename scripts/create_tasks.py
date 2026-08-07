import json
import os
import urllib.request
import sys

token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "")
if not token:
    print("Error: GITHUB_PERSONAL_ACCESS_TOKEN env variable is missing.")
    sys.exit(1)

project_id = "PVT_kwHOAkgXus4BfhjX"
url = "https://api.github.com/graphql"

tasks = [
    "Task 1: Setup Vite React SPA architecture and Google OAuth integrations",
    "Task 2: Build minimal Dashboard view (Charts, metrics, styling)",
    "Task 3: Build Data Ingestion view (CSV drag&drop, papaparse, Sheets API)",
    "Task 4: Build Gemini AI Assistant chat view (iMessage style UI + API)",
]

created_items = []
print(f"Adding tasks to GitHub Project {project_id}...")

for title in tasks:
    mutation = f"""mutation {{
      addProjectV2DraftIssue(input: {{projectId: "{project_id}", title: "{title}"}}) {{
        projectItem {{
          id
          content {{
            ... on DraftIssue {{
              title
            }}
          }}
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
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            if "errors" in res:
                print(f"GraphQL Error for '{title}':", res["errors"])
                continue
            item = res["data"]["addProjectV2DraftIssue"]["projectItem"]
            created_items.append({"title": title, "id": item["id"]})
            print(f"✅ Created task '{title}' with Item ID: {item['id']}")
    except Exception as e:
        print(f"HTTP Request failed for '{title}': {e}")

print("\nDone! Tasks mapped to IDs:")
for item in created_items:
    print(f"{item['title']} -> {item['id']}")
