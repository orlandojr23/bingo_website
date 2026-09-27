const BINNY_SYSTEM_PROMPT = `You are Binny, the friendly in-app assistant for Bin'Go — the Smart Waste Collection system for Barangay Tejero. You are a warm, patient neighbor-friend (silingan): welcoming, plain-spoken, and dependable.

Personality:
- Friendly first: greet warmly, keep it light. A little Bisaya warmth like "Kumusta!" is welcome when it fits, but always stay easy to understand.
- Reliable above all: never guess or invent facts. If you don't know, say so honestly and point to where the truth lives in the app.
- Concise: short answers, simple words, no jargon. At most one emoji per reply, only when it adds warmth.

Scope — ONLY answer topics relevant to this app and project:
- Waste segregation (Malata, Recyclable, Dili Malata/residual, Special/Hazardous)
- Collection schedules, truck tracking, missed pickups
- Filing and following up on reports in the Report tab
- Navigating the Bin'Go app (Map, Schedule, Report tabs)
- Barangay Tejero waste rules covered in the app guide

If the user asks something off-topic or outside this scope (homework, coding, general trivia, other barangays, politics, etc.), politely decline to answer in detail and redirect: briefly say you only help with Bin'Go waste and collection questions, then suggest one relevant thing they can ask instead.

Facts you know (never contradict these):
- Malata (biodegradable): leftover food and rice, fruit and vegetable peelings, eggshells, coffee grounds and tea bags, leaves and yard trimmings.
- Recyclable: plastic (PET) bottles, glass bottles and jars, tin and aluminum cans, cardboard and paper, clean metal scraps.
- Dili Malata (residual): dirty plastic sachets and wrappers, styrofoam containers, diapers and sanitary products, used tissue and napkins, broken ceramics and glass.
- Special/Hazardous: batteries, electronics, bulbs — require special drop-off, do not mix with regular waste.
- Users track the garbage truck live in the Map tab.
- Users report uncollected waste or overflowing bins in the Report tab.
- Users see their collection days in the Schedule tab.

Guidelines:
- Never estimate truck arrival times — tell them to check the Map tab for the live truck or the Schedule tab for their day.
- For complaints about uncollected waste, sympathize briefly, then guide them to file a report in the Report tab so the crew sees it.
- Be concise, smart, and sensible: answer in 1–2 short sentences, max ~45 words. No long paragraphs, no lists, no filler. Only give steps if the user explicitly asks how to do something, and then keep it to 3 very brief steps max.
- Get to the point in the first sentence. Every sentence must add useful meaning.
- Write in clean, professional plain text only: no markdown, no asterisks, no **bold**, no hashtags, no backticks, no bullet symbols. Use simple sentences, not formatted lists.
`;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function toPromptText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((m) => {
      const role = m?.role === 'assistant' ? 'assistant' : 'user';
      const content = toPromptText(m?.content ?? m?.parts).trim();
      if (!content) return null;
      return { role, content: content.slice(0, 2000) };
    })
    .filter(Boolean)
    .slice(-12);
}

function cleanReply(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)\*(?=\S)/g, '$1')
    .replace(/`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

function faqReply(text) {
  const t = String(text || '').toLowerCase();
  const has = (...words) => words.some((w) => t.includes(w));

  if (has('malata') && !has('dili', 'di malata', 'residual')) {
    return 'Malata means biodegradable. Put leftover food and rice, fruit and vegetable peelings, eggshells, coffee grounds and tea bags, plus leaves and yard trimmings.';
  }
  if (has('dili malata', 'di malata', 'residual')) {
    return 'Dili Malata means residual. Put dirty sachets and wrappers, styrofoam, diapers and sanitary products, used tissue, plus broken ceramics and glass.';
  }
  if (has('recycl')) {
    return 'Recyclable means clean and dry. Put PET bottles, glass jars, tin and aluminum cans, plus cardboard and paper.';
  }
  if (has('hazard', 'battery', 'batteries', 'electronic', 'bulb', 'special')) {
    return 'Special waste needs special drop-off. Keep batteries, electronics, and bulbs separate and never mix them with regular waste.';
  }
  if (has('collection day', 'pickup', 'pick up', 'schedule', 'when will', 'what day', 'what time', 'arrival', 'truck')) {
    return 'I cannot give an exact time. Please check your day in the Schedule tab and watch the live truck in the Map tab.';
  }
  if (has('report', 'overflowing', 'overflow', 'missed', 'uncollected', 'not collected', 'complaint')) {
    return 'To report, open the Report tab, describe the problem and location, then submit so the crew sees it.';
  }
  if (has('where', 'how to use', 'how do i use', 'navigate', 'map tab', 'schedule tab', 'report tab')) {
    return 'Use the Map tab to track the truck, the Schedule tab for your day, and the Report tab to report a problem.';
  }
  return null;
}

export async function POST(req) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Oops! I'm taking a quick nap because my Groq key isn't set up yet. Please ask the admin to set GROQ_API_KEY in the environment variables.",
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Please send a message first.' }, { status: 400 });
  }

  const history = normalizeMessages(body?.messages);
  if (history.length === 0) {
    return Response.json({ error: 'Please type a question for Binny first.' }, { status: 400 });
  }

  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const direct = faqReply(lastUser?.content);
  if (direct) {
    return Response.json({ reply: direct });
  }

  const model = (process.env.GROQ_MODEL || 'openai/gpt-oss-20b').trim();

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: BINNY_SYSTEM_PROMPT }, ...history],
        temperature: 0.4,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.error?.message || errJson?.error?.code || '';
      } catch {
        try {
          detail = (await res.text()).slice(0, 200);
        } catch {
          detail = '';
        }
      }
      console.error('Groq chat error:', res.status, detail);
      if (res.status === 401) {
        return Response.json(
          { error: "Binny can't connect right now (invalid API key). Please tell the admin to check GROQ_API_KEY." },
          { status: 500 }
        );
      }
      if (res.status === 429) {
        return Response.json(
          { error: 'Binny is a bit busy right now. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      if (res.status === 404) {
        return Response.json(
          {
            error: `Binny's model "${model}" was not found (404). Please set GROQ_MODEL to a current Groq model like openai/gpt-oss-20b or llama-3.1-8b-instant.${detail ? ` Detail: ${String(detail).slice(0, 120)}` : ''}`,
          },
          { status: 500 }
        );
      }
      return Response.json(
        {
          error: detail
            ? `Binny got error ${res.status} from Groq: ${String(detail).slice(0, 160)}`
            : 'Something went wrong getting Binny’s reply. Please try again.',
        },
        { status: 500 }
      );
    }

    const data = await res.json();
    const reply = cleanReply(data?.choices?.[0]?.message?.content);
    if (!reply) {
      return Response.json({ error: 'Binny came back empty-handed. Please try again.' }, { status: 500 });
    }

    return Response.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return Response.json(
      { error: 'Something went wrong processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
