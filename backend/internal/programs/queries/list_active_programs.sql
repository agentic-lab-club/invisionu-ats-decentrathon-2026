SELECT
    id,
    level,
    code,
    name,
    is_active,
    sort_order
FROM programs
WHERE is_active = TRUE
ORDER BY sort_order ASC, id ASC;
