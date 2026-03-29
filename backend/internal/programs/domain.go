package programs

type Program struct {
	ID        int    `db:"id" json:"id"`
	Level     string `db:"level" json:"level"`
	Code      string `db:"code" json:"code"`
	Name      string `db:"name" json:"name"`
	IsActive  bool   `db:"is_active" json:"-"`
	SortOrder int    `db:"sort_order" json:"-"`
}

type ListResponse struct {
	Items []Program `json:"items"`
}
