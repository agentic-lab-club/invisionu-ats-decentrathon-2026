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
