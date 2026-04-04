package favorites

import _ "embed"

//go:embed queries/list_favorites.sql
var listFavoritesQuery string

//go:embed queries/add_favorite.sql
var addFavoriteQuery string

//go:embed queries/remove_favorite.sql
var removeFavoriteQuery string