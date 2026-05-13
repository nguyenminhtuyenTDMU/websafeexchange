import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pin, MessageSquare, Clock, Send, CornerDownRight, ShieldCheck, Users, Key, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { buildAuthPayload } from "@/lib/web3-auth";
import { useAnonId, buildAnonColorMap, type AnonColorEntry } from "@/hooks/use-anon-id";
import type { ForumPost, ForumComment } from "@shared/schema";

type PostWithComments = ForumPost & { comments: ForumComment[] };

interface SafeSnapshot {
  address: string;
  owners: string[];
  threshold: number;
  nonce: number;
  version?: string;
  chainId?: number;
  verifiedAt?: string;
}

function SafeSnapshotPanel({ raw }: { raw: string }) {
  let snap: SafeSnapshot | null = null;
  try { snap = JSON.parse(raw); } catch { return null; }
  if (!snap) return null;

  return (
    <Card className="border-emerald-500/40 bg-emerald-500/5">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Đã xác minh on-chain
          </span>
          {snap.version && (
            <Badge variant="outline" className="text-xs ml-auto">Safe v{snap.version}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <Key className="h-3 w-3" /> Threshold
            </p>
            <p className="font-semibold text-base">{snap.threshold} / {snap.owners.length}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Nonce</p>
            <p className="font-mono">{snap.nonce}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Owners ({snap.owners.length})
          </p>
          <div className="space-y-1">
            {snap.owners.map((o) => (
              <p key={o} className="text-xs font-mono bg-background/60 rounded px-2 py-0.5 break-all">
                {o}
              </p>
            ))}
          </div>
        </div>

        {snap.verifiedAt && (
          <p className="text-xs text-muted-foreground">
            Snapshot lúc {new Date(snap.verifiedAt).toLocaleString("vi-VN")}
            {snap.chainId === 11155111 && " · Sepolia"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags) as string[]; }
  catch { return tags.split(",").map((t) => t.trim()).filter(Boolean); }
}

const TYPE_LABEL: Record<string, string> = {
  SELL: "Bán ví", BUY_REQUEST: "Tìm mua",
  DISCUSSION: "Thảo luận", QA: "Q&A", PINNED: "Bài ghim",
};

// ─── Anonymous badge ──────────────────────────────────────────────────────────

function AnonBadge({ entry, isMe }: { entry: AnonColorEntry; isMe?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${entry.label}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${entry.bg} ${isMe ? "ring-2 " + entry.ring : ""}`} />
      Ẩn danh #{entry.index}
      {isMe && <span className="text-muted-foreground font-normal">(bạn)</span>}
    </span>
  );
}

// ─── Author label ─────────────────────────────────────────────────────────────

function AuthorLabel({
  comment,
  anonMap,
  myAnonId,
}: {
  comment: ForumComment;
  anonMap: Map<string, AnonColorEntry>;
  myAnonId: string;
}) {
  // Named user (has a wallet address or explicit non-default alias)
  if (comment.authorAddress) {
    return (
      <span className="text-sm font-medium">
        {comment.authorAlias}
        <span className="text-xs text-muted-foreground ml-1 font-mono">
          {comment.authorAddress.slice(0, 8)}…
        </span>
      </span>
    );
  }

  // Anonymous with anonId
  if (comment.anonId) {
    const entry = anonMap.get(comment.anonId);
    if (entry) {
      return <AnonBadge entry={entry} isMe={comment.anonId === myAnonId} />;
    }
  }

  // Fallback (no anonId, no address)
  return <span className="text-sm font-medium text-muted-foreground">{comment.authorAlias}</span>;
}

// ─── Reply form ───────────────────────────────────────────────────────────────

function ReplyForm({
  postId,
  parentId,
  onCancel,
  onSuccess,
  myAnonId,
}: {
  postId: string;
  parentId: string;
  onCancel: () => void;
  onSuccess: () => void;
  myAnonId: string;
}) {
  const { toast } = useToast();
  const { address } = useAccount();
  const [alias, setAlias] = useState("");
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: (body: object) =>
      apiRequest("POST", `/api/forum/posts/${postId}/comments`, body).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Đã trả lời!" });
      setContent("");
      onSuccess();
    },
    onError: () => toast({ title: "Gửi thất bại", variant: "destructive" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate({
      content: content.trim(),
      authorAlias: alias.trim() || "Ẩn danh",
      authorAddress: address ?? null,
      anonId: address ? null : myAnonId,
      parentId,
    });
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
      <Input
        placeholder="Tên (tuỳ chọn, để trống = ẩn danh)"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        className="h-8 text-sm"
      />
      <Textarea
        placeholder="Nội dung trả lời..."
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending || !content.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" />
          {mutation.isPending ? "Đang gửi..." : "Trả lời"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}

// ─── Single comment (with optional replies) ───────────────────────────────────

function getAuthorLabel(comment: ForumComment, anonMap: Map<string, AnonColorEntry>): string {
  if (comment.authorAddress) {
    return `${comment.authorAlias} (${comment.authorAddress.slice(0, 6)}…)`;
  }
  if (comment.anonId) {
    const entry = anonMap.get(comment.anonId);
    if (entry) return `Ẩn danh #${entry.index}`;
  }
  return comment.authorAlias;
}

function CommentItem({
  comment,
  replies,
  anonMap,
  myAnonId,
  postId,
  onReplySuccess,
  depth = 0,
  commentById,
}: {
  comment: ForumComment;
  replies: ForumComment[];
  anonMap: Map<string, AnonColorEntry>;
  myAnonId: string;
  postId: string;
  onReplySuccess: () => void;
  depth?: number;
  commentById: Map<string, ForumComment>;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const directParent = comment.parentId ? commentById.get(comment.parentId) : undefined;
  const replyingToLabel = directParent ? getAuthorLabel(directParent, anonMap) : undefined;

  return (
    <div className={depth > 0 ? "pl-5 border-l-2 border-muted mt-3" : ""}>
      <div className="py-3">
        {replyingToLabel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span>trả lời <span className="font-medium text-foreground/70">{replyingToLabel}</span></span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <AuthorLabel comment={comment} anonMap={anonMap} myAnonId={myAnonId} />
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleString("vi-VN")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>

        <button
          onClick={() => setShowReplyForm((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CornerDownRight className="h-3 w-3" />
          Trả lời
        </button>

        {showReplyForm && (
          <ReplyForm
            postId={postId}
            parentId={comment.id}
            myAnonId={myAnonId}
            onCancel={() => setShowReplyForm(false)}
            onSuccess={() => { setShowReplyForm(false); onReplySuccess(); }}
          />
        )}
      </div>

      {/* Replies flattened at depth=1 */}
      {replies.length > 0 && (
        <div className="space-y-0">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              replies={[]}
              anonMap={anonMap}
              myAnonId={myAnonId}
              postId={postId}
              onReplySuccess={onReplySuccess}
              depth={1}
              commentById={commentById}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comment section ──────────────────────────────────────────────────────────

function CommentSection({
  postId,
  comments,
  onNewComment,
}: {
  postId: string;
  comments: ForumComment[];
  onNewComment: () => void;
}) {
  const { toast } = useToast();
  const { address } = useAccount();
  const myAnonId = useAnonId();
  const [alias, setAlias] = useState("");
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: (body: object) =>
      apiRequest("POST", `/api/forum/posts/${postId}/comments`, body).then((r) => r.json()),
    onSuccess: () => {
      setContent("");
      toast({ title: "Đã đăng bình luận!" });
      onNewComment();
    },
    onError: () => toast({ title: "Đăng thất bại", variant: "destructive" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast({ title: "Vui lòng nhập nội dung", variant: "destructive" });
      return;
    }
    mutation.mutate({
      content: content.trim(),
      authorAlias: alias.trim() || "Ẩn danh",
      authorAddress: address ?? null,
      anonId: address ? null : myAnonId,
      parentId: null,
    });
  }

  // Build tree: index all comments, find top-level, flatten all descendants under root
  const { topLevel, rootRepliesMap, commentById } = useMemo(() => {
    const byId = new Map<string, ForumComment>();
    for (const c of comments) byId.set(c.id, c);

    const top = comments.filter((c) => !c.parentId);

    const rMap = new Map<string, ForumComment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      // walk up to find root ancestor
      let rootId = c.parentId;
      while (byId.get(rootId)?.parentId) rootId = byId.get(rootId)!.parentId!;
      if (!rMap.has(rootId)) rMap.set(rootId, []);
      rMap.get(rootId)!.push(c);
    }
    return { topLevel: top, rootRepliesMap: rMap, commentById: byId };
  }, [comments]);

  // Build anon color map from all comments (ordered by createdAt)
  const anonMap = useMemo(() =>
    buildAnonColorMap(comments.map((c) => c.anonId)),
  [comments]);

  const totalCount = comments.length;

  return (
    <div className="space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Bình luận ({totalCount})
      </h2>

      {/* Comment list */}
      {topLevel.length > 0 ? (
        <Card>
          <CardContent className="pt-2 pb-2 divide-y divide-border">
            {topLevel.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                replies={rootRepliesMap.get(c.id) ?? []}
                anonMap={anonMap}
                myAnonId={myAnonId}
                postId={postId}
                onReplySuccess={onNewComment}
                commentById={commentById}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      )}

      {/* New top-level comment form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Viết bình luận</CardTitle>
          {!address && (
            <p className="text-xs text-muted-foreground">
              Đang đăng ẩn danh — trình duyệt sẽ nhận màu riêng trong thread này.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            {!address && (
              <div className="space-y-1">
                <Label htmlFor="c-alias">Tên hiển thị (tuỳ chọn)</Label>
                <Input
                  id="c-alias"
                  placeholder="Để trống = ẩn danh với màu riêng"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="c-content">Nội dung *</Label>
              <Textarea
                id="c-content"
                placeholder="Nhập bình luận..."
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              {mutation.isPending ? "Đang gửi..." : "Gửi bình luận"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForumPostPage() {
  const [, params] = useRoute("/forum/:id");
  const postId = params?.id ?? "";
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const { data: post, isLoading, isError } = useQuery<PostWithComments>({
    queryKey: ["/api/forum/posts", postId],
    queryFn: () =>
      fetch(`/api/forum/posts/${postId}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    enabled: !!postId,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["/api/forum/posts", postId] });
  }

  async function handleDelete() {
    if (!address || !post) return;
    if (!confirm("Xoá bài này? Hành động không thể hoàn tác.")) return;
    try {
      setDeleting(true);
      const auth = await buildAuthPayload(signMessageAsync, "delete-forum-post", post.id);
      await apiRequest("DELETE", `/api/forum/posts/${post.id}`, {
        authorAddress: address,
        ...auth,
      });
      toast({ title: "Đã xoá bài đăng" });
      queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
      window.location.href = "/forum";
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("user rejected") || msg.includes("denied")) {
        toast({ title: "Đã huỷ xoá", variant: "destructive" });
      } else {
        toast({ title: `Xoá thất bại: ${msg}`, variant: "destructive" });
      }
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <div className="text-center py-16 text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="container px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <div className="text-center py-16 text-muted-foreground">
          <p>Không tìm thấy bài đăng.</p>
          <Button asChild variant="ghost" className="mt-2">
            <Link href="/forum">← Quay lại diễn đàn</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tags = parseTags(post.tags);

  return (
    <div className="container px-4 md:px-8 py-8 max-w-3xl mx-auto space-y-6">
      {/* Back + delete */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/forum">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Diễn đàn
          </Link>
        </Button>
        {address && post.authorAddress?.toLowerCase() === address.toLowerCase() && !post.isPinned && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleting ? "Đang xoá..." : "Xoá bài"}
          </Button>
        )}
      </div>

      {/* Post */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline">{TYPE_LABEL[post.type] ?? post.type}</Badge>
            {post.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Pin className="h-3 w-3" /> Ghim
              </span>
            )}
          </div>
          <CardTitle className="text-xl leading-snug">
            {post.title ?? post.question ?? "(Không có tiêu đề)"}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="font-medium">{post.authorAlias}</span>
            {post.authorAddress && (
              <span className="font-mono">{post.authorAddress.slice(0, 10)}...</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(post.createdAt).toLocaleString("vi-VN")}
            </span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs font-mono">{t}</Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </CardContent>
      </Card>

      {/* Safe on-chain snapshot (SELL posts only) */}
      {post.type === "SELL" && post.safeSnapshot && (
        <SafeSnapshotPanel raw={post.safeSnapshot} />
      )}

      {/* Comments */}
      <CommentSection
        postId={post.id}
        comments={post.comments ?? []}
        onNewComment={refresh}
      />
    </div>
  );
}
