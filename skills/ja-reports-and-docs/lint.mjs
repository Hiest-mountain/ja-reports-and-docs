#!/usr/bin/env node
// 日本語の文書から、check.md の 6 節が直す候補を 1 回で列挙する。
// 使い方: node lint.mjs <文書.md> [--outline]
// 当たった行は候補で、直すかは SKILL.md の 3 節で判断する。依存パッケージは無い。
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('使い方: node lint.mjs <文書.md> [--outline]'); process.exit(2); }
const outlineOnly = args.includes('--outline');
const lines = readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/);

// ---- 行の種類を決める（コードブロックと frontmatter は対象外） ----
const rows = [];
let fence = false, front = lines[0] === '---';
lines.forEach((raw, i) => {
  const n = i + 1;
  if (front) { if (i > 0 && raw === '---') front = false; return; }
  if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; return; }
  if (fence) return;
  const text = raw.replace(/`[^`]*`/g, '◆').replace(/\]\([^)]*\)/g, ']'); // コードと URL を伏せる
  let kind = 'prose';
  if (!raw.trim()) kind = 'blank';
  else if (/^\s*#/.test(raw)) kind = 'heading';
  else if (/^\s*\|/.test(raw)) kind = 'table';
  else if (/^\s*>/.test(raw)) kind = 'quote';
  else if (/^\s*([-*]|[0-9]+\.)\s/.test(raw)) kind = 'list';
  rows.push({ n, raw, text, kind });
});

// ---- 段落と文に分ける ----
const paras = [];           // {heading, sents:[{n,s}], kind}
let cur = null, heading = '(冒頭)';
for (const r of rows) {
  if (r.kind === 'heading') { heading = r.raw.replace(/^\s*#+\s*/, ''); cur = null; continue; }
  if (r.kind !== 'prose') { cur = null; continue; }
  if (!cur) { cur = { heading, sents: [], bold: 0, n: r.n }; paras.push(cur); }
  cur.bold += (r.text.match(/\*\*/g) || []).length / 2;
  for (const s of r.text.split(/(?<=[。！？])/)) if (s.trim()) cur.sents.push({ n: r.n, s: s.trim() });
}
const sents = paras.flatMap(p => p.sents);
const listRows = rows.filter(r => r.kind === 'list');

if (outlineOnly) {
  // 節ごとに最初の文だけを並べる。読み手がその節で最初に知りたいことと照合する（3.6）
  let last = null;
  for (const p of paras) {
    if (p.heading === last) continue;
    last = p.heading;
    console.log(`## ${p.heading}\n  L${p.sents[0]?.n}: ${p.sents[0]?.s ?? ''}`);
  }
  process.exit(0);
}

// ---- 検査 ----
const hits = [];
const hit = (n, code, frag, hint) => hits.push({ n, code, frag, hint });
const K = '[\\u4E00-\\u9FFF々]';   // 漢字
const each = (re, str, fn) => { for (const m of str.matchAll(re)) fn(m); };

const WORD_VERB = new RegExp(
  '始ま|並[ぶびべん]|選[ぶび]|試[すし]|(?<![けり取受差])入れ(?!子)|(?<!' + K + ')置[くいき](?!換)|' +
  '(?<![きりいみえけ])直[すし]|見比べ|動か|(?<![み' + K.slice(1, -1) + '])立て|起こ|当て|詰め|写[すし]|回[すし]|落と', 'g');
const WORD_NOUN = new RegExp('(?<!' + K + ')(物|所|形|辺り)(?!' + K + ')|感じ', 'g');
const TYPE = /のは|ことを目的|定め|→|—|(もの|仕組み|ツール|スクリプト)(です|である)|分かったこと(です|である)|次のとおり/g;
const PREVIEW = /(次の|以下の)[^。]*(します|です|である|する)。$/;
const WRITER = /作者|私|僕|自分は|手元|前回|今回|さっき/g;
const SELECT = /たところ|た(ため|ので)|ていたため|想定して|設けている|以前は|当初|事故|[0-9]+ ?(件|ファイル|GB|MB|分|秒|回)[^。]*確認|ためのもの|照らして|判断してください|例がある|ことがある/g;
const ORDER = /[代か]わり(に|として)|のではなく|ではな[いく]|でなく|とは違う|せず(に|、)|ないで、|従来は|これまでは|もともと|既定では|[だて]ったが、/g;
const KEITAI = /(です|ます|ました|ません|でした|ください|でしょう)[。！？]?$/;
const JOTAI = /(である|ている|ない|した|になる|する|れる|できる|だ)[。]$/;

