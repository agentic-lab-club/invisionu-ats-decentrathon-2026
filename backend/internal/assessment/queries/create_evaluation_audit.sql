INSERT INTO evaluation_audit (
    session_id,
    llm_input_prompt,
    llm_raw_response,
    parsed_result,
    evaluator_model
)
VALUES (?, ?, ?, ?, ?);
