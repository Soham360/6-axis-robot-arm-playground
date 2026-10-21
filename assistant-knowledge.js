import {lessons} from './curriculum.js';
import {lessonDetails} from './lesson-details.js';
const ignored=new Set('a an and are as at be can do for from help how i in is it me my of on or please the this to what why with you your'.split(' '));
const aliases={code:'sketch programming',error:'debugging breakpoint unsupported',stuck:'troubleshoot debugging',print:'fabrication stl',arduino:'sketch programming',block:'blocks',move:'motion movement',robot:'arm',reach:'ik',collision:'planning fixture',save:'projects',grasp:'gripper holding sensors'};
export function findLessons(question,lessonId){
 const words=question.toLowerCase().match(/[a-z0-9]+/g)??[];
 const tokens=[...new Set(words.filter(w=>!ignored.has(w)).flatMap(w=>[w,...(aliases[w]??'').split(' ')]).filter(Boolean))];
 return lessons.map(l=>{const d=lessonDetails[l.id],title=(l.title+' '+l.id).toLowerCase(),text=[...l.body,d.explanation,d.worked,d.trouble].join(' ').toLowerCase();return {lesson:l,score:tokens.reduce((n,t)=>n+(title.includes(t)?5:0)+(text.includes(t)?1:0),0)+(l.id===lessonId?6:0)}}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(r=>r.lesson);
}
export function builtInReply(question,lessonId){
 const matches=findLessons(question,lessonId);
 if(!matches.length)return {answer:'I could not find a close match in the AXIS lessons. Try asking about coordinates, blocks, sketches, unreachable targets, printing, or saving a project. For a specific code error, use the debugger lesson or connect the AI assistant. Built-in help searches course material; it does not analyze arbitrary code.',sources:[]};
 const l=matches[0],d=lessonDetails[l.id],troubleshoot=/error|fail|stuck|wrong|not work|cannot|can.t|unreach|trouble/i.test(question);
 return {answer:`${l.title}\n\n${troubleshoot?d.trouble:d.explanation}\n\n${troubleshoot?'Check in order':'Try this'}:\n${d.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n${d.worked}\n\nBuilt-in guidance is drawn from the lessons. It does not inspect or execute your sketch.`,sources:matches.map(({id,title})=>({id,title}))};
}
export function lessonContext(question,lessonId){return findLessons(question,lessonId).map(l=>({id:l.id,title:l.title,body:l.body,...lessonDetails[l.id]}))}
