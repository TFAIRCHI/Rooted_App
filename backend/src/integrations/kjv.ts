import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const books: Record<string,string> = {
  genesis:'GEN',exodus:'EXO',leviticus:'LEV',numbers:'NUM',deuteronomy:'DEU',joshua:'JOS',judges:'JDG',ruth:'RUT',
  '1 samuel':'1SA','2 samuel':'2SA','1 kings':'1KI','2 kings':'2KI','1 chronicles':'1CH','2 chronicles':'2CH',ezra:'EZR',nehemiah:'NEH',esther:'EST',job:'JOB',psalm:'PSA',psalms:'PSA',proverbs:'PRO',ecclesiastes:'ECC','song of songs':'SOL','song of solomon':'SOL',isaiah:'ISA',jeremiah:'JER',lamentations:'LAM',ezekiel:'EZE',daniel:'DAN',hosea:'HOS',joel:'JOE',amos:'AMO',obadiah:'OBA',jonah:'JON',micah:'MIC',nahum:'NAH',habakkuk:'HAB',zephaniah:'ZEP',haggai:'HAG',zechariah:'ZEC',malachi:'MAL',
  matthew:'MAT',mark:'MAR',luke:'LUK',john:'JOH',acts:'ACT',romans:'ROM','1 corinthians':'1CO','2 corinthians':'2CO',galatians:'GAL',ephesians:'EPH',philippians:'PHI',colossians:'COL','1 thessalonians':'1TH','2 thessalonians':'2TH','1 timothy':'1TI','2 timothy':'2TI',titus:'TIT',philemon:'PHM',hebrews:'HEB',james:'JAM','1 peter':'1PE','2 peter':'2PE','1 john':'1JO','2 john':'2JO','3 john':'3JO',jude:'JUD',revelation:'REV',
};
const sourceUrl=new URL('../../scripture/kjv-1769-vpl.txt',import.meta.url);
let verses:Map<string,string>|undefined;
function corpus(){
  if(verses)return verses;
  const raw=readFileSync(sourceUrl,'utf8');
  const digest=createHash('sha256').update(raw).digest('hex');
  if(digest!=='7f46250da578d6256d195475c4c94b3909665fc7712efaf1989a58c38bf3c69e')throw new Error('KJV corpus digest mismatch');
  const result=new Map<string,string>();
  for(const line of raw.split(/\r?\n/)){
    const match=/^([1-4]?[A-Z]{2,3}) (\d+):(\d+) (.+)$/.exec(line);
    if(match)result.set(`${match[1]}:${match[2]}:${match[3]}`,match[4]!.replace(/^¶\s*/,''));
  }
  verses=result;return result;
}
export interface KjvReading {reference:string;translation:'KJV';edition:'1769';source:'eBible/CrossWire eng-kjv';verses:{number:number;text:string}[];digest:string}
export function resolveKjv(reference:string):KjvReading|null {
  const match=/^(.+?)\s+(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?$/.exec(reference.trim());
  if(!match)return null;
  const book=books[match[1]!.toLowerCase().replace(/\s+/g,' ')];
  const chapter=Number(match[2]),first=Number(match[3]),last=Number(match[4]??match[3]);
  if(!book||chapter<1||first<1||last<first||last-first>29)return null;
  const text=corpus(),selected:{number:number;text:string}[]=[];
  for(let number=first;number<=last;number++){
    const verse=text.get(`${book}:${chapter}:${number}`);
    if(!verse)return null;
    selected.push({number,text:verse});
  }
  const canonical=`${match[1]!.replace(/\s+/g,' ')} ${chapter}:${first}${last===first?'':`-${last}`}`;
  return {reference:canonical,translation:'KJV',edition:'1769',source:'eBible/CrossWire eng-kjv',verses:selected,digest:createHash('sha256').update(JSON.stringify(selected)).digest('hex')};
}
