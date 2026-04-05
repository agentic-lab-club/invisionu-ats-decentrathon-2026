package interview

import _ "embed"

//go:embed queries/create_session.sql
var createSessionQuery string

//go:embed queries/find_session_by_id.sql
var findSessionByIDQuery string

//go:embed queries/update_session_status.sql
var updateSessionStatusQuery string

//go:embed queries/save_answer.sql
var saveAnswerQuery string

//go:embed queries/save_score.sql
var saveScoreQuery string

//go:embed queries/find_active_session_by_user.sql
var findActiveSessionByUserQuery string

//go:embed queries/get_full_session_by_id.sql
var GetFullSessionById string