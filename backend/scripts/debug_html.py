"""
Debug script to save HTML for inspection
"""

import requests

CARD_LIST_URL = "https://www.onepiece-cardgame.com/cardlist/"

headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

data = {
    "freewords": "",
    "series": "",
    "categories[]": "リーダー"
}

print("Fetching card list...")
response = requests.post(CARD_LIST_URL, headers=headers, data=data)
response.raise_for_status()

# Save HTML to file
with open("cardlist_debug.html", "w", encoding="utf-8") as f:
    f.write(response.text)

print(f"HTML saved to cardlist_debug.html ({len(response.text)} characters)")
print("Please open this file in a browser to inspect the HTML structure.")
