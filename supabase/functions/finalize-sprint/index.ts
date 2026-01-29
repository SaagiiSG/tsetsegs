import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIER_ORDER = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby']
const TIER_PROMOTION_CUTOFFS: Record<string, number> = {
  unranked: 50,
  bronze: 30,
  silver: 20,
  gold: 15,
  platinum: 10,
  diamond: 5,
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

    // Get the sprint to finalize (either from body or get the most recent ended one)
    const body = await req.json().catch(() => ({}))
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
      .select('id, student_account_id, current_tier, total_points')
      .eq('sprint_id', sprintId)
      .order('total_points', { ascending: false })

    if (rankingsError) throw rankingsError

    if (!rankings || rankings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No rankings found for this sprint' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group by tier
    const byTier: Record<string, typeof rankings> = {}
    for (const r of rankings) {
      const tier = r.current_tier || 'unranked'
      if (!byTier[tier]) byTier[tier] = []
      byTier[tier].push(r)
    }

    // Calculate ranks within each tier and determine promotions
    const updates: Array<{
      id: string
      final_rank: number
      is_top_1: boolean
      reserved_next_tier: string
      student_account_id: string
      current_tier: string
    }> = []

    for (const tier of Object.keys(byTier)) {
      const tierRankings = byTier[tier]
      const cutoff = TIER_PROMOTION_CUTOFFS[tier] || 30
      const currentTierIndex = TIER_ORDER.indexOf(tier)
      const nextTier = currentTierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIndex + 1] : tier

      tierRankings.forEach((ranking, index) => {
        const rank = index + 1
        const isTop1 = rank === 1
        const isAdvancing = rank <= cutoff && currentTierIndex < TIER_ORDER.length - 1
        const reservedNextTier = isAdvancing ? nextTier : tier

        updates.push({
          id: ranking.id,
          final_rank: rank,
          is_top_1: isTop1,
          reserved_next_tier: reservedNextTier,
          student_account_id: ranking.student_account_id,
          current_tier: tier
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

    // Award badges to top 1 finishers
    const top1Finishers = updates.filter(u => u.is_top_1)
    console.log(`Found ${top1Finishers.length} top 1 finishers to award badges`)

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
          console.log(`Awarded badge ${badgeName} to ${finisher.student_account_id}`)
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
          console.log(`Awarded badge ${badgeName} to ${finisher.student_account_id}`)
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
              tier: finisher.current_tier
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
        .select('student_account_id, current_tier, reserved_next_tier, is_top_1, sprint_id')
        .in('sprint_id', await getSeasonSprintIds(supabase, seasonNumber!))
      
      if (seasonError) {
        console.error('Failed to get season rankings:', seasonError)
      } else if (seasonRankings && seasonRankings.length > 0) {
        // Group by student to find their final tier and best P1 protection
        const studentData = new Map<string, {
          finalTier: string
          bestP1Tier: string | null // The highest tier they achieved P1 at
          sprint3Ranking: any | null
        }>()

        for (const ranking of seasonRankings) {
          const studentId = ranking.student_account_id
          const existing = studentData.get(studentId)
          
          if (!existing) {
            studentData.set(studentId, {
              finalTier: ranking.current_tier,
              bestP1Tier: ranking.is_top_1 ? ranking.reserved_next_tier : null,
              sprint3Ranking: ranking.sprint_id === sprintId ? ranking : null
            })
          } else {
            // Update final tier if this is Sprint 3
            if (ranking.sprint_id === sprintId) {
              existing.finalTier = ranking.current_tier
              existing.sprint3Ranking = ranking
            }
            // Track highest P1 protection tier earned this season
            if (ranking.is_top_1 && ranking.reserved_next_tier) {
              const existingP1Index = existing.bestP1Tier ? TIER_ORDER.indexOf(existing.bestP1Tier) : -1
              const newP1Index = TIER_ORDER.indexOf(ranking.reserved_next_tier)
              if (newP1Index > existingP1Index) {
                existing.bestP1Tier = ranking.reserved_next_tier
              }
            }
          }
        }

        // Apply demotions for next season
        for (const [studentId, data] of studentData) {
          const currentTierIndex = TIER_ORDER.indexOf(data.finalTier || 'unranked')
          const demotedTierIndex = Math.max(0, currentTierIndex - 1) // Drop 1 tier, min is unranked
          let newTier = TIER_ORDER[demotedTierIndex]
          
          // Check if P1 protection applies
          if (data.bestP1Tier) {
            const protectedTierIndex = TIER_ORDER.indexOf(data.bestP1Tier)
            // If demoted tier would be below protected tier, use protected tier instead
            if (demotedTierIndex < protectedTierIndex) {
              newTier = data.bestP1Tier
              console.log(`Student ${studentId}: P1 protection keeps them at ${newTier} (would have dropped to ${TIER_ORDER[demotedTierIndex]})`)
            }
          }

          // Only log if there's an actual demotion
          if (newTier !== data.finalTier) {
            console.log(`Student ${studentId}: ${data.finalTier} -> ${newTier} (season end demotion)`)
            seasonEndDemotions++
          }

          // Update the Sprint 3 ranking with the demoted tier as reserved_next_tier for next season
          // This way, when they enroll in Season N+1 Sprint 1, they'll use this tier
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

    return new Response(
      JSON.stringify({
        success: true,
        sprintId,
        sprintNumber,
        seasonNumber,
        updated: updates.length,
        badgesAwarded,
        seasonEndDemotions: sprintNumber === 3 ? seasonEndDemotions : undefined
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
