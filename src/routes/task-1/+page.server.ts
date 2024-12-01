import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.db;

  /* Bugs fixed: 
  + Remove final comma before FROM in the SQL query;
  + Count the number of unique users that visiting each artist' page (COUNT (DISTINCT user_id))
  Time was reformatted in the artistTable.svelte file.
  */
  const query = `
SELECT 
    a.id AS artist_id, 
    a.name AS artist_name, 
    SUM(v.end_time - v.start_time) AS total_visit_duration,
    COUNT(DISTINCT s.user_id) AS unique_visitor_count
FROM 
    artists a
JOIN 
    visits v ON a.id = v.artist_id
JOIN 
    sessions s ON v.session_id = s.id
GROUP BY 
    a.id
ORDER BY total_visit_duration DESC
`;

  const data = await db.prepare(query).all();

  return {
    data,
  };
};
