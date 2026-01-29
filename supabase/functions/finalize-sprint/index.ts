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
          break
        }
      }
    }

    if (!sprintId) {
      return new Response(
        JSON.stringify({ message: 'No sprint needs finalization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Finalizing sprint: ${sprintId}`)

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

    for (const finisher of top1Finishers) {
      const badgeName = TIER_BADGE_NAMES[finisher.current_tier]
      if (!badgeName) continue

      // Get badge ID from database
      const { data: badge } = await supabase
        .from('badges')
        .select('id')
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
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sprintId,
        updated: updates.length,
        badgesAwarded: top1Finishers.length
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
