'use client';
import {useEffect} from 'react';
export default function BrandEffects(){useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('isVisible');observer.unobserve(e.target)}})},{threshold:.08});const nodes=document.querySelectorAll('main>section:not(:first-child)');nodes.forEach(n=>{n.classList.add('scrollReveal');observer.observe(n)});return()=>{observer.disconnect();nodes.forEach(n=>n.classList.remove('scrollReveal'))}},[]);return null}
