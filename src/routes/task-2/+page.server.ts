import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.db;
 
  /* For the data cleaning:
  - We don't have any null data from user_id, artist_id, event_type and created_at;
  - As for event_target, we have play_track, share_track, add_track_to_playlist and share_track (which are relevant to our analysis)
  all relating to the track number. All meets the criteria, so we don't need to remove anything.
  Also, we will choose only share_artist, follow_artist, play_track, share_track, add_track_to_playlist and share_track as the positive
  engagement needed for our analysis. Apart from that we don't need to remove any data from the dataset provided.
   We could do it in SQL query for a faster performance, however in this case I chose to do it in the analysingEngagement.svelte file, 
   to simplify the SQL query here. Also, we could change the scoring system without need to deploy.

  We will also add the artists table in this file - to map the artist name with ID, and making sure that artist name would be displayed later.

  */
  const query = `SELECT ue.user_id, ue.artist_id, ue.event_type, ue.created_at,
   u.username, u.timezone, a.name  
    FROM user_events ue
    JOIN users u ON ue.user_id = u.id
    JOIN artists a on ue.artist_id = a.id
    
    
    ;`;

  const data = await db.prepare(query).all();

  return {
    data,
  };
};
