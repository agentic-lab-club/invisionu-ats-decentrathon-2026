normalized_score = (raw_score / 4) * 100

metric_raw_score =
  Σ(weight_i * normalized_score_i)

metric_penalty =
  low_confidence_penalty +
  missing_evidence_penalty +
  weak_evidence_penalty

metric_final_score =
  clamp(metric_raw_score - metric_penalty, 0, 100)

overall_raw_score =
  Σ(metric_weight_m * metric_final_score_m)

overall_final_score =
  clamp(overall_raw_score - contradiction_penalties, 0, 100)