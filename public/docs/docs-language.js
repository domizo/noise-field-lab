const language=document.documentElement.lang==='ja'?'ja':'en';
try{localStorage.setItem('noise-lab-language',language);}catch{/* The guide works without persistent storage. */}
for(const link of document.querySelectorAll('[data-language]')){
 if(link.dataset.language===language)link.setAttribute('aria-current','page');
 link.addEventListener('click',()=>{
  try{localStorage.setItem('noise-lab-language',link.dataset.language);}catch{/* Optional preference. */}
  const target=new URL(link.href,window.location.href);if(window.location.hash)target.hash=window.location.hash;link.href=target.href;
 });
}
