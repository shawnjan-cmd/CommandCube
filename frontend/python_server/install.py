#!/usr/bin/env python3
"""
Cyber-Botler  ·  One-Click Installer  v5.0
──────────────────────────────────────────
Run this script first.  It installs all Python dependencies and
optionally sets up the server to start automatically on login.

Usage:
  python install.py              — install + run server
  python install.py --service    — also install as startup service
  python install.py --update     — update packages only
"""

import os, sys, platform, subprocess, textwrap, shutil, argparse

REQUIREMENTS = [
    "flask",
    "flask-cors",
    "psutil",
    "qrcode[pil]",
    "pillow",
    "requests",
]

def banner(msg: str):
    w = max(len(msg) + 4, 54)
    print("┌" + "─" * w + "┐")
    print("│  " + msg.ljust(w - 2) + "│")
    print("└" + "─" * w + "┘")

def run(cmd, check=True):
    print(f"  $ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=False)
    if check and result.returncode != 0:
        print(f"\n  ❌  Command failed (exit {result.returncode})")
        sys.exit(result.returncode)
    return result.returncode == 0

def install_packages():
    banner("Installing Python dependencies")
    pip = [sys.executable, "-m", "pip", "install", "--upgrade"] + REQUIREMENTS
    run(pip)
    print("\n  ✅  All packages installed\n")

def install_service_windows(server_py: str):
    """Create a Windows Task Scheduler task that runs butler_server.py at login."""
    task_name = "CyberButlerServer"
    script = f'SchTasks /Create /F /SC ONLOGON /TN "{task_name}" /TR "{sys.executable} {server_py}" /RL HIGHEST'
    ok = run(script, check=False)
    if ok:
        print(f"\n  ✅  Windows startup task '{task_name}' created")
        print("     To remove: SchTasks /Delete /F /TN CyberButlerServer\n")
    else:
        print("\n  ⚠️   Could not create task (run as Admin if needed)\n")

def install_service_mac(server_py: str):
    """Create a launchd plist so the server starts at login on macOS."""
    plist = textwrap.dedent(f"""\
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
          "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
          <key>Label</key>             <string>com.cyberbutler.server</string>
          <key>ProgramArguments</key>
          <array>
            <string>{sys.executable}</string>
            <string>{server_py}</string>
          </array>
          <key>RunAtLoad</key>         <true/>
          <key>KeepAlive</key>         <true/>
          <key>StandardErrorPath</key>  <string>/tmp/butler_server.err</string>
          <key>StandardOutPath</key>   <string>/tmp/butler_server.out</string>
        </dict>
        </plist>
    """)
    dest = os.path.expanduser("~/Library/LaunchAgents/com.cyberbutler.server.plist")
    with open(dest, "w") as f:
        f.write(plist)
    run(["launchctl", "load", dest], check=False)
    print(f"\n  ✅  macOS LaunchAgent installed: {dest}")
    print("     To remove: launchctl unload " + dest + "\n")

def install_service_linux(server_py: str):
    """Create a systemd user service."""
    service = textwrap.dedent(f"""\
        [Unit]
        Description=Cyber-Botler Desktop Server
        After=network.target

        [Service]
        ExecStart={sys.executable} {server_py}
        Restart=always
        RestartSec=5

        [Install]
        WantedBy=default.target
    """)
    service_dir = os.path.expanduser("~/.config/systemd/user")
    os.makedirs(service_dir, exist_ok=True)
    dest = os.path.join(service_dir, "cyberbutler.service")
    with open(dest, "w") as f:
        f.write(service)
    run(["systemctl", "--user", "enable", "cyberbutler.service"], check=False)
    run(["systemctl", "--user", "start",  "cyberbutler.service"], check=False)
    print(f"\n  ✅  systemd user service installed: {dest}")
    print("     To remove: systemctl --user disable cyberbutler.service\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--service", action="store_true", help="Install as startup service")
    parser.add_argument("--update",  action="store_true", help="Update packages only, no launch")
    args = parser.parse_args()

    print()
    banner("Cyber-Botler  ·  One-Click Installer  v5.0")
    print()
    print(f"  Python   : {platform.python_version()} ({sys.executable})")
    print(f"  OS       : {platform.system()} {platform.release()}")
    print()

    if sys.version_info < (3, 8):
        print("  ❌  Python 3.8+ required.")
        sys.exit(1)

    install_packages()

    if args.update:
        print("  ✅  Packages updated. Exiting (--update flag set).")
        return

    server_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), "butler_server.py")
    if not os.path.exists(server_py):
        print(f"  ❌  butler_server.py not found at {server_py}")
        sys.exit(1)

    if args.service:
        banner("Installing startup service")
        sys_name = platform.system()
        if sys_name == "Windows":
            install_service_windows(server_py)
        elif sys_name == "Darwin":
            install_service_mac(server_py)
        elif sys_name == "Linux":
            install_service_linux(server_py)
        else:
            print(f"  ⚠️   Startup service not supported on {sys_name}")

    print()
    banner("Starting Cyber-Botler Server")
    print()
    os.execv(sys.executable, [sys.executable, server_py])

if __name__ == "__main__":
    main()
