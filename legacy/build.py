#!/usr/bin/env python3
"""Build the Japan 2026 trip page.

The page parses the sheet itself (parseTrip in template.html). This script packs the
template into its two forms:

  site/index.html  - the hosted page for wrongtrain.lol. Carries NO trip data: it asks for a
                     name and passcode, and the sheet's Apps Script web app (apps_script.gs)
                     only answers a valid login. Upload with site/apple-touch-icon.png.
  trip.html        - the private Claude artifact: a snapshot baked in, no sign-in, no live link.
  preview.html     - standalone copy of trip.html for local checks.

Snapshot source for trip.html: live.json if present (a saved web-app response), otherwise
sheet.json (Google Sheets `spreadsheets.get` with grid data; fields sheets.properties.title,
sheets.data.rowData.values.formattedValue, sheets.data.rowData.values.hyperlink).

Usage: python3 build.py LIVE_URL
"""
import json, sys, datetime, pathlib

HERE = pathlib.Path(__file__).parent


def snapshot(sheet):
    """Same shape the web app returns: {updated, tabs:[{title, rows, links}]}."""
    tabs = []
    for s in sheet["sheets"]:
        rows, links = [], {}
        for r, rd in enumerate(s["data"][0].get("rowData", [])):
            vals = rd.get("values", [])
            row = [v.get("formattedValue") or "" for v in vals]
            while row and not row[-1]:
                row.pop()
            for c, v in enumerate(vals[:len(row)]):
                if v.get("hyperlink"):
                    links[f"{r},{c}"] = v["hyperlink"]
            rows.append(row)
        while rows and not rows[-1]:
            rows.pop()
        tabs.append({"title": s["properties"]["title"], "rows": rows, "links": links})
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return {"updated": now, "tabs": tabs}


SKELETON = ('<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}'
            'body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}'
            '[hidden]{display:none!important}</style></head><body>')

HOSTED_HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Japan 2026">
<meta name="theme-color" content="#EEF1F0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1412" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="apple-touch-icon.png">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body class="locked">
"""
# Hosted layout: tabs as a slim row at the top, where no phone browser toolbar can cover them.
HOSTED_CSS = """
<style>
.tabs{top:0;bottom:auto;border-top:0;border-bottom:1px solid var(--rule);padding-bottom:0}
.tabs-in{height:46px}
.tab{height:46px;padding:0;align-content:center;font-size:12.5px;letter-spacing:-.01em}
.tab svg{display:none}
.tab[aria-current="page"]::before{top:auto;bottom:0;left:18%;right:18%;border-radius:3px 3px 0 0}
.wrap{padding-block:60px 90px}
body.locked .wrap{padding-block:16px 40px}
.daystrip,.catstrip{top:47px}
</style>
<script>if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));</script>
</body>
</html>
"""


def fill(tpl, data, live_url, auth):
    for mark in ("/*__DATA__*/", "/*__LIVE_URL__*/", "/*__AUTH__*/"):
        assert tpl.count(mark) == 1, mark
    return tpl.replace("/*__DATA__*/", data).replace("/*__LIVE_URL__*/", live_url).replace("/*__AUTH__*/", auth)


def main():
    live_url = sys.argv[1] if len(sys.argv) > 1 else ""
    tpl = (HERE / "template.html").read_text()

    # hosted page: no data inside, sign-in required
    site = HERE / "site"
    site.mkdir(exist_ok=True)
    hosted = HOSTED_HEAD + fill(tpl, "null", live_url, "1") + HOSTED_CSS
    (site / "index.html").write_text(hosted)
    # recorded phrase audio (made by audio_src/make_audio.py); the page fetches it from beside index.html
    pack = HERE / "phrases-audio.json"
    if pack.exists():
        (site / "phrases-audio.json").write_bytes(pack.read_bytes())
    # offline support: keeps the page, audio, map library and viewed tiles on the phone
    (site / "sw.js").write_bytes((HERE / "sw.js").read_bytes())

    # private artifact: snapshot inside, no sign-in, cannot call out
    live = HERE / "live.json"
    snap = json.loads(live.read_text()) if live.exists() else snapshot(json.loads((HERE / "sheet.json").read_text()))
    snap = {"updated": snap["updated"], "tabs": [t for t in snap["tabs"] if t["title"] != "Accounts"]}
    blob = json.dumps(snap, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    artifact = fill(tpl, blob, "", "")
    (HERE / "trip.html").write_text(artifact)
    (HERE / "preview.html").write_text(SKELETON + artifact + "</body></html>")
    print("hosted bytes", len(hosted), "| artifact bytes", len(artifact),
          "| snapshot tabs", len(snap["tabs"]), "| live:", live_url or "(none)")


if __name__ == "__main__":
    main()
