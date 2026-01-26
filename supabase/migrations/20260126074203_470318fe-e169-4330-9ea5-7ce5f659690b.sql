-- Drop existing restrictive teacher policies
DROP POLICY IF EXISTS "Teachers can view their own groups" ON public.intense_prep_groups;
DROP POLICY IF EXISTS "Teachers can insert their own groups" ON public.intense_prep_groups;
DROP POLICY IF EXISTS "Teachers can update their own groups" ON public.intense_prep_groups;
DROP POLICY IF EXISTS "Teachers can delete their own groups" ON public.intense_prep_groups;

DROP POLICY IF EXISTS "Teachers can view members of their groups" ON public.intense_prep_members;
DROP POLICY IF EXISTS "Teachers can insert members to their groups" ON public.intense_prep_members;
DROP POLICY IF EXISTS "Teachers can delete members from their groups" ON public.intense_prep_members;

DROP POLICY IF EXISTS "Teachers can view tracking for their groups" ON public.intense_prep_tracking;
DROP POLICY IF EXISTS "Teachers can insert tracking for their groups" ON public.intense_prep_tracking;
DROP POLICY IF EXISTS "Teachers can update tracking for their groups" ON public.intense_prep_tracking;

-- Create new policies allowing all authenticated teachers to access all groups

-- Groups policies - all teachers can see and manage all groups
CREATE POLICY "All teachers can view all groups"
ON public.intense_prep_groups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All teachers can create groups"
ON public.intense_prep_groups FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All teachers can update groups"
ON public.intense_prep_groups FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All teachers can delete groups"
ON public.intense_prep_groups FOR DELETE
TO authenticated
USING (true);

-- Members policies - all teachers can manage all members
CREATE POLICY "All teachers can view all members"
ON public.intense_prep_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All teachers can add members"
ON public.intense_prep_members FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All teachers can remove members"
ON public.intense_prep_members FOR DELETE
TO authenticated
USING (true);

-- Tracking policies - all teachers can manage all tracking data
CREATE POLICY "All teachers can view all tracking"
ON public.intense_prep_tracking FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All teachers can insert tracking"
ON public.intense_prep_tracking FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All teachers can update tracking"
ON public.intense_prep_tracking FOR UPDATE
TO authenticated
USING (true);