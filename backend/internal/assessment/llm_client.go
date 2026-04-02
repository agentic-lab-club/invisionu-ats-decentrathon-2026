package assessment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
)

type OpenAIClient struct {
	baseURL         string
	apiKey          string
	questionModel   string
	evaluationModel string
	httpClient      *http.Client
	enabled         bool
}

func NewOpenAIClient(cfg *config.Config) *OpenAIClient {
	return &OpenAIClient{
		baseURL:         strings.TrimRight(cfg.LLMAssessment.BaseURL, "/"),
		apiKey:          strings.TrimSpace(cfg.LLMAssessment.APIKey),
		questionModel:   cfg.LLMAssessment.QuestionModel,
		evaluationModel: cfg.LLMAssessment.EvaluationModel,
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.LLMAssessment.RequestTimeoutSecs) * time.Second,
		},
		enabled: cfg.LLM.Enabled,
	}
}

func (c *OpenAIClient) GenerateQuestions(ctx context.Context, specialization string, numQuestions int) ([]string, error) {
	if !c.enabled || c.apiKey == "" {
		return nil, fmt.Errorf("llm is disabled or api key is missing")
	}

	prompt := buildQuestionPrompt(specialization, numQuestions)
	rawJSON, err := c.completeJSON(ctx, c.questionModel, prompt, 0.85, 800)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Questions []string `json:"questions"`
	}
	if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
		return nil, fmt.Errorf("llm returned invalid questions json: %w", err)
	}

	questions := make([]string, 0, len(parsed.Questions))
	seen := make(map[string]struct{}, len(parsed.Questions))
	for _, question := range parsed.Questions {
		trimmed := strings.TrimSpace(question)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		questions = append(questions, trimmed)
		if len(questions) == numQuestions {
			break
		}
	}

	if len(questions) != numQuestions {
		return nil, fmt.Errorf("llm returned %d unique questions, expected %d", len(questions), numQuestions)
	}

	return questions, nil
}

func (c *OpenAIClient) EvaluateAnswers(ctx context.Context, session *AssessmentSession, timeoutMinutes int) (EvaluationPayload, string, string, error) {
	if !c.enabled || c.apiKey == "" {
		return EvaluationPayload{}, "", "", fmt.Errorf("llm is disabled or api key is missing")
	}

	prompt := buildEvaluationPrompt(session, timeoutMinutes)
	rawJSON, err := c.completeJSON(ctx, c.evaluationModel, prompt, 0.5, 1200)
	if err != nil {
		return EvaluationPayload{}, "", prompt, err
	}

	var parsed EvaluationPayload
	if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
		return EvaluationPayload{}, rawJSON, prompt, fmt.Errorf("llm returned invalid evaluation json: %w", err)
	}
	if strings.TrimSpace(parsed.Reason) == "" || strings.TrimSpace(parsed.DetailedFeedback) == "" {
		return EvaluationPayload{}, rawJSON, prompt, fmt.Errorf("llm response is missing required evaluation fields")
	}

	return parsed, rawJSON, prompt, nil
}

func (c *OpenAIClient) completeJSON(ctx context.Context, model string, prompt string, temperature float64, maxTokens int) (string, error) {
	body := openAIChatCompletionRequest{
		Model: model,
		Messages: []openAIMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: temperature,
		MaxTokens:   maxTokens,
		ResponseFormat: openAIResponseFormat{
			Type: "json_object",
		},
	}

	var lastErr error
	for attempt := 1; attempt <= 2; attempt++ {
		raw, retryable, err := c.doChatCompletion(ctx, body)
		if err == nil {
			return raw, nil
		}
		lastErr = err
		if !retryable {
			break
		}
		time.Sleep(time.Duration(attempt) * time.Second)
	}

	return "", lastErr
}

func (c *OpenAIClient) doChatCompletion(ctx context.Context, payload openAIChatCompletionRequest) (string, bool, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", false, fmt.Errorf("failed to marshal llm request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", false, fmt.Errorf("failed to create llm request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", true, fmt.Errorf("failed to call llm provider: %w", err)
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", true, fmt.Errorf("failed to read llm response: %w", err)
	}

	var parsed openAIChatCompletionResponse
	if err := json.Unmarshal(respData, &parsed); err != nil {
		return "", resp.StatusCode >= http.StatusInternalServerError, fmt.Errorf("failed to decode llm response: %w", err)
	}

	if resp.StatusCode >= http.StatusBadRequest {
		message := string(respData)
		if parsed.Error != nil && parsed.Error.Message != "" {
			message = parsed.Error.Message
		}
		return "", resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= http.StatusInternalServerError, fmt.Errorf("llm provider returned status %d: %s", resp.StatusCode, message)
	}

	if len(parsed.Choices) == 0 {
		return "", false, fmt.Errorf("llm provider returned no choices")
	}

	content := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if content == "" {
		return "", false, fmt.Errorf("llm provider returned empty content")
	}

	return content, false, nil
}

func buildQuestionPrompt(specialization string, numQuestions int) string {
	return fmt.Sprintf(`You are an expert interviewer for %s.
Generate EXACTLY %d UNIQUE open-ended interview questions that simultaneously test:
1. deep domain knowledge in %s
2. leadership potential in serious real-world cases:
   - crisis management and difficult situations
   - strategic decision-making under uncertainty
   - team management and responsibility distribution
   - long-term vision
   - stress resilience

The questions must be:
- original and scenario-based
- difficult and analysis-heavy
- contextual to %s

Return ONLY valid JSON:
{"questions":["Question 1?","Question 2?"]}`, specialization, numQuestions, specialization, specialization)
}

func buildEvaluationPrompt(session *AssessmentSession, timeoutMinutes int) string {
	pairs := make([]string, 0, len(session.Questions))
	for i := range session.Questions {
		answer := ""
		if i < len(session.Answers) {
			answer = session.Answers[i]
		}
		pairs = append(pairs, fmt.Sprintf("Question %d: %s\nAnswer: %s", i+1, session.Questions[i], answer))
	}

	return fmt.Sprintf(`You are an experienced recruiter and interviewer for %s.
Evaluate the candidate answers using these criteria.

Context:
- Specialization: %s
- Questions count: %d
- Time limit: %d minutes

Candidate answers:
%s

Return ONLY valid JSON:
{
  "overall_score": 0-100 integer for overall technical quality, depth, and structure,
  "leadership_score": 0-100 integer for leadership potential, decision-making, strategic thinking, crisis handling,
  "reason": "2-3 sentences with overall impression and key conclusions",
  "detailed_feedback": "detailed analysis with strengths, growth areas, and concrete examples from the answers"
}`, session.Specialization, session.Specialization, len(session.Questions), timeoutMinutes, strings.Join(pairs, "\n\n"))
}
