// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

import * as M from "../src/model.mjs";

export const cases = {};
const NOW = Date.parse("2026-01-15T12:00:00Z");
const minute = 60000;
const opts = { hidden: [], names: {}, kinds: M.DEFAULT_KINDS, showNotSetUp: false,
               notify: true, threshold: 90, refreshMs: 5 * minute };
const iso = minutes => new Date(NOW + minutes * minute).toISOString();
const row = overrides => Object.assign({ provider: "claude", label: "Claude", state: { status: "fresh" }, windows: [] }, overrides);
const win = overrides => Object.assign({ id: "five", label: "Five", kind: "session", percentUsed: 82,
                                          resetsAt: iso(18), windowSeconds: 18000 }, overrides);
const report = rows => M.parseReport(JSON.stringify({ schemaVersion: 6, providers: rows }), NOW, []);
const view = overrides => {
    const lane = report([row({ windows: [win(overrides)] })]).lanes[0];
    return M.windowView(lane, lane.windows[0], NOW, opts.refreshMs);
};

cases["reads supported reports between shell messages and rejects invalid report identities"] = a => {
    a.equal(M.extractJson('hello\n{"a":{"b":1}}\nbye'), '{"a":{"b":1}}');
    a.throws(() => M.extractJson("hello"), /no JSON/);
    a.deepEqual(M.parseReport('{"schemaVersion":5,"providers":[]}', NOW, []).lanes, []);
    a.throws(() => M.parseReport('{"schemaVersion":7}', NOW, []), /schema version 7/);
    a.throws(() => M.parseReport('{"schemaVersion":6}', NOW, []), /no provider list/);
    a.throws(() => report([row(), row()]), /claude\/default twice/);
    a.throws(() => report([row({state:{status:"weird"}})]), /unknown status weird/);
};
cases["reads account selectors, window cycles, trusted forecasts and runway"] = a => {
    const source = row({ accountKey:"profile:aaa", accountLocator:{path:"/srv/team"}, account:{email:"a@example.com", organization:"Example"},
        state:{status:"fresh", untrustedWindowIds:["five"]}, windows:[win({windowSeconds:null, startsAt:iso(-42),
            pace:{projectedExhaustedAt:iso(1),projectionConfidence:"early"}})], quotaSemantics:{effectiveAvailability:[
                {scope:"all_models", status:"known", effectivePercentRemaining:18, runway:{status:"through_reset",limitingWindowId:"five"}}]} });
    const lane = report([source]).lanes[0];
    a.deepEqual([lane.key,lane.email,lane.organization,lane.refreshedAt,lane.windows[0].cycleSeconds,lane.windows[0].untrusted,lane.windows[0].exhaustedAt],
                ["claude/profile:aaa","a@example.com","Example",NOW,3600,true,null]);
    a.deepEqual(lane.runway, {status:"through_reset",remaining:18,freeAt:NOW+18*minute,exhaustedAt:null,confident:false});
    a.deepEqual(M.parseReport(JSON.stringify({schemaVersion:5,providers:[source]}),NOW,["/srv/team"]).lanes,[]);
    source.quotaSemantics.effectiveAvailability[0].scope = "model";
    a.equal(report([source]).lanes[0].runway,null);
};
cases["renders percentages, pace and amounts without deriving a percentage"] = a => {
    const v = view({});
    a.deepEqual([v.percentText,v.fill,v.level,v.detail,v.label,v.dimmed],["82 %",0.82,2,"resets in 18 min · 12 % under pace","5 hours",false]);
    a.deepEqual([0,59.9,60,79.9,80,91.9,92,140].map(M.level),[0,0,1,1,2,2,3,3]);
    const credits = view({percentUsed:null,kind:"credits",spentUsd:12.4,limitUsd:50});
    a.deepEqual([credits.percentText,credits.fill,credits.level,credits.detail],["—",null,null,"12.40 of 50.00 $"]);
    a.deepEqual([view({percentUsed:140}).fill,view({percentUsed:-3}).percentText],[1,"-3 %"]);
    a.equal(view({resetsAt:iso(-1)}).elapsed,null);
    a.equal(view({shareOf:"weekly"}).indent,true);
    a.equal(view({kind:"model",pace:{projectedExhaustedAt:iso(5),projectionConfidence:"established"}}).detail.endsWith("empty around 12:05"),true);
};
cases["formats durations and times"] = a => {
    a.deepEqual([18,78,3185].map(x=>M.until(x*minute)),["18 min","1 h 18 min","2 d 5 h"]);
    a.deepEqual([60,1560,17280].map(x=>M.clock(NOW+x*minute,NOW)),["13:00","Fri 14:00","in 12 d"]);
    a.deepEqual([0,12,180,2880].map(x=>M.ago(x*minute)),["just now","12 min ago","3 h ago","2 d ago"]);
};
cases["names accounts independently of visibility and explains provider problems"] = a => {
    const r=report([row({accountKey:"a",accountLocator:{path:"/srv/.claude"},plan:"pro"}),
                    row({accountKey:"b",accountLocator:{path:"/srv/.claude-work"},notSetUp:true,state:{status:"unavailable",reason:"credentials_expired",remedyCommand:"grok"}})]);
    a.deepEqual(M.laneNames(r.lanes,{}),{"claude/a":"Claude · Default","claude/b":"Claude · work"});
    a.equal(M.laneNames(r.lanes,{"claude/b":"Team"})["claude/b"],"Claude · Team");
    a.equal(M.notSetUpCount(r),1);
    a.equal(M.visibleLanes(r,opts).length,1);
    a.equal(M.planText(r.lanes[0]),"Pro");
    a.deepEqual(M.laneProblem(r.lanes[1],NOW),{text:"Session expired",command:"grok"});
    a.equal(M.laneAge(r.lanes[1],NOW,opts.refreshMs),"Outdated reading");
    a.equal(M.creditsText({credits:{unlimited:true}}),"Credit: unlimited");
    a.equal(M.laneSummary({runway:{status:"projected_exhaustion",remaining:18,confident:false}},NOW),"18 % left");
};
cases["counts visible recent independent windows and schedules the reset"] = a => {
    const r=report([row({windows:[win({percentUsed:95}),win({id:"model",kind:"model",percentUsed:99}),win({id:"share",shareOf:"five"})]})]);
    a.deepEqual(M.countedWindows(r,opts,NOW).map(x=>x.percent),[95]);
    a.deepEqual(M.trayState(r,opts,NOW,null),{fill:0.95,level:3,warning:false,tooltip:"Claude: 95 %"});
    a.equal(M.nextResetRead(r,opts,NOW),NOW+18*minute+30000);
    a.deepEqual(M.countedWindows(r,opts,NOW+11*minute),[]);
    a.equal(M.trayState(null,opts,NOW,{title:"Missing"}).tooltip,"Missing");
    a.deepEqual([299000,300000,28800000].map(gap=>M.readDue(NOW-gap,NOW,300000)),[false,true,true]);
};
cases["notifies once per cycle and primes silently"] = a => {
    let memory={primed:false,cycles:{}};
    function step(p,reset,notify) {
        const r=report([row({windows:[win({percentUsed:p,resetsAt:iso(reset)})]})]);
        const result=M.notifications(memory,r,Object.assign({},opts,{notify:notify!==false}),NOW);
        memory=result.memory;
        return result.messages.map(x=>x.body);
    }
    a.deepEqual(step(50,80),[]);
    a.deepEqual(step(90,80),["5 hours at 90 %"]);
    a.deepEqual(step(99,80),[]);
    a.deepEqual(step(100,80),["5 hours used up, free from 13:20"]);
    a.deepEqual(step(100,80),[]);
    a.deepEqual(step(3,380),["5 hours available again"]);
    a.deepEqual(step(95,380,false),[]);
    a.deepEqual(step(95,380),[]);
};
cases["keeps the cycle when the reported reset time only jitters"] = a => {
    let memory={primed:false,cycles:{}};
    function step(p,reset) {
        const r=report([row({windows:[win({percentUsed:p,resetsAt:iso(reset)})]})]);
        const result=M.notifications(memory,r,opts,NOW);
        memory=result.memory;
        return result.messages.map(x=>x.body);
    }
    a.deepEqual(step(50,80),[]);
    a.deepEqual(step(100,80),["5 hours used up, free from 13:20"]);
    a.deepEqual(step(100,80-0.8/60),[]);
    a.deepEqual(step(100,80+0.4),[]);
    a.deepEqual(step(95,80-0.8/60),[]);
    a.deepEqual(step(3,380),["5 hours available again"]);
    a.deepEqual(step(95,380+0.4),["5 hours at 95 %"]);
    a.deepEqual(step(96,380-0.4),[]);
};
cases["discovers profiles and starts quota-axi with a clean environment"] = a => {
    const c=(path,flags)=>Object.assign({path,canonicalPath:path,isDir:true},flags);
    const p=M.claudeProfiles([c("/a",{hasSettings:true}),c("/b",{manual:true}),c("/alias",{manual:true,canonicalPath:"/a"}),
        c("/off",{manual:true}),c("/empty",{}),c("/bad:path",{manual:true})],["/off"]);
    a.deepEqual(p.dirs,["/a","/b"]);
    a.match(p.rejected[0].reason,/colon/);
    a.equal(M.invocation("/opt/q","/bin/q","/bin/sh",[]).program,"/opt/q");
    a.deepEqual(M.invocation("","/bin/q","/bin/sh",p.dirs),{program:"/bin/q",args:["--json","--full"],
        env:{remove:M.ENV_REMOVE,removePrefixes:["QUOTA_AXI_"],set:{QUOTA_AXI_CLAUDE_PROFILES:"/a:/b"}}});
    a.deepEqual(M.invocation("","","/bin/sh",[]).args,["-lic","exec quota-axi --json --full"]);
    a.throws(()=>M.invocation("","","",[]),/was not found/);
};
cases["explains read failures and identifies broken settings"] = a => {
    a.deepEqual(M.readFailure(3,"line one\nboom\n"),{title:"quota-axi failed (exit 3)",detail:"boom",hint:""});
    a.equal(M.readFailure(-2,"").hint,M.INSTALL_HINT);
    a.equal(M.readFailure(-1,"").title,"quota-axi did not answer");
    a.deepEqual(M.parseSetting("hidden","[oops",[]),{value:[],error:"The setting hidden is unreadable and was ignored."});
    a.deepEqual(M.parseSetting("names","[]",{}).value,{});
    a.deepEqual(M.parseSetting("hidden",'["a"]',[]),{value:["a"],error:""});
};

