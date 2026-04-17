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
    print("Starting Skyline (port 3000)...")
    return subprocess.Popen(["npm", "run", "dev"], cwd="frontend", shell=True)

if __name__ == "__main__":
    if not os.path.exists("frontend/package.json"):
        print("frontend/package.json not found. Are you in the Skyline root folder?")
        sys.exit(1)

    ensure_deps("frontend", "frontend")
    proc = run_frontend()

    print("Waiting for server to start...")
    time.sleep(6)
    webbrowser.open("http://localhost:3000")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        proc.terminate()
        sys.exit(0)
