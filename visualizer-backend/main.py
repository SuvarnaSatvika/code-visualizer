import os
import ast
import sys
import copy
import router_agent

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client

load_dotenv()

# Configure Gemini (for embeddings)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeSubmission(BaseModel):
    code: str


class RuntimeTracer:
    def __init__(self, max_steps=50): # Cap lower for cleaner visualization
        self.trace_history = []
        self.step_counter = 0
        self.previous_locals = {}
        self.max_steps = max_steps
        self.execution_error = None

    def trace_lines(self, frame, event, arg):
        if event == "line":
            if self.step_counter >= self.max_steps:
                raise TimeoutError(f"Execution stopped: Loop exceeded safety limit of {self.max_steps} steps.")

            current_locals = {k: v for k, v in frame.f_locals.items() if not k.startswith('__')}
            memory_snapshot = {}
            for var_name, var_value in current_locals.items():
                is_mutated = (var_name not in self.previous_locals) or (self.previous_locals[var_name] != var_value)
                memory_snapshot[var_name] = {"value": var_value, "mutated": is_mutated}
            
            self.trace_history.append({
                "step": self.step_counter,
                "line": frame.f_lineno,
                "memorySnapshot": copy.deepcopy(memory_snapshot)
            })
            self.previous_locals = copy.deepcopy(current_locals)
            self.step_counter += 1
        return self.trace_lines

    def run(self, code_string: str):
        namespace = {}
        sys.settrace(self.trace_lines)
        try:
            exec(code_string, namespace, namespace)
        except TimeoutError as te:
            self.execution_error = {"type": "InfiniteLoopWarning", "message": str(te)}
        except Exception as e:
            self.execution_error = {"type": "RuntimeError", "message": str(e)}
        finally:
            sys.settrace(None)
        return self.trace_history, self.execution_error


@app.post("/parse")
def parse_code(submission: CodeSubmission):
    try:
        tree = ast.parse(submission.code)
    except SyntaxError as e:
        return {"error": {"type": "SyntaxError", "message": str(e)}}

    nodes = []
    edges = []
    node_counter = 1

    def create_node(ast_obj, label_override=None, line_override=None):
        nonlocal node_counter
        nid = f"n{node_counter}"
        node_counter += 1
        label = label_override or ast.unparse(ast_obj)
        line_num = line_override or getattr(ast_obj, 'lineno', 0)
        
        nodes.append({
            "id": nid,
            "data": {
                "label": label,
                # Pass the full code to the agent
                "explanation": router_agent.generate_insight(ast_obj, label, submission.code) 
            },
            "line": line_num
        })
        return nid

    # Recursive function to unroll nested statements (functions, ifs, loops)
    def process_block(statements, prev_id):
        current_prev = prev_id
        for stmt in statements:
            if isinstance(stmt, ast.FunctionDef):
                sig_label = f"def {stmt.name}({ast.unparse(stmt.args)}):"
                func_id = create_node(stmt, label_override=sig_label)
                if current_prev: 
                    edges.append({"id": f"e_{current_prev}_{func_id}", "source": current_prev, "target": func_id})
                # Recursively parse the inside of the function
                current_prev = process_block(stmt.body, func_id)

            elif isinstance(stmt, ast.If):
                cond_label = f"if {ast.unparse(stmt.test)}:"
                if_id = create_node(stmt, label_override=cond_label)
                if current_prev: 
                    edges.append({"id": f"e_{current_prev}_{if_id}", "source": current_prev, "target": if_id})
                
                # Branch 1: The True Path
                process_block(stmt.body, if_id)

                # Branch 2: The False/Else Path
                if stmt.orelse:
                    process_block(stmt.orelse, if_id)
                
                # Crucial Fix: The next sequential statement in the function 
                # should connect to the IF condition (as the implicit false path), 
                # NOT the end of the true block.
                current_prev = if_id

            elif isinstance(stmt, ast.While):
                cond_label = f"while {ast.unparse(stmt.test)}:"
                cond_id = create_node(stmt, label_override=cond_label)
                if current_prev: 
                    edges.append({"id": f"e_{current_prev}_{cond_id}", "source": current_prev, "target": cond_id})
                
                body_end_id = process_block(stmt.body, cond_id)
                edges.append({"id": f"e_cycle_{body_end_id}_{cond_id}", "source": body_end_id, "target": cond_id, "animated": True})
                current_prev = cond_id

            elif isinstance(stmt, ast.For):
                cond_label = f"for {ast.unparse(stmt.target)} in {ast.unparse(stmt.iter)}:"
                cond_id = create_node(stmt, label_override=cond_label)
                if current_prev: 
                    edges.append({"id": f"e_{current_prev}_{cond_id}", "source": current_prev, "target": cond_id})
                
                body_end_id = process_block(stmt.body, cond_id)
                edges.append({"id": f"e_cycle_{body_end_id}_{cond_id}", "source": body_end_id, "target": cond_id, "animated": True})
                current_prev = cond_id

            else:
                nid = create_node(stmt)
                if current_prev: 
                    edges.append({"id": f"e_{current_prev}_{nid}", "source": current_prev, "target": nid})
                current_prev = nid

        return current_prev

    # Start the tree parsing from the global scope
    process_block(tree.body, None)

    tracer = RuntimeTracer(max_steps=50)
    execution_trace, execution_error = tracer.run(submission.code)

    # Generate the high-level summary
    overall_summary = router_agent.generate_overall_summary(submission.code)

    return {
        "graph": {
            "nodes": nodes,
            "edges": edges
        },
        "trace": execution_trace,
        "error": execution_error,
        "overall_summary": overall_summary
    }
