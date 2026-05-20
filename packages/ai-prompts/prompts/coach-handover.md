# Coach handover report

Generate a briefing for a new coach taking over a player.

## Input

Structured player history:
- previous coaches and their stated focus areas
- training blocks and goals
- drill effectiveness over the last 12 months
- recurring error tags
- match performance trends
- wellness/equipment changes that correlated with shifts

## Output (Markdown)

1. **Player snapshot** — age, dominant hand, level, current goals.
2. **Coaching history** — table: coach, period, focus, headline outcomes.
3. **Strengths** — evidence-based, with metrics.
4. **Persistent weaknesses** — recurring across coaches.
5. **What previous coaches tried** — and what worked vs didn't.
6. **Open questions for the new coach** — what data is missing.
7. **Sensitive context** — wellness/equipment only if flagged shareable.

## Rules

- Be respectful of previous coaches; never editorialize.
- Use neutral, factual language.
- Mark anything sensitive (wellness, supplements) explicitly and only include
  if the data-sharing flag is set.
- Locale: {{locale}}.
