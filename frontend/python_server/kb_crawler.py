#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════╗
║   SIGMA-NET RELAY CRAWLER — Butler Knowledge Engine v1.0          ║
║   Server-Integrated Graph-Mapped Autonomous-crawler               ║
║   via Network-Encoded Teleport Relay                              ║
║                                                                   ║
║   Run: python kb_crawler.py                                       ║
║   Or:  Integrated with butler_server.py as /api/crawl endpoint   ║
╚═══════════════════════════════════════════════════════════════════╝

This module adds to the Butler Server:
  POST /api/crawl        — Single URL teleport crawl
  POST /api/crawl/batch  — Multi-URL batch crawl (async)
  GET  /api/crawl/status — Crawler status + stats

The mobile app sends crawl requests here. The PC's Python does
the real HTTP fetching (no Android restrictions), cleans the HTML,
and returns compressed clean text back to the phone.
"""

import json
import re
import sys
import time
import socket
import threading
import urllib.request
import urllib.error
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

# ─── Config ──────────────────────────────────────────────────────
CRAWLER_PORT    = 8766   # Separate port from main butler (8765)
MAX_WORKERS     = 6      # Concurrent crawls
FETCH_TIMEOUT   = 20     # Seconds per URL
MAX_TEXT_LENGTH = 10000  # Chars of clean text to return
DEFAULT_UA      = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# ─── Stats ───────────────────────────────────────────────────────
stats = {
    "totalRequests": 0,
    "successful": 0,
    "failed": 0,
    "totalWords": 0,
    "startedAt": datetime.now().isoformat(),
}


# ─── Core Crawl Function ─────────────────────────────────────────
def fetch_and_clean(url: str, keywords: list = None) -> dict:
    """
    SIGMA-NET RELAY core function:
    Fetch URL on PC, clean HTML, extract relevant text.
    Returns structured dict with cleanText, title, wordCount, links.
    """
    keywords = keywords or []
    start_ts = time.time()

    try:
        headers = {
            "User-Agent": DEFAULT_UA,
            "Accept": "text/html,application/xhtml+xml,text/plain,*/*;q=0.9",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "DNT": "1",
        }

        if HAS_REQUESTS:
            resp = requests.get(url, headers=headers, timeout=FETCH_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()
            html = resp.text
            final_url = resp.url
        else:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as r:
                html = r.read().decode("utf-8", errors="replace")
                final_url = r.url

        # ── Extract title ────────────────────────────────────
        title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
        title = title_match.group(1).strip() if title_match else url

        # ── Extract links ─────────────────────────────────────
        links = []
        if keywords:  # Only extract links if we want to follow them
            link_matches = re.findall(r'href=["\']([^"\']+)["\']', html, re.I)
            base = "/".join(url.split("/")[:3])
            for lnk in link_matches[:20]:
                if lnk.startswith("http"):
                    links.append(lnk)
                elif lnk.startswith("/"):
                    links.append(base + lnk)

        # ── Clean HTML ────────────────────────────────────────
        if HAS_BS4:
            soup = BeautifulSoup(html, "html.parser")
            # Remove noise elements
            for tag in soup(["script", "style", "nav", "header", "footer",
                             "aside", "form", "iframe", "noscript", "svg"]):
                tag.decompose()
            # Prefer main content blocks
            content_blocks = soup.find_all(["main", "article", "section", ".content", "#content"])
            if content_blocks:
                clean = " ".join(b.get_text(separator=" ", strip=True) for b in content_blocks)
            else:
                clean = soup.get_text(separator=" ", strip=True)
        else:
            # Fallback regex cleaning
            clean = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
            clean = re.sub(r"<style[\s\S]*?</style>", "", clean, flags=re.I)
            clean = re.sub(r"<!--[\s\S]*?-->", "", clean)
            clean = re.sub(r"<[^>]+>", " ", clean)

        # ── Normalize whitespace ──────────────────────────────
        clean = re.sub(r"\s+", " ", clean).strip()

        # ── Keyword-focused extraction ────────────────────────
        if keywords and len(clean) > 1000:
            # Extract paragraphs containing keywords (relevance boost)
            paragraphs = clean.split(". ")
            scored = []
            for para in paragraphs:
                score = sum(1 for kw in keywords if kw.lower() in para.lower())
                if score > 0:
                    scored.append((score, para))
            if scored:
                scored.sort(key=lambda x: x[0], reverse=True)
                focused = ". ".join(p for _, p in scored[:30])
                # Prepend focused content, then add general context
                clean = focused + " ... " + clean[:2000]

        # ── Truncate to max ───────────────────────────────────
        clean = clean[:MAX_TEXT_LENGTH]
        word_count = len(clean.split())
        elapsed = round((time.time() - start_ts) * 1000)

        print(f"[SIGMA-NET] ✓ {url[:60]}... → {word_count} words in {elapsed}ms")

        stats["successful"] += 1
        stats["totalWords"] += word_count

        return {
            "ok": True,
            "url": final_url,
            "title": title,
            "cleanText": clean,
            "wordCount": word_count,
            "links": links[:10],
            "fetchedAt": datetime.now().isoformat(),
            "latencyMs": elapsed,
            "method": "SIGMA-NET-RELAY",
        }

    except Exception as e:
        elapsed = round((time.time() - start_ts) * 1000)
        print(f"[SIGMA-NET] ✗ {url[:60]}... → {e}")
        stats["failed"] += 1
        return {
            "ok": False,
            "url": url,
            "title": "",
            "cleanText": "",
            "wordCount": 0,
            "links": [],
            "error": str(e),
            "latencyMs": elapsed,
            "method": "SIGMA-NET-RELAY",
        }


def batch_crawl(requests_list: list, max_workers: int = MAX_WORKERS) -> dict:
    """
    Parallel batch crawl using ThreadPoolExecutor.
    Up to MAX_WORKERS concurrent fetches.
    """
    results = []
    total_words = 0
    failed = 0
    start_ts = time.time()

    print(f"[SIGMA-NET BATCH] Starting {len(requests_list)} crawls with {max_workers} workers")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(
                fetch_and_clean,
                req.get("url", ""),
                req.get("keywords", [])
            ): req
            for req in requests_list
        }
        for future in as_completed(future_map):
            orig_req = future_map[future]
            try:
                result = future.result(timeout=FETCH_TIMEOUT + 5)
                # Attach domain/topic from original request
                result["domain"] = orig_req.get("domain", "General")
                result["topic"]  = orig_req.get("topic", "Unknown")
                results.append(result)
                total_words += result.get("wordCount", 0)
                if not result.get("ok"):
                    failed += 1
            except Exception as e:
                failed += 1
                results.append({
                    "ok": False, "url": orig_req.get("url", ""),
                    "domain": orig_req.get("domain", ""), "topic": orig_req.get("topic", ""),
                    "cleanText": "", "wordCount": 0, "error": str(e),
                    "method": "SIGMA-NET-RELAY",
                })

    total_ms = round((time.time() - start_ts) * 1000)
    print(f"[SIGMA-NET BATCH] Done: {len(results) - failed} success / {failed} fail in {total_ms}ms")

    return {
        "completed": len(results) - failed,
        "failed": failed,
        "results": results,
        "totalWords": total_words,
        "totalMs": total_ms,
    }


# ─── HTTP Handler ────────────────────────────────────────────────
class CrawlerHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass  # Suppress Apache-style logs

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")

    def _json(self, obj: dict, status: int = 200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/status":
            self._json({
                "status": "online",
                "service": "SIGMA-NET-RELAY-CRAWLER",
                "version": "1.0.0",
                "host": socket.gethostname(),
                "uptime": datetime.now().isoformat(),
                "capabilities": ["single-crawl", "batch-crawl", "keyword-focus"],
                "hasRequests": HAS_REQUESTS,
                "hasBeautifulSoup": HAS_BS4,
            })
        elif self.path == "/api/crawl/status":
            self._json({"stats": stats, "service": "SIGMA-NET-RELAY"})
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        stats["totalRequests"] += 1
        body = self._body()

        if self.path == "/api/crawl":
            url       = body.get("url", "").strip()
            domain    = body.get("domain", "General")
            topic     = body.get("topic", "Unknown")
            keywords  = body.get("keywords", [])

            if not url:
                self._json({"error": "url is required"}, 400)
                return

            result = fetch_and_clean(url, keywords)
            result["domain"] = domain
            result["topic"]  = topic
            self._json(result)

        elif self.path == "/api/crawl/batch":
            requests_list = body.get("requests", [])
            if not isinstance(requests_list, list) or not requests_list:
                self._json({"error": "requests must be a non-empty list"}, 400)
                return
            # Cap to 30 URLs per batch
            requests_list = requests_list[:30]
            result = batch_crawl(requests_list)
            self._json(result)

        else:
            self._json({"error": "not found"}, 404)


# ─── Standalone server mode ──────────────────────────────────────
def run_standalone():
    ip = "0.0.0.0"
    print("╔══════════════════════════════════════════════════╗")
    print("║  SIGMA-NET RELAY CRAWLER — Butler KB Engine     ║")
    print(f"║  Listening on port {CRAWLER_PORT}                        ║")
    print(f"║  Host: {socket.gethostname():<42}║")
    print("║  Endpoints:                                      ║")
    print("║    POST /api/crawl          Single URL crawl     ║")
    print("║    POST /api/crawl/batch    Batch URL crawl      ║")
    print("║    GET  /api/crawl/status   Stats                ║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"[SIGMA-NET] requests: {'YES' if HAS_REQUESTS else 'NO (pip install requests)'}")
    print(f"[SIGMA-NET] beautifulsoup4: {'YES' if HAS_BS4 else 'NO (pip install beautifulsoup4)'}")
    print("[SIGMA-NET] Server started. Waiting for crawl requests...")

    server = HTTPServer((ip, CRAWLER_PORT), CrawlerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[SIGMA-NET] Shutting down crawler...")
        server.shutdown()


# ─── Integration functions (for butler_server.py import) ─────────
def get_crawl_routes():
    """
    Returns route handlers for integration into butler_server.py
    Usage: from kb_crawler import handle_crawl_route
    """
    return {
        "/api/crawl": fetch_and_clean,
        "/api/crawl/batch": batch_crawl,
    }


def handle_crawl_request(path: str, body: dict) -> dict:
    """Unified handler callable from butler_server.py do_POST"""
    if path == "/api/crawl":
        url = body.get("url", "").strip()
        if not url:
            return {"error": "url required", "ok": False}
        result = fetch_and_clean(url, body.get("keywords", []))
        result["domain"] = body.get("domain", "General")
        result["topic"] = body.get("topic", "Unknown")
        return result
    elif path == "/api/crawl/batch":
        reqs = body.get("requests", [])[:30]
        return batch_crawl(reqs)
    return {"error": "unknown path"}


if __name__ == "__main__":
    run_standalone()
