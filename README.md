# EDUX

EDUX — an agentic personalized tutoring platform, built and maintained by the EduOrbit team.

## Features

- Chat, Quiz, Research, Visualize, Solve, and Mastery Path on one agent loop
- Knowledge bases (RAG), notebooks, and memory shared across every workflow
- Consult live subagents (Claude Code, Codex) or persistent Partners
- Multi-engine RAG: LlamaIndex, PageIndex, GraphRAG, LightRAG, or a linked Obsidian vault
- Installable community skills, plus MCP server support

## Requirements

- Python 3.11+
- Node.js 20+ (22 LTS recommended)

## How to Run

```bash
git clone https://github.com/Rohit-girish-Belagali/EDUX-EDUORBIT.git
cd EDUX-EDUORBIT

python3 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip

python -m pip install -e .
( cd web && npm ci --legacy-peer-deps )

edux init     # prompts for ports + LLM provider + optional embedding
edux start    # starts backend + frontend; keep the terminal open
```

Open the frontend URL printed in the terminal — by default [http://127.0.0.1:3782](http://127.0.0.1:3782). Press `Ctrl+C` to stop.

### CLI only (no Web UI)

```bash
python -m pip install -e ./packaging/edux-cli
edux init --cli
edux chat
```

### Common commands

```bash
edux chat                                # interactive REPL
edux run chat "Explain Fourier transform"
edux kb create my-kb --doc textbook.pdf  # build a knowledge base
edux memory show
edux config show
```

## Configuration

Runtime settings live under `data/user/settings/` (JSON/YAML), editable from the Web app's **Settings** page or directly:

| File | Purpose |
|:---|:---|
| `model_catalog.json` | LLM, embedding, and search provider profiles |
| `system.json` | Ports, API base, CORS |
| `auth.json` | Optional auth toggle |

## License

Licensed under the [Apache License 2.0](LICENSE).
