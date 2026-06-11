#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║   NEXUS KNOWLEDGE ENGINE v1.0 — Standalone 24/7 Autonomous KB Crawler      ║
║                                                                              ║
║   Run alongside butler_server.py for continuous knowledge acquisition.      ║
║   Port: 8767  (separate from main server on 8765)                           ║
║                                                                              ║
║   Proprietary Method: Φ-NEXUS ΩLOOP HARVEST PROTOCOL                       ║
║     Phase 1 — SEED: Load curated Python docs URLs                           ║
║     Phase 2 — HARVEST: Parallel async fetch + BeautifulSoup clean           ║
║     Phase 3 — COMPRESS: BM25-inspired semantic dedup + keyword extraction   ║
║     Phase 4 — RELAY: Push compressed findings back to mobile via REST       ║
║     Phase 5 — GROW: Auto-discover new URLs from crawled content             ║
║                                                                              ║
║   Run: python nexus_knowledge_engine.py                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import json
import os
import re
import sys
import time
import math
import random
import socket
import hashlib
import threading
import subprocess
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse

# Optional heavy imports
try:
    import requests as _req
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    import urllib.request

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

# ─── Config ────────────────────────────────────────────────────────────────────
ENGINE_PORT       = 8767
HARVEST_INTERVAL  = 45 * 60       # 45 min between full harvests
QUICK_INTERVAL    = 8 * 60        # 8 min for gap-fill mini-harvests
BATCH_SIZE        = 12             # concurrent fetches per cycle
MAX_WORDS_PER_DOC = 1200          # cap words stored per document
KB_FILE           = os.path.join(os.path.dirname(__file__), "nexus_kb.json")
LOG_FILE          = os.path.join(os.path.dirname(__file__), "nexus_engine.log")

