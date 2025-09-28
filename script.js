// DEFAULT WORDS
let allWords = ["בר", "בירה", "סיבה", "חלב", "מים", "לחם", "תפוח"];
let targetWords = [];
let letters = [];

let currentGuess="", foundWords=[];
let revealedLetters = [];
let parsedWordLists = {};

let dragging=false, usedButtons=new Set();
const positions = new Map();
let path = [], lastPointer=null;

const canvas = document.getElementById("lineCanvas");
const ctx = canvas.getContext("2d");

// Set the canvas dimensions to match the circle
canvas.width = 500;
canvas.height = 500;

const circleEl = document.getElementById("circle");
let eventsAttached = false;

// Update the center and radius values for the new size
const center = {x: 250, y: 250};
const radius = 250 - 30; 

const messageEl = document.getElementById("message");

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Pick random words
function pickRandomWords(words, maxCount = 4){
  const shuffled = words.slice().sort(()=>Math.random()-0.5);
  return shuffled.slice(0, Math.min(maxCount, shuffled.length));
}

// Render board
function renderBoard(){
  const board=document.getElementById("board"); board.innerHTML="";
  const displayCount = parseInt(document.getElementById("displayWordCountInput").value) || 2;
  const wordsToDisplay = targetWords.slice(0, displayCount + foundWords.length);

  wordsToDisplay.forEach((word,wi)=>{
    let rowHTML="";
    for(let ci=0; ci<word.length; ci++){
      const ch=word[ci];
      const show = foundWords.includes(word) || revealedLetters[wi][ci];
      rowHTML += `<span style="display:inline-block;width:28px">${show?ch:"_"}</span>`;
    }
    board.innerHTML+=`<div class="word-row">${rowHTML}</div>`;
  });
}

// Render letters
function renderLetters(){
  circleEl.innerHTML=""; positions.clear(); path=[]; lastPointer=null; clearCanvas();
  const angleStep = (2*Math.PI)/letters.length;
  letters.forEach((letter,i)=>{
    const angle = i*angleStep - Math.PI/2;
    const x = center.x + radius*Math.cos(angle)-30;
    const y = center.y + radius*Math.sin(angle)-30;
    const btn = document.createElement("button");
    btn.innerText = letter;
    btn.style.left=`${x}px`; btn.style.top=`${y}px`;
    btn.dataset.letter = letter;
    positions.set(btn,{x:x+30,y:y+30});
    btn.addEventListener("click",()=>{ if(!dragging){ addLetter(letter,btn); checkWord(); }});
    circleEl.appendChild(btn);
  });
  attachEventsOnce();
}

function getDisplayedWords() {
  const displayCount = parseInt(document.getElementById('displayWordCountInput').value) || 2;
  return targetWords.slice(0, displayCount + foundWords.length);
}

function updateLettersForDisplay() {
  const displayedWords = getDisplayedWords();
  const unsolvedWords = displayedWords.filter(w => !foundWords.includes(w));
  
  // Only include letters from unsolved words that are currently displayed
  // This ensures common letters between solved and unsolved words are preserved
  const source = unsolvedWords.length > 0 ? unsolvedWords : [];
  letters = [...new Set(source.join("").split(""))];
  shuffleArray(letters);
  renderLetters();
}

function attachEventsOnce(){
  if(eventsAttached) return; eventsAttached=true;
  circleEl.addEventListener("mousedown",startDrag,{passive:false});
  document.addEventListener("mousemove",dragMove,{passive:false});
  document.addEventListener("mouseup",endDrag);
  circleEl.addEventListener("touchstart",startDrag,{passive:false});
  document.addEventListener("touchmove",dragMove,{passive:false});
  document.addEventListener("touchend",endDrag);
  document.addEventListener("touchcancel",endDrag);
}

function startDrag(e){ if(e.type==='touchstart') e.preventDefault(); dragging=true; usedButtons.clear(); path=[]; lastPointer=null; currentGuess=""; document.getElementById("guess").innerText=""; document.querySelectorAll("#circle button").forEach(b=>b.classList.remove("active")); clearCanvas(); processPointerEvent(e); }
function dragMove(e){ if(!dragging) return; if(e.type==='touchmove') e.preventDefault(); processPointerEvent(e); }
function processPointerEvent(e){
  const point=e.touches?e.touches[0]:e;
  const rect=canvas.getBoundingClientRect();
  lastPointer={x:point.clientX-rect.left,y:point.clientY-rect.top};
  let el=document.elementFromPoint(point.clientX,point.clientY);
  if(el){
    const btnElem = el.tagName==='BUTTON'?el:(el.closest?el.closest('button'):null);
    if(btnElem && positions.has(btnElem) && !usedButtons.has(btnElem)){
      addLetter(btnElem.dataset.letter,btnElem); usedButtons.add(btnElem);
      const pos = positions.get(btnElem); if(pos) path.push(pos);
    }
  }
  drawPath();
}

function endDrag(){ if(!dragging) return; dragging=false; checkWord(); usedButtons.clear(); path=[]; lastPointer=null; clearCanvas(); document.querySelectorAll("#circle button").forEach(b=>b.classList.remove("active")); }

function addLetter(letter,btn){ currentGuess+=letter; document.getElementById("guess").innerText=currentGuess; if(btn) btn.classList.add("active"); }

function checkWord(){
  if(!currentGuess) return;
  const idx = targetWords.indexOf(currentGuess);
  if(idx!==-1 && !foundWords.includes(currentGuess)){
    foundWords.push(currentGuess);
    revealedLetters[idx] = revealedLetters[idx].map(()=>true);
    renderBoard();
    updateLettersForDisplay();
  }
  currentGuess=""; document.getElementById("guess").innerText="";
  showMessageIfDone();
}

