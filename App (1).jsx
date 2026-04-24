import { useState, useRef } from "react";

const TABS = ["news", "humanizer"];

// ── helpers ──────────────────────────────────────────────────────────────────
async function callClaude(messages, systemPrompt) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: systemPrompt,
            messages,
        }),
    });
    const data = await res.json();
    return data.content?.find((b) => b.type === "text")?.text ?? "";
}

// ── News Checker ──────────────────────────────────────────────────────────────
function NewsChecker() {
    const [url, setUrl] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function analyze() {
        if (!url.trim()) return;
        setLoading(true);
        setResult(null);
        setError("");

        const system = `You are a professional fact-checking AI. When given a news URL, analyze:
1. SOURCE CREDIBILITY: Evaluate the domain's reputation (0-100 trust score).
2. CONTENT ANALYSIS: Based on the URL and domain, assess likely reliability.
3. VERDICT: Is this likely reliable, questionable, or unreliable?
4. CORRECT SOURCE: If questionable/unreliable, suggest the correct authoritative source.

Respond ONLY with this exact JSON (no markdown fences):
{
  "trustScore": <number 0-100>,
  "domain": "<extracted domain>",
  "sourceVerdict": "reliable|questionable|unreliable",
  "sourceReason": "<one sentence about the source>",
  "contentVerdict": "likely_true|needs_verification|likely_false",
  "contentReason": "<one sentence about the content>",
  "imageTextMatch": "consistent|inconsistent|unknown",
  "imageNote": "<brief note about image-text consistency>",
  "correctSource": "<URL or name of authoritative source if content is false, else null>",
  "summary": "<2 sentence overall assessment>"
}`;

        try {
            const raw = await callClaude(
                [{ role: "user", content: `Analyze this news URL: ${url}` }],
                system
            );
            const parsed = JSON.parse(raw);
            setResult(parsed);
        } catch {
            setError("Analysis failed. Please check the URL and try again.");
        } finally {
            setLoading(false);
        }
    }

    const scoreColor = (s) =>
        s >= 70 ? "#00e5a0" : s >= 40 ? "#f5a623" : "#ff4d6d";

    const verdictBadge = (v, map) => {
        const cfg = {
            reliable: { label: "Reliable ✓", bg: "#00e5a020", border: "#00e5a0" },
            questionable: { label: "Questionable ⚠", bg: "#f5a62320", border: "#f5a623" },
            unreliable: { label: "Unreliable ✗", bg: "#ff4d6d20", border: "#ff4d6d" },
            likely_true: { label: "Likely True ✓", bg: "#00e5a020", border: "#00e5a0" },
            needs_verification: { label: "Needs Verification ⚠", bg: "#f5a62320", border: "#f5a623" },
            likely_false: { label: "Likely False ✗", bg: "#ff4d6d20", border: "#ff4d6d" },
            consistent: { label: "Consistent ✓", bg: "#00e5a020", border: "#00e5a0" },
            inconsistent: { label: "Inconsistent ✗", bg: "#ff4d6d20", border: "#ff4d6d" },
            unknown: { label: "Unknown —", bg: "#88889920", border: "#888899" },
        }[v] ?? { label: v, bg: "#88889920", border: "#888899" };
        return (
            <span
                style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    color: cfg.border,
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                }}
            >
                {cfg.label}
            </span>
        );
    };

    const teamMessage = result
        ? `[FACT-CHECK REPORT]\nURL: ${url}\nDomain: ${result.domain}\nTrust Score: ${result.trustScore}/100\nSource: ${result.sourceVerdict} — ${result.sourceReason}\nContent: ${result.contentVerdict} — ${result.contentReason}\nImage/Text: ${result.imageTextMatch} — ${result.imageNote}\nSummary: ${result.summary}${result.correctSource ? `\n\n✅ Correct Source: ${result.correctSource}` : ""}`
        : "";

    return (
        <div>
            <p style={{ color: "#9999bb", marginBottom: 24, lineHeight: 1.6 }}>
                Paste a news article URL to verify its credibility, detect image-text
                inconsistencies, and get the correct source if needed.
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && analyze()}
                    placeholder="https://example.com/news-article..."
                    style={{
                        flex: 1,
                        background: "#12122a",
                        border: "1px solid #2a2a4a",
                        borderRadius: 10,
                        color: "#fff",
                        padding: "12px 16px",
                        fontSize: 14,
                        outline: "none",
                    }}
                />
                <button
                    onClick={analyze}
                    disabled={loading}
                    style={{
                        background: loading ? "#2a2a4a" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px 24px",
                        fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: 14,
                        whiteSpace: "nowrap",
                    }}
                >
                    {loading ? "Analyzing…" : "Analyze →"}
                </button>
            </div>

            {error && (
                <div style={{ color: "#ff4d6d", background: "#ff4d6d15", border: "1px solid #ff4d6d33", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14 }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Trust score */}
                    <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ color: "#9999bb", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Trust Score</span>
                            <span style={{ fontSize: 32, fontWeight: 900, color: scoreColor(result.trustScore) }}>
                                {result.trustScore}<span style={{ fontSize: 16, color: "#9999bb" }}>/100</span>
                            </span>
                        </div>
                        <div style={{ background: "#1e1e3a", borderRadius: 99, height: 8, overflow: "hidden" }}>
                            <div style={{ width: `${result.trustScore}%`, height: "100%", background: `linear-gradient(90deg, ${scoreColor(result.trustScore)}, ${scoreColor(result.trustScore)}88)`, borderRadius: 99, transition: "width 0.8s ease" }} />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#9999bb" }}>Domain: <span style={{ color: "#c4c4ff" }}>{result.domain}</span></div>
                    </div>

                    {/* Three cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[
                            { label: "Source", verdict: result.sourceVerdict, reason: result.sourceReason },
                            { label: "Content", verdict: result.contentVerdict, reason: result.contentReason },
                            { label: "Image / Text", verdict: result.imageTextMatch, reason: result.imageNote },
                        ].map((c) => (
                            <div key={c.label} style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 12, padding: 16 }}>
                                <div style={{ color: "#9999bb", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
                                {verdictBadge(c.verdict)}
                                <p style={{ color: "#c4c4ff", fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{c.reason}</p>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 12, padding: 16 }}>
                        <div style={{ color: "#9999bb", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Assessment</div>
                        <p style={{ color: "#e0e0ff", lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
                    </div>

                    {/* Correct source */}
                    {result.correctSource && (
                        <div style={{ background: "#00e5a010", border: "1px solid #00e5a033", borderRadius: 12, padding: 16 }}>
                            <div style={{ color: "#00e5a0", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>✅ Verified Correct Source</div>
                            <a href={result.correctSource} target="_blank" rel="noreferrer" style={{ color: "#7c8eff", fontSize: 13 }}>{result.correctSource}</a>
                        </div>
                    )}

                    {/* Team message */}
                    <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 12, padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ color: "#9999bb", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Ready-to-send Team Report</span>
                            <button
                                onClick={() => navigator.clipboard.writeText(teamMessage)}
                                style={{ background: "#2a2a4a", border: "none", color: "#c4c4ff", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                            >
                                Copy
                            </button>
                        </div>
                        <pre style={{ color: "#c4c4ff", fontSize: 12, whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{teamMessage}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── AI Humanizer ──────────────────────────────────────────────────────────────
function AIHumanizer() {
    const [text, setText] = useState("");
    const [aiPct, setAiPct] = useState(null);
    const [targetPct, setTargetPct] = useState(20);
    const [humanized, setHumanized] = useState("");
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState("idle"); // idle | detected | humanized

    async function detect() {
        if (!text.trim()) return;
        setLoading(true);
        setPhase("idle");
        setHumanized("");

        const system = `You are an AI text detector. Analyze the given text and estimate what percentage was written by AI vs human.
Respond ONLY with this JSON (no markdown):
{"aiPercentage": <0-100>, "humanPercentage": <0-100>, "signals": ["<signal1>","<signal2>","<signal3>"]}`;

        try {
            const raw = await callClaude([{ role: "user", content: `Detect AI percentage in:\n\n${text}` }], system);
            const parsed = JSON.parse(raw);
            setAiPct(parsed.aiPercentage);
            setTargetPct(Math.max(5, parsed.aiPercentage - 50));
            setPhase("detected");
        } catch {
            setAiPct(50);
            setPhase("detected");
        } finally {
            setLoading(false);
        }
    }

    async function humanize() {
        setLoading(true);
        const system = `You are a text humanizer. Rewrite the given text so that it appears ${targetPct}% AI-generated and ${100 - targetPct}% human-written.
Rules:
- Keep the exact same meaning and information
- Adjust vocabulary, sentence rhythm, and style to match the target AI percentage
- Lower AI % = more casual, varied sentence lengths, occasional colloquialisms, minor imperfections
- Higher AI % = more formal, consistent structure, precise language
- Do NOT add commentary — return ONLY the rewritten text.`;

        try {
            const result = await callClaude(
                [{ role: "user", content: `Rewrite this text to be ${targetPct}% AI:\n\n${text}` }],
                system
            );
            setHumanized(result);
            setPhase("humanized");
        } finally {
            setLoading(false);
        }
    }

    const barColor = (p) => (p <= 30 ? "#00e5a0" : p <= 60 ? "#f5a623" : "#ff4d6d");

    return (
        <div>
            <p style={{ color: "#9999bb", marginBottom: 24, lineHeight: 1.6 }}>
                Detect how much of your text was written by AI, then use the slider to
                adjust and rewrite it to your desired human-AI balance.
            </p>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your article or text here…"
                rows={7}
                style={{
                    width: "100%",
                    background: "#12122a",
                    border: "1px solid #2a2a4a",
                    borderRadius: 10,
                    color: "#fff",
                    padding: "14px 16px",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                }}
            />

            <button
                onClick={detect}
                disabled={loading || !text.trim()}
                style={{
                    marginTop: 10,
                    background: loading ? "#2a2a4a" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 28px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 14,
                }}
            >
                {loading && phase === "idle" ? "Detecting…" : "Detect AI %"}
            </button>

            {phase !== "idle" && aiPct !== null && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Gauge */}
                    <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ color: "#9999bb", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Detected AI Content</span>
                            <span style={{ fontSize: 28, fontWeight: 900, color: barColor(aiPct) }}>{aiPct}%</span>
                        </div>
                        <div style={{ background: "#1e1e3a", borderRadius: 99, height: 10, overflow: "hidden" }}>
                            <div style={{ width: `${aiPct}%`, height: "100%", background: `linear-gradient(90deg,${barColor(aiPct)},${barColor(aiPct)}88)`, borderRadius: 99, transition: "width 0.8s" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                            <span style={{ color: "#00e5a0", fontSize: 12 }}>🧑 Human {100 - aiPct}%</span>
                            <span style={{ color: "#ff4d6d", fontSize: 12 }}>🤖 AI {aiPct}%</span>
                        </div>
                    </div>

                    {/* Slider */}
                    <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <span style={{ color: "#9999bb", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Target AI Percentage</span>
                            <span style={{ fontSize: 22, fontWeight: 900, color: barColor(targetPct) }}>{targetPct}%</span>
                        </div>
                        <input
                            type="range"
                            min={5}
                            max={95}
                            value={targetPct}
                            onChange={(e) => setTargetPct(Number(e.target.value))}
                            style={{ width: "100%", accentColor: barColor(targetPct) }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ color: "#00e5a0", fontSize: 12 }}>5% — Very Human</span>
                            <span style={{ color: "#ff4d6d", fontSize: 12 }}>95% — Very AI</span>
                        </div>
                        <button
                            onClick={humanize}
                            disabled={loading}
                            style={{
                                marginTop: 14,
                                width: "100%",
                                background: loading ? "#2a2a4a" : "linear-gradient(135deg,#00e5a0,#0099ff)",
                                color: loading ? "#9999bb" : "#001a0f",
                                border: "none",
                                borderRadius: 10,
                                padding: "12px",
                                fontWeight: 800,
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: 14,
                            }}
                        >
                            {loading ? "Rewriting…" : `✨ Rewrite to ${targetPct}% AI`}
                        </button>
                    </div>

                    {/* Result */}
                    {phase === "humanized" && humanized && (
                        <div style={{ background: "#12122a", border: "1px solid #00e5a033", borderRadius: 14, padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <span style={{ color: "#00e5a0", fontSize: 13, fontWeight: 700 }}>✅ Rewritten Text ({targetPct}% AI)</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(humanized)}
                                    style={{ background: "#2a2a4a", border: "none", color: "#c4c4ff", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                                >
                                    Copy
                                </button>
                            </div>
                            <p style={{ color: "#e0e0ff", lineHeight: 1.7, margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{humanized}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
    const [tab, setTab] = useState("news");

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#fff", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "0 0 60px" }}>
            {/* Header */}
            <div style={{ borderBottom: "1px solid #1a1a2e", padding: "24px 0 0", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "#7c3aed", textTransform: "uppercase", marginBottom: 8 }}>
                    AI-Powered
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px", background: "linear-gradient(135deg,#fff,#9999cc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    TruthLens
                </h1>
                <p style={{ color: "#9999bb", fontSize: 14, margin: "0 0 20px" }}>
                    Fake News Detector & AI Text Humanizer
                </p>
                {/* Tabs */}
                <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
                    {[
                        { id: "news", label: "🔍 News Checker" },
                        { id: "humanizer", label: "🤖 AI Humanizer" },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                background: tab === t.id ? "#1e1e3a" : "transparent",
                                border: "none",
                                borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
                                color: tab === t.id ? "#fff" : "#9999bb",
                                padding: "12px 28px",
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: tab === t.id ? 700 : 400,
                                transition: "all 0.2s",
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 0" }}>
                {tab === "news" ? <NewsChecker /> : <AIHumanizer />}
            </div>
        </div>
    );
}
