SELECT COUNT(*)
FROM applications
WHERE user_id = ?
  AND decision = 'pending';
