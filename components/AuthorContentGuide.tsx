'use client';
import { useState } from "react";

const C = {
  cream: "#FFF8F0",
  navy: "#1E2D3D",
  amber: "#E9A020",
  coral: "#F97B6B",
  sage: "#6EBF8B",
  peach: "#F4A261",
};

const STEPS = [
  {
    number: "01",
    title: "Know Exactly Who You're Writing For",
    tagline: "Before you create a single post, you need a real person — not a demographic.",
    body: `Give her a name. Give her an age. Think about what her life looks like — her job, her relationships, what she does on a Saturday morning. What has she been through? What does she reach for when she needs to escape?

This is your reader avatar. Everything you create is for her.

The more specific you are, the better your content will be. A post written for everyone connects with no one. A post written for her will find her.`,
    questions: [
      "What does she feel when she picks up a book in your genre?",
      "What has she experienced in real life that your book speaks to?",
      "What line from your book would she screenshot and send to someone?",
      "What would make her say \"this author gets me\"?",
    ],
    prompt: `I'm a romance author building my social media strategy. Help me define my ideal reader avatar through conversation. Ask me one question at a time — her name, age, job, Saturday morning, what she reaches for when she needs to escape, what she texts her best friend about. After we've talked through it, write me a vivid 3-4 sentence reader portrait I can use as my north star.`,
    outputLabel: "Your reader avatar",
  },
  {
    number: "02",
    title: "Find the Feelings",
    tagline: "Your reader isn't buying a plot. She's buying a feeling she's been chasing.",
    body: `Your book is full of plot. Forget the plot for now.

What your reader is actually buying is a feeling — and she's learned from experience which books deliver it and which ones don't.

Write down 5 feelings your book delivers. Not themes, not topics — feelings. The kind a reader would describe to a friend.`,
    examples: [
      "The rush of wanting two people together when they absolutely shouldn't be yet",
      "The satisfaction of watching someone finally get called out",
      "The devastation of a moment that was almost okay",
      "The ugly cry you didn't see coming",
      "The exhale at the end when everything lands",
    ],
    examplesLabel: "Examples to spark yours:",
    prompt: `I'm a romance author and I need help identifying the 5 core feelings my book delivers — not themes or plot points, but the emotional experience readers get. Here's a bit about my book: [describe your book in 2-3 sentences]. Help me dig into what readers actually feel at key moments — the tension, the release, the devastation, the exhale. Give me 5 vivid, specific feelings I can use as the backbone of my content strategy.`,
    outputLabel: "Your 5 core feelings",
  },
  {
    number: "03",
    title: "Build Your Three Pillars",
    tagline: "You need three types of content. That's it. Three.",
    body: `Think of these as three different ways to invite your reader in. Every post you make fits into one of them.`,
    pillars: [
      {
        name: "Pillar 1: Emotional Experience",
        description: "Posts that make your reader feel something she recognizes. She saves these. She shares them. Your book is never mentioned.",
        example: "\"Do you ever think about the version of yourself you perform when you're not okay? How good you get at her?\"",
      },
      {
        name: "Pillar 2: The Reader You're Writing For",
        description: "Posts that make her feel seen. These say: I know who you are, I wrote this for you.",
        example: "\"She's the one who makes sure everyone else is okay. She's funny. She's capable. So no one worries. She's fine. (She's not always fine.)\"",
      },
      {
        name: "Pillar 3: World Mood Board",
        description: "Posts that invite her into the atmosphere of your book world. Not plot. Just mood.",
        example: "A warm vineyard at golden hour: \"the kind of place that makes you believe things are possible.\"",
      },
    ],
    prompt: `I'm a romance author building a content strategy. I need help writing example posts for my three content pillars. Here's my reader avatar: [paste your avatar]. Here are the 5 feelings my book delivers: [paste your feelings].

Write one example post for each pillar:
1. Emotional Experience — makes her feel something she recognizes, book never mentioned
2. The Reader You're Writing For — makes her feel seen
3. World Mood Board — captures the atmosphere of my book world

Keep them short, real, and written in a warm voice with a dry edge.`,
    outputLabel: "Example posts for each pillar",
  },
  {
    number: "04",
    title: "Find Your Voice",
    tagline: "Your content needs to sound like a real person. Specifically, like you.",
    body: `You are not a brand. You are an author. There is a human being behind these books and your reader wants to feel that.

Write your posts the way you'd talk to someone you like. Not formally. Not like an advertisement. Like yourself.

A simple test: read your post out loud. If it sounds like a commercial, rewrite it. If it sounds like you, you're done.`,
    questions: [
      "Are you warm and open, dry and witty — or both?",
      "Do you lead with heart or earn the heart through humor?",
      "What do you believe about love or relationships?",
      "What would you say about this to a friend over coffee?",
    ],
    prompt: `I'm a romance author and I need help defining my content voice. Ask me a few questions — am I warm and open or dry and witty, do I lead with heart or earn it through humor, what would I say about love to a friend over coffee. Then write me a 2-3 sentence voice profile I can keep in front of me when I'm writing posts. Something specific and true, not generic.`,
    outputLabel: "Your voice profile",
  },
  {
    number: "05",
    title: "Structure Every Post",
    tagline: "Every post has three parts. Once you know this, you can batch fast.",
    body: ``,
    parts: [
      {
        label: "Part 1: The Image",
        description: "Stops the scroll. Doesn't need to show your book or cover. Just needs to create the right feeling — atmospheric, warm, real. Not stock-photo-fake.",
      },
      {
        label: "Part 2: The Text Overlay",
        description: "Short copy on the image itself. This is your hook. Two to five lines maximum. Make every word earn its place.",
      },
      {
        label: "Part 3: The Caption",
        description: "Two to four sentences underneath. Warm, genuine, no pressure. You're not asking her to buy anything. You're sharing something real.",
      },
    ],
    prompt: `I'm a romance author and I need help writing a complete Instagram post. Here's the pillar I'm working with: [Emotional Experience / Reader You're Writing For / World Mood Board]. Here's my reader avatar: [paste]. Here's my voice profile: [paste].

Write me a complete post with:
1. A description of the image I should use or create
2. Short text overlay (2-5 lines)
3. Caption (2-4 sentences)

Make it feel real, not like an ad.`,
    outputLabel: "A complete post draft",
  },
  {
    number: "06",
    title: "Create Your Visual Identity",
    tagline: "Your feed should look like it belongs to the same person.",
    body: `Find one image that feels exactly right for your brand. One image that makes you think: yes, that's the world I'm creating. Save it. That is your reference image.

Everything you create should feel like it lives in the same world.`,
    lockList: [
      "Light quality — warm golden? soft natural? moody?",
      "Color palette — creams and honey? deep jewel tones? muted neutrals?",
      "Setting mood — cozy interior? wide open landscape? intimate close-up?",
      "Overall feeling — romantic? contemplative? joyful?",
    ],
    prompt: `I'm a romance author and I need to lock my visual identity for social media. Help me define it by asking about my light quality preference, color palette, setting mood, and overall feeling. Then give me a one-paragraph visual brief I can refer back to every time I create content — specific enough that I'm never making visual decisions from scratch again.`,
    outputLabel: "Your visual brief",
  },
  {
    number: "07",
    title: "Create Your Images with AI",
    tagline: "You don't need a photographer. You need a good prompt.",
    body: `Use Midjourney (midjourney.com) to generate exactly the images you need.

A prompt is just a description of the image you want. Think of it like instructions to a very talented photographer.`,
    promptStructure: "[what's in the image], [the light], [the mood], [the style], [what you don't want]",
    promptExample: "woman sitting on a wooden fence, back to camera, oversized cream knit sweater, warm golden backlight, soft and contemplative, film grain, --ar 4:5 --style raw --v 6 --no dramatic lighting, no cold tones, no stock photo feel",
    tips: [
      "Be specific about light. \"Warm golden backlight\" gives you something. \"Nice light\" gives you nothing.",
      "Tell it what you DON'T want to keep results consistent.",
      "Add --ar 4:5 for Instagram ratio.",
      "Once you find a style that works, save it and use it on everything.",
    ],
    prompt: `I'm a romance author who needs to create a locked Midjourney style string for my social media images. Here's my visual brief: [paste your visual brief].

Generate:
1. A master style string I can append to every prompt to keep my feed consistent
2. Three specific image prompts — one for each content pillar (Emotional Experience, Reader post, World Mood Board)

Format them ready to paste into Midjourney.`,
    outputLabel: "Your Midjourney prompts",
  },
  {
    number: "08",
    title: "Batch Create Your Content",
    tagline: "Never create one post at a time.",
    body: `Set aside one session — two to three hours — and create three weeks of content at once.

Once you have your pillars, your voice, and your visual style locked, the posts come quickly.`,
    schedule: [
      { day: "Monday", type: "Emotional Experience" },
      { day: "Tuesday", type: "Reader You're Writing For" },
      { day: "Wednesday", type: "World Mood Board" },
      { day: "Thursday", type: "Emotional Experience" },
      { day: "Friday", type: "Reader You're Writing For" },
      { day: "Saturday", type: "World Mood Board" },
      { day: "Sunday", type: "Something personal — a thought, a line you love" },
    ],
    tools: "Schedule with Later, Planoly, or Meta Business Suite (free).",
    prompt: `I'm a romance author and I need to batch create 3 weeks of social media content. Here's everything you need:

Reader avatar: [paste]
5 core feelings: [paste]
Voice profile: [paste]
Visual brief: [paste]

Write 21 posts following this weekly rhythm:
Mon: Emotional Experience | Tue: Reader post | Wed: World Mood Board | Thu: Emotional Experience | Fri: Reader post | Sat: World Mood Board | Sun: Personal

For each post: image description, text overlay, caption. Keep them short, real, in my voice. Don't mention my book more than 3 times total across all 21 posts.`,
    outputLabel: "21 ready-to-schedule posts",
  },
  {
    number: "09",
    title: "The Rule of Five",
    tagline: "For every post that mentions your book, write five that don't.",
    body: `This is the step most authors skip because it feels wrong. It feels like you should be talking about your book more.

You shouldn't.

The posts that drive the most readers to your book are the ones that never mention it. They just make the right person feel understood. She follows you because she feels seen. She buys your book because she trusts you.

That trust is built post by post, over time, by showing up as a real human being who has something genuine to say.`,
    stat: "5:1",
    statLabel: "non-book posts to every book mention",
    noPrompt: true,
  },
  {
    number: "10",
    title: "Let It Be Imperfect",
    tagline: "Your first posts will feel awkward. That's not failure. That's the process.",
    body: `Your voice will take a few weeks to find its rhythm. Some images won't land. Some captions will fall flat.

Show up consistently. Pay attention to what resonates. Adjust. Keep going.

Your readers are out there looking for you right now. They just don't know your name yet.

Go introduce yourself.`,
    noPrompt: true,
    final: true,
  },
];

