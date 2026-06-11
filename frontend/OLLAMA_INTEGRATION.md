# Ollama Integration for Botler

## ✅ Ollama is 100% FREE!

**Official Site:** https://ollama.com  
**GitHub:** https://github.com/ollama/ollama  
**License:** MIT (Open Source)

Ollama is completely free to use locally on your PC. No API keys, no subscriptions, no cloud costs!

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   React Native  │  HTTP   │   Python PC     │  HTTP   │     Ollama      │
│   Mobile App    │ ─────▶  │   Agent Server  │ ─────▶  │   (localhost)   │
│                 │ ◀─────  │                 │ ◀─────  │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                                │
                                                                ▼
                                                         Local LLM Models
                                                         (Llama 3.1, Mistral, etc.)
```

## 📦 Installation Steps

### 1. Install Ollama on PC

**Windows:**
```bash
# Download installer from https://ollama.com/download/windows
# Or use winget:
winget install Ollama.Ollama
```

**macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Download AI Models

```bash
# Recommended for Botler (balance of speed and quality)
ollama pull llama3.1:8b

# Faster but less capable
ollama pull phi3:3.8b

# More capable but slower
ollama pull llama3.1:70b

# Coding specialist
ollama pull codellama:13b
```

### 3. Start Ollama Server

```bash
# Default port 11434
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

## 🔧 Integration Implementation

### Phase 1: Python PC Agent Integration

**File:** `python_server/ollama_integration.py`

```python
import requests
import json
from typing import Dict, Any

class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = "llama3.1:8b"
    
    def generate(self, prompt: str, system_prompt: str = "") -> Dict[str, Any]:
        """Generate response from Ollama"""
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_predict": 2048,
            }
        }
        
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def chat(self, messages: list) -> Dict[str, Any]:
        """Chat interface for conversation"""
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }
        
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

# Add to existing FastAPI server
@app.post("/api/ai/generate")
async def ai_generate(request: dict):
    """Generate script using Ollama"""
    user_query = request.get("query", "")
    context = request.get("context", "")
    
    ollama = OllamaClient()
    
    system_prompt = """You are Botler, an expert system automation assistant.
Generate production-ready Python scripts for Windows/macOS/Linux automation.
Include error handling, comments, and specify all dependencies."""

    prompt = f"""User request: {user_query}

Context: {context}

Generate a complete, working script that:
1. Solves the user's request
2. Includes error handling
3. Has clear comments
4. Lists all dependencies at the top
5. Is safe to execute

Output ONLY the script code, no explanations."""

    result = ollama.generate(prompt, system_prompt)
    
    if "error" in result:
        return {"status": "error", "error": result["error"]}
    
    return {
        "status": "success",
        "script": result.get("response", ""),
        "model": ollama.model,
    }
```

### Phase 2: React Native Integration

**File:** `services/ollamaService.ts`

```typescript
export interface OllamaRequest {
  query: string;
  context?: string;
}

export interface OllamaResponse {
  status: 'success' | 'error';
  script?: string;
  error?: string;
  model?: string;
}

class OllamaService {
  private serverUrl: string = '';

  setServerUrl(url: string) {
    this.serverUrl = url;
  }

  async generateScript(request: OllamaRequest): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        status: 'error',
        error: (error as Error).message,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ai/status`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
```

## 🎯 Implementation Priority (Next Steps)

### ✅ CRITICAL (Week 1)
1. **Ollama PC Setup**
   - Install Ollama on PC
   - Download llama3.1:8b model
   - Test with curl commands

2. **Python Agent Extension**
   - Add `ollama_integration.py` to existing Python server
   - Create `/api/ai/generate` endpoint
   - Test script generation locally

3. **React Native Service**
   - Create `services/ollamaService.ts`
   - Add AI generation to Scripts tab
   - Test end-to-end flow

### 🔥 HIGH (Week 2)
4. **Context Builder Integration**
   - Use `butlerKnowledge.ts` to build context
   - Add domain expertise to prompts
   - Implement semantic search for context

5. **Conversation History**
   - Store AI conversations in AsyncStorage
   - Add "Explain Code" feature
   - Implement follow-up questions

### ⚡ MEDIUM (Week 3)
6. **Model Selection UI**
   - Allow users to choose model
   - Display model capabilities
   - Add model download helper

7. **Performance Optimization**
   - Stream responses (SSE/WebSocket)
   - Add loading states
   - Implement cancellation

## 📊 Model Recommendations

| Model | Size | Speed | Use Case | RAM Required |
|-------|------|-------|----------|--------------|
| phi3:3.8b | 2.3GB | ⚡⚡⚡ | Quick tasks, file ops | 4GB |
| llama3.1:8b | 4.7GB | ⚡⚡ | General automation | 8GB |
| codellama:13b | 7.4GB | ⚡ | Python code generation | 16GB |
| llama3.1:70b | 40GB | 🐌 | Complex reasoning | 64GB |

**Recommended for Botler:** `llama3.1:8b` (best balance)

## 🔒 Security Considerations

✅ **Advantages:**
- 100% offline - no data sent to cloud
- No API keys to leak
- User controls all data
- GDPR/privacy compliant by default

⚠️ **Risks:**
- Generated scripts must be reviewed
- Implement AST poisoning defense (already in blueprint)
- Add "Dry Run" mode before execution
- Require user confirmation for destructive ops

## 💡 Example Prompts

**Simple:**
```
"Create a Python script to backup my Documents folder"
```

**Complex:**
```
"Monitor CPU usage every 5 seconds. If it exceeds 80% for more than 1 minute, 
send me an alert and log which process is using the most CPU"
```

**With Context:**
```
Query: "Install Docker on Ubuntu"
Context: {
  domain: "software_installation",
  keywords: ["install", "docker", "ubuntu"],
  examples: [...],
}
```

## 📝 Next Actions

1. ✅ Review this document
2. ⏳ Install Ollama on development PC
3. ⏳ Test basic script generation with curl
4. ⏳ Implement Python integration
5. ⏳ Create React Native service
6. ⏳ Add UI in Butler tab

---

**Resources:**
- Ollama Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- Model Library: https://ollama.com/library
- React Native Integration: https://medium.com/godel-technologies/guide-to-running-ai-models-locally-on-mobile-devices-using-react-native-and-llama-rn-fcd41adbc597

**Last Updated:** 2026-03-24
