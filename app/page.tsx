import { createServerSupabaseClient } from '@/lib/supabase-server'
import Game2048 from '@/components/Game2048'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <Game2048 user={user} />
}
