package personalitytest

import "github.com/google/uuid"

type Test struct {
	ID        uuid.UUID  `db:"id" json:"test_id"`
	Code      string     `db:"code" json:"code"`
	Title     string     `db:"title" json:"title"`
	Questions []Question `json:"questions"`
}

type Question struct {
	ID      uuid.UUID `db:"question_id" json:"id"`
	Order   int       `db:"question_order" json:"order"`
	Text    string    `db:"question_text" json:"text"`
	Options []Option  `json:"options"`
}

type Option struct {
	ID    uuid.UUID `db:"option_id" json:"id"`
	Key   string    `db:"option_key" json:"key"`
	Text  string    `db:"option_text" json:"text"`
	Order int       `db:"option_order" json:"-"`
}

type row struct {
	TestID        uuid.UUID `db:"id"`
	Code          string    `db:"code"`
	Title         string    `db:"title"`
	QuestionID    uuid.UUID `db:"question_id"`
	QuestionOrder int       `db:"question_order"`
	QuestionText  string    `db:"question_text"`
	OptionID      uuid.UUID `db:"option_id"`
	OptionOrder   int       `db:"option_order"`
	OptionKey     string    `db:"option_key"`
	OptionText    string    `db:"option_text"`
}

type PersonalityOptionMetrics struct {
    M int `db:"m"`
    P int `db:"p"`
    R int `db:"r"`
    L int `db:"l"`
    V int `db:"v"`
}