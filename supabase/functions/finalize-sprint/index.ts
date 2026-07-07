import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIER_ORDER = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby']
const MAX_GROUP_SIZE = 55 // 40 ± 15 margin, effective range 25-55
const TIER_PROMOTION_CUTOFFS: Record<string, number> = {
  unranked: 30,
  bronze: 20,
  silver: 15,
  gold: 10,
  platinum: 5,
  diamond: 1,
  ruby: 1
}

// Badge name to tier mapping for sprint championship badges
const TIER_BADGE_NAMES: Record<string, string> = {
  unranked: 'Bronze Novice', // Winning unranked promotes to bronze, so we award bronze badge
  bronze: 'Bronze Novice',
  silver: 'Silver Challenger',
  gold: 'Gold Scholar',
  platinum: 'Platinum Legend',
  diamond: 'Diamond Apex',
  ruby: 'Ruby Legend'
}

// Helper function to get all sprint IDs for a season
async function getSeasonSprintIds(supabase: any, seasonNumber: number): Promise<string[]> {
  const { data: sprints } = await supabase
    .from('sprints')
    .select('id')
    .eq('season_number', seasonNumber)
  
  return sprints?.map((s: any) => s.id) || []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Admin auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: adminRole } = await supabase.from('user_roles')
      .select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sprintId = body.sprintId
    let sprintNumber: number | null = null
    let seasonNumber: number | null = null

    if (!sprintId) {
      // Find sprints that ended but haven't been finalized (no final_rank set for anyone)
      const { data: endedSprints } = await supabase
        .from('sprints')
        .select('id, sprint_number, season_number')
        .eq('is_active', false)
        .order('end_date', { ascending: false })
        .limit(5)

      for (const sprint of endedSprints || []) {
        // Check if this sprint has been finalized
        const { data: rankings } = await supabase
          .from('student_sprint_rankings')
          .select('final_rank')
          .eq('sprint_id', sprint.id)
          .not('final_rank', 'is', null)
          .limit(1)

        if (!rankings || rankings.length === 0) {
          // This sprint hasn't been finalized yet
          sprintId = sprint.id
          sprintNumber = sprint.sprint_number
          seasonNumber = sprint.season_number
          break
        }
      }
    } else {
      // Get sprint info for provided sprintId
      const { data: sprint } = await supabase
        .from('sprints')
        .select('sprint_number, season_number')
        .eq('id', sprintId)
        .single()
      
      if (sprint) {
        sprintNumber = sprint.sprint_number
        seasonNumber = sprint.season_number
      }
    }

    if (!sprintId) {
      return new Response(
        JSON.stringify({ message: 'No sprint needs finalization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Finalizing sprint: ${sprintId} (Season ${seasonNumber}, Sprint ${sprintNumber})`)

    // Get all rankings for this sprint, ordered by points
    const { data: rankings, error: rankingsError } = await supabase
      .from('student_sprint_rankings')
      .select('id, student_account_id, current_tier, total_points, group_number')
      .eq('sprint_id', sprintId)
      .order('total_points', { ascending: false })

    if (rankingsError) throw rankingsError

    if (!rankings || rankings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No rankings found for this sprint' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group by tier AND group_number
    const byTierAndGroup: Record<string, typeof rankings> = {}
    for (const r of rankings) {
      const tier = r.current_tier || 'unranked'
      const groupNumber = r.group_number || 1
      const key = `${tier}:${groupNumber}`
      if (!byTierAndGroup[key]) byTierAndGroup[key] = []
      byTierAndGroup[key].push(r)
    }

    // Calculate ranks within each tier+group and determine promotions
    const updates: Array<{
      id: string
      final_rank: number
      is_top_1: boolean
      reserved_next_tier: string
      student_account_id: string
      current_tier: string
      group_number: number
    }> = []

    for (const key of Object.keys(byTierAndGroup)) {
      const [tier, groupNumStr] = key.split(':')
      const groupNumber = parseInt(groupNumStr)
      const groupRankings = byTierAndGroup[key]
      const cutoff = TIER_PROMOTION_CUTOFFS[tier] || 30
      const currentTierIndex = TIER_ORDER.indexOf(tier)
      const nextTier = currentTierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIndex + 1] : tier
      const prevTier = currentTierIndex > 0 ? TIER_ORDER[currentTierIndex - 1] : tier

      // Sort by points within group (should already be sorted, but ensure it)
      groupRankings.sort((a, b) => b.total_points - a.total_points)

      groupRankings.forEach((ranking, index) => {
        const rank = index + 1
        const isTop1 = rank === 1 // Each group has its own P1 winner
        
        // Ruby tier special logic: only rank 1 stays, others drop to Diamond
        let reservedNextTier: string
        if (tier === 'ruby') {
          reservedNextTier = rank === 1 ? 'ruby' : 'diamond'
        } else {
          const isAdvancing = rank <= cutoff && currentTierIndex < TIER_ORDER.length - 1
          // Move up or move down — no staying in place
          reservedNextTier = isAdvancing ? nextTier : prevTier
        }

        updates.push({
          id: ranking.id,
          final_rank: rank,
          is_top_1: isTop1,
          reserved_next_tier: reservedNextTier,
          student_account_id: ranking.student_account_id,
          current_tier: tier,
          group_number: groupNumber
        })
      })
    }

    // Update all rankings
    for (const update of updates) {
      const { error } = await supabase
        .from('student_sprint_rankings')
        .update({
          final_rank: update.final_rank,
          is_top_1: update.is_top_1,
          reserved_next_tier: update.reserved_next_tier
        })
        .eq('id', update.id)

      if (error) {
        console.error(`Failed to update ranking ${update.id}:`, error)
      }
    }

    // Award badges to ALL P1 finishers (one per group)
    const top1Finishers = updates.filter(u => u.is_top_1)
    console.log(`Found ${top1Finishers.length} P1 finishers across all groups to award badges`)

    let badgesAwarded = 0

    for (const finisher of top1Finishers) {
      const badgeName = TIER_BADGE_NAMES[finisher.current_tier]
      if (!badgeName) continue

      // Get badge ID and point value from database
      const { data: badge } = await supabase
        .from('badges')
        .select('id, point_value')
        .eq('name', badgeName)
        .single()

      if (!badge) {
        console.log(`Badge not found: ${badgeName}`)
        continue
      }

      // Check if student already has this badge
      const { data: existingBadge } = await supabase
        .from('student_badges')
        .select('id, is_unlocked')
        .eq('student_account_id', finisher.student_account_id)
        .eq('badge_id', badge.id)
        .single()

      if (existingBadge?.is_unlocked) {
        console.log(`Student ${finisher.student_account_id} already has badge ${badgeName}`)
        continue
      }

      let badgeAwarded = false

      if (existingBadge) {
        // Update existing record
        const { error } = await supabase
          .from('student_badges')
          .update({
            is_unlocked: true,
            progress: 100,
            unlocked_at: new Date().toISOString()
          })
          .eq('id', existingBadge.id)

        if (error) {
          console.error(`Failed to update badge for ${finisher.student_account_id}:`, error)
        } else {
          console.log(`Awarded badge ${badgeName} to ${finisher.student_account_id} (Group ${finisher.group_number})`)
          badgeAwarded = true
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('student_badges')
          .insert({
            student_account_id: finisher.student_account_id,
            badge_id: badge.id,
            is_unlocked: true,
            progress: 100,
            unlocked_at: new Date().toISOString()
          })

        if (error) {
          console.error(`Failed to insert badge for ${finisher.student_account_id}:`, error)
        } else {
          console.log(`Awarded badge ${badgeName} to ${finisher.student_account_id} (Group ${finisher.group_number})`)
          badgeAwarded = true
        }
      }

      // Award badge points as a point transaction
      if (badgeAwarded && badge.point_value > 0) {
        const { error: pointError } = await supabase
          .from('point_transactions')
          .insert({
            student_account_id: finisher.student_account_id,
            points: badge.point_value,
            category: 'badge',
            sprint_id: sprintId,
            metadata: { 
              badge_name: badgeName, 
              badge_id: badge.id,
              tier: finisher.current_tier,
              group_number: finisher.group_number
            }
          })

        if (pointError) {
          console.error(`Failed to award badge points for ${finisher.student_account_id}:`, pointError)
        } else {
          console.log(`Awarded ${badge.point_value} points for badge ${badgeName} to ${finisher.student_account_id}`)
        }

        badgesAwarded++
      }
    }

    // SEASON END LOGIC: If this is Sprint 3, apply tier demotions for next season
    let seasonEndDemotions = 0
    if (sprintNumber === 3) {
      console.log(`Season ${seasonNumber} ending - applying tier demotions`)
      
      // Get all students who participated in this season (from any of the 3 sprints)
      // We need to find their highest reserved_next_tier (from P1 wins) and current tier
      const { data: seasonRankings, error: seasonError } = await supabase
        .from('student_sprint_rankings')
        .select('student_account_id, current_tier, reserved_next_tier, is_top_1, sprint_id, group_number')
        .in('sprint_id', await getSeasonSprintIds(supabase, seasonNumber!))
      
      if (seasonError) {
        console.error('Failed to get season rankings:', seasonError)
      } else if (seasonRankings && seasonRankings.length > 0) {
        // Group by student to find their Sprint 3 ranking
        // NOTE: Only P1 in Sprint 3 provides protection - P1 in Sprint 1 or 2 awards badges only
        const studentData = new Map<string, {
          finalTier: string
          sprint3Ranking: any | null
        }>()

        for (const ranking of seasonRankings) {
          const studentId = ranking.student_account_id
          const existing = studentData.get(studentId)
          
          if (!existing) {
            studentData.set(studentId, {
              finalTier: ranking.current_tier,
              sprint3Ranking: ranking.sprint_id === sprintId ? ranking : null
            })
          } else {
            // Update final tier if this is Sprint 3
            if (ranking.sprint_id === sprintId) {
              existing.finalTier = ranking.current_tier
              existing.sprint3Ranking = ranking
            }
          }
        }

        // Apply demotions for next season
        for (const [studentId, data] of studentData) {
          // If the student got P1 in Sprint 3, they keep their promoted tier (no demotion)
          if (data.sprint3Ranking?.is_top_1) {
            console.log(`Student ${studentId}: P1 in Sprint 3 - keeps promoted tier ${data.sprint3Ranking.reserved_next_tier}`)
            // reserved_next_tier is already set correctly from the main finalization above
            continue
          }
          
          const currentTierIndex = TIER_ORDER.indexOf(data.finalTier || 'unranked')
          const demotedTierIndex = Math.max(0, currentTierIndex - 1) // Drop 1 tier, min is unranked
          const newTier = TIER_ORDER[demotedTierIndex]

          // Only log if there's an actual demotion
          if (newTier !== data.finalTier) {
            console.log(`Student ${studentId}: ${data.finalTier} -> ${newTier} (season end demotion)`)
            seasonEndDemotions++
          }

          // Update the Sprint 3 ranking with the demoted tier as reserved_next_tier for next season
          if (data.sprint3Ranking) {
            await supabase
              .from('student_sprint_rankings')
              .update({ reserved_next_tier: newTier })
              .eq('sprint_id', sprintId)
              .eq('student_account_id', studentId)
          }
        }

        console.log(`Season end: ${seasonEndDemotions} students demoted`)
      }
    }

    // AUTO-ENROLL: Enroll all participants in the next sprint (active OR upcoming)
    let autoEnrolledCount = 0
    
    // Find the next sprint - first check active, then check upcoming (scheduled but not yet active)
    let nextSprintData = null
    
    const { data: nextActiveSprint } = await supabase
      .from('sprints')
      .select('id, season_number, sprint_number')
      .eq('is_active', true)
      .neq('id', sprintId)
      .order('start_date', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    if (nextActiveSprint) {
      nextSprintData = nextActiveSprint
    } else {
      // No active sprint found - look for the next upcoming sprint in the same season
      const { data: nextUpcomingSprint } = await supabase
        .from('sprints')
        .select('id, season_number, sprint_number, start_date')
        .eq('season_number', seasonNumber)
        .gt('sprint_number', sprintNumber)
        .order('sprint_number', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (nextUpcomingSprint) {
        nextSprintData = nextUpcomingSprint
      }
    }
    
    const nextSprint = nextSprintData

    if (nextSprint) {
      console.log(`Found next sprint: Season ${nextSprint.season_number}, Sprint ${nextSprint.sprint_number}`)
      
      // Get all unique students from the finalized sprint
      const studentsToEnroll = new Map<string, { tier: string }>()
      
      for (const update of updates) {
        // Use reserved_next_tier for their starting tier in the new sprint
        studentsToEnroll.set(update.student_account_id, {
          tier: update.reserved_next_tier || update.current_tier
        })
      }

      // Check which students are already enrolled in the next sprint
      const { data: existingEnrollments } = await supabase
        .from('student_sprint_rankings')
        .select('student_account_id')
        .eq('sprint_id', nextSprint.id)

      const alreadyEnrolled = new Set(existingEnrollments?.map(e => e.student_account_id) || [])

      // Enroll students who aren't already enrolled
      for (const [studentId, { tier }] of studentsToEnroll) {
        if (alreadyEnrolled.has(studentId)) {
          continue
        }

        // Get current group counts for this tier to assign appropriate group
        const { data: tierMembers } = await supabase
          .from('student_sprint_rankings')
          .select('group_number')
          .eq('sprint_id', nextSprint.id)
          .eq('current_tier', tier)

        let assignedGroup = 1
        if (tierMembers && tierMembers.length > 0) {
          const groupMap: Record<number, number> = {}
          tierMembers.forEach(r => {
            const g = r.group_number || 1
            groupMap[g] = (groupMap[g] || 0) + 1
          })

          // Find a group that hasn't hit the max (55)
          const maxGroup = Math.max(...Object.keys(groupMap).map(Number), 1)
          let foundGroup = false
          for (let i = 1; i <= maxGroup; i++) {
            if ((groupMap[i] || 0) < MAX_GROUP_SIZE) {
              assignedGroup = i
              foundGroup = true
              break
            }
          }
          if (!foundGroup) {
            assignedGroup = maxGroup + 1
          }
        }

        // Insert the enrollment
        const { error: enrollError } = await supabase
          .from('student_sprint_rankings')
          .insert({
            sprint_id: nextSprint.id,
            student_account_id: studentId,
            current_tier: tier,
            total_points: 0,
            is_top_1: false,
            group_number: assignedGroup
          })

        if (enrollError) {
          console.error(`Failed to auto-enroll student ${studentId}:`, enrollError)
        } else {
          autoEnrolledCount++
        }
      }

      console.log(`Auto-enrolled ${autoEnrolledCount} students in next sprint`)
    } else {
      console.log('No next active sprint found - students will enroll when they visit the leaderboard')
    }

    // Get unique group count for summary
    const uniqueGroups = new Set(updates.map(u => `${u.current_tier}:${u.group_number}`))

    return new Response(
      JSON.stringify({
        success: true,
        sprintId,
        sprintNumber,
        seasonNumber,
        updated: updates.length,
        badgesAwarded,
        totalGroups: uniqueGroups.size,
        p1WinnersCount: top1Finishers.length,
        seasonEndDemotions: sprintNumber === 3 ? seasonEndDemotions : undefined,
        autoEnrolledInNextSprint: autoEnrolledCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error finalizing sprint:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