cases["distinguishes expired, placeholder, untrusted and incipient cycles"] = a => {
    function oldView(state) {
        const lane = report([row({ state, windows: [win({resetsAt: iso(-1)})] })]).lanes[0];
        return M.windowView(lane, lane.windows[0], NOW, opts.refreshMs);
    }
    const expired = oldView({status:"fresh", refreshedAt:iso(-2)});
    a.deepEqual([expired.detail, expired.elapsed, expired.dimmed], ["no new reading since the reset", null, true]);
    const untrusted = oldView({status:"fresh", refreshedAt:iso(-2), untrustedWindowIds:["five"]});
    a.deepEqual([untrusted.detail, untrusted.dimmed], ["not trusted by quota-axi", true]);
    a.equal(view({resetsAt: "1970-01-01T00:00:00Z"}).detail, "");
    a.equal(view({resetsAt: iso(295)}).detail, "resets in 4 h 55 min");
    a.equal(view({windowSeconds:null}).elapsed, null);
    a.equal(view({resetsAt:iso(150),percentUsed:52}).detail, "resets in 2 h 30 min · on pace");
    a.equal(view({resetsAt:iso(150),percentUsed:70}).detail, "resets in 2 h 30 min · 20 % over pace");
    a.equal(view({kind:"model", pace:{projectedExhaustedAt:iso(19),projectionConfidence:"established"}}).detail,
            "resets in 18 min · 12 % under pace");
};

