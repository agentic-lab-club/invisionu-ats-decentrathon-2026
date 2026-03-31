import os
import json
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We need the base path to point to the llm folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment.")
    return Groq(api_key=api_key)

def read_prompt(filename: str) -> str:
    path = os.path.join(BASE_DIR, "prompts", filename)
    with open(path, "r", encoding="utf-8") as f:
         return f.read()

def call_groq(prompt_text: str, system_message: str = "Вы полезный HR ассистент.", require_json: bool = True, max_tokens: int = None, max_retries: int = 3) -> dict | str:
    client = get_client()
    model_name = os.environ.get("GROQ_MODEL", "llama3-70b-8192")
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": prompt_text}
    ]
    
    response_args = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens
    }
    
    if require_json:
        response_args["response_format"] = {"type": "json_object"}
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(**response_args)
            content = response.choices[0].message.content
            
            if require_json:
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    print(f"Ошибка парсинга JSON:\\n{content}")
                    if attempt == max_retries - 1:
                        return None
                    continue
            return content
        except Exception as e:
            if attempt == max_retries - 1:
                raise RuntimeError(f"Ошибка Groq API: {e}") from e
    return None

def extract_score(evaluations: dict, question_key: str, metric_name: str) -> float:
    try:
        if question_key in evaluations and evaluations[question_key]:
            if "scores" in evaluations[question_key]:
                for item in evaluations[question_key]["scores"]:
                    if isinstance(item, dict) and item.get("metric_name") == metric_name:
                        return float(item.get("score", 0))
    except Exception:
        pass
    return 0.0

def main(input_text: str) -> dict:
    # 1. Parse using main prompt
    parser_system_prompt = read_prompt("prompt_main_parser.txt")
    parsed_stt_json = call_groq(
        prompt_text=input_text.strip(), 
        system_message=parser_system_prompt,
        require_json=True,
        max_tokens=8000,
        max_retries=3
    )

    evaluations = {}
    
    if parsed_stt_json and isinstance(parsed_stt_json, dict):
        questions_data = parsed_stt_json.get("questions", {})
        
        # 6 evaluations
        for i in range(1, 7):
            q_key = f"q{i}"
            q_text_key = f"q{i}_text"
            prompt_filename = f"q{i}_prompt.txt"
            
            candidate_answer = questions_data.get(q_text_key, "") or ""
            
            try:
                eval_system_prompt = read_prompt(prompt_filename)
                eval_result = call_groq(
                    prompt_text=candidate_answer, 
                    system_message=eval_system_prompt,
                    require_json=True
                )
                evaluations[q_key] = eval_result
            except FileNotFoundError:
                print(f"Промпт {prompt_filename} не найден, пропускаем...")
                
    # 3. Aggregate
    scores = {
        "q1_motivation": extract_score(evaluations, "q1", "motivation"),
        "q1_planning": extract_score(evaluations, "q1", "planning"),
        "q2_motivation": extract_score(evaluations, "q2", "motivation"),
        "q2_planning": extract_score(evaluations, "q2", "planning"),
        "q3_resilience": extract_score(evaluations, "q3", "resilience"),
        "q3_leadership": extract_score(evaluations, "q3", "leadership"),
        "q3_values": extract_score(evaluations, "q3", "values"),
        "q4_planning": extract_score(evaluations, "q4", "planning"),
        "q4_motivation": extract_score(evaluations, "q4", "motivation"),
        "q5_leadership": extract_score(evaluations, "q5", "leadership"),
        "q5_values": extract_score(evaluations, "q5", "values"),
        "q6_social_support": extract_score(evaluations, "q6", "social_support"),
        "q6_resilience": extract_score(evaluations, "q6", "resilience"),
        "q6_motivation": extract_score(evaluations, "q6", "motivation"),
    }

    Agg_M = (0.35 * scores["q1_motivation"]) + (0.20 * scores["q2_motivation"]) + (0.35 * scores["q4_motivation"]) + (0.10 * scores["q6_motivation"])
    Agg_P = (0.15 * scores["q1_planning"]) + (0.35 * scores["q2_planning"]) + (0.50 * scores["q4_planning"])
    Agg_R = (0.80 * scores["q3_resilience"]) + (0.20 * scores["q6_resilience"])
    Agg_L = (0.30 * scores["q3_leadership"]) + (0.70 * scores["q5_leadership"])
    Agg_V = (0.40 * scores["q3_values"]) + (0.60 * scores["q5_values"])
    Agg_S = 1.0 * scores["q6_social_support"]

    LeadershipIndex = (0.35 * Agg_L) + (0.20 * Agg_R) + (0.20 * Agg_P) + (0.15 * Agg_M) + (0.10 * Agg_V)
    AdmissionsPotential = (0.25 * Agg_L) + (0.20 * Agg_P) + (0.20 * Agg_M) + (0.20 * Agg_R) + (0.10 * Agg_V) + (0.05 * Agg_S)

    return {
        "workflow_status": "success",
        "stt_length": len(input_text),
        "candidate_breakdown": parsed_stt_json.get("questions", parsed_stt_json) if isinstance(parsed_stt_json, dict) else parsed_stt_json,
        "llm_evaluations": evaluations,
        "aggregated_metrics": {
            "Motivation": round(Agg_M, 2),
            "Planning": round(Agg_P, 2),
            "Resilience": round(Agg_R, 2),
            "Leadership": round(Agg_L, 2),
            "Values": round(Agg_V, 2),
            "Social_Support": round(Agg_S, 2)
        },
        "global_score": {
            "LeadershipIndex": round(LeadershipIndex, 2),
            "AdmissionsPotential": round(AdmissionsPotential, 2)
        }
    }

if __name__ == "__main__":
    pass
