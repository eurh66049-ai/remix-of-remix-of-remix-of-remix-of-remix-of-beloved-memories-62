import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coins, Gift, Package, Sparkles, Crown, Star, Lock, ArrowLeft, Layers } from 'lucide-react';
import { mysteryBoxesApi, type MysteryBox, type CardRarity, type OpenBoxResult, type AuthorCard, type UserAuthorCard } from '@/services/mysteryBoxes';
import { useAuth } from '@/context/AuthContext';
import { useGamificationState } from '@/hooks/useGamification';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const RARITY_META: Record<CardRarity, { label: string; gradient: string; border: string; text: string; icon: React.ReactNode }> = {
  common: {
    label: 'شائع',
    gradient: 'from-slate-400 to-slate-600',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-700 dark:text-slate-200',
    icon: <Star className="w-4 h-4" />,
  },
  rare: {
    label: 'نادر',
    gradient: 'from-blue-500 to-indigo-600',
    border: 'border-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Sparkles className="w-4 h-4" />,
  },
  legendary: {
    label: 'أسطوري',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    border: 'border-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <Crown className="w-4 h-4" />,
  },
};

const MysteryBoxes: React.FC = () => {
  const { user } = useAuth();
  const { data: gamState } = useGamificationState();
  const qc = useQueryClient();

  const boxesQ = useQuery({ queryKey: ['mystery-boxes'], queryFn: () => mysteryBoxesApi.listBoxes(), staleTime: 5 * 60_000 });
  const allCardsQ = useQuery({ queryKey: ['author-cards', 'all'], queryFn: () => mysteryBoxesApi.listAllCards(), staleTime: 5 * 60_000 });
  const myCardsQ = useQuery({ queryKey: ['author-cards', 'me', user?.id ?? 'anon'], queryFn: () => mysteryBoxesApi.listMyCards(), enabled: !!user?.id });

  const [openedReward, setOpenedReward] = useState<OpenBoxResult | null>(null);
  const [openingBoxId, setOpeningBoxId] = useState<string | null>(null);

  const openMutation = useMutation({
    mutationFn: (boxId: string) => mysteryBoxesApi.openBox(boxId),
    onMutate: (boxId) => setOpeningBoxId(boxId),
    onSuccess: (data) => {
      setOpenedReward(data);
      qc.invalidateQueries({ queryKey: ['gamification', 'state'] });
      qc.invalidateQueries({ queryKey: ['author-cards', 'me'] });
    },
    onError: (e: { message?: string }) => {
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('insufficient')) toast.error('🪙 رصيدك من العملات غير كافٍ');
      else if (msg.toLowerCase().includes('not authenticated')) toast.error('سجّل الدخول أولاً');
      else toast.error('تعذّر فتح الصندوق');
    },
    onSettled: () => setOpeningBoxId(null),
  });

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 pt-16 text-center min-h-screen" dir="rtl">
        <Helmet><title>صناديق المفاجآت — كتبي</title></Helmet>
        <h1 className="text-2xl font-bold mb-4">سجّل الدخول لفتح الصناديق وجمع البطاقات</h1>
        <Link to="/auth"><Button>تسجيل الدخول</Button></Link>
      </div>
    );
  }

  const coins = gamState?.coins ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12" dir="rtl">
      <Helmet>
        <title>صناديق المفاجآت وبطاقات المؤلفين — كتبي</title>
        <meta name="description" content="افتح صناديق المفاجآت واجمع بطاقات المؤلفين النادرة والأسطورية" />
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Gift className="text-primary" /> صناديق المفاجآت
        </h1>
        <Link to="/rewards" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
          <Coins className="w-4 h-4" /> {coins.toLocaleString('ar')}
        </Link>
      </div>

      <Tabs defaultValue="boxes" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-6">
          <TabsTrigger value="boxes" className="gap-2"><Package className="w-4 h-4" /> الصناديق</TabsTrigger>
          <TabsTrigger value="collection" className="gap-2"><Layers className="w-4 h-4" /> مجموعتي</TabsTrigger>
        </TabsList>

        <TabsContent value="boxes">
          {boxesQ.isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxesQ.data?.map((box) => (
                <BoxCard
                  key={box.id}
                  box={box}
                  coins={coins}
                  isOpening={openingBoxId === box.id && openMutation.isPending}
                  onOpen={() => openMutation.mutate(box.id)}
                />
              ))}
            </div>
          )}

          {/* عرض كل البطاقات الممكنة */}
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="text-primary" /> كل البطاقات
            </h2>
            {allCardsQ.isLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allCardsQ.data?.map((c) => {
                  const owned = (myCardsQ.data ?? []).some((u) => u.card_id === c.id);
                  return <AuthorCardTile key={c.id} card={c} owned={owned} />;
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="collection">
          {myCardsQ.isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (myCardsQ.data?.length ?? 0) === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-semibold mb-2">لا تمتلك أي بطاقة بعد</p>
              <p className="text-sm">افتح صناديق المفاجآت لتبدأ مجموعتك!</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                {(['legendary', 'rare', 'common'] as CardRarity[]).map((r) => {
                  const count = (myCardsQ.data ?? []).filter((u) => u.card?.rarity === r).length;
                  return (
                    <Card key={r} className={`p-3 bg-gradient-to-br ${RARITY_META[r].gradient} text-white`}>
                      <div className="flex items-center justify-center gap-1 text-xs mb-1">{RARITY_META[r].icon} {RARITY_META[r].label}</div>
                      <div className="text-2xl font-bold">{count.toLocaleString('ar')}</div>
                    </Card>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(myCardsQ.data ?? []).map((u) => (
                  u.card ? <AuthorCardTile key={u.card_id} card={u.card} owned count={u.count} /> : null
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <RewardDialog reward={openedReward} onClose={() => setOpenedReward(null)} />
    </div>
  );
};

const BoxCard: React.FC<{ box: MysteryBox; coins: number; isOpening: boolean; onOpen: () => void }> = ({ box, coins, isOpening, onOpen }) => {
  const meta = RARITY_META[box.rarity];
  const canAfford = coins >= box.price_coins;
  return (
    <Card className={`p-5 border-2 ${meta.border} bg-card relative overflow-hidden transition hover:shadow-lg ${isOpening ? 'animate-pulse' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.gradient}`} />
      <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-3 shadow-md ${isOpening ? 'animate-bounce' : ''}`}>
        <Gift className="w-10 h-10 text-white" />
      </div>
      <div className="text-center">
        <Badge variant="outline" className={`mb-2 ${meta.text} border-current gap-1`}>{meta.icon} {meta.label}</Badge>
        <h3 className="font-bold text-lg mb-1">{box.title_ar}</h3>
        {box.description_ar && <p className="text-xs text-muted-foreground mb-4 min-h-[2.5em]">{box.description_ar}</p>}
        <Button
          className="w-full font-bold"
          onClick={onOpen}
          disabled={isOpening || !canAfford}
          variant={canAfford ? 'default' : 'outline'}
        >
          {isOpening ? 'يفتح...' : (
            <span className="inline-flex items-center gap-2">
              <Coins className="w-4 h-4" /> {box.price_coins.toLocaleString('ar')}
            </span>
          )}
        </Button>
        {!canAfford && <p className="text-xs text-muted-foreground mt-2">رصيدك غير كافٍ</p>}
      </div>
    </Card>
  );
};

const AuthorCardTile: React.FC<{ card: AuthorCard; owned: boolean; count?: number }> = ({ card, owned, count }) => {
  const meta = RARITY_META[card.rarity];
  const image = card.image_url || card.author?.avatar_url;
  return (
    <Card className={`relative overflow-hidden border-2 ${meta.border} ${!owned ? 'opacity-60' : ''}`}>
      <div className={`h-1 bg-gradient-to-r ${meta.gradient}`} />
      <div className={`aspect-[3/4] bg-gradient-to-br ${meta.gradient} relative flex items-center justify-center`}>
        {image ? (
          <img src={image} alt={card.title_ar} className={`w-full h-full object-cover ${!owned ? 'grayscale' : ''}`} loading="lazy" />
        ) : (
          <span className="text-5xl text-white/80">📖</span>
        )}
        {!owned && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white/80" />
          </div>
        )}
        {count && count > 1 && (
          <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">×{count}</span>
        )}
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 ${meta.text}`}>{meta.label}</span>
      </div>
      <div className="p-2 text-center">
        <div className="font-bold text-sm truncate">{card.title_ar}</div>
        {card.author?.name && <div className="text-xs text-muted-foreground truncate">{card.author.name}</div>}
      </div>
    </Card>
  );
};

const RewardDialog: React.FC<{ reward: OpenBoxResult | null; onClose: () => void }> = ({ reward, onClose }) => {
  if (!reward) return null;
  const isCard = reward.kind === 'card' && reward.card;
  const rarity = isCard ? reward.card!.rarity : 'common';
  const meta = RARITY_META[rarity];
  return (
    <Dialog open={!!reward} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isCard ? '🎉 بطاقة جديدة!' : reward.fallback ? '🪙 استرداد عملات' : '🪙 ربحت عملات!'}
          </DialogTitle>
        </DialogHeader>
        {isCard ? (
          <div className="py-4">
            <div className={`mx-auto w-44 aspect-[3/4] rounded-xl border-2 ${meta.border} overflow-hidden bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-xl animate-in zoom-in-50 duration-500`}>
              {reward.card!.image_url ? (
                <img src={reward.card!.image_url} alt={reward.card!.title_ar} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">📖</span>
              )}
            </div>
            <Badge className={`mt-3 bg-gradient-to-r ${meta.gradient} text-white border-0 gap-1`}>{meta.icon} {meta.label}</Badge>
            <h3 className="text-xl font-bold mt-2">{reward.card!.title_ar}</h3>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-xl animate-in zoom-in-50 duration-500">
              <Coins className="w-12 h-12 text-white" />
            </div>
            <div className="text-4xl font-bold mt-2">+{reward.coins?.toLocaleString('ar')}</div>
            {reward.fallback && <p className="text-xs text-muted-foreground">لا توجد بطاقات متاحة، تم استرداد عملات بدلاً منها</p>}
          </div>
        )}
        <Button onClick={onClose} className="mt-4">رائع!</Button>
      </DialogContent>
    </Dialog>
  );
};

export default MysteryBoxes;
