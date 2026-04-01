package auth

import _ "embed"

//go:embed queries/create_user.sql
var createUserQuery string

//go:embed queries/find_user_by_email.sql
var findUserByEmailQuery string

//go:embed queries/find_user_by_id.sql
var findUserByIDQuery string

//go:embed queries/create_auth_code.sql
var createAuthCodeQuery string

//go:embed queries/find_latest_active_auth_code.sql
var findLatestActiveAuthCodeQuery string

//go:embed queries/consume_auth_code.sql
var consumeAuthCodeQuery string

//go:embed queries/mark_user_email_verified.sql
var markUserEmailVerifiedQuery string

//go:embed queries/create_refresh_session.sql
var createRefreshSessionQuery string

//go:embed queries/find_refresh_session_by_hash.sql
var findRefreshSessionByHashQuery string

//go:embed queries/revoke_refresh_session.sql
var revokeRefreshSessionQuery string