// FIX: Corrected delete function
function deleteLetter(){
  if(currentGuess.length > 0){
    currentGuess = currentGuess.slice(0, -1);
    document.getElementById("guess").innerText = currentGuess;
  }
}

function giveHint(){
  for(let wi=0;wi<targetWords.length;wi++){
    if(revealedLetters[wi].every(Boolean)) continue;
    for(let ci=0;ci<revealedLetters[wi].length;ci++){
      if(!revealedLetters[wi][ci]){
        revealedLetters[wi][ci]=true;
        if(revealedLetters[wi].every(Boolean) && !foundWords.includes(targetWords[wi])) foundWords.push(targetWords[wi]);
        renderBoard();
        updateLettersForDisplay();
        break;
      }
    }
  }
  showMessageIfDone();
}

function restartGame(){ 
  // Select ALL words from the list, not just 4
  targetWords = [...allWords];

  currentGuess=""; foundWords=[]; revealedLetters = targetWords.map(w=>Array.from({length:w.length},()=>false)); 

  document.getElementById("guess").innerText=""; 
  renderBoard(); updateLettersForDisplay(); clearCanvas(); hideMessage(); 
}

// Show/hide message
function showMessageIfDone(){
  if(foundWords.length===targetWords.length){
    messageEl.classList.add("show");
    setTimeout(()=>{ messageEl.classList.remove("show"); },2000);
  } else {
    messageEl.classList.remove("show");
  }
}
function hideMessage(){ messageEl.classList.remove("show"); }

// Clamp point to circle
function clampToCircle(point){
  const dx=point.x-center.x, dy=point.y-center.y;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>radius){ const scale=radius/dist; return {x:center.x+dx*scale, y:center.y+dy*scale}; }
  return point;
}

// Draw elastic line
function drawPath(){
  clearCanvas(); if(!lastPointer && path.length===0) return;
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='red'; ctx.lineWidth=4;
  ctx.beginPath();
  let points = path.slice();
  if(lastPointer) points.push(clampToCircle(lastPointer));
  if(points.length>0){
    ctx.moveTo(points[0].x, points[0].y);
    for(let i=1;i<points.length;i++){
      const mx=(points[i-1].x+points[i].x)/2;
      const my=(points[i-1].y+points[i].y)/2;
      ctx.quadraticCurveTo(points[i-1].x,points[i-1].y,mx,my);
    }
    const last=points[points.length-1]; ctx.lineTo(last.x,last.y); ctx.stroke();
  }
}

function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

// NEW: Word list functions
document.getElementById('wordFileInput').addEventListener('change', handleFileSelect, false);
document.getElementById('wordListSelector').addEventListener('change', handleListSelection);
document.getElementById('displayWordCountInput').addEventListener('input', handleDisplayCountChange);
document.getElementById('displayWordCountInput').addEventListener('change', handleDisplayCountChange);

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const contents = e.target.result;
    parsedWordLists = parseWordFile(contents);
    
    const listNames = Object.keys(parsedWordLists);
    populateDropdown(listNames);

    if (listNames.length > 0) {
      document.getElementById('wordListSelector').value = listNames[0];
      handleListSelection();
    }
  };
  reader.readAsText(file);
}

function parseWordFile(content) {
  const lists = {};
  const lines = content.split('\n');
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
      const listName = parts[0].trim();
      const words = parts[1].split(',').map(word => word.trim());
      if (listName && words.length > 0) {
        lists[listName] = words;
      }
    }
  });
  return lists;
}

function populateDropdown(listNames) {
  const selector = document.getElementById('wordListSelector');
  selector.innerHTML = '<option value="">-- Select a Word List --</option>';
  listNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    selector.appendChild(option);
  });
  selector.disabled = false;
}

function handleListSelection() {
  const selector = document.getElementById('wordListSelector');
  const selectedListName = selector.value;
  if (selectedListName && parsedWordLists[selectedListName]) {
    allWords = parsedWordLists[selectedListName];
    restartGame();
    console.log(`Loaded list: ${selectedListName} with ${allWords.length} words.`);
  } else {
    // This will run if the user selects the default "-- Select a Word List --" option
    // It will reset the game to the default words
    allWords = ["בר", "בירה", "סיבה", "חלב", "מים", "לחם", "תפוח"];
    restartGame();
  }
}

function handleDisplayCountChange() {
  // Do not reset targetWords or progress. Only re-compute letters and re-render.
  if (!targetWords || targetWords.length === 0) return;
  renderBoard();
  updateLettersForDisplay();
}

// INIT
async function loadWordsFromDefaultFile() {
  if (window.location.protocol === 'file:') {
    console.warn('Running from file:// — browsers block fetch for local files. Please serve via a local web server.');
  }
  try {
    const response = await fetch('./words.txt', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to fetch words.txt: ${response.status}`);
    const contents = await response.text();
    const lists = parseWordFile(contents);
    const listNames = Object.keys(lists);
    if (listNames.length > 0) {
      parsedWordLists = lists;
      populateDropdown(listNames);
      document.getElementById('wordListSelector').value = listNames[0];
      handleListSelection();
      return;
    }
  } catch (err) {
    console.warn('Could not load words.txt at startup:', err);
  }
  restartGame();
}

loadWordsFromDefaultFile();

window.deleteLetter = deleteLetter;
window.giveHint = giveHint;
window.restartGame = restartGame;
