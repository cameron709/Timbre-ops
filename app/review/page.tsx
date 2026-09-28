import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Send } from "lucide-react";
import { notFound } from "next/navigation";
import { Pill, Section } from "@/components/ui";

export default function LocalReviewPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES !== "1") notFound();

  return <main className="page briefing-page review-fixture">
    <section className="briefing-hero">
      <div><p className="eyebrow">Monday, 28 September 2026</p><h1>Good evening, Cameron</h1><p className="lede">Isolated review data. Nothing on this page writes to Supabase.</p></div>
      <div className="assistant-box"><label htmlFor="fixture-assistant">What do you need?</label><div className="assistant-input-row"><input id="fixture-assistant" defaultValue="What did we learn from Mad Hatters?"/><button aria-label="Run command"><Send size={18}/></button></div><div className="assistant-memory"><strong>Keep a spare DI at FOH</strong><small>Technical · Mad Hatters</small></div><p className="assistant-result">Found 2 saved lessons. No records changed.</p></div>
    </section>
    <Section title="Needs You"><section className="review-panel"><p className="eyebrow">Attention 1 of 1</p><h2>Confirm loading-dock access</h2><p>The venue has not confirmed the service lift dimensions or access window.</p><label>Resolution / remaining follow-up<input defaultValue="Beth to call venue Tuesday morning"/></label><div className="review-actions"><button type="button">Mark reviewed</button></div></section></Section>
    <div className="briefing-columns">
      <Section title="Operations"><div className="compact-list"><div className="compact-row"><span><strong>Ezra Equipment Return</strong><small>Cameron · Tue, 29 Sep · all day</small></span><Pill>Open</Pill></div><div className="compact-row"><span><strong>Order a marquee</strong><small>Beth · Wed, 30 Sep · date only</small></span><Pill tone="warn">Waiting</Pill></div></div></Section>
      <Section title="Coming Up"><div className="compact-list"><div className="compact-row"><span><strong>Mad Hatters Gala and Awards Presentation With A Deliberately Long Event Name</strong><small>Sat, 10 Oct · Perth Town Hall</small></span><span className="readiness-number">83%</span></div></div></Section>
    </div>
    <section className="detail-layout">
      <div className="detail-section"><h2>Status gate</h2><div className="gate-warning"><strong>Ready To Pack is blocked</strong><span>Still needs: arrival or access, pack list</span><label>Override reason<textarea placeholder="Why is it operationally safe to proceed?"/></label></div></div>
      <div className="detail-section"><h2>Operation editor</h2><div className="form-grid two"><label>Owner<select defaultValue="Beth"><option>Beth</option><option>Cameron</option></select></label><label>Status<select defaultValue="waiting"><option value="open">Open</option><option value="waiting">Waiting</option><option value="done">Done</option></select></label><label>Due type<select defaultValue="date"><option value="none">No due date</option><option value="date">Date only</option><option value="timed">Date and time</option></select></label><label>Due date<input type="date" defaultValue="2026-09-30"/></label></div><label>Related job<select><option>Mad Hatters</option></select></label><label>Notes<textarea defaultValue="Confirm dimensions before ordering."/></label></div>
    </section>
    <section className="detail-layout">
      <div className="detail-section"><h2>Files</h2><div className="document-list"><div className="document-row"><FileText size={20}/><span><strong>Perth-Town-Hall-stage-plot-v4-final.pdf</strong><small>PDF · 2.4 MB · uploaded by Cameron · 28 Sep 2026</small></span><button aria-label="Remove file">×</button></div></div><p className="notice">Upload failed: file exceeds the configured storage limit.</p><small className="meta">Gmail links are external references; Gmail is not synchronised.</small></div>
      <div className="detail-section"><h2>State checks</h2><div className="clear-state"><CheckCircle2 size={20}/><div><strong>Empty state</strong><span>No unresolved questions remain.</span></div></div><div className="gate-warning"><AlertTriangle size={18}/><strong>Error state</strong><span>Could not load one attachment. Retry from the Files tab.</span></div></div>
    </section>
    <Link className="secondary-button review-pack-link" href="/review/pack">Preview printed job pack <ArrowRight size={16}/></Link>
  </main>;
}