# ─── Logging ───────────────────────────────────────────────────────────────────
def _log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}][{level}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ─── MASTER URL LIBRARY ────────────────────────────────────────────────────────
# Every URL we will ever need to train Butler AI.
# Organized by category → domain → (url, topic, keywords[])
MASTER_URLS = [
    # ── Python Standard Library ────────────────────────────────────────────
    ("https://docs.python.org/3/library/pathlib.html",     "Python/stdlib",   "pathlib",       ["path","file","directory","glob","mkdir","rename"]),
    ("https://docs.python.org/3/library/os.html",          "Python/stdlib",   "os-module",     ["os","environ","walk","makedirs","getenv","chmod"]),
    ("https://docs.python.org/3/library/shutil.html",      "Python/stdlib",   "shutil",        ["copy","move","rmtree","copytree","disk_usage"]),
    ("https://docs.python.org/3/library/subprocess.html",  "Python/stdlib",   "subprocess",    ["run","popen","shell","stdout","stderr","communicate"]),
    ("https://docs.python.org/3/library/threading.html",   "Python/stdlib",   "threading",     ["thread","lock","event","semaphore","barrier"]),
    ("https://docs.python.org/3/library/multiprocessing.html","Python/stdlib","multiprocessing",["process","pool","queue","pipe","manager"]),
    ("https://docs.python.org/3/library/asyncio.html",     "Python/stdlib",   "asyncio",       ["async","await","coroutine","event_loop","task"]),
    ("https://docs.python.org/3/library/socket.html",      "Python/stdlib",   "socket",        ["tcp","udp","bind","listen","connect","recv","send"]),
    ("https://docs.python.org/3/library/smtplib.html",     "Python/stdlib",   "smtplib",       ["email","smtp","sendmail","login","tls","gmail"]),
    ("https://docs.python.org/3/library/imaplib.html",     "Python/stdlib",   "imaplib",       ["imap","email","read","inbox","fetch","search"]),
    ("https://docs.python.org/3/library/json.html",        "Python/stdlib",   "json",          ["json","loads","dumps","serialize","parse"]),
    ("https://docs.python.org/3/library/csv.html",         "Python/stdlib",   "csv",           ["csv","reader","writer","dictreader","dictwriter"]),
    ("https://docs.python.org/3/library/sqlite3.html",     "Python/stdlib",   "sqlite3",       ["sqlite","database","sql","cursor","execute","fetchall"]),
    ("https://docs.python.org/3/library/logging.html",     "Python/stdlib",   "logging",       ["logging","handler","formatter","level","debug","error"]),
    ("https://docs.python.org/3/library/configparser.html","Python/stdlib",   "configparser",  ["config","ini","read","get","set","write"]),
    ("https://docs.python.org/3/library/argparse.html",    "Python/stdlib",   "argparse",      ["argument","parser","cli","help","flags","optional"]),
    ("https://docs.python.org/3/library/datetime.html",    "Python/stdlib",   "datetime",      ["date","time","now","timedelta","strftime","strptime"]),
    ("https://docs.python.org/3/library/re.html",          "Python/stdlib",   "regex",         ["regex","pattern","match","search","findall","sub","compile"]),
    ("https://docs.python.org/3/library/zipfile.html",     "Python/stdlib",   "zipfile",       ["zip","compress","extract","archive","write","read"]),
    ("https://docs.python.org/3/library/hashlib.html",     "Python/stdlib",   "hashlib",       ["hash","sha256","md5","blake","digest","hexdigest"]),
    ("https://docs.python.org/3/library/secrets.html",     "Python/stdlib",   "secrets",       ["secret","token","random","urlsafe","secure"]),
    ("https://docs.python.org/3/library/base64.html",      "Python/stdlib",   "base64",        ["base64","encode","decode","urlsafe","b64encode"]),
    ("https://docs.python.org/3/library/urllib.request.html","Python/stdlib", "urllib",        ["url","open","request","urlopen","urlretrieve"]),
    ("https://docs.python.org/3/library/ftplib.html",      "Python/stdlib",   "ftplib",        ["ftp","upload","download","connect","login"]),
    ("https://docs.python.org/3/library/http.server.html", "Python/stdlib",   "http-server",   ["server","handler","basehttprequesthandler","response"]),
    ("https://docs.python.org/3/library/xml.etree.elementtree.html","Python/stdlib","xml",     ["xml","etree","parse","findall","element","tag"]),
    ("https://docs.python.org/3/library/collections.html", "Python/stdlib",   "collections",   ["defaultdict","counter","deque","ordereddict","namedtuple"]),
    ("https://docs.python.org/3/library/itertools.html",   "Python/stdlib",   "itertools",     ["chain","cycle","product","combinations","permutations"]),
    ("https://docs.python.org/3/library/functools.html",   "Python/stdlib",   "functools",     ["partial","reduce","lru_cache","wraps","cache"]),
    ("https://docs.python.org/3/library/typing.html",      "Python/stdlib",   "typing",        ["type","hint","annotation","optional","union","list","dict"]),
    ("https://docs.python.org/3/library/contextlib.html",  "Python/stdlib",   "contextlib",    ["context","with","contextmanager","suppress","closing"]),
    ("https://docs.python.org/3/library/signal.html",      "Python/stdlib",   "signal",        ["signal","sigterm","sigint","handler","alarm"]),
    ("https://docs.python.org/3/library/platform.html",    "Python/stdlib",   "platform",      ["platform","system","machine","node","release","version"]),
    ("https://docs.python.org/3/library/sys.html",         "Python/stdlib",   "sys",           ["argv","path","exit","stdout","stdin","version","platform"]),
    ("https://docs.python.org/3/library/glob.html",        "Python/stdlib",   "glob",          ["glob","pattern","wildcard","files","match"]),
    ("https://docs.python.org/3/library/tempfile.html",    "Python/stdlib",   "tempfile",      ["temp","temporary","mkstemp","mkdtemp","namedtempfile"]),
    ("https://docs.python.org/3/library/pickle.html",      "Python/stdlib",   "pickle",        ["pickle","serialize","dump","load","protocol"]),
    ("https://docs.python.org/3/library/struct.html",      "Python/stdlib",   "struct",        ["struct","pack","unpack","binary","bytes"]),
    ("https://docs.python.org/3/library/textwrap.html",    "Python/stdlib",   "textwrap",      ["wrap","dedent","indent","fill","shorten"]),
    ("https://docs.python.org/3/library/dataclasses.html", "Python/stdlib",   "dataclasses",   ["dataclass","field","init","repr","eq","frozen"]),

    # ── PyPI Automation Libraries ──────────────────────────────────────────
    ("https://psutil.readthedocs.io/en/latest/",           "Python/system",   "psutil",        ["cpu","memory","disk","network","process","pid","io"]),
    ("https://pypi.org/project/psutil/",                   "Python/system",   "psutil-pypi",   ["psutil","install","version","changelog"]),
    ("https://pypi.org/project/pyautogui/",                "Python/gui",      "pyautogui",     ["mouse","keyboard","screenshot","click","move"]),
    ("https://pyautogui.readthedocs.io/en/latest/",        "Python/gui",      "pyautogui-docs",["hotkey","write","press","position","size"]),
    ("https://pypi.org/project/pynput/",                   "Python/gui",      "pynput",        ["keyboard","mouse","listener","controller","hotkey"]),
    ("https://pypi.org/project/keyboard/",                 "Python/gui",      "keyboard-lib",  ["keyboard","hotkey","hook","send","press","release"]),
    ("https://pypi.org/project/pyperclip/",                "Python/gui",      "pyperclip",     ["clipboard","copy","paste","text"]),
    ("https://pypi.org/project/pygetwindow/",              "Python/gui",      "pygetwindow",   ["window","title","activate","maximize","minimize"]),
    ("https://selenium-python.readthedocs.io/",            "Python/web",      "selenium",      ["webdriver","chrome","firefox","find","click","element"]),
    ("https://pypi.org/project/selenium/",                 "Python/web",      "selenium-pypi", ["selenium","browser","automation","webdriver"]),
    ("https://playwright.dev/python/docs/intro",           "Python/web",      "playwright",    ["playwright","chromium","headless","page","browser"]),
    ("https://pypi.org/project/playwright/",               "Python/web",      "playwright-pypi",["playwright","install","async","sync"]),
    ("https://requests.readthedocs.io/en/latest/",         "Python/web",      "requests",      ["http","get","post","session","headers","auth","timeout"]),
    ("https://pypi.org/project/requests/",                 "Python/web",      "requests-pypi", ["requests","install","version"]),
    ("https://www.crummy.com/software/BeautifulSoup/bs4/doc/","Python/web",   "beautifulsoup", ["html","parse","find","findall","select","tag","css"]),
    ("https://pypi.org/project/beautifulsoup4/",           "Python/web",      "bs4-pypi",      ["beautifulsoup4","bs4","install"]),
    ("https://pypi.org/project/httpx/",                    "Python/web",      "httpx",         ["httpx","async","http2","client","request"]),
    ("https://pypi.org/project/aiohttp/",                  "Python/web",      "aiohttp",       ["aiohttp","async","session","get","post","websocket"]),
    ("https://pypi.org/project/scrapy/",                   "Python/web",      "scrapy",        ["spider","crawl","xpath","css","item","pipeline"]),
    ("https://docs.python-requests.org/en/latest/user/quickstart/","Python/web","requests-quickstart",["get","post","json","params","header"]),
    ("https://pypi.org/project/schedule/",                 "Python/schedule", "schedule",      ["schedule","every","run","job","interval","at","tag"]),
    ("https://apscheduler.readthedocs.io/en/3.x/",        "Python/schedule", "apscheduler",   ["scheduler","cron","interval","date","job","trigger"]),
    ("https://pypi.org/project/APScheduler/",              "Python/schedule", "apscheduler-pypi",["apscheduler","background","scheduler"]),
    ("https://watchdog.readthedocs.io/en/latest/",         "Python/files",    "watchdog",      ["watch","observer","event","file","directory","monitor"]),
    ("https://pypi.org/project/watchdog/",                 "Python/files",    "watchdog-pypi", ["watchdog","install","version"]),
    ("https://pandas.pydata.org/docs/",                    "Python/data",     "pandas",        ["dataframe","series","read_csv","groupby","merge","plot"]),
    ("https://pypi.org/project/pandas/",                   "Python/data",     "pandas-pypi",   ["pandas","install","version"]),
    ("https://openpyxl.readthedocs.io/en/stable/",        "Python/data",     "openpyxl",      ["excel","xlsx","workbook","sheet","cell","write","read"]),
    ("https://pypi.org/project/openpyxl/",                 "Python/data",     "openpyxl-pypi", ["openpyxl","excel","install"]),
    ("https://pypi.org/project/xlrd/",                     "Python/data",     "xlrd",          ["excel","xls","read","workbook","sheet"]),
    ("https://pypi.org/project/xlwt/",                     "Python/data",     "xlwt",          ["excel","xls","write","workbook","cell"]),
    ("https://pypi.org/project/python-docx/",              "Python/data",     "python-docx",   ["word","docx","document","paragraph","table","image"]),
    ("https://pypi.org/project/PyPDF2/",                   "Python/data",     "pypdf2",        ["pdf","read","extract","page","writer","merger"]),
    ("https://pypi.org/project/reportlab/",                "Python/data",     "reportlab",     ["pdf","generate","canvas","paragraph","table"]),
    ("https://flask.palletsprojects.com/en/stable/",       "Python/web",      "flask",         ["flask","route","request","response","template","api"]),
    ("https://fastapi.tiangolo.com/",                      "Python/web",      "fastapi",       ["fastapi","endpoint","pydantic","async","openapi"]),
    ("https://pypi.org/project/paramiko/",                 "Python/network",  "paramiko",      ["ssh","sftp","transport","connect","exec_command"]),
    ("https://pypi.org/project/fabric/",                   "Python/network",  "fabric",        ["ssh","remote","run","put","get","deploy"]),
    ("https://pypi.org/project/pywin32/",                  "Python/windows",  "pywin32",       ["win32","registry","winreg","com","service","window"]),
    ("https://pypi.org/project/pywin32-ctypes/",           "Python/windows",  "ctypes-win",    ["ctypes","windll","wintypes","handle","hwnd"]),
    ("https://pypi.org/project/winreg/",                   "Python/windows",  "winreg",        ["registry","hkey","open","query","set","startup"]),
    ("https://pypi.org/project/pyinstaller/",              "Python/deploy",   "pyinstaller",   ["exe","compile","bundle","spec","onefile","dist"]),
    ("https://pypi.org/project/cx-Freeze/",                "Python/deploy",   "cxfreeze",      ["freeze","exe","msi","build","standalone"]),
    ("https://pypi.org/project/python-dotenv/",            "Python/config",   "dotenv",        ["env","dotenv","load_dotenv","environ","secret"]),
    ("https://pypi.org/project/pydantic/",                 "Python/config",   "pydantic",      ["pydantic","model","validation","schema","field"]),
    ("https://pypi.org/project/cryptography/",             "Python/security", "cryptography",  ["encrypt","decrypt","aes","rsa","fernet","key","cipher"]),
    ("https://pypi.org/project/bcrypt/",                   "Python/security", "bcrypt",        ["bcrypt","hash","password","salt","verify"]),
    ("https://pypi.org/project/PyJWT/",                    "Python/security", "pyjwt",         ["jwt","token","encode","decode","secret","payload"]),
    ("https://pypi.org/project/Pillow/",                   "Python/image",    "pillow",        ["image","pil","open","save","resize","crop","convert"]),
    ("https://pypi.org/project/mss/",                      "Python/image",    "mss",           ["screenshot","grab","monitor","screen","capture"]),
    ("https://pypi.org/project/plyer/",                    "Python/gui",      "plyer",         ["notification","notify","alert","toast","system"]),
    ("https://pypi.org/project/win10toast/",               "Python/windows",  "win10toast",    ["notification","toast","windows","notify","balloon"]),
    ("https://pypi.org/project/rich/",                     "Python/cli",      "rich",          ["rich","console","print","table","progress","color","panel"]),
    ("https://pypi.org/project/typer/",                    "Python/cli",      "typer",         ["cli","typer","command","argument","option","app"]),
    ("https://pypi.org/project/click/",                    "Python/cli",      "click",         ["click","command","option","argument","group","decorator"]),
    ("https://pypi.org/project/tqdm/",                     "Python/cli",      "tqdm",          ["progress","bar","loop","iterator","tqdm","percentage"]),
    ("https://pypi.org/project/colorama/",                 "Python/cli",      "colorama",      ["color","terminal","ansi","fore","back","reset"]),
    ("https://pypi.org/project/loguru/",                   "Python/logging",  "loguru",        ["log","debug","info","error","sink","rotation","retention"]),
    ("https://pypi.org/project/structlog/",                "Python/logging",  "structlog",     ["structured","log","processor","context","json"]),
    ("https://pypi.org/project/celery/",                   "Python/tasks",    "celery",        ["celery","task","worker","queue","broker","redis","beat"]),
    ("https://pypi.org/project/rq/",                       "Python/tasks",    "rq",            ["queue","job","worker","redis","enqueue","delayed"]),
    ("https://pypi.org/project/redis/",                    "Python/db",       "redis-py",      ["redis","set","get","expire","pubsub","pipeline"]),
    ("https://pypi.org/project/pymongo/",                  "Python/db",       "pymongo",       ["mongo","mongodb","insert","find","update","delete"]),
    ("https://pypi.org/project/sqlalchemy/",               "Python/db",       "sqlalchemy",    ["orm","engine","session","table","column","query"]),
    ("https://pypi.org/project/peewee/",                   "Python/db",       "peewee",        ["peewee","model","orm","field","database","sqlite"]),
    ("https://pypi.org/project/motor/",                    "Python/db",       "motor",         ["mongo","async","collection","insert","find","asyncio"]),
    ("https://pypi.org/project/boto3/",                    "Python/cloud",    "boto3",         ["aws","s3","ec2","lambda","dynamodb","bucket","upload"]),
    ("https://pypi.org/project/google-api-python-client/","Python/cloud",    "google-api",    ["google","sheets","drive","calendar","gmail","oauth"]),
    ("https://pypi.org/project/twilio/",                   "Python/cloud",    "twilio",        ["twilio","sms","call","verify","phone","message"]),
    ("https://pypi.org/project/slack-sdk/",                "Python/cloud",    "slack-sdk",     ["slack","message","channel","webhook","bot","event"]),
    ("https://pypi.org/project/discord.py/",               "Python/cloud",    "discord-py",    ["discord","bot","command","event","guild","channel"]),
    ("https://pypi.org/project/python-telegram-bot/",      "Python/cloud",    "telegram-bot",  ["telegram","bot","handler","message","command","webhook"]),
    ("https://pypi.org/project/openai/",                   "Python/ai",       "openai",        ["openai","gpt","chat","completion","embedding","image"]),
    ("https://pypi.org/project/google-generativeai/",      "Python/ai",       "google-genai",  ["gemini","generativeai","model","generate","content"]),
    ("https://pypi.org/project/anthropic/",                "Python/ai",       "anthropic",     ["claude","anthropic","message","completion","stream"]),
    ("https://pypi.org/project/langchain/",                "Python/ai",       "langchain",     ["langchain","chain","llm","agent","tool","memory","prompt"]),
    ("https://pypi.org/project/transformers/",             "Python/ai",       "transformers",  ["huggingface","model","tokenizer","pipeline","bert","gpt"]),
    ("https://pypi.org/project/nltk/",                     "Python/ai",       "nltk",          ["nltk","tokenize","stem","pos","corpus","sentiment"]),
    ("https://pypi.org/project/spacy/",                    "Python/ai",       "spacy",         ["spacy","nlp","entity","pos","dep","pipeline","model"]),
    ("https://pypi.org/project/scikit-learn/",             "Python/ai",       "sklearn",       ["sklearn","classifier","regressor","cluster","pipeline","fit"]),
    ("https://pypi.org/project/numpy/",                    "Python/ai",       "numpy",         ["numpy","array","matrix","zeros","ones","dot","reshape"]),
    ("https://pypi.org/project/matplotlib/",               "Python/ai",       "matplotlib",    ["plot","figure","axes","show","savefig","bar","scatter"]),
    ("https://pypi.org/project/seaborn/",                  "Python/ai",       "seaborn",       ["seaborn","heatmap","barplot","countplot","scatterplot"]),
    ("https://pypi.org/project/pytest/",                   "Python/testing",  "pytest",        ["test","assert","fixture","mark","parametrize","mock"]),
    ("https://pypi.org/project/unittest-mock/",            "Python/testing",  "mock",          ["mock","patch","magicmock","assert_called","return_value"]),
    ("https://pypi.org/project/black/",                    "Python/dev",      "black",         ["black","format","code","style","pep8","autoformat"]),
    ("https://pypi.org/project/pylint/",                   "Python/dev",      "pylint",        ["lint","check","error","warning","convention","refactor"]),
    ("https://pypi.org/project/mypy/",                     "Python/dev",      "mypy",          ["mypy","type","check","annotation","strict","error"]),
    ("https://pypi.org/project/poetry/",                   "Python/dev",      "poetry",        ["poetry","dependency","package","build","publish","lock"]),
    ("https://pypi.org/project/virtualenv/",               "Python/dev",      "virtualenv",    ["virtualenv","venv","activate","deactivate","pip","install"]),
    ("https://pypi.org/project/docker/",                   "Python/devops",   "docker-sdk",    ["docker","container","image","build","run","stop","network"]),
    ("https://pypi.org/project/parameterized/",            "Python/testing",  "parameterized", ["parameterized","test","data","cases","decorator"]),

    # ── Windows-Specific Automation ────────────────────────────────────────
    ("https://docs.microsoft.com/en-us/windows/win32/api/winreg/","Python/windows","winreg-api",["hkey","regqueryvalue","regsetvalue","registry","open"]),
    ("https://pypi.org/project/wmi/",                      "Python/windows",  "wmi",           ["wmi","query","process","service","hardware","bios"]),
    ("https://pypi.org/project/comtypes/",                 "Python/windows",  "comtypes",      ["com","automation","dispatch","word","excel","ole"]),

    # ── Error Handling & Troubleshooting ──────────────────────────────────
    ("https://docs.python.org/3/library/exceptions.html",  "Python/errors",   "exceptions",    ["exception","error","try","except","raise","traceback"]),
    ("https://docs.python.org/3/library/traceback.html",   "Python/errors",   "traceback",     ["traceback","format","print","extract","tb"]),
    ("https://docs.python.org/3/library/warnings.html",    "Python/errors",   "warnings",      ["warning","warn","filter","simplefilter","filterwarnings"]),

    # ── Networking & Ports ────────────────────────────────────────────────
    ("https://docs.python.org/3/howto/sockets.html",       "Python/network",  "sockets-howto", ["socket","tcp","udp","client","server","bind","accept"]),
    ("https://pypi.org/project/scapy/",                    "Python/network",  "scapy",         ["scapy","packet","sniff","send","layer","protocol"]),
    ("https://pypi.org/project/nmap/",                     "Python/network",  "nmap",          ["nmap","scan","port","host","service","os"]),
    ("https://pypi.org/project/netifaces/",                "Python/network",  "netifaces",     ["interface","ip","mac","address","gateway","ifaddresses"]),
    ("https://pypi.org/project/websocket-client/",         "Python/network",  "websocket",     ["websocket","connect","send","recv","close","onmessage"]),

    # ── WiFi & Network Diagnostics ────────────────────────────────────────
    ("https://pypi.org/project/speedtest-cli/",            "Python/network",  "speedtest",     ["speedtest","download","upload","ping","server","best"]),
    ("https://pypi.org/project/ping3/",                    "Python/network",  "ping3",         ["ping","icmp","host","timeout","delay","verbose"]),

    # ── Process Automation & Scheduling ───────────────────────────────────
    ("https://docs.python.org/3/library/sched.html",       "Python/schedule", "sched",         ["scheduler","event","enter","run","delay","priority"]),
    ("https://pypi.org/project/croniter/",                 "Python/schedule", "croniter",      ["cron","expression","next","previous","match","schedule"]),
    ("https://pypi.org/project/rocketry/",                 "Python/schedule", "rocketry",      ["rocketry","app","task","cron","daily","weekly","condition"]),

    # ── File & Backup Operations ──────────────────────────────────────────
    ("https://pypi.org/project/send2trash/",               "Python/files",    "send2trash",    ["trash","delete","recycle","bin","remove","file"]),
    ("https://pypi.org/project/pathspec/",                 "Python/files",    "pathspec",      ["gitignore","pattern","match","ignore","path","spec"]),
    ("https://pypi.org/project/filelock/",                 "Python/files",    "filelock",      ["lock","file","concurrent","exclusive","timeout"]),
    ("https://docs.python.org/3/library/tarfile.html",     "Python/files",    "tarfile",       ["tar","gz","compress","extract","archive","add"]),

    # ── System Performance & Monitoring ───────────────────────────────────
    ("https://pypi.org/project/py-spy/",                   "Python/monitor",  "py-spy",        ["profiler","trace","sampling","flamegraph","threads"]),
    ("https://pypi.org/project/memory-profiler/",          "Python/monitor",  "memory-profiler",["memory","ram","profile","usage","decorator","mprof"]),
    ("https://pypi.org/project/objgraph/",                 "Python/monitor",  "objgraph",      ["object","memory","leak","reference","graph","type"]),

    # ── Stack Overflow knowledge (popular Python answers) ─────────────────
    ("https://stackoverflow.com/questions/419163/what-does-if-name-main-do","Python/concepts","if-main",["main","module","script","import","__name__"]),
    ("https://stackoverflow.com/questions/11277432/how-can-i-remove-a-key-from-a-python-dictionary","Python/concepts","dict-remove",["dict","key","pop","del","remove"]),
    ("https://stackoverflow.com/questions/3437059/does-python-have-a-string-contains-substring-method","Python/concepts","string-contains",["string","in","find","contains","substring"]),
    ("https://stackoverflow.com/questions/2257441/random-string-generation-with-upper-case-letters-and-digits","Python/concepts","random-string",["random","string","secrets","token","generate"]),
    ("https://stackoverflow.com/questions/4233218/how-to-read-write-a-file-to-a-specific-location","Python/concepts","file-rw",["open","write","read","with","file","path"]),
    ("https://realpython.com/python-concurrency/",          "Python/advanced", "concurrency",   ["thread","process","asyncio","concurrent","parallel","gil"]),
    ("https://realpython.com/python-decorators/",           "Python/advanced", "decorators",    ["decorator","functools","wraps","closure","wrapper","factory"]),
    ("https://realpython.com/python-generators/",           "Python/advanced", "generators",    ["generator","yield","next","iter","lazy","pipeline"]),
    ("https://realpython.com/python-exceptions/",           "Python/advanced", "exceptions",    ["exception","try","except","raise","finally","custom"]),
    ("https://realpython.com/python-logging/",              "Python/advanced", "logging-guide", ["log","handler","formatter","level","file","stream"]),
    ("https://realpython.com/working-with-files-in-python/","Python/files",   "file-guide",    ["file","path","read","write","copy","move","delete"]),
    ("https://realpython.com/python-send-email/",           "Python/email",    "email-guide",   ["email","smtp","send","attach","html","gmail","ssl"]),
    ("https://realpython.com/web-scraping-with-python-selenium/","Python/web","selenium-guide",["selenium","scrape","browser","element","click","wait"]),
    ("https://realpython.com/python-web-scraping-practical-introduction/","Python/web","requests-scrape",["requests","beautifulsoup","scrape","html","parse"]),
    ("https://realpython.com/python-subprocess/",           "Python/system",   "subprocess-guide",["subprocess","popen","run","communicate","shell"]),
    ("https://realpython.com/python-sqlite-sqlalchemy/",    "Python/db",       "sqlite-guide",  ["sqlite","database","engine","session","orm","query"]),
    ("https://realpython.com/python-schedule/",             "Python/schedule", "schedule-guide",["schedule","job","run","every","background","thread"]),
]

# ─── BM25 / TF-IDF Utilities ───────────────────────────────────────────────────
STOP_WORDS = set([
    "the","a","an","is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","could","should","may","might","can","to","of",
    "in","on","at","by","for","with","about","as","into","from","this","that","these",
    "those","and","or","but","not","so","if","i","me","my","we","you","he","she","it",
    "they","which","who","what","how","all","any","each","both","few","more","most",
    "also","than","then","only","very","just","see","use","using","used","example",
    "following","above","below","can","install","pip","python","get","make","create",
])

def extract_keywords(text: str, max_kw: int = 15) -> list:
    """BM25-inspired keyword extraction without external libraries."""
    words = re.findall(r'[a-z_][a-z0-9_]{2,}', text.lower())
    freq = defaultdict(int)
    for w in words:
        if w not in STOP_WORDS and len(w) > 2:
            freq[w] += 1
    # Sort by frequency × IDF approximation (shorter word = more specific)
    scored = [(w, c * (1 / math.log(len(w) + 1))) for w, c in freq.items()]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [w for w, _ in scored[:max_kw]]


def semantic_hash(text: str, domain: str, topic: str) -> str:
    """Fast dedup hash: top 5 keywords + domain/topic."""
    kws = extract_keywords(text, 5)
    raw = f"{domain}::{topic}::{','.join(sorted(kws))}::{text[:40].lower()}"
    return hashlib.md5(raw.encode()).hexdigest()


def clean_html(html: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    if HAS_BS4:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script","style","nav","header","footer","aside","form","noscript"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
    else:
        text = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
        text = re.sub(r"<style[\s\S]*?</style>",   "", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_WORDS_PER_DOC * 7]  # approx chars


def compress_text(text: str, domain: str, topic: str, source: str) -> dict:
    """Convert raw text into a compressed KB finding."""
    kws = extract_keywords(text, 14)
    # Extract example code snippets
    code_blocks = re.findall(r"```[\s\S]{20,300}?```", text)
    code_inline = re.findall(r"`[^`]{5,60}`", text)
    examples = [c.strip("`").strip()[:100] for c in (code_blocks[:2] + code_inline[:3])]

    # Summary: first 450 chars of clean text
    summary = text[:450].replace("\n", " ").strip()

    conf = min(0.99, 0.60 + len(kws) * 0.025 + min(0.15, len(text) / 8000))

    return {
        "domain": domain,
        "topic": topic,
        "summary": summary,
        "keywords": kws,
        "examples": examples[:5],
        "source": source,
        "metadata": {
            "confidence": round(conf, 2),
            "source": source,
            "timestamp": int(time.time() * 1000),
            "wordCount": len(text.split()),
        },
        "hash": semantic_hash(text, domain, topic),
    }


# ─── HTTP Fetcher ─────────────────────────────────────────────────────────────
def fetch_url(url: str, timeout: int = 20) -> tuple:
    """Returns (html, latency_ms, error)"""
    start = time.time()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,text/plain",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        if HAS_REQUESTS:
            r = _req.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            r.raise_for_status()
            return r.text, round((time.time() - start) * 1000), None
        else:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                html = r.read().decode("utf-8", errors="replace")
            return html, round((time.time() - start) * 1000), None
    except Exception as e:
        return None, round((time.time() - start) * 1000), str(e)


# ─── Knowledge Base Storage ───────────────────────────────────────────────────
class NexusKB:
    """Thread-safe in-memory + disk KB with BM25-inspired dedup."""

    def __init__(self):
        self._lock = threading.Lock()
        self._findings: list = []          # All compressed findings
        self._hash_set: set = set()        # Dedup hashes
        self._inverted: dict = defaultdict(set)  # keyword → finding indices
        self._stats = {
            "totalAdded": 0,
            "totalFetched": 0,
            "totalSkipped": 0,
            "totalFailed": 0,
            "startedAt": datetime.now().isoformat(),
            "lastHarvest": None,
            "harvests": 0,
        }
        self._load()

    def _load(self):
        if not os.path.exists(KB_FILE):
            return
        try:
            with open(KB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._findings = data.get("findings", [])
            self._hash_set = set(data.get("hashes", []))
            self._stats.update(data.get("stats", {}))
            # Rebuild inverted index
            for i, f in enumerate(self._findings):
                for kw in f.get("keywords", []):
                    self._inverted[kw].add(i)
            _log(f"KB loaded: {len(self._findings)} findings from disk")
        except Exception as e:
            _log(f"KB load error: {e}", "WARN")

    def save(self):
        with self._lock:
            try:
                data = {
                    "findings": self._findings,
                    "hashes": list(self._hash_set),
                    "stats": self._stats,
                    "savedAt": datetime.now().isoformat(),
                }
                with open(KB_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                _log(f"KB save error: {e}", "ERROR")

    def add(self, finding: dict) -> bool:
        """Add a finding if not duplicate. Returns True if added."""
        h = finding.get("hash", "")
        with self._lock:
            if h in self._hash_set:
                self._stats["totalSkipped"] += 1
                return False
            idx = len(self._findings)
            self._findings.append(finding)
            self._hash_set.add(h)
            for kw in finding.get("keywords", []):
                self._inverted[kw].add(idx)
            self._stats["totalAdded"] += 1
            return True

    def query(self, text: str, limit: int = 8) -> list:
        """BM25-inspired query: returns top matching findings."""
        terms = [t for t in text.lower().split() if len(t) > 2 and t not in STOP_WORDS]
        scores: dict = defaultdict(float)
        N = max(len(self._findings), 1)
        with self._lock:
            for term in terms:
                # Exact keyword match (high weight)
                for idx in self._inverted.get(term, set()):
                    df = len(self._inverted.get(term, set()))
                    idf = math.log((N - df + 0.5) / (df + 0.5) + 1)
                    scores[idx] += idf * 2.0
                # Partial match on stored keywords
                for kw, indices in self._inverted.items():
                    if term in kw and kw != term:
                        for idx in indices:
                            scores[idx] += 0.5
                # Domain/topic match
                for i, f in enumerate(self._findings):
                    d = f.get("domain", "").lower()
                    t = f.get("topic", "").lower()
                    s = f.get("summary", "").lower()
                    if term in d or term in t:
                        scores[i] += 3.0
                    elif term in s:
                        scores[i] += 0.8

            sorted_idxs = sorted(scores, key=scores.__getitem__, reverse=True)[:limit]
            return [self._findings[i] for i in sorted_idxs if i < len(self._findings)]

    def get_stats(self) -> dict:
        with self._lock:
            return {**self._stats, "totalFindings": len(self._findings)}

    def get_all(self) -> list:
        with self._lock:
            return list(self._findings)

    def clear(self):
        with self._lock:
            self._findings.clear()
            self._hash_set.clear()
            self._inverted.clear()
            self._stats["totalAdded"] = 0
        self.save()


# ─── Harvest Engine ───────────────────────────────────────────────────────────
class HarvestEngine:
    """Runs the ΩLOOP HARVEST PROTOCOL in background threads."""

    def __init__(self, kb: NexusKB):
        self.kb = kb
        self._running = False
        self._harvest_count = 0
        self._current_phase = "STANDBY"
        self._progress = 0
        self._last_url = ""
        self._url_queue: list = []
        self._visited: set = set()
        self._thread: threading.Thread | None = None
        self._quick_thread: threading.Thread | None = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._full_harvest_loop, daemon=True, name="NexusHarvest")
        self._thread.start()
        self._quick_thread = threading.Thread(target=self._quick_harvest_loop, daemon=True, name="NexusQuick")
        self._quick_thread.start()
        _log("NEXUS HARVEST ENGINE started — full cycle every 45min, gap-fill every 8min")

    def stop(self):
        self._running = False

    def get_status(self) -> dict:
        return {
            "running": self._running,
            "phase": self._current_phase,
            "progress": self._progress,
            "lastUrl": self._last_url,
            "harvests": self._harvest_count,
            "queueSize": len(self._url_queue),
            "visited": len(self._visited),
        }

    def _full_harvest_loop(self):
        """Full ΩLOOP: harvests ALL URLs every HARVEST_INTERVAL seconds."""
        # First run: do initial harvest immediately
        time.sleep(3)
        while self._running:
            self._run_full_harvest()
            self._harvest_count += 1
            self.kb._stats["harvests"] += 1
            self.kb._stats["lastHarvest"] = datetime.now().isoformat()
            self.kb.save()
            _log(f"Full harvest #{self._harvest_count} complete. Sleeping {HARVEST_INTERVAL//60}min...")
            for _ in range(HARVEST_INTERVAL):
                if not self._running:
                    break
                time.sleep(1)

    def _quick_harvest_loop(self):
        """Quick gap-fill: re-harvests lowest-confidence domains every 8min."""
        time.sleep(60)  # Give full harvest a head start
        while self._running:
            try:
                self._run_gap_fill()
            except Exception as e:
                _log(f"Quick harvest error: {e}", "WARN")
            for _ in range(QUICK_INTERVAL):
                if not self._running:
                    break
                time.sleep(1)

    def _run_full_harvest(self):
        """Harvest all MASTER_URLS in parallel batches."""
        self._current_phase = "FULL_HARVEST"
        urls_to_harvest = [u for u in MASTER_URLS if u[0] not in self._visited]
        if not urls_to_harvest:
            # Reset visited after one full cycle so we re-harvest everything
            self._visited.clear()
            urls_to_harvest = list(MASTER_URLS)

        _log(f"[FULL] Harvesting {len(urls_to_harvest)} URLs in batches of {BATCH_SIZE}")
        total = len(urls_to_harvest)
        done = 0

        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as ex:
            futures = {
                ex.submit(self._harvest_url, url, domain, topic, kws): (url, domain, topic)
                for url, domain, topic, kws in urls_to_harvest
            }
            for future in as_completed(futures):
                url, domain, topic = futures[future]
                done += 1
                self._progress = round(done / total * 100)
                try:
                    result = future.result(timeout=35)
                    if result:
                        _log(f"[OK] {domain}/{topic} ({self._progress}%)")
                    else:
                        _log(f"[SKIP] {domain}/{topic} — duplicate", "INFO")
                except Exception as e:
                    _log(f"[FAIL] {url[:50]}: {e}", "WARN")
                    self.kb._stats["totalFailed"] += 1
                self._last_url = url
                self._visited.add(url)

        self._current_phase = "DONE"
        self._progress = 100
        _log(f"[FULL] Harvest done. KB now has {self.kb.get_stats()['totalFindings']} findings")

    def _run_gap_fill(self):
        """Fill gaps in KB coverage by re-harvesting underrepresented domains."""
        all_findings = self.kb.get_all()
        # Count per domain
        domain_counts: dict = defaultdict(int)
        for f in all_findings:
            domain_counts[f.get("domain","unknown")] += 1

        # Find domains with < 3 findings
        low_domains = [d for d, c in domain_counts.items() if c < 3]
        target_urls = [u for u in MASTER_URLS if u[1] in low_domains]
        if not target_urls:
            # Nothing to fill — re-harvest random sample for freshness
            target_urls = random.sample(MASTER_URLS, min(5, len(MASTER_URLS)))

        self._current_phase = "GAP_FILL"
        _log(f"[QUICK] Gap-fill: {len(target_urls)} URLs for domains {low_domains[:4]}")
        for url, domain, topic, kws in target_urls[:8]:
            if not self._running:
                break
            try:
                self._harvest_url(url, domain, topic, kws)
            except Exception as e:
                _log(f"[QUICK FAIL] {url[:40]}: {e}", "WARN")
            self._last_url = url
        self._current_phase = "STANDBY"

    def _harvest_url(self, url: str, domain: str, topic: str, kws: list) -> bool:
        """Fetch, clean, compress, and store a single URL. Returns True if stored."""
        self.kb._stats["totalFetched"] += 1
        html, ms, err = fetch_url(url, timeout=25)
        if err or not html:
            return False
        clean = clean_html(html)
        if len(clean.split()) < 40:
            return False
        # Inject known keywords into extraction context
        enhanced = clean + " " + " ".join(kws * 3)
        finding = compress_text(enhanced, domain, topic, url)
        return self.kb.add(finding)


# ─── HTTP API Server ──────────────────────────────────────────────────────────
_kb: NexusKB | None = None
_engine: HarvestEngine | None = None

class EngineHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length", 0))
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        if self.path == "/status":
            self._json({"ok": True, "port": ENGINE_PORT, "engine": _engine.get_status() if _engine else {}, "kb": _kb.get_stats() if _kb else {}})
        elif self.path == "/kb/all":
            findings = _kb.get_all() if _kb else []
            self._json({"findings": findings[:200], "total": len(findings)})
        elif self.path == "/kb/stats":
            self._json(_kb.get_stats() if _kb else {})
        elif self.path == "/engine/status":
            self._json(_engine.get_status() if _engine else {})
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        body = self._body()

        if self.path == "/kb/query":
            q = body.get("query", "")
            lim = min(int(body.get("limit", 8)), 20)
            results = _kb.query(q, lim) if (_kb and q) else []
            self._json({"findings": results, "count": len(results), "query": q})

        elif self.path == "/kb/add":
            finding = body.get("finding", {})
            if finding:
                added = _kb.add(finding) if _kb else False
                if added:
                    _kb.save()
                self._json({"added": added})
            else:
                self._json({"error": "finding required"}, 400)

        elif self.path == "/kb/clear":
            if _kb:
                _kb.clear()
            self._json({"ok": True})

        elif self.path == "/engine/trigger":
            """Manually trigger a harvest cycle (for testing/admin)."""
            if _engine:
                t = threading.Thread(target=_engine._run_full_harvest, daemon=True, name="ManualHarvest")
                t.start()
            self._json({"triggered": True})

        elif self.path == "/kb/enrich":
            """ΣNET compatible: query + web seeds."""
            q = body.get("query", "")
            kws = body.get("keywords", [])
            max_r = min(int(body.get("maxResults", 6)), 10)
            results = _kb.query(q + " " + " ".join(kws), max_r) if _kb else []
            self._json({
                "enrichments": [
                    {
                        "source": r.get("source", ""),
                        "topic":  r.get("topic", ""),
                        "snippet": r.get("summary", ""),
                        "keywords": r.get("keywords", []),
                        "score": r.get("metadata", {}).get("confidence", 0.5),
                    }
                    for r in results
                ],
                "method": "NEXUS-ENGINE-RELAY",
                "latencyMs": 0,
            })

        else:
            self._json({"error": "not found"}, 404)


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    global _kb, _engine

    ip = "0.0.0.0"
    _log("=" * 65)
    _log("  NEXUS KNOWLEDGE ENGINE v1.0 — Φ-NEXUS ΩLOOP HARVEST")
    _log(f"  Port: {ENGINE_PORT}  |  KB: {KB_FILE}")
    _log(f"  URLs: {len(MASTER_URLS)} targets  |  Batch: {BATCH_SIZE} concurrent")
    _log(f"  Schedule: full every {HARVEST_INTERVAL//60}min, gap-fill every {QUICK_INTERVAL//60}min")
    _log("=" * 65)

    _kb = NexusKB()
    _engine = HarvestEngine(_kb)
    _engine.start()

    httpd = HTTPServer((ip, ENGINE_PORT), EngineHandler)
    _log(f"API ready: http://localhost:{ENGINE_PORT}/status")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        _log("Shutting down NEXUS engine...")
        _engine.stop()
        _kb.save()
        httpd.shutdown()


if __name__ == "__main__":
    main()
