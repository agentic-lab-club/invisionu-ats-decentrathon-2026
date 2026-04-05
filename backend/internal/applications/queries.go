package applications

import _ "embed"

//go:embed queries/find_user_by_id.sql
var findUserByIDQuery string

//go:embed queries/find_program_by_code.sql
var findProgramByCodeQuery string

//go:embed queries/find_file_by_id.sql
var findFileByIDQuery string

//go:embed queries/count_active_applications.sql
var countActiveApplicationsQuery string

//go:embed queries/create_application.sql
var createApplicationQuery string

//go:embed queries/update_user_profile.sql
var updateUserProfileQuery string

//go:embed queries/attach_file_to_application.sql
var attachFileToApplicationQuery string

//go:embed queries/insert_application_test_answer.sql
var insertApplicationTestAnswerQuery string

//go:embed queries/find_status_by_user_id.sql
var findStatusByUserIDQuery string

//go:embed queries/validate_answer_pair.sql
var validateAnswerPairQuery string

//go:embed queries/create_application_file.sql
var createApplicationFileQuery string

//go:embed queries/update_application_audio_file.sql
var updateApplicationAudioFileQuery string

//go:embed queries/update_application_transcript.sql
var updateApplicationTranscriptQuery string

//go:embed queries/update_application_screening.sql
var updateApplicationScreeningQuery string

//go:embed queries/update_application_ai_probability.sql
var updateApplicationAIProbabilityQuery string

//go:embed queries/update_application_ielts_score.sql
var updateApplicationIELTSScoreQuery string

//go:embed queries/update_application_ent_score.sql
var updateApplicationENTScoreQuery string
