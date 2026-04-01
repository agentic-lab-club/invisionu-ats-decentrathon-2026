package programs

import _ "embed"

//go:embed queries/list_active_programs.sql
var listActiveProgramsQuery string
