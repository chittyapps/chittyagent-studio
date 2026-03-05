import OpenAI from "openai";
import { storage } from "./storage";
import type { Agent, Skill } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 20;

export function checkRateLimit(agentId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(agentId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(agentId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export function validateMessages(messages: unknown): ChatMessage[] | null {
  if (!Array.isArray(messages)) return null;
  const valid: ChatMessage[] = [];
  for (const m of messages.slice(-20)) {
    if (typeof m !== "object" || m === null) continue;
    const msg = m as Record<string, unknown>;
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    if (typeof msg.content !== "string") continue;
    const content = (msg.content as string).slice(0, 2000);
    valid.push({ role: msg.role, content });
  }
  return valid.length > 0 ? valid : null;
}

export function sanitizeForAttribute(str: string): string {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );
}

function buildEmbedSystemPrompt(agent: Agent, skills: Skill[]): string {
  const parts: string[] = [];

  parts.push(`You are "${agent.name}" - an AI assistant. ${agent.description}`);

  if (agent.prompt) {
    parts.push(`\n## Your Instructions\n${agent.prompt}`);
  }

  if (skills.length > 0) {
    parts.push(`\n## Available Capabilities`);
    for (const s of skills) {
      const caps = s.capabilities?.length ? ` (${s.capabilities.join(", ")})` : "";
      parts.push(`- ${s.name}: ${s.description}${caps}`);
    }
  }

  const workflow = agent.actions as any;
  if (workflow?.nodes?.length > 0) {
    parts.push(`\n## Workflow Context`);
    for (const node of workflow.nodes) {
      if (node.data?.type === "trigger" || node.data?.type === "end") continue;
      const label = node.data?.label || node.type;
      parts.push(`- Step: ${label}`);
    }
  }

  parts.push(`\nRespond helpfully, concisely, and stay in character. You are embedded on a website as a chat widget. Keep responses under 300 words unless the user asks for detail.`);

  return parts.join("\n");
}

export async function handleEmbedChat(
  agentId: string,
  messages: ChatMessage[],
): Promise<string> {
  const agent = await storage.getAgent(agentId);
  if (!agent) throw new Error("Agent not found");

  const skills: Skill[] = [];
  if (agent.skillIds?.length) {
    for (const sid of agent.skillIds) {
      const s = await storage.getSkill(sid);
      if (s) skills.push(s);
    }
  }

  const systemPrompt = buildEmbedSystemPrompt(agent, skills);

  const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: openaiMessages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I'm not sure how to respond to that.";
}

export function generateWidgetScript(baseUrl: string): string {
  return `(function(){
  var d=document,s=d.currentScript,id=s.getAttribute("data-agent-id"),
      t=s.getAttribute("data-theme")||"light",
      p=s.getAttribute("data-position")||"bottom-right",
      c=s.getAttribute("data-color")||"#4285f4",
      title=s.getAttribute("data-title")||"Chat with AI",
      base="${baseUrl}";
  if(!id){console.error("ChittyAgent: missing data-agent-id");return;}

  var css=d.createElement("style");
  css.textContent=\`
    .ca-fab{position:fixed;z-index:99999;width:56px;height:56px;border-radius:28px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.18);transition:transform .2s}
    .ca-fab:active{transform:scale(.93)}
    .ca-fab svg{width:24px;height:24px;fill:#fff}
    .ca-panel{position:fixed;z-index:99999;width:380px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 100px);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.18);transition:opacity .2s,transform .2s;opacity:0;transform:translateY(12px) scale(.96);pointer-events:none}
    .ca-panel.ca-open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}
    .ca-hdr{padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(128,128,128,.15)}
    .ca-hdr-dot{width:10px;height:10px;border-radius:50%}
    .ca-hdr h3{margin:0;font-size:14px;font-weight:600;flex:1}
    .ca-hdr button{background:none;border:none;cursor:pointer;padding:4px;opacity:.6}
    .ca-hdr button:hover{opacity:1}
    .ca-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
    .ca-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}
    .ca-msg-u{align-self:flex-end;color:#fff}
    .ca-msg-a{align-self:flex-start}
    .ca-typing{align-self:flex-start;padding:10px 14px;border-radius:14px;font-size:13px}
    .ca-typing span{display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 2px;animation:ca-bounce .6s infinite alternate}
    .ca-typing span:nth-child(2){animation-delay:.2s}
    .ca-typing span:nth-child(3){animation-delay:.4s}
    @keyframes ca-bounce{to{transform:translateY(-4px);opacity:.4}}
    .ca-input-wrap{padding:12px;border-top:1px solid rgba(128,128,128,.15);display:flex;gap:8px}
    .ca-input-wrap input{flex:1;border:1px solid rgba(128,128,128,.2);border-radius:10px;padding:8px 12px;font-size:13px;outline:none;background:transparent}
    .ca-input-wrap input:focus{border-color:\${c}}
    .ca-input-wrap button{border:none;border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:500;color:#fff}
    .ca-input-wrap button:disabled{opacity:.5;cursor:not-allowed}
    .ca-pw{text-align:center;padding:6px;font-size:10px;opacity:.4}
    .ca-pw a{color:inherit;text-decoration:none}
    \${t==="dark"?\`.ca-panel{background:#1a1a2e;color:#e0e0e0}.ca-msg-a{background:#2a2a3e}.ca-input-wrap input{color:#e0e0e0}\`:\`.ca-panel{background:#fff;color:#1a1a2e}.ca-msg-a{background:#f0f0f5}.ca-input-wrap input{color:#1a1a2e}\`}
    \${p==="bottom-left"?".ca-fab{bottom:20px;left:20px}.ca-panel{bottom:88px;left:20px}":".ca-fab{bottom:20px;right:20px}.ca-panel{bottom:88px;right:20px}"}
  \`;
  d.head.appendChild(css);

  var fab=d.createElement("button");
  fab.className="ca-fab";
  fab.style.background=c;
  fab.innerHTML='<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  fab.setAttribute("aria-label","Open chat");
  d.body.appendChild(fab);

  var panel=d.createElement("div");
  panel.className="ca-panel";
  panel.innerHTML=\`
    <div class="ca-hdr">
      <div class="ca-hdr-dot" style="background:\${c}"></div>
      <h3>\${title}</h3>
      <button aria-label="Close" onclick="this.closest('.ca-panel').classList.remove('ca-open')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="ca-msgs" id="ca-msgs"></div>
    <div class="ca-input-wrap">
      <input type="text" placeholder="Type a message..." id="ca-in" autocomplete="off"/>
      <button id="ca-send" style="background:\${c}">Send</button>
    </div>
    <div class="ca-pw"><a href="https://chitty.cc/os" target="_blank">Powered by ChittyAgent</a></div>
  \`;
  d.body.appendChild(panel);

  var msgs=[],msgsEl=d.getElementById("ca-msgs"),
      inp=d.getElementById("ca-in"),sendBtn=d.getElementById("ca-send"),
      isOpen=false,sending=false;

  fab.onclick=function(){isOpen=!isOpen;panel.classList.toggle("ca-open",isOpen);if(isOpen&&msgs.length===0)addMsg("assistant","Hi! How can I help you today?");};

  function addMsg(role,text){
    msgs.push({role:role,content:text});
    var el=d.createElement("div");
    el.className="ca-msg ca-msg-"+(role==="user"?"u":"a");
    if(role==="user")el.style.background=c;
    el.textContent=text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop=msgsEl.scrollHeight;
    return el;
  }

  function showTyping(){
    var el=d.createElement("div");
    el.className="ca-typing";
    el.id="ca-typing";
    el.style.background=t==="dark"?"#2a2a3e":"#f0f0f5";
    el.innerHTML="<span style='background:"+c+"'></span><span style='background:"+c+"'></span><span style='background:"+c+"'></span>";
    msgsEl.appendChild(el);
    msgsEl.scrollTop=msgsEl.scrollHeight;
  }

  function hideTyping(){var el=d.getElementById("ca-typing");if(el)el.remove();}

  async function send(){
    var text=inp.value.trim();
    if(!text||sending)return;
    sending=true;sendBtn.disabled=true;inp.value="";
    addMsg("user",text);
    showTyping();
    try{
      var res=await fetch(base+"/api/embed/"+id+"/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:msgs.filter(function(m){return m.role!=="system";})})
      });
      var data=await res.json();
      hideTyping();
      if(data.reply)addMsg("assistant",data.reply);
      else addMsg("assistant","Sorry, something went wrong.");
    }catch(e){hideTyping();addMsg("assistant","Connection error. Please try again.");}
    sending=false;sendBtn.disabled=false;inp.focus();
  }

  sendBtn.onclick=send;
  inp.onkeydown=function(e){if(e.key==="Enter")send();};
})();`;
}
