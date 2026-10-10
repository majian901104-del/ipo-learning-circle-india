'use strict';
const form = document.getElementById('leadForm');
const button = document.getElementById('submitBtn');
const status = document.getElementById('setupNote');
const params = new URLSearchParams(location.search);
for (const key of ['utm_source','utm_campaign']) {
  document.getElementById(key).value = (params.get(key) || '').slice(0,120);
}
button.disabled = false;
let sending = false;
form.addEventListener('submit',async event => {
  event.preventDefault();
  if(sending) return;
  form.elements.whatsapp.setCustomValidity('');
  if(!form.reportValidity()) return;
  const phone = form.elements.whatsapp;
  const digits = phone.value.replace(/\D/g,'');
  phone.setCustomValidity('');
  if(digits.length < 7 || digits.length > 15) {
    phone.setCustomValidity('Enter a valid phone number with 7–15 digits, including the country code.');
    phone.reportValidity(); return;
  }
  sending = true; button.disabled = true; button.textContent = 'SENDING REQUEST…';
  form.setAttribute('aria-busy','true');
  status.hidden = false; status.textContent = 'Please wait while we confirm your request was received.';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),20000);
  try {
    const body = new URLSearchParams();
    new FormData(form).forEach((value,key) => body.append(key,String(value)));
    const response = await fetch(form.action,{method:'POST',body,signal:controller.signal,redirect:'follow'});
    if(!response.ok) throw Error('network');
    const result = await response.json();
    if(result.ok !== true) throw Error(result.error || 'rejected');
    status.textContent = 'Request received. Opening your request status…';
    // Only a readable affirmative server response can continue this flow.
    const target = new URL('join.html',location.href);
    target.searchParams.set('status','received');
    location.assign(target.href);
  } catch(error) {
    status.textContent = 'Submission not confirmed. Please do not assume your request was received. Your entries are still here; you may retry later. If the issue persists, do not submit repeatedly.';
    status.focus();
    button.disabled = false; button.textContent = 'RETRY REQUEST';
    sending = false;
  } finally {
    clearTimeout(timeout); form.removeAttribute('aria-busy');
  }
});
form.elements.whatsapp.addEventListener('input',event => event.target.setCustomValidity(''));
