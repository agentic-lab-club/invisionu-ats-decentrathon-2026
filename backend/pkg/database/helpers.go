package database

import (
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/metrics"
	"vitess.io/vitess/go/vt/sqlparser"
)

func TablesFrom(query string) []string {
	p, err := sqlparser.New(sqlparser.Options{})
	if err != nil {
		return nil
	}
	stmt, _, err := p.Parse2(query)
	if err != nil {
		return nil
	}

	var tables []string
	sqlparser.Walk(func(node sqlparser.SQLNode) (bool, error) {
		if t, ok := node.(sqlparser.TableName); ok {
			tables = append(tables, t.Name.String())
		}
		return true, nil
	}, stmt)

	return tables
}

func record(queryType string, query string, start time.Time, err error) {
	tables := TablesFrom(query)
	for _, table := range tables {
		metrics.RecordDBQuery(queryType, table, time.Since(start), err)
	}
}
