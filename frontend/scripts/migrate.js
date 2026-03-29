const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Удаляем старые таблицы (если существуют), чтобы избежать конфликтов
    await client.query(`
      DROP TABLE IF EXISTS personality_test_answers CASCADE;
      DROP TABLE IF EXISTS candidate_statuses CASCADE;
      DROP TABLE IF EXISTS applications CASCADE;
      DROP TABLE IF EXISTS ml_analysis CASCADE;
      DROP TABLE IF EXISTS scores CASCADE;
      DROP TABLE IF EXISTS candidates CASCADE;
      DROP TABLE IF EXISTS weight_settings CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Создаём таблицы согласно схеме, используемой в Go-бэкенде
    await client.query(`
      CREATE TABLE candidates (
        id UUID PRIMARY KEY,
        external_id VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        data_source VARCHAR(50),
        ielts_score NUMERIC(3,1),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        patronymic VARCHAR(100),
        date_of_birth DATE,
        gender VARCHAR(20),
        citizenship VARCHAR(100),
        iin VARCHAR(12),
        country VARCHAR(100),
        city VARCHAR(100),
        mobile_phone VARCHAR(20),
        program VARCHAR(100),
        video_link TEXT,
        english_exam VARCHAR(100)
      );

      CREATE TABLE applications (
        id SERIAL PRIMARY KEY,
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        submitted_at TIMESTAMPTZ,
        structured_data JSONB,
        essay_text TEXT,
        video_transcript TEXT,
        file_references JSONB,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );

      CREATE TABLE candidate_statuses (
        id SERIAL PRIMARY KEY,
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        comment TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ
      );

      CREATE TABLE scores (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        overall_score NUMERIC,
        motivation_avg NUMERIC,
        leadership_avg NUMERIC,
        structure_avg NUMERIC,
        calculated_at TIMESTAMPTZ
      );

      CREATE TABLE ml_analysis (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        analysis_json JSONB NOT NULL,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );

      CREATE TABLE weight_settings (
        id SERIAL PRIMARY KEY,
        motivation_weight NUMERIC NOT NULL,
        leadership_weight NUMERIC NOT NULL,
        structure_weight NUMERIC NOT NULL,
        set_by VARCHAR(100),
        set_at TIMESTAMPTZ
      );

      CREATE TABLE personality_test_answers (
        id SERIAL PRIMARY KEY,
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        question_index INT NOT NULL,
        answer_value VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Индексы для ускорения запросов
      CREATE INDEX idx_personality_test_answers_candidate_id ON personality_test_answers(candidate_id);
      CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
      CREATE INDEX idx_candidate_statuses_candidate_id ON candidate_statuses(candidate_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Миграция выполнена успешно (все таблицы созданы)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();