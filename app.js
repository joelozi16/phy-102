/* ============================================================
   PHY 102 QUIZ APPLICATION LOGIC
   ============================================================ */

/* ---------- CATEGORY DEFINITIONS ---------- */
const CATEGORIES = [
  {name:"Forces in Nature",icon:"&#127757;",desc:"Gravity, weak, electromagnetic, strong"},
  {name:"Electrostatics",icon:"&#9889;",desc:"Static electricity & phenomena"},
  {name:"Electric Charges",icon:"&#11036;",desc:"Types, properties & units"},
  {name:"Methods of Charging",icon:"&#128295;",desc:"Friction, contact & induction"},
  {name:"Coulomb's Law",icon:"&#8709;",desc:"Force between charges"},
  {name:"Electric Fields",icon:"&#10148;",desc:"Field intensity & lines"},
  {name:"Electric Potential",icon:"&#9889;",desc:"Voltage & potential energy"},
  {name:"Capacitors & Capacitance",icon:"&#128308;",desc:"Storing charge & farads"},
  {name:"Electric Dipoles",icon:"&#128261;",desc:"Dipole moment p = qd"},
  {name:"Mixed PHY 102",icon:"&#128221;",desc:"All topics combined"}
];

const CAT_SELECT = "All Categories";

/* ---------- STATE ---------- */
let currentView = "dashboard";
let selectedCategory = "All Categories";
let selectedDifficulty = "mixed";
let selectedCount = 10;
let selectedMode = "learning";
let activeQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let markedForReview = [];
let quizStarted = false;
let timerInterval = null;
let timeUsed = 0;
let lastResult = null;

const STORAGE_KEY = "phy102_progress_v1";

/* ---------- HELPERS ---------- */
function $(id){return document.getElementById(id);}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.classList.remove("show"),2500);
}

function showModal(title,msg,onConfirm){
  $("modalTitle").textContent = title;
  $("modalMsg").textContent = msg;
  $("modalOverlay").classList.remove("hidden");
  $("modalConfirmBtn").onclick = ()=>{closeModal(); if(onConfirm) onConfirm();};
}
function closeModal(){ $("modalOverlay").classList.add("hidden"); }

/* ---------- NAVIGATION ---------- */
function goTo(view){
  currentView = view;
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  $("view-"+view).classList.add("active");
  document.querySelectorAll("#navMenu button").forEach(b=>{
    b.classList.toggle("active", b.getAttribute("data-view")===view);
  });
  if(view==="dashboard") renderDashboard();
  if(view==="study") renderStudy();
  if(view==="results") renderResults();
  if(view==="progress") renderProgress();
  window.scrollTo({top:0,behavior:"smooth"});
  $("navMenu").classList.remove("open");
}

/* ---------- STUDY MODE ---------- */
const FORMULAS = [
  {name:"Coulomb's Law",formula:"F = K·Q₁Q₂ / r²",desc:"Force between two point charges. K = 9×10⁹ N·m²/C², Q in coulombs (C), r in metres (m), F in newtons (N)."},
  {name:"Electric Field Intensity",formula:"E = F / Q",desc:"Force per unit charge. E in N/C (or V/m), F in N, Q in C."},
  {name:"Point Charge Field",formula:"E = Q / (4πε₀r²)",desc:"Electric field due to a point charge Q at distance r. ε₀ is the permittivity of free space."},
  {name:"Electric Potential",formula:"V = W / Q",desc:"Work done per unit charge. V in volts (V), W in joules (J), Q in coulombs (C)."},
  {name:"Coulomb Potential",formula:"V = Q / (4πε₀r)",desc:"Electric potential due to a point charge Q at distance r. V in volts."},
  {name:"Capacitance",formula:"C = Q / V",desc:"Charge stored per unit voltage. C in farads (F), Q in coulombs, V in volts."},
  {name:"Charge–Voltage Relation",formula:"Q = C·V",desc:"Charge stored equals capacitance times voltage."},
  {name:"Electric Dipole Moment",formula:"p = q·d",desc:"Product of charge magnitude q and separation d. p in C·m, d is a vector."}
];

