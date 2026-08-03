import os
import subprocess
import re
import sys

def run_cmd(cmd, check=True):
    print(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, check=check)

def replace_in_files(file_patterns, replacements, commit_message):
    import glob
    files_to_update = []
    for pattern in file_patterns:
        # Use glob or just find
        for root, _, files in os.walk("."):
            if ".git" in root or "node_modules" in root or ".next" in root or "dist" in root:
                continue
            for f in files:
                if re.match(pattern, f):
                    files_to_update.append(os.path.join(root, f))
    
    files_to_update = list(set(files_to_update))
    changed_any = False
    for path in files_to_update:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content, flags=re.IGNORECASE if "(?i)" in old else 0)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                run_cmd(f"git add '{path}'")
                changed_any = True
        except Exception as e:
            print(f"Skipping {path}: {e}")
            
    if changed_any:
        run_cmd(f'git commit -m "{commit_message}"')
        return True
    return False

def main():
    # 1. Initialize git and do first commit
    run_cmd("git init")
    run_cmd('git config user.name "Rohit-girish-Belagali"')
    run_cmd('git config user.email "rohitgirishbelagali@users.noreply.github.com"')
    run_cmd("git branch -M main")
    
    # Remove any existing tracking or huge files if necessary, but .gitignore is already set
    run_cmd("git add .")
    run_cmd('git commit -m "chore: initial project snapshot"')
    
    # Define replacements
    org_repl = [
        (r"HKUDS/EDUX", "Rohit-girish-Belagali/EDUX-EDUORBIT"),
        (r"hkuds/edux", "Rohit-girish-Belagali/EDUX-EDUORBIT"),
        (r"EduOrbit/EDUX", "Rohit-girish-Belagali/EDUX-EDUORBIT"),
        (r"EduOrbit/eduorbit", "Rohit-girish-Belagali/EDUX-EDUORBIT"),
        (r"eduorbit/eduorbit", "Rohit-girish-Belagali/EDUX-EDUORBIT"),
        (r"eduorbit/EDUX", "Rohit-girish-Belagali/EDUX-EDUORBIT"),
        (r"(?i)hkuds", "EduOrbit")
    ]

    # Commit 2
    replace_in_files([r"^package\.json$"], org_repl, "chore(config): update package.json repository and author fields")

    # Commit 3
    replace_in_files([r"^README\.md$"], org_repl + [(r"edux\.info", "eduorbit.com")], "docs: rebrand main README with EduOrbit references")

    # Commit 4
    replace_in_files([r"^README_.*\.md$"], org_repl + [(r"edux\.info", "eduorbit.com")], "docs: update localized README files")

    # Commit 5
    replace_in_files([r"^LICENSE$", r"^CITATION\.cff$"], org_repl, "docs: update LICENSE and CITATION.cff")

    # Commit 6
    replace_in_files([r".*\.yml$", r".*\.yaml$"], org_repl, "ci: update github workflows and config files for EduOrbit org")

    # Commit 7
    replace_in_files([r".*\.md$"], org_repl, "chore(github): update issue templates and PR templates")

    # Commit 8
    replace_in_files([r"__version__\.py$", r"pyproject\.toml$", r"setup\.py$"], org_repl, "chore(python): update python package metadata")

    # Commit 9
    replace_in_files([r"^Dockerfile.*", r"compose\.yaml"], org_repl, "chore(docker): update docker images and compose configs")

    # Commit 10 - Run bulk_replace.py (already there)
    if os.path.exists("bulk_replace.py"):
        run_cmd("python3 bulk_replace.py")
        run_cmd("git add .")
        try:
            run_cmd('git commit -m "refactor: bulk replace DeepTutor with EduOrbit across codebase"')
        except:
            pass
        
        run_cmd("rm bulk_replace.py")
        run_cmd("git add bulk_replace.py")
        try:
            run_cmd('git commit -m "chore: remove bulk_replace migration script"')
        except:
            pass

    # Ensure remote is added
    try:
        run_cmd("git remote remove origin", check=False)
    except:
        pass
    run_cmd("git remote add origin https://github.com/Rohit-girish-Belagali/EDUX-EDUORBIT.git")
    
    print("Commits created successfully. Pushing to origin...")
    try:
        run_cmd("git push -u origin main")
    except subprocess.CalledProcessError:
        print("Push failed! Authentication might be required.")

if __name__ == "__main__":
    main()