type StepData = typeof STEPS[number];

function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} style={{
      background: copied ? C.sage : "white",
      color: copied ? "white" : C.navy,
      border: `1.5px solid ${copied ? C.sage : "rgba(30,45,61,0.2)"}`,
      borderRadius: 8,
      padding: "9px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}>
      {copied ? "✓ Copied" : `📋 ${label}`}
    </button>
  );
}

function ClaudeButton({ prompt }: { prompt: string }) {
  const encoded = encodeURIComponent(prompt);
  const url = `https://claude.ai/new?q=${encoded}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      background: C.amber,
      color: C.navy,
      border: "none",
      borderRadius: 8,
      padding: "9px 14px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      ✦ Open in Claude
    </a>
  );
}

function AIHelper({ prompt, outputLabel }: { prompt: string; outputLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 20, borderTop: "1px solid rgba(30,45,61,0.07)", paddingTop: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none",
        border: "none",
        color: C.amber,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: 0,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span style={{ fontSize: 11, transform: open ? "rotate(90deg)" : "rotate(0)", display: "inline-block", transition: "transform 0.2s" }}>▶</span>
        Need help with this? Get a prompt →
      </button>
      {open && (
        <div style={{ marginTop: 12, background: C.cream, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, color: "rgba(30,45,61,0.5)", marginBottom: 10, lineHeight: 1.5 }}>
            Use this prompt in Claude, ChatGPT, or any AI. It will guide you through this step and output: <strong style={{ color: C.navy }}>{outputLabel}</strong>.
          </div>
          <div style={{
            background: "white",
            border: "1px solid rgba(30,45,61,0.1)",
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
            color: C.navy,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
            marginBottom: 12,
            fontFamily: "Georgia, serif",
          }}>
            {prompt}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CopyButton text={prompt} label="Copy for ChatGPT / any AI" />
            <ClaudeButton prompt={prompt} />
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ step }: { step: StepData }) {
  const s = step as Record<string, unknown>;
  const questions = s.questions as string[] | undefined;
  const examples = s.examples as string[] | undefined;
  const examplesLabel = s.examplesLabel as string | undefined;
  const pillars = s.pillars as { name: string; description: string; example: string }[] | undefined;
  const parts = s.parts as { label: string; description: string }[] | undefined;
  const lockList = s.lockList as string[] | undefined;
  const promptStructure = s.promptStructure as string | undefined;
  const promptExample = s.promptExample as string | undefined;
  const tips = s.tips as string[] | undefined;
  const schedule = s.schedule as { day: string; type: string }[] | undefined;
  const tools = s.tools as string | undefined;
  const stat = s.stat as string | undefined;
  const statLabel = s.statLabel as string | undefined;
  const noPrompt = s.noPrompt as boolean | undefined;
  const final = s.final as boolean | undefined;
  const prompt = s.prompt as string | undefined;
  const outputLabel = s.outputLabel as string | undefined;

  return (
    <div style={{ background: "white", borderRadius: 14, padding: "22px 20px", marginBottom: 14, border: "1px solid rgba(30,45,61,0.07)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ background: C.navy, color: "white", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, marginTop: 2 }}>{step.number}</div>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: C.navy, lineHeight: 1.3 }}>{step.title}</div>
          <div style={{ fontSize: 13, color: C.amber, fontWeight: 600, marginTop: 3, lineHeight: 1.4 }}>{step.tagline}</div>
        </div>
      </div>
      {step.body && (
        <div style={{ fontSize: 14, color: "rgba(30,45,61,0.75)", lineHeight: 1.75, marginBottom: 14, whiteSpace: "pre-wrap" }}>{step.body}</div>
      )}
      {questions && (
        <div style={{ marginBottom: 4 }}>
          {questions.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
              <div style={{ color: C.amber, fontSize: 12, marginTop: 3, flexShrink: 0 }}>→</div>
              <div style={{ fontSize: 14, color: C.navy, lineHeight: 1.6 }}>{q}</div>
            </div>
          ))}
        </div>
      )}
      {examples && (
        <div style={{ marginBottom: 4 }}>
          {examplesLabel && <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(30,45,61,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{examplesLabel}</div>}
          {examples.map((e, i) => (
            <div key={i} style={{ background: C.cream, borderRadius: 8, padding: "9px 12px", marginBottom: 6, fontSize: 13, color: C.navy, lineHeight: 1.55, fontStyle: "italic", fontFamily: "Georgia, serif" }}>&ldquo;{e}&rdquo;</div>
          ))}
        </div>
      )}
      {pillars && pillars.map((p, i) => (
        <div key={i} style={{ borderLeft: `3px solid ${[C.coral, C.amber, C.sage][i]}`, paddingLeft: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 3 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: "rgba(30,45,61,0.65)", lineHeight: 1.6, marginBottom: 5 }}>{p.description}</div>
          <div style={{ fontSize: 12, color: "rgba(30,45,61,0.5)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>{p.example}</div>
        </div>
      ))}
      {parts && parts.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
          <div style={{ background: C.amber, color: C.navy, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{p.label}</div>
            <div style={{ fontSize: 13, color: "rgba(30,45,61,0.65)", lineHeight: 1.6 }}>{p.description}</div>
          </div>
        </div>
      ))}
      {lockList && (
        <div style={{ marginBottom: 4 }}>
          {lockList.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
              <div style={{ color: C.amber, fontSize: 16, flexShrink: 0, marginTop: -1 }}>◎</div>
              <div style={{ fontSize: 14, color: C.navy, lineHeight: 1.6 }}>{item}</div>
            </div>
          ))}
        </div>
      )}
      {promptStructure && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(30,45,61,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Prompt structure</div>
          <div style={{ background: C.cream, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.navy, fontFamily: "monospace" }}>{promptStructure}</div>
          {promptExample && <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(30,45,61,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "10px 0 6px" }}>Example</div>
            <div style={{ background: C.cream, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: C.navy, fontFamily: "monospace", lineHeight: 1.6 }}>{promptExample}</div>
          </>}
        </div>
      )}
      {tips && (
        <div style={{ marginBottom: 4 }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
              <div style={{ color: C.amber, fontSize: 12, marginTop: 3, flexShrink: 0 }}>→</div>
              <div style={{ fontSize: 13, color: "rgba(30,45,61,0.7)", lineHeight: 1.6 }}>{t}</div>
            </div>
          ))}
        </div>
      )}
      {schedule && (
        <div style={{ marginBottom: tools ? 10 : 4 }}>
          {schedule.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "center" }}>
              <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: C.navy, flexShrink: 0 }}>{s.day}</div>
              <div style={{ fontSize: 13, color: "rgba(30,45,61,0.65)" }}>{s.type}</div>
            </div>
          ))}
          {tools && <div style={{ marginTop: 10, fontSize: 13, color: "rgba(30,45,61,0.5)", fontStyle: "italic" }}>{tools}</div>}
        </div>
      )}
      {stat && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, color: C.amber, lineHeight: 1 }}>{stat}</div>
          <div style={{ fontSize: 13, color: "rgba(30,45,61,0.5)", marginTop: 4 }}>{statLabel}</div>
        </div>
      )}
      {final && (
        <div style={{ background: C.navy, borderRadius: 10, padding: "16px", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 18, marginBottom: 4 }}>Go introduce yourself. ✦</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Your readers are out there looking for you right now.<br />They just don&apos;t know your name yet.</div>
        </div>
      )}
      {!noPrompt && prompt && <AIHelper prompt={prompt} outputLabel={outputLabel ?? ""} />}
    </div>
  );
}

export default function AuthorContentGuide() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", background: C.cream, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,400&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        a { color: inherit; }
      `}</style>
      <div style={{ background: C.navy, padding: "24px 20px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>A Guide by Andrea Bonilla · AuthorDash</div>
        <div style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: 26, lineHeight: 1.2, marginBottom: 8 }}>The Reader You&apos;re Writing For</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, maxWidth: 480 }}>You are not here to sell your book. You&apos;re here to find your people — and make them feel seen before they ever open a page.</div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>10 steps</div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>AI prompts included</div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Works with any AI</div>
        </div>
      </div>
      <div style={{ padding: "16px 16px 40px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 14,
          border: "1px solid rgba(30,45,61,0.07)",
          borderLeft: "3px solid #E9A020",
        }}>
          <p style={{
            fontSize: 14,
            color: "rgba(30,45,61,0.7)",
            lineHeight: 1.75,
            margin: 0,
            fontStyle: "italic",
          }}>
            The work you do in these 10 steps doesn&apos;t just build a content strategy. It gives you the foundation for every email you write, every social post, every newsletter, every piece of copy — because it all starts with knowing exactly who you&apos;re writing for.
          </p>
        </div>
        {STEPS.map((step, i) => <Step key={i} step={step} />)}
      </div>
      <div style={{ textAlign: "center", padding: "20px 20px 40px", fontSize: 12, color: "rgba(30,45,61,0.35)", lineHeight: 1.8 }}>
        A guide by Andrea Bonilla · AuthorDash · April 2026<br />
        Built with <a href="https://authordash.io" target="_blank" style={{ color: C.amber, textDecoration: "none", fontWeight: 600 }}>AuthorDash</a>
      </div>
    </div>
  );
}