// 語（表と箇条書きも対象）
for (const r of rows) {
  if (!['prose', 'list', 'table'].includes(r.kind)) continue;
  each(WORD_VERB, r.text, m => hit(r.n, '語-動詞', m[0], '動作か操作なら意味の狭い語にする（3.1、3.2）'));
  each(WORD_NOUN, r.text, m => hit(r.n, '語-名詞', m[0], '指している対象の名前にする（3.1）'));
}
// 箇条書きのラベル
for (const r of listRows) {
  if (/^\s*([-*]|[0-9]+\.) (\*\*[^*]+\*\*|[^:：\s◆]{1,10})[:：]/.test(r.text))
    hit(r.n, '型-ラベル', r.text.trim().slice(0, 16), 'ラベルを外して文にするか、表にする（3.4）');
}
// 文ごと
const listSents = listRows.flatMap(r => r.text.replace(/^\s*([-*]|[0-9]+\.)\s/, '').split(/(?<=[。！？])/).filter(x => x.trim()).map(x => ({ n: r.n, s: x.trim() })));
for (const { n, s } of [...sents, ...listSents]) {
  const len = [...s].length, commas = (s.match(/、/g) || []).length;
  each(/[しりれけえ]、/g, s, m => {
    if (/[あで]り、/.test(s.slice(Math.max(0, m.index - 1), m.index + 2))) hit(n, '読点-言いさし', s.slice(Math.max(0, m.index - 6), m.index + 2), '「あり、」は文を分ける（3.5）');
    else hit(n, '読点-言いさし', s.slice(Math.max(0, m.index - 6), m.index + 2), '「〜して」に変えるか文を分ける（3.5）');
  });
  if (len <= 30) each(/(は|では|には|も)、/g, s, m => hit(n, '読点-主題', s.slice(0, m.index + m[0].length), '30 字以下の文なので読点を消す（3.5）'));
  each(/[をにの]、/g, s, m => hit(n, '読点-語順', s.slice(Math.max(0, m.index - 8), m.index + 2), '語順を変えて読点を消せるか確かめる（3.4、3.5）'));
  if (commas >= 3) hit(n, '読点-3つ以上', `読点 ${commas} 個: ${s.slice(0, 20)}…`, '文を分けるか、列挙を箇条書きに移す（3.5）');
  each(TYPE, s, m => hit(n, '型', m[0], '動作を述語にする。記号は語で書く（3.4）'));
  if (PREVIEW.test(s) && len <= 40) hit(n, '型-予告', s, '中身を予告するだけなら消して中身を書く（3.4）');
  each(WRITER, s, m => hit(n, '書き手', m[0], '読み手にとっての意味に書き換えるか消す（3.7、3.8）'));
  each(SELECT, s, m => hit(n, '選別', m[0], '読み手の操作か判断を変えない文なら削る（1 節）'));
  each(ORDER, s, m => hit(n, '順番', m[0], '否定の側を消して誤解が起きないなら削る。残すなら置く位置を決める（3.6）'));
}
// 段落ごと
const all = sents.filter(x => /[。]$/.test(x.s));
const nK = all.filter(x => KEITAI.test(x.s)).length, nJ = all.filter(x => !KEITAI.test(x.s) && JOTAI.test(x.s)).length;
const style = nK >= nJ ? '敬体' : '常体';
for (const p of paras) {
  if (p.bold >= 2) hit(p.n, '太字', `太字 ${p.bold} 箇所`, '1 段落に 1 箇所までにする（3.4）');
  let run = [], masu = [];
  const flush = () => { if (run.length >= 3) hit(run[0].n, '言い切りの連続', `${run.length} 文: ${run[0].s.slice(0, 16)}…`, '理由、条件、結果の関係にある文をつなぐ。その前に載せない情報が残っていないか確かめる（1 節、3.4）'); run = []; };
  const flushM = () => { if (masu.length >= 3) hit(masu[0].n, '「します」の連続', `${masu.length} 文`, '主語を省くか、理由で前の文につなぐ（3.3、3.4）'); masu = []; };
  for (const x of p.sents) {
    const len = [...x.s].length;
    if (len <= 35 && !/(ので|ため|から)、?/.test(x.s)) run.push(x); else flush();
    if (/します。$/.test(x.s)) masu.push(x); else flushM();
    if (/[。]$/.test(x.s)) {
      const k = KEITAI.test(x.s), j = !k && JOTAI.test(x.s);
      if (style === '敬体' && j) hit(x.n, '文体', x.s.slice(-12), '敬体の文書に常体の文が混ざっている（3.9）');
      if (style === '常体' && k) hit(x.n, '文体', x.s.slice(-12), '常体の文書に敬体の文が混ざっている（3.9）');
    }
  }
  flush(); flushM();
}
const lead = paras[0];
if (lead && lead.heading === '(冒頭)' && lead.sents.length > 3) hit(lead.n, '冒頭', `${lead.sents.length} 文`, '冒頭は 3 文まで。ほかは後ろの節へ移す（2 節）');

// ---- 出力 ----
hits.sort((a, b) => a.n - b.n || a.code.localeCompare(b.code));
for (const h of hits) console.log(`L${h.n}\t${h.code}\t${h.frag}\t${h.hint}`);
const count = {};
for (const h of hits) count[h.code] = (count[h.code] || 0) + 1;
console.log(`\n文体: ${style}（敬体 ${nK} 文、常体 ${nJ} 文）  文 ${sents.length}  候補 ${hits.length}`);
console.log(Object.entries(count).map(([k, v]) => `${k} ${v}`).join(' / ') || '候補なし');
