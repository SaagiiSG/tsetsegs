-- Live game players' phone numbers were readable by anyone with the public key. Something outside
-- the repo re-granted table-wide SELECT, which silently undid the 28 May column grants (a column
-- REVOKE can't override a table-wide GRANT). Put the column grants back. Rejoining by phone still
-- works through live_session_find_participant(), which runs as definer.
REVOKE SELECT ON public.live_session_participants FROM anon, authenticated;
GRANT SELECT (id, session_id, player_name, total_points, joined_at)
  ON public.live_session_participants TO anon, authenticated;

-- "Anyone can update participants" (April) let anyone rename any player or rewrite their phone.
-- The game only ever updates a player's total, so that's the only column left writable.
REVOKE UPDATE ON public.live_session_participants FROM anon, authenticated;
GRANT UPDATE (total_points) ON public.live_session_participants TO anon, authenticated;
