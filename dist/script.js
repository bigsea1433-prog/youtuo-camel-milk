const header=document.querySelector('.site-header');const menuButton=document.querySelector('.menu-toggle');const nav=document.querySelector('#site-nav');
const updateHeader=()=>header.classList.toggle('scrolled',window.scrollY>24);updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});
menuButton.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open))});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');menuButton.setAttribute('aria-expanded','false')}));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(element=>observer.observe(element));
