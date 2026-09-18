const button = document.querySelector<HTMLButtonElement>("#toggle")!;
const statusText = document.querySelector<HTMLElement>("#status")!;

async function currentTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true}); return tab;
}
async function refresh(): Promise<void> {
  const tab = await currentTab();
  if (!tab?.id) return unavailable();
  try { const result = await chrome.tabs.sendMessage(tab.id,{command:"get-status"}) as {active:boolean}; setUi(result.active); }
  catch { unavailable(); }
}
button.addEventListener("click",async()=>{
  const tab=await currentTab(); if(!tab?.id)return unavailable();
  try{const result=await chrome.tabs.sendMessage(tab.id,{command:"toggle-inspector"}) as {active:boolean};setUi(result.active);window.close();}
  catch{unavailable();}
});
function setUi(active:boolean):void{statusText.textContent=active?"Inspector active":"Ready";button.textContent=active?"Close inspector":"Inspect this page";button.disabled=false;}
function unavailable():void{statusText.textContent="This page cannot be inspected";button.textContent="Unavailable";button.disabled=true;}
void refresh();
