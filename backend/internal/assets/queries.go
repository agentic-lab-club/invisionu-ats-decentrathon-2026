package assets

import _ "embed"

//go:embed queries/create_file_record.sql
var createFileRecordQuery string