const DEFINITIONS = [
  {name:"Gravity",def:"A fundamental force of attraction between two objects that have mass or energy."},
  {name:"Weak Force",def:"A fundamental force responsible for certain types of particle decay and plays a role in nuclear fusion that powers the sun."},
  {name:"Electromagnetic Force",def:"The Lorentz force, composed of electric and magnetic forces; acts between charged particles."},
  {name:"Strong Nuclear Force",def:"The strongest fundamental force, holding the quarks together that make up protons and neutrons."},
  {name:"Electrostatics",def:"The study of electromagnetic phenomena that occur when there are no moving charges."},
  {name:"Electric Charge",def:"A physical property of matter causing it to experience a force in an electric field; measured in coulombs."},
  {name:"Electric Field",def:"A region of space in which an electric force is obtained on a charge."},
  {name:"Electric Potential",def:"The work needed to move a unit positive charge from a reference point (usually infinity) to a specific point in the field."},
  {name:"Capacitor",def:"A device used to store electric charge, made of two parallel metal plates separated by a dielectric."},
  {name:"Capacitance",def:"The ability of a capacitor to store charge; C = Q/V, measured in farads."},
  {name:"Electric Dipole",def:"A system of two equal but opposite charges separated by a small distance."},
  {name:"Electric Dipole Moment",def:"A vector quantity p = qd, pointing from the negative to the positive charge."}
];

function renderStudy(){
  $("formulasList").innerHTML = FORMULAS.map(f=>
    `<div class="formula-card"><h4>${f.name}</h4><span class="formula-code">${f.formula}</span><p>${f.desc}</p></div>`
  ).join("");
  $("defsList").innerHTML = DEFINITIONS.map(d=>
    `<div class="def-card"><h4>${d.name}</h4><p>${d.def}</p></div>`
  ).join("");
}

/* ---------- DASHBOARD ---------- */
function loadProgress(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultProgress();
  }catch(e){ return defaultProgress(); }
}
function defaultProgress(){
  return {
    quizzesCompleted:0, totalQuestions:0, correct:0, incorrect:0,
    bestScore:0, lastScore:0, categoryPerf:{}, learningDone:0, totalPossible:0
  };
}
function saveProgress(p){ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function renderDashboard(){
  const p = loadProgress();
  const correct = p.correct, total = p.totalQuestions;
  const acc = total>0 ? Math.round(correct/total*100) : 0;
  const avg = p.quizzesCompleted>0 ? Math.round(p.bestScore) : 0;
  const overallPct = p.totalPossible>0 ? Math.round(p.learningDone/p.totalPossible*100) : 0;
  $("dashStats").innerHTML = `
    <div class="stat accent"><div class="num">${p.quizzesCompleted}</div><div class="lbl">Quizzes Completed</div></div>
    <div class="stat"><div class="num">${total}</div><div class="lbl">Questions Answered</div></div>
    <div class="stat accent"><div class="num">${correct}</div><div class="lbl">Correct Answers</div></div>
    <div class="stat"><div class="num">${acc}%</div><div class="lbl">Accuracy</div></div>
    <div class="stat accent"><div class="num">${p.bestScore}%</div><div class="lbl">Best Score</div></div>
    <div class="stat"><div class="num">${avg}%</div><div class="lbl">Average Score</div></div>`;
  $("dashOverallPct").textContent = overallPct+"%";
  $("dashBar").style.width = overallPct+"%";
}

/* ---------- QUIZ SETUP ---------- */
function renderSetup(){
  // categories
  const cats = [CAT_SELECT].concat(CATEGORIES.map(c=>c.name));
  $("categoryGrid").innerHTML = cats.map(cat=>{
    const isAll = cat===CAT_SELECT;
    const count = isAll ? QUESTION_BANK.length : QUESTION_BANK.filter(q=>q.category===cat).length;
    const icon = isAll ? "&#128221;" : (CATEGORIES.find(c=>c.name===cat)||{}).icon || "&#10004;";
    return `<div class="cat-card ${selectedCategory===cat?'selected':''}" onclick="selectCategory('${cat.replace(/'/g,"\\'")}')">
      <div class="icon">${icon}</div><h3>${cat}</h3><p>${isAll?"All PHY 102 topics":"Questions from this topic"}</p>
      <div class="count">${count} Qs</div></div>`;
  }).join("");

  // difficulty
  const diffs = [["easy","Easy"],["medium","Medium"],["hard","Hard"],["mixed","Mixed"]];
  $("diffSeg").innerHTML = diffs.map(([v,l])=>`<button data-d="${v}" class="${selectedDifficulty===v?'selected':''}" onclick="selectDiff('${v}')">${l}</button>`).join("");

  // count
  const counts = [10,20,30,50,100];
  $("countSeg").innerHTML = counts.map(c=>`<button data-c="${c}" class="${selectedCount===c?'selected':''}" onclick="selectCount(${c})">${c}</button>`).join("") +
    `<button data-c="all" class="${selectedCount==='all'?'selected':''}" onclick="selectCount('all')">Practice All</button>`;
}

function selectCategory(cat){ selectedCategory = cat; renderSetup(); }
function selectDiff(d){ selectedDifficulty = d; renderSetup(); }
function selectCount(c){ selectedCount = c; renderSetup(); }
function resetSetup(){ selectedCategory="All Categories"; selectedDifficulty="mixed"; selectedCount=10; selectedMode="learning"; renderSetup(); setModeButtons(); }

/* ---------- MODE SELECTION ---------- */
function setModeButtons(){
  document.querySelectorAll("#modeSeg button").forEach(b=>{
    b.classList.toggle("selected", b.getAttribute("data-mode")===selectedMode);
  });
}
document.addEventListener("click",function(e){
  const m = e.target.closest("#modeSeg button");
  if(m){ selectedMode = m.getAttribute("data-mode"); setModeButtons(); }
});

/* ---------- BUILD QUIZ ---------- */
function buildQuiz(){
  let pool = QUESTION_BANK;
  if(selectedCategory !== CAT_SELECT){
    pool = pool.filter(q=>q.category===selectedCategory);
  }
  if(selectedDifficulty !== "mixed"){
    pool = pool.filter(q=>q.difficulty===selectedDifficulty);
  }
  let shuffled = shuffle(pool);
  if(selectedCount === "all"){
    activeQuestions = shuffled;
  } else {
    activeQuestions = shuffled.slice(0, Math.min(selectedCount, shuffled.length));
  }
}

/* ---------- RANDOMIZE ANSWERS ---------- */
function randomizeAnswers(q){
  const idx = q.answer;
  let opts, newAns;
  if(q.type === "mcq" || q.type === "calculation"){
    const pairs = q.options.map((opt,i)=>({opt, i}));
    const sh = shuffle(pairs);
    opts = sh.map(p=>p.opt);
    newAns = sh.findIndex(p=>p.i===idx);
  } else if(q.type === "tf"){
    opts = ["True","False"];
    newAns = q.answer === true ? 0 : 1;
  }
  return {...q, options: opts, answer: newAns};
}

/* ---------- START QUIZ ---------- */
function startQuiz(){
  buildQuiz();
  if(activeQuestions.length===0){
    toast("No questions match your selection. Try another category.");
    return;
  }
  // randomize each question's answers
  activeQuestions = activeQuestions.map(randomizeAnswers);
  currentIndex = 0;
  userAnswers = new Array(activeQuestions.length).fill(null);
  markedForReview = [];
  quizStarted = true;
  timeUsed = 0;
  lastResult = null;

  goTo("quizactive");
  renderQuizTopbar();
  renderPalette();
  renderQuestion();
  if(selectedMode === "exam"){
    $("timer").classList.remove("hidden");
    startTimer();
  } else {
    $("timer").classList.add("hidden");
    stopTimer();
  }
}

function startTimer(){
  stopTimer();
  timerInterval = setInterval(()=>{
    timeUsed++;
    const m = String(Math.floor(timeUsed/60)).padStart(2,"0");
    const s = String(timeUsed%60).padStart(2,"0");
    const t = $("timer");
    t.innerHTML = "&#9201; "+m+":"+s;
    t.classList.toggle("warn", timeUsed > 45*60);
  },1000);
}
function stopTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval=null; } }
function formatTime(sec){
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return m+":"+s;
}

