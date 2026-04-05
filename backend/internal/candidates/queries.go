package candidates

import _ "embed"

//go:embed queries/list_candidates.sql
var listCandidatesQuery string

//go:embed queries/get_candidate_detail.sql
var getCandidateDetailQuery string

//go:embed queries/get_candidate_files.sql
var getCandidateFilesQuery string

//go:embed queries/get_latest_scoring_run.sql
var getLatestScoringRunQuery string

//go:embed queries/get_latest_scoring_run_by_model.sql
var getLatestScoringRunByModelQuery string

//go:embed queries/update_candidate_stage.sql
var updateCandidateStageQuery string

//go:embed queries/smart_filter_high_potential_low_english.sql
var smartFilterHighPotentialLowEnglishQuery string

//go:embed queries/smart_filter_strong_motivation_weak_soft.sql
var smartFilterStrongMotivationWeakSoftQuery string

//go:embed queries/smart_filter_low_motivation_high_background.sql
var smartFilterLowMotivationHighBackgroundQuery string

//go:embed queries/smart_filter_top10_percent.sql
var smartFilterTop10PercentQuery string