import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pin,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";
import { apiRequest } from "@/lib/queryClient";
import { useDisplayName } from "@/components/user-profile-dialog";
import type { ForumPost } from "@shared/schema";

// ─── Config ───────────────────────────────────────────────────────────────────

type PostType = "SELL" | "BUY_REQUEST" | "DISCUSSION" | "QA";
type FilterType = PostType | "ALL" | "PINNED";

const TYPE_META: Record<PostType, { label: string; color: string }> = {
  SELL:       { label: "Bán ví",     color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  BUY_REQUEST:{ label: "Tìm mua",    color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  DISCUSSION: { label: "Thảo luận",  color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  QA:         { label: "Q&A",        color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "ALL",        label: "Tất cả" },
  { key: "SELL",       label: "Bán ví" },
  { key: "BUY_REQUEST",label: "Tìm mua" },
  { key: "DISCUSSION", label: "Thảo luận" },
  { key: "QA",         label: "Q&A" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags) as string[]; }
  catch { return tags.split(",").map((t) => t.trim()).filter(Boolean); }
}

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type as PostType];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function TagChip({ tag }: { tag: string }) {
  return (
    <Badge variant="secondary" className="text-xs font-mono">
      {tag}
    </Badge>
  );
}

// ─── New-post dialog ──────────────────────────────────────────────────────────

function NewPostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const { address } = useAccount();
  const defaultName = useDisplayName();
  const queryClient = useQueryClient();

  const [type, setType] = useState<PostType>("DISCUSSION");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function reset() {
    setType("DISCUSSION");
    setTitle("");
    setContent("");
    setTagInput("");
    setTags([]);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 8) setTags([...tags, t]);
    setTagInput("");
  }

  const mutation = useMutation({
    mutationFn: (body: object) =>
      apiRequest("POST", "/api/forum/posts", body).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
      toast({ title: "Đã đăng bài!" });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Đăng thất bại", variant: "destructive" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "Vui lòng điền tiêu đề và nội dung", variant: "destructive" });
      return;
    }
    mutation.mutate({
      type,
      title: title.trim(),
      question: type === "QA" ? title.trim() : null,
      content: content.trim(),
      authorAlias: defaultName || "Ẩn danh",
      authorAddress: address ?? null,
      tags: tags.length ? JSON.stringify(tags) : null,
    });
  }

  const placeholder: Record<PostType, { title: string; content: string }> = {
    SELL:        { title: "VD: Bán Safe 2-of-3 Sepolia, giá 0.2 ETH", content: "Mô tả ví: số owner, threshold, lịch sử, giá và cách liên hệ..." },
    BUY_REQUEST: { title: "VD: Tìm mua Safe 2-of-3, tối đa 0.3 ETH",   content: "Yêu cầu của bạn: loại ví, ngân sách, cách liên hệ..." },
    DISCUSSION:  { title: "VD: Tại sao nên dùng Safe thay EOA?",        content: "Chia sẻ thông tin, kinh nghiệm, hoặc bắt đầu thảo luận..." },
    QA:          { title: "Câu hỏi của bạn?",                            content: "Mô tả thêm nếu cần..." },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Đăng bài mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 mt-1">
          {/* Type selector */}
          <div className="space-y-1">
            <Label>Loại bài đăng</Label>
            <Select value={type} onValueChange={(v) => setType(v as PostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TYPE_META) as [PostType, { label: string }][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-title">Tiêu đề *</Label>
            <Input
              id="pf-title"
              placeholder={placeholder[type].title}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-content">Nội dung *</Label>
            <Textarea
              id="pf-content"
              rows={4}
              placeholder={placeholder[type].content}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label>Tags <span className="text-muted-foreground font-normal">(tùy chọn, tối đa 8)</span></Label>
            <div className="flex gap-2">
              <Input
                placeholder="VD: sepolia, 2-of-3, 0.5ETH"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Thêm
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-mono"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Huỷ
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang đăng..." : "Đăng bài"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: ForumPost }) {
  const tags = parseTags(post.tags);
  return (
    <Link href={`/forum/${post.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={post.type} />
                {post.isPinned && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                    <Pin className="h-3 w-3" /> Ghim
                  </span>
                )}
              </div>
              <p className="font-medium text-sm leading-snug line-clamp-2">
                {post.title ?? post.question}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => <TagChip key={t} tag={t} />)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {post.authorAlias} · {new Date(post.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Pinned info cards (collapse) ─────────────────────────────────────────────

function PinnedInfoSection({ posts }: { posts: ForumPost[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (posts.length === 0) return null;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const pinned = posts.filter((p) => p.type === "PINNED");
  const pinnedQA = posts.filter((p) => p.type === "QA" && p.isPinned);

  return (
    <div className="space-y-3 pb-2 border-b mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <BookOpen className="h-3.5 w-3.5" /> Tài liệu cộng đồng
      </p>
      <div className="space-y-2">
        {[...pinned, ...pinnedQA].map((p) => {
          const ex = expandedIds.has(p.id);
          return (
            <Card key={p.id} className="border-primary/20 bg-primary/5">
              <CardContent className="pt-3 pb-3">
                <button className="w-full text-left" onClick={() => toggle(p.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                      {p.title ?? p.question}
                    </span>
                    {ex
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                </button>
                {ex && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{p.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Forum() {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [showNewPost, setShowNewPost] = useState(false);

  const queryFn = (type?: string) => () =>
    fetch(type ? `/api/forum/posts?type=${type}` : "/api/forum/posts")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); });

  const { data: allPosts = [] } = useQuery<ForumPost[]>({
    queryKey: ["/api/forum/posts"],
    queryFn: queryFn(),
  });

  const { data: pinnedPosts = [] } = useQuery<ForumPost[]>({
    queryKey: ["/api/forum/posts", "PINNED"],
    queryFn: queryFn("PINNED"),
  });

  const { data: pinnedQA = [] } = useQuery<ForumPost[]>({
    queryKey: ["/api/forum/posts", "QA", "pinned"],
    queryFn: () =>
      fetch("/api/forum/posts?type=QA")
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((posts: ForumPost[]) => posts.filter((p) => p.isPinned)),
  });

  // Filter feed — exclude PINNED type and pinned QA from main feed
  const feed = allPosts.filter((p) => {
    if (p.type === "PINNED") return false;
    if (p.isPinned) return false;
    if (filter === "ALL") return true;
    return p.type === filter;
  });

  const hasPinnedContent = pinnedPosts.length > 0 || pinnedQA.length > 0;

  return (
    <div className="container px-4 md:px-8 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Diễn đàn
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rao bán · Tìm mua · Thảo luận · Hỏi đáp
          </p>
        </div>
        <Button onClick={() => setShowNewPost(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Đăng bài
        </Button>
      </div>

      <NewPostDialog open={showNewPost} onClose={() => setShowNewPost(false)} />

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors border ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pinned docs (only shown when filter = ALL) */}
      {filter === "ALL" && hasPinnedContent && (
        <PinnedInfoSection posts={[...pinnedPosts, ...pinnedQA]} />
      )}

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Chưa có bài đăng nào.</p>
          <p className="text-sm mt-1">Hãy là người đầu tiên chia sẻ!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}
