package talents

import _ "embed"

//go:embed queries/list_talents.sql
var listTalentsQuery string

//go:embed queries/count_talents.sql
var countTalentsQuery string

//go:embed queries/upsert_talent.sql
var upsertTalentQuery string

//go:embed queries/get_backend_status.sql
var getBackendStatusQuery string

//go:embed queries/existing_talent_links.sql
var existingTalentLinksQuery string
