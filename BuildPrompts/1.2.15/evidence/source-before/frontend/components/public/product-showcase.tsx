"use client";

import Image from 'next/image';
import {useState} from 'react';

const tours = [
  {name:'For your members',label:'A little time. A shared direction.',intro:'Your church’s teaching, ready to come home. Members find their next study, spend time in Scripture, and carry a reflection into the day.',steps:[
    {name:'Find this week',image:'member-home',title:'A familiar place to begin.',text:'The church’s own space brings the week’s studies together. Members can see what’s available and choose their next moment in the Word.'},
    {name:'Read & reflect',image:'member-study',title:'Room to read. A reason to return.',text:'Open a study, read the passage and reflect on a practical response. The focus stays on Scripture and your church’s teaching.'},
  ]},
  {name:'For your church team',label:'One workspace. Your church’s voice.',intro:'Give contributors a clear place to prepare and administrators a clear view of the work. Keep the teaching, review and publishing journey together.',steps:[
    {name:'See the workspace',image:'team-dashboard',title:'Know what needs your attention.',text:'The real church workspace brings your teaching and study preparation into view, so the team can find the next piece of work.'},
    {name:'Review & share',image:'team-editor',title:'A clear path from preparation to publication.',text:'The study workspace keeps the date, approval and publication steps together, with a preview of the member experience alongside your work.'},
    {name:'Plan the week',image:'team-calendar',title:'Make space for a steady rhythm.',text:'See the study calendar and plan when members will engage. Your team reviews the content and decides what is ready to share.'},
  ]},
];

export function ProductShowcase(){
  const [audience,setAudience]=useState(0);
  const [step,setStep]=useState(0);
  const tour=tours[audience];const current=tour.steps[step];
  return <section className="section product-showcase" id="inside-rooted" aria-labelledby="showcase-heading"><div className="wrap">
    <div className="showcase-heading"><div><span className="eyebrow">TAKE A LOOK INSIDE</span><h2 id="showcase-heading">One church.<br/><em>Two thoughtful experiences.</em></h2></div><p>See the actual Rooted application, from a member’s next study to your team’s next step.</p></div>
    <div className="showcase-audiences" role="group" aria-label="Choose an application walkthrough">{tours.map((item,index)=><button key={item.name} type="button" aria-pressed={audience===index} onClick={()=>{setAudience(index);setStep(0);}}>{item.name}<span aria-hidden="true"> ↗</span></button>)}</div>
    <div className="showcase-layout"><div className="showcase-copy"><span className="eyebrow">{tour.label}</span><p>{tour.intro}</p><div className="showcase-steps" role="group" aria-label="Walkthrough steps">{tour.steps.map((item,index)=><button type="button" key={item.name} aria-pressed={step===index} onClick={()=>setStep(index)}><span>0{index+1}</span>{item.name}</button>)}</div><div aria-live="polite"><h3>{current.title}</h3><p>{current.text}</p></div><a className="text-link" href="/sample-study">Try the sample study →</a></div>
    <figure className="showcase-screen"><div className="showcase-browser" aria-hidden="true"><span>● ● ●</span><span>Rooted · {audience===0?'Member experience':'Church workspace'}</span></div><Image key={current.image} src={`/showcase/${current.image}.webp`} alt={`Actual Rooted application: ${current.name}, using fictional Grace Community Church demonstration data`} width={1360} height={960} sizes="(max-width: 800px) 100vw, 760px"/><figcaption>Actual application screens · Fictional demonstration church</figcaption></figure></div>
    <p className="showcase-note">Choose an audience and a step to explore. These screenshots show the working application with sample content; the sample study lets you try a reading experience without an account.</p>
  </div></section>;
}

export function ResearchHighlights(){return <aside className="research-highlights" aria-label="Bible engagement research"><div className="research-highlights-intro"><span className="eyebrow">THE RHYTHM BEHIND ROOTED</span><h2>Four days in the Word.<br/><em>Possibilities beyond Sunday.</em></h2><a className="text-link" href="#power-of-four">Why four days? ↓</a></div><div className="research-metrics"><div><strong>+416<span>%</span><sup><a href="#cbe-research-note" aria-label="See CBE research source">*</a></sup></strong><p>Higher reported odds of<br/>giving financially to a church</p></div><div><strong>+228<span>%</span><sup><a href="#cbe-research-note" aria-label="See CBE research source">*</a></sup></strong><p>Higher reported odds<br/>of sharing faith</p></div><div><strong>+231<span>%</span><sup><a href="#cbe-research-note" aria-label="See CBE research source">*</a></sup></strong><p>Higher reported odds<br/>of discipling others</p></div></div><p className="research-attendance">Keep the connection alive between Sundays. Help people stay close to your church’s teaching and make gathering again part of their week.</p><p className="research-highlights-note" id="cbe-research-note"><span aria-hidden="true">* </span>CBE research on Scripture engagement four or more days a week. Survey associations, not measured Rooted results or guaranteed outcomes. <a href="https://www.odbm.org/en/center-for-bible-engagement/blog/bible-engagement-and-the-power-of-4-a-key-to-spiritual-growth" target="_blank" rel="noopener noreferrer">Read the research ↗</a></p></aside>;}

export function RootedDifference(){return <section className="section rooted-difference" id="the-rooted-difference"><div className="wrap"><div className="difference-heading"><span className="eyebrow">PURPOSEFUL BY DESIGN</span><h2>More than something to watch.<br/><em>Something to carry into the week.</em></h2><p>Choose a discipleship tool around the life of your church. Rooted connects the teaching you already give with a rhythm your people can return to.</p></div><div className="difference-grid">{[
  ['01','Begin with your church’s teaching.','A library can broaden a perspective. Rooted helps your team build studies around the passage, sermon notes and direction you want your own people to explore.'],
  ['02','Give assistance a human direction.','Use the co-writer to help plan and draft, then edit, review and approve the work. Your team keeps responsibility for the teaching and what gets published.'],
  ['03','Connect preparation to participation.','A church workspace for the people preparing the studies. A focused reading experience for the people receiving them. One place to connect those parts of the week.'],
  ['04','Build a rhythm beyond the feed.','A shared study calendar, Scripture, reflection and practical responses give people a next step beyond watching or scrolling. Make room for engagement, at your church’s pace.'],
].map(([number,title,text])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div><a className="text-link" href="#inside-rooted">See how that looks in Rooted ↓</a></div></section>;}
