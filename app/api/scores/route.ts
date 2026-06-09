import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dimension = searchParams.get('dimension') || '4'

  const { data, error } = await supabase
    .from('high_scores')
    .select('score, dimension')
    .eq('user_id', user.id)
    .eq('dimension', parseInt(dimension))
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ score: data?.score ?? 0 })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { score, dimension } = await request.json()

  const { data: existing } = await supabase
    .from('high_scores')
    .select('score')
    .eq('user_id', user.id)
    .eq('dimension', dimension)
    .single()

  if (existing && existing.score >= score) {
    return NextResponse.json({ updated: false, highScore: existing.score })
  }

  const { error } = await supabase
    .from('high_scores')
    .upsert({
      user_id: user.id,
      dimension,
      score,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,dimension' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: true, highScore: score })
}

export async function GET_ALL(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('high_scores')
    .select('score, dimension')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ scores: data ?? [] })
}
