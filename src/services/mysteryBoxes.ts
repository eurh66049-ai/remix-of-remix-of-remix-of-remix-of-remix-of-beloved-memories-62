// خدمة صناديق المفاجآت وبطاقات المؤلفين
import { supabase } from '@/integrations/supabase/client';

export type CardRarity = 'common' | 'rare' | 'legendary';

export interface MysteryBox {
  id: string;
  code: string;
  rarity: CardRarity;
  title_ar: string;
  description_ar: string | null;
  image_url: string | null;
  price_coins: number;
  sort_order: number;
}

export interface AuthorCard {
  id: string;
  author_id: string | null;
  rarity: CardRarity;
  title_ar: string;
  description_ar: string | null;
  image_url: string | null;
  author?: { name: string | null; avatar_url: string | null } | null;
}

export interface UserAuthorCard {
  card_id: string;
  count: number;
  first_obtained_at: string;
  last_obtained_at: string;
  card: AuthorCard | null;
}

export interface OpenBoxResult {
  opening_id: string;
  kind: 'coins' | 'card';
  coins?: number;
  fallback?: boolean;
  card?: {
    id: string;
    author_id: string;
    rarity: CardRarity;
    title_ar: string;
    image_url: string | null;
  };
  box?: { id: string; code: string; title_ar: string };
}

export const mysteryBoxesApi = {
  async listBoxes(): Promise<MysteryBox[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('mystery_boxes')
      .select('id,code,rarity,title_ar,description_ar,image_url,price_coins,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MysteryBox[];
  },

  async listAllCards(): Promise<AuthorCard[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('author_cards')
      .select('id,author_id,rarity,title_ar,description_ar,image_url,author:authors(name,avatar_url)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AuthorCard[];
  },

  async listMyCards(): Promise<UserAuthorCard[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_author_cards')
      .select('card_id,count,first_obtained_at,last_obtained_at,card:author_cards(id,author_id,rarity,title_ar,description_ar,image_url,author:authors(name,avatar_url))')
      .order('last_obtained_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserAuthorCard[];
  },

  async openBox(boxId: string): Promise<OpenBoxResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('open_mystery_box', { p_box_id: boxId });
    if (error) throw error;
    return data as OpenBoxResult;
  },
};
