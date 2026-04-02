package assessment

import _ "embed"

//go:embed queries/create_session.sql
var createSessionQuery string

//go:embed queries/find_session_by_id.sql
var findSessionByIDQuery string

//go:embed queries/update_session_status.sql
var updateSessionStatusQuery string

//go:embed queries/save_answers.sql
var saveAnswersQuery string

//go:embed queries/save_evaluation.sql
var saveEvaluationQuery string

//go:embed queries/save_error_log.sql
var saveErrorLogQuery string

//go:embed queries/create_evaluation_audit.sql
var createEvaluationAuditQuery string