cases["preserves distinctions between windows of the same kind"] = a => {
    const lane = report([row({windows: [win({kind:"weekly", label:"Gemini weekly"}),
                                         win({kind:"weekly", id:"another", label:"Claude weekly"})]})]).lanes[0];
    a.deepEqual(lane.windows.map(w => M.windowView(lane, w, NOW, opts.refreshMs).label),
                ["Gemini weekly", "Claude weekly"]);
};

cases["reports known runway, age, rate limits and available credits"] = a => {
    const lane = row({state:{status:"rate_limited",retryAfter:iso(60),refreshedAt:iso(-180)},credits:{remaining:12,unit:"credits"}});
    const l = report([lane]).lanes[0];
    a.equal(M.laneAge(l,NOW,opts.refreshMs), "Reading from 3 h ago");
    a.equal(M.laneProblem(l,NOW).text,"Rate limit until 13:00");
    a.equal(M.creditsText(l),"Credit: 12 credits");
    l.credits.remaining = 0;
    a.equal(M.creditsText(l),"");
    l.refreshedAt = NOW;
    a.equal(M.isOld(l,NOW+2*opts.refreshMs,opts.refreshMs),false);
    a.equal(M.isOld(l,NOW+2*opts.refreshMs+1,opts.refreshMs),true);
    l.status = "stale";
    a.equal(M.isOld(l,NOW,opts.refreshMs),true);
    l.status = "auth_required";
    a.equal(M.laneProblem(l,NOW).text,"Sign-in required");
    l.status = "error";
    l.error = "boom";
    a.equal(M.laneProblem(l,NOW).text,"Not available: boom");
    l.runway = {status:"exhausted_now",freeAt:NOW+60*minute};
    a.equal(M.laneSummary(l,NOW),"used up · free from 13:00");
    l.runway = {status:"projected_exhaustion",remaining:18,exhaustedAt:NOW+60*minute,confident:true};
    a.equal(M.laneSummary(l,NOW),"18 % left · empty around 13:00");
    l.runway.status = "through_reset";
    a.equal(M.laneSummary(l,NOW),"18 % left · lasts until the reset");
    l.runway.status = "unknown";
    a.equal(M.laneSummary(l,NOW),"");
};

