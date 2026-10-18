# Code Visualizer
<img width="1898" height="851" alt="image" src="https://github.com/user-attachments/assets/53d084b8-ba59-4d9f-9de5-ccefcf998a9f" />

Code Visualizer is a full-stack, AI-driven educational platform designed to help students conceptually map and trace Python execution. It bridges the gap between static source code and dynamic runtime state by converting Python logic into interactive node-graph execution paths, enriched with Retrieval-Augmented Generation (RAG) pedagogical insights.

## System Architecture

The platform is designed with an enterprise-grade microservice architecture, strictly separating routing concerns, caching, and execution environments.

* **Frontend (React / React Flow):** Renders the visual Abstract Syntax Tree (AST), branching control flow, and real-time memory state.
* **API Gateway (Java Spring Boot):** Acts as the primary ingress router. It utilizes `@Cacheable` to intercept duplicate code submissions, instantly serving historical execution graphs from memory and significantly reducing load on the Python execution engine.
* **Execution Engine (Python FastAPI):** A specialized, secure sandbox service. It utilizes Python's `ast` module to recursively unroll nested structures (Functions, Ifs, Loops) into 2D visual coordinate maps, and `sys.settrace` to capture step-by-step variable mutations and stack frames.
* **AI Pedagogy Layer (Google Gemini & Supabase):** Implements a RAG architecture. When complex logic is parsed, the engine queries a Supabase `pgvector` database to retrieve matching architectural patterns, feeding this context to the Gemini-3.8-Flash LLM to generate granular, context-aware explanations of the execution mechanics.

## Key Features

* **Recursive AST Branching:** Dynamically unrolls standard execution blocks, mapping conditional branches and recursive function calls into distinct, traceable visual paths.
* **Live Memory Tracing:** Captures frame-by-frame snapshots of local variables, visually highlighting state mutations during loops and recursive returns.
* **Context-Aware AI Insights:** Rather than defining generic terms, the RAG agent explains exactly how a specific node alters the program's control flow based on the surrounding codebase.
* **Circuit Breakers:** Built-in infinite loop protection caps runaway execution gracefully without crashing the backend microservice.

## Local Development Setup

### Prerequisites
* Node.js (v18+)
* Java 17 & Maven
* Python 3.10+
* Supabase Account (for pgvector database)
* Google Gemini API Key

### 1. Python Execution Engine (FastAPI)
* Navigate to the `visualizer-backend` directory, create a virtual environment, and install dependencies:<br>
&nbsp;&nbsp;python -m venv venv<br>
&nbsp;&nbsp;source venv/bin/activate  # On Windows: venv\Scripts\activate<br>
&nbsp;&nbsp;pip install fastapi uvicorn supabase google-generativeai python-dotenv pydantic

* Create a `.env` file with your `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_KEY`. Start the engine:<br>
&nbsp;&nbsp;python -m uvicorn main:app --reload --port 8000

### 2. API Gateway (Spring Boot)
* Navigate to the Spring Boot root directory and start the cache-enabled routing server:<br>
&nbsp;&nbsp;./mvnw spring-boot:run


### 3. React Frontend
* Navigate to the `code-visualizer` frontend directory:<br>
&nbsp;&nbsp;npm install<br>
&nbsp;&nbsp;npm run dev


## Author
**Suvarna Satvika Tiriveedhi**
