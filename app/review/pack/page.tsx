import { notFound } from "next/navigation";

const facts = [["Job date", "Saturday, 10 October 2026 (date only)"], ["Arrival", "3:30 pm"], ["Bump-in", "4:00 pm"], ["Soundcheck", "5:30 pm"], ["Event", "7:00 pm to 11:00 pm"], ["Venue", "Perth Town Hall"], ["On-day contact", "Alex Morgan · 0400 000 000"]];

export default function LocalPackReviewPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES !== "1") notFound();

  return <main className="job-pack">
    <p className="eyebrow">Timbre Ops · Job pack</p><h1>Mad Hatters Gala and Awards Presentation</h1><p className="pack-generated">Review fixture generated 28 September 2026. Isolated local data.</p>
    <section><h2>Brief and intent</h2><p>Speech, awards playback, walk-up music and presentation laptop support for 420 guests. Keep FOH sightlines clear and retain a spare DI at control.</p></section>
    <section><h2>Schedule</h2><dl className="pack-facts">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section><h2>Venue and access</h2><p><strong>Access:</strong> Service lane from Hay Street. Confirm lift dimensions before truck departure.</p><p><strong>FOH:</strong> Rear centre, 18 m multicore run. Protect public crossing with cable ramp.</p></section>
    <section><h2>Technical details</h2><p>Two lectern microphones, awards playback, presentation laptop, confidence monitor and stereo house feed. Wireless coordination remains outstanding.</p></section>
    <section><h2>Pack checklist</h2><table><thead><tr><th>Item</th><th>Planned</th><th>Packed</th><th>Out</th><th>Returned</th></tr></thead><tbody><tr><td>DI box</td><td>3</td><td>3</td><td>0</td><td>0</td></tr><tr><td>Lectern microphone</td><td>2</td><td>2</td><td>0</td><td>0</td></tr><tr><td>Presentation laptop</td><td>1</td><td>1</td><td>0</td><td>0</td></tr></tbody></table></section>
    <section><h2>Outstanding questions</h2><ul><li>Confirm service lift dimensions and access window.</li><li>Client to supply final awards playback by Thursday.</li></ul></section>
    <section><h2>Plans and attachments</h2><ul><li>Perth-Town-Hall-stage-plot-v4-final.pdf · Stage plot · uploaded 28 Sep 2026</li><li>Gmail production thread · external reference only, not synchronised</li></ul></section>
    <section className="plan-page"><h2>Stage plot</h2><div className="fixture-plan"><strong>STAGE</strong><span>Lectern</span><span>Screen</span><span>Playback</span><span>FOH</span></div><p>Separate page generated from an actual stage-plot attachment record.</p></section>
    <button className="print-button" type="button">Print</button>
  </main>;
}
