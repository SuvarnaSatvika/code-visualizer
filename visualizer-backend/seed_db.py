import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# 1. Load Environment Variables
load_dotenv()

# 2. Initialize Supabase
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# 3. Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 4. Define our pedagogical rules/context for the RAG pipeline
programming_rules = [
    {
        "concept_name": "for_loop",
        "explanation": "A for loop iterates over a sequence (like a list or range). It executes a block of code repeatedly for each item in that sequence."
    },
    {
        "concept_name": "variable_assignment",
        "explanation": "Variable assignment uses the '=' operator to store data in memory. The value on the right is evaluated and saved to the variable name on the left."
    },
    {
        "concept_name": "accumulator_pattern",
        "explanation": "An accumulator pattern involves initializing a variable (like total = 0) before a loop, and then updating it (total = total + i) inside the loop to calculate a final sum or result."
    }
]

def seed_database():
    print("Starting database ingestion...")
    
    for rule in programming_rules:
        print(f"Processing '{rule['concept_name']}'...")
        
        # Generate the vector embedding using Gemini
        # We use text-embedding-001 as it is optimized for semantic retrieval
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=rule['explanation']
        )
        embedding_vector = result['embedding']
        
        # Insert the concept, explanation, and vector into PostgreSQL
        data, count = supabase.table('python_rules').insert({
            "concept_name": rule['concept_name'],
            "explanation": rule['explanation'],
            "embedding": embedding_vector
        }).execute()
        
        print(f"Successfully inserted '{rule['concept_name']}'.")

if __name__ == "__main__":
    seed_database()
    print("Database seeding complete!")