import subprocess
import time
import sys
import webbrowser
import os

def ensure_deps(name, cwd):
    if not os.path.exists(os.path.join(cwd, "node_modules")):
        print(f"[{name}] node_modules not found — running npm install...")
        result = subprocess.run(["npm", "install"], cwd=cwd, shell=True)
        if result.returncode != 0:
            print(f"[{name}] npm install failed. Exiting.")
            sys.exit(1)
        print(f"[{name}] Dependencies installed.")

def run_frontend():
    print("Starting Next.js city app (port 3000)...")
    return subprocess.Popen(
        ["npm", "run", "dev"],
        cwd="frontend",
        shell=True
    )

def run_homepage():
    print("Starting Skyline homepage (port 3001)...")
    return subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", "3001"],
        cwd="emerald-depths-main",
        shell=True
    )

if __name__ == "__main__":
    if not os.path.exists("frontend/package.json"):
        print("frontend/package.json not found. Are you in the Skyline root folder?")
        sys.exit(1)
    if not os.path.exists("emerald-depths-main/package.json"):
        print("emerald-depths-main/package.json not found.")
        sys.exit(1)

    # Auto-install dependencies if not present
    ensure_deps("frontend", "frontend")
    ensure_deps("homepage", "emerald-depths-main")

    frontend_proc = run_frontend()
    homepage_proc = run_homepage()

    print("Waiting for servers to start...")
    time.sleep(6)
    webbrowser.open("http://localhost:3001")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        frontend_proc.terminate()
        homepage_proc.terminate()
        sys.exit(0)