function renderQuizTopbar(){
  $("qnumBadge").textContent = "Question "+(currentIndex+1)+" / "+activeQuestions.length;
  const mb = $("modeBadge");
  mb.textContent = selectedMode.toUpperCase();
  mb.className = "mode-badge "+(selectedMode==="exam"?"exam":"learning");
  if(selectedMode==="learning"){ $("submitBtn").classList.add("hidden"); } else { $("submitBtn").classList.remove("hidden"); }
  updateProgressText();
}

function updateProgressText(){
  const answered = userAnswers.filter(a=>a!==null).length;
  $("progressText").textContent = answered+" / "+activeQuestions.length+" answered";
}

/* ---------- PALETTE ---------- */
function renderPalette(){
  $("palette").innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;">${activeQuestions.map((q,i)=>{
      let cls = "pal-num";
      if(i===currentIndex) cls += " cur";
      if(markedForReview.includes(i)) cls += " marked";
      if(userAnswers[i]!==null) cls += " answered";
      return `<button class="${cls}" onclick="jumpTo(${i})">${i+1}</button>`;
    }).join("")}
    </div>
    <div class="pal-legend">
      <span><span class="legend-dot" style="background:var(--green)"></span>Answered</span>
      <span><span class="legend-dot" style="background:var(--amber)"></span>Marked</span>
      <span><span class="legend-dot" style="background:#eef2f7;border:1px solid #cbd5e1"></span>Unanswered</span>
    </div>`;
}

function jumpTo(i){
  if(i>=0 && i<activeQuestions.length){ currentIndex=i; renderQuestion(); }
}

/* ---------- RENDER QUESTION ---------- */
function renderQuestion(){
  const q = activeQuestions[currentIndex];
  const num = currentIndex+1;
  const diffCls = q.difficulty;
  const typeLabel = q.type==="calculation" ? "Calculation" : (q.type==="tf" ? "True/False" : "Multiple Choice");
  const answered = userAnswers[currentIndex] !== null;

  let optsHtml = "";
  if(q.type==="tf"){
    optsHtml = q.options.map((opt,i)=>{
      const letter = opt==="True"?"T":"F";
      let cls = "opt";
      if(selectedMode==="learning"){
        if(answered){
          if(i===q.answer) cls += " correct";
          else if(userAnswers[currentIndex]===i) cls += " wrong";
        }
      } else {
        if(userAnswers[currentIndex]===i) cls += " selected";
      }
      return `<button class="${cls}" onclick="selectAnswer(${i})" ${answered&&selectedMode==="learning"?"disabled":""}>
        <span class="letter">${letter}</span><span>${opt}</span></button>`;
    }).join("");
  } else {
    optsHtml = q.options.map((opt,i)=>{
      const letter = "ABCD"[i];
      let cls = "opt";
      if(selectedMode==="learning"){
        if(answered){
          if(i===q.answer) cls += " correct";
          else if(userAnswers[currentIndex]===i) cls += " wrong";
        }
      } else {
        if(userAnswers[currentIndex]===i) cls += " selected";
      }
      return `<button class="${cls}" onclick="selectAnswer(${i})" ${answered&&selectedMode==="learning"?"disabled":""}>
        <span class="letter">${letter}</span><span>${opt}</span></button>`;
    }).join("");
  }

  let feedbackHtml = "";
  if(selectedMode==="learning" && answered){
    const correct = userAnswers[currentIndex]===q.answer;
    const correctLetter = "ABCD"[q.answer];
    feedbackHtml = `<div class="feedback ${correct?'correct':'wrong'}">
      <h4>${correct?"&#9989; Correct!":"&#10060; Incorrect"}</h4>
      <p><strong>Correct Answer: ${correctLetter}</strong> — ${q.options[q.answer]}</p>
      <p>${q.explanation}</p>
      ${q.formula?`<div class="f-formula">${q.formula}</div>`:""}
      ${q.solution?`<div class="note"><strong>Solution:</strong> ${q.solution}</div>`:""}
    </div>`;
  }

  const markBtn = $("markBtn");
  markBtn.textContent = markedForReview.includes(currentIndex) ? "&#9873; Marked for Review" : "&#9873; Mark for Review";
  markBtn.style.background = markedForReview.includes(currentIndex) ? "var(--amber)" : "#fffbeb";
  markBtn.style.color = markedForReview.includes(currentIndex) ? "#fff" : "#b45309";

  $("questionCard").innerHTML = `
    <div class="q-meta">
      <span class="q-tag category">${q.category}</span>
      <span class="q-tag ${diffCls}">${diffCls.charAt(0).toUpperCase()+diffCls.slice(1)}</span>
      <span class="q-tag type">${typeLabel}</span>
      <span style="margin-left:auto;color:var(--gray);font-size:.8rem;font-weight:700;">Question ${num}/${activeQuestions.length}</span>
    </div>
    <div class="question-text">${num}. ${q.question}</div>
    <div class="opt-list">${optsHtml}</div>
    ${feedbackHtml}`;

  $("prevBtn").disabled = currentIndex===0;
  const nextLbl = currentIndex===activeQuestions.length-1 ? "Finish" : "Next";
  $("nextBtn").innerHTML = (currentIndex===activeQuestions.length-1?"Finish":"Next")+" &#8594;";

  updateProgressText();
  renderPalette();
}

/* ---------- ANSWER SELECTION ---------- */
function selectAnswer(i){
  if(selectedMode==="learning"){
    if(userAnswers[currentIndex]!==null) return;
    userAnswers[currentIndex]=i;
    renderQuestion();
    // auto-advance
    setTimeout(()=>{ if(currentIndex<activeQuestions.length-1) nextQuestion(); },1400);
  } else {
    userAnswers[currentIndex]=i;
    renderQuestion();
  }
}

function prevQuestion(){ if(currentIndex>0){ currentIndex--; renderQuestion(); } }
function nextQuestion(){
  if(currentIndex<activeQuestions.length-1){
    currentIndex++;
    renderQuestion();
  } else {
    if(selectedMode==="exam"){ submitExam(); }
    else { toast("You've reached the end of the quiz."); }
  }
}

function markForReview(){
  const idx = markedForReview.indexOf(currentIndex);
  if(idx>=0){ markedForReview.splice(idx,1); } else { markedForReview.push(currentIndex); }
  renderQuestion();
}

/* ---------- SUBMIT EXAM ---------- */
function submitExam(){
  if(selectedMode!=="exam") return;
  const unanswered = userAnswers.filter(a=>a===null).length;
  showModal("Submit Exam?",
    unanswered>0 ? `You have ${unanswered} unanswered question(s). Submit anyway?` : "Submit your exam and see your score?",
    ()=>{ finishQuiz(); });
}

function finishQuiz(){
  stopTimer();
  let correct=0, wrong=0, skipped=0;
  activeQuestions.forEach((q,i)=>{
    if(userAnswers[i]===null){ skipped++; }
    else if(userAnswers[i]===q.answer){ correct++; }
    else { wrong++; }
  });
  const attempted = correct+wrong;
  const score = Math.round(correct/activeQuestions.length*100);
  const pct = correct/activeQuestions.length*100;

  lastResult = {
    questions: activeQuestions, answers: userAnswers.slice(),
    correct, wrong, skipped, attempted,
    total: activeQuestions.length, score, pct,
    time: timeUsed, mode: selectedMode, category: selectedCategory
  };

  // update progress
  const prog = loadProgress();
  prog.quizzesCompleted++;
  prog.totalQuestions += attempted;
  prog.correct += correct;
  prog.incorrect += wrong;
  prog.learningDone += attempted;
  prog.totalPossible += activeQuestions.length;
  if(score>prog.bestScore) prog.bestScore = score;
  prog.lastScore = score;
  // category perf
  const catMap = {};
  activeQuestions.forEach((q,i)=>{
    if(!catMap[q.category]) catMap[q.category]={c:0,w:0};
    if(userAnswers[i]===q.answer) catMap[q.category].c++;
    else if(userAnswers[i]!==null) catMap[q.category].w++;
  });
  Object.keys(catMap).forEach(cat=>{
    if(!prog.categoryPerf[cat]) prog.categoryPerf[cat]={c:0,w:0};
    prog.categoryPerf[cat].c += catMap[cat].c;
    prog.categoryPerf[cat].w += catMap[cat].w;
  });
  saveProgress(prog);

  renderResults();
  goTo("results");
}

/* ---------- RESULTS ---------- */
function renderResults(){
  if(!lastResult){ $("resultsContent").innerHTML = `<div class="card"><h3 class="card-title">No Results Yet</h3><p class="card-sub">Complete a quiz to see your results here.</p><button class="btn btn-primary" onclick="goTo('quiz')">Start a Quiz</button></div>`; return; }
  const r = lastResult;
  let level, cls;
  if(r.pct>=90){level="Excellent";cls="excellent";}
  else if(r.pct>=75){level="Very Good";cls="verygood";}
  else if(r.pct>=60){level="Good";cls="good";}
  else if(r.pct>=50){level="Needs Improvement";cls="needs";}
  else {level="More Practice Needed";cls="practice";}

  $("resultsContent").innerHTML = `
  <div class="result-hero">
    <h2 style="margin-bottom:18px;">&#127891; Your Result</h2>
    <div class="result-score-wrap">
      <div class="score-ring" style="--pct:${r.pct}%">
        <div class="inner"><div class="pct">${r.score}%</div><div class="sc">${r.correct} / ${r.total}</div></div>
      </div>
      <div style="text-align:left;">
        <div class="result-level ${cls}">${level}</div>
        <p style="color:#cfe0ff;font-size:.95rem;">${r.mode==="exam"?"Exam Mode":"Learning Mode"} &middot; ${r.category}</p>
      </div>
    </div>
    <div class="result-stats">
      <div class="rs"><div class="n" style="color:#6ee7b7;">${r.correct}</div><div class="l">Correct</div></div>
      <div class="rs"><div class="n" style="color:#fca5a5;">${r.wrong}</div><div class="l">Wrong</div></div>
      <div class="rs"><div class="n" style="color:#fcd34d;">${r.skipped}</div><div class="l">Skipped</div></div>
      <div class="rs"><div class="n">${r.attempted}</div><div class="l">Attempted</div></div>
      <div class="rs"><div class="n">${r.total}</div><div class="l">Total</div></div>
      <div class="rs"><div class="n">${formatTime(r.time)}</div><div class="l">Time Used</div></div>
    </div>
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
    <button class="btn btn-primary" onclick="showReview()">&#128269; Review Answers</button>
    <button class="btn btn-outline" onclick="goTo('quiz')">&#128203; New Quiz</button>
    <button class="btn btn-dark" onclick="goTo('dashboard')">&#127968; Dashboard</button>
  </div>`;
}

function showReview(){ renderReview(); goTo("review"); }

function renderReview(){
  const r = lastResult;
  if(!r){ $("reviewContent").innerHTML="<p>No review available.</p>"; return; }
  $("reviewContent").innerHTML = r.questions.map((q,i)=>{
    const stu = r.answers[i];
    let state, stateLabel;
    if(stu===null){ state="unanswered"; stateLabel="Unanswered"; }
    else if(stu===q.answer){ state="correct"; stateLabel="Correct"; }
    else { state="incorrect"; stateLabel="Incorrect"; }
    const stuLetter = stu===null ? "—" : "ABCD"[stu];
    const corrLetter = "ABCD"[q.answer];
    const stuText = stu===null ? "Not answered" : q.options[stu];
    return `<div class="review-item ${state}">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
        <span class="q-tag category">${q.category}</span>
        <span class="q-tag ${state==='correct'?'easy':(state==='incorrect'?'hard':'medium')}">${stateLabel}</span>
      </div>
      <h4>${i+1}. ${q.question}</h4>
      <div class="review-answer student ${state==='correct'?'correct':'wrong'}"><strong>Your answer:</strong> ${stuLetter}. ${stuText}</div>
      <div class="review-answer correct-ans"><strong>Correct answer:</strong> ${corrLetter}. ${q.options[q.answer]}</div>
      <p style="margin:8px 0;color:#334155;font-size:.92rem;">${q.explanation}</p>
      ${q.formula?`<div class="review-formula">${q.formula}</div>`:""}
      ${q.solution?`<div style="margin-top:6px;font-size:.88rem;color:#475569;"><strong>Solution:</strong> ${q.solution}</div>`:""}
    </div>`;
  }).join("");
}

/* ---------- PROGRESS ---------- */
function renderProgress(){
  const p = loadProgress();
  const acc = p.totalQuestions>0 ? Math.round(p.correct/p.totalQuestions*100) : 0;
  const overallPct = p.totalPossible>0 ? Math.round(p.learningDone/p.totalPossible*100) : 0;
  const avg = p.quizzesCompleted>0 ? Math.round(p.bestScore) : 0;

  let catRows = Object.keys(p.categoryPerf).map(cat=>{
    const d = p.categoryPerf[cat];
    const total = d.c+d.w;
    const pct = total>0 ? Math.round(d.c/total*100) : 0;
    return `<tr><td>${cat}</td><td>${d.c}</td><td>${d.w}</td><td>${total}</td><td>${pct}%</td></tr>`;
  }).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--gray);">No category data yet.</td></tr>`;

  $("progressContent").innerHTML = `
    <div class="stats-grid">
      <div class="stat accent"><div class="num">${p.quizzesCompleted}</div><div class="lbl">Quizzes</div></div>
      <div class="stat"><div class="num">${p.totalQuestions}</div><div class="lbl">Answered</div></div>
      <div class="stat accent"><div class="num">${p.correct}</div><div class="lbl">Correct</div></div>
      <div class="stat"><div class="num">${p.incorrect}</div><div class="lbl">Incorrect</div></div>
      <div class="stat accent"><div class="num">${acc}%</div><div class="lbl">Accuracy</div></div>
      <div class="stat"><div class="num">${p.bestScore}%</div><div class="lbl">Best Score</div></div>
      <div class="stat accent"><div class="num">${p.lastScore}%</div><div class="lbl">Last Score</div></div>
      <div class="stat"><div class="num">${avg}%</div><div class="lbl">Average</div></div>
    </div>
    <div class="card">
      <h3 class="card-title">&#128202; Overall Progress</h3>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><strong style="color:var(--navy)">Learning Progress</strong><strong style="color:var(--electric)">${overallPct}%</strong></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${overallPct}%"></div></div>
    </div>
    <div class="card">
      <h3 class="card-title">&#128202; Category Performance</h3>
      <table><thead><tr><th>Category</th><th>Correct</th><th>Wrong</th><th>Total</th><th>Accuracy</th></tr></thead><tbody>${catRows}</tbody></table>
    </div>`;
}

function confirmResetProgress(){
  showModal("Reset Progress?","This will delete all saved progress on this device. This cannot be undone.",()=>{
    saveProgress(defaultProgress());
    renderDashboard(); renderProgress();
    toast("Progress reset.");
  });
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  renderSetup();
  setModeButtons();
  renderDashboard();
  renderStudy();
  renderResults();
  renderProgress();
  $("menuToggle").addEventListener("click",()=>$("navMenu").classList.toggle("open"));
  // nav buttons
  document.querySelectorAll("#navMenu button").forEach(b=>{
    b.addEventListener("click",()=>goTo(b.getAttribute("data-view")));
  });
  // prevent accidental loss
  window.addEventListener("beforeunload",(e)=>{
    if(quizStarted && selectedMode==="exam" && !lastResult){
      e.preventDefault(); e.returnValue="";
    }
  });
});