cases["excludes ineligible windows and retains independent unknown-kind quota"] = a => {
    const windows = [win({id:"untrusted"}),win({id:"elapsed",resetsAt:iso(-1)}),
                     win({id:"absent",percentUsed:null}),win({id:"share",shareOf:"other"}),
                     win({id:"other",kind:"unknown",percentUsed:4})];
    const r = report([row({state:{status:"fresh",refreshedAt:iso(-2),untrustedWindowIds:["untrusted"]},windows})]);
    a.deepEqual(M.countedWindows(r,opts,NOW).map(c=>c.window.id),["other"]);
    a.equal(M.nextResetRead(r,opts,NOW),null);
    a.deepEqual(M.countedWindows(r,Object.assign({},opts,{hidden:["claude/default"]}),NOW),[]);
    const notSetup = report([row({state:{status:"auth_required"},notSetUp:true})]);
    a.equal(M.trayState(notSetup,Object.assign({},opts,{showNotSetUp:true}),NOW,null).warning,false);
    const problem = report([row({state:{status:"error",error:"boom"}})]);
    a.equal(M.trayState(problem,opts,NOW,null).warning,true);
};

cases["never coerces malformed numbers or missing quotas to zero"] = a => {
    a.throws(() => report([row({windows:[win({percentUsed:"0"})]})]), /invalid number/);
    a.throws(() => report([row({windows:[win({resetsAt:"bad date"})]})]), /invalid timestamp/);
    a.equal(view({percentUsed:null,usedCredits:3,limitCredits:10,creditUnit:"tokens"}).detail,"3.00 of 10.00 tokens");
    a.equal(view({percentUsed:null}).detail,"");
};
