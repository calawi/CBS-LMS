import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, Medal, Award, Crown, Rocket, Zap, BookOpen, Target, Star,
} from "lucide-react";
import { useLeaderboard, useMyBadges, useMyPoints } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BADGE_ICONS: Record<string, typeof Trophy> = {
  rocket: Rocket,
  zap: Zap,
  "book-open": BookOpen,
  crown: Crown,
  target: Target,
  award: Award,
};

const BADGE_COLORS: Record<string, string> = {
  "First Steps": "from-primary/20 to-primary/5 border-primary/30",
  "Quick Learner": "from-accent/20 to-accent/5 border-accent/30",
  "Knowledge Seeker": "from-warning/20 to-warning/5 border-warning/30",
  "Master Scholar": "from-success/20 to-success/5 border-success/30",
  "Perfect Score": "from-destructive/20 to-destructive/5 border-destructive/30",
};

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-warning" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
};

const Leaderboard = () => {
  const { user } = useAuth();
  const { data: leaderboard, isLoading, isError } = useLeaderboard();
  const { data: myBadges } = useMyBadges();
  const { data: myPoints } = useMyPoints();

  const totalPoints = useMemo(() =>
    (myPoints || []).reduce((sum, p) => sum + p.points, 0), [myPoints]
  );

  const myRank = useMemo(() => {
    if (!leaderboard) return null;
    const idx = leaderboard.findIndex((l) => l.user_id === user?.id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

  const recentPointEvents = useMemo(() =>
    (myPoints || []).slice(0, 10), [myPoints]
  );

  // All possible badges for display
  const allPossibleBadges = [
    { name: "First Steps", icon: "rocket", description: "Complete your first course" },
    { name: "Quick Learner", icon: "zap", description: "Complete 3 courses" },
    { name: "Knowledge Seeker", icon: "book-open", description: "Complete 5 courses" },
    { name: "Master Scholar", icon: "crown", description: "Complete 10 courses" },
    { name: "Perfect Score", icon: "target", description: "Score 100% on an assessment" },
  ];

  const earnedBadgeNames = new Set((myBadges || []).map((b) => b.badge_name));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold">Leaderboard & Achievements</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">Could not load leaderboard data. Restart the backend and refresh.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-warning" />
          Leaderboard & Achievements
        </h1>
        <p className="text-muted-foreground mt-1">
          Earn points by completing courses and passing assessments
        </p>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-warning/10 text-warning">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">My Points</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-primary/10 text-primary">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{myRank ? `#${myRank}` : "—"}</p>
                <p className="text-xs text-muted-foreground">My Rank</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-success/10 text-success">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{(myBadges || []).length}</p>
                <p className="text-xs text-muted-foreground">Badges Earned</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Points breakdown */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-primary mb-2">How to Earn Points</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">📚 Enroll = 25 pts</span>
            <span className="bg-success/10 text-success px-3 py-1.5 rounded-full font-medium">✅ Complete Course = 100 pts</span>
            <span className="bg-warning/10 text-warning px-3 py-1.5 rounded-full font-medium">🎯 Pass Assessment = 50 pts</span>
            <span className="bg-muted text-muted-foreground px-3 py-1.5 rounded-full font-medium">📝 Attempt Assessment = 10 pts</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rankings">
        <TabsList>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="badges">My Badges</TabsTrigger>
          <TabsTrigger value="history">Point History</TabsTrigger>
        </TabsList>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Top Learners</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(leaderboard || []).map((entry, i) => {
                  const isMe = entry.user_id === user?.id;
                  return (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5 transition-colors",
                        isMe && "bg-primary/5",
                        i < 3 && "bg-warning/3"
                      )}
                    >
                      <div className="w-8 flex justify-center">{rankIcon(i + 1)}</div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                        {entry.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", isMe && "text-primary")}>
                          {entry.full_name || "Unknown"} {isMe && <span className="text-xs text-primary">(You)</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          {(entry.badges || []).slice(0, 3).map((b: any) => {
                            const Icon = BADGE_ICONS[b.badge_icon] || Award;
                            return (
                              <span key={b.badge_name} className="text-xs text-muted-foreground flex items-center gap-0.5" title={b.badge_name}>
                                <Icon className="h-3 w-3" />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-display font-bold">{entry.total_points}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </motion.div>
                  );
                })}
                {(!leaderboard || leaderboard.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No rankings yet. Start learning to earn points!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPossibleBadges.map((badge, i) => {
              const earned = earnedBadgeNames.has(badge.name);
              const Icon = BADGE_ICONS[badge.icon] || Award;
              const colorClass = BADGE_COLORS[badge.name] || "from-muted/20 to-muted/5 border-muted/30";
              return (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={cn(
                    "border transition-all",
                    earned ? `bg-gradient-to-br ${colorClass}` : "opacity-40 grayscale"
                  )}>
                    <CardContent className="p-5 text-center">
                      <div className={cn(
                        "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full",
                        earned ? "bg-background shadow-sm" : "bg-muted"
                      )}>
                        <Icon className={cn("h-7 w-7", earned ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <h3 className="font-display font-semibold text-sm">{badge.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                      {earned ? (
                        <Badge className="bg-success/10 text-success border-0 text-xs mt-3">Earned ✓</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs mt-3">Locked</Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Point History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Recent Points</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPointEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentPointEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success text-xs font-bold">
                          +{event.points}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No points earned yet. Enroll in a course to start!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
