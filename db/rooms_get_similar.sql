select * from rooms where 
name = ${name}
AND (
  ended_at::timestamp > ${created_at}::timestamp with time zone - ${interval} * interval '1 minute' 
  AND
  ended_at::timestamp < ${created_at}::timestamp with time zone
)
OR (
  created_at::timestamp < ${ended_at}::timestamp with time zone + ${interval} * interval '1 minute'
  AND
  created_at::timestamp > ${ended_at}::timestamp with time zone
)