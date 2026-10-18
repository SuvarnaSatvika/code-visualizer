import os
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configure API Keys
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def get_embedding(text: str) -> list[float]:
    """Generate 3072-dimensional embeddings using Gemini."""
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def generate_insight(ast_obj, node_label: str, full_code: str) -> str:
    node_type = type(ast_obj).__name__
    try:
        # Embed the specific line to find relevant architectural patterns
        query_embedding = get_embedding(node_label)

        response = supabase.rpc(
            'match_patterns', 
            {'query_embedding': query_embedding, 'match_threshold': 0.75, 'match_count': 1}
        ).execute()

        rag_context = response.data[0]['content'] if response.data else "No specific pattern found."

        # Bind the LLM strictly to the execution mechanics
        prompt = f"""
        You are an advanced runtime debugger. Explain the mechanical purpose of this specific line: `{node_label}`
        
        AST Node Type: `{node_type}`
        
        Database Pedagogical Context:
        {rag_context}
        
        Full Execution Context:
        ```python
        {full_code}
        ```
        
        Constraint 1: DO NOT define basic programming concepts.
        Constraint 2: Explain exactly how THIS line affects THIS specific program's state or control flow. 
        Constraint 3: Keep it short but clear.
        """

        model = genai.GenerativeModel('gemini-3.8-flash')
        return model.generate_content(prompt).text.strip()

    except Exception as e:
        return f"Evaluates `{node_label}`."

def generate_overall_summary(full_code: str) -> str:
    try:
        prompt = f"""
        You are a computer science pedagogy assistant. Provide a concise, high-level summary of what this entire Python script does.
        
        Code:
        ```python
        {full_code}
        ```
        
        Keep it short but good. Focus on the algorithm or overarching logic (e.g., "This script implements a recursive factorial function to..."). Do not break down line-by-line.
        """

        model = genai.GenerativeModel('gemini-3.8-flash')
        return model.generate_content(prompt).text.strip()
    except Exception as e:
        print(f"GEMINI SUMMARY ERROR: {e}")
        return "Overall script summary currently unavailable."