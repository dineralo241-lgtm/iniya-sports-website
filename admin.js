import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,EmailAuthProvider,reauthenticateWithCredential,updatePassword} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,onSnapshot,setDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {getStorage,ref as storageRef,uploadBytes,getDownloadURL} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';
const ADMIN_UID='xEnhWM5Wvabjlkkf5DctPtYw2l02';
const ADMIN_USERNAME='01768487228';
const ADMIN_EMAIL='dineralo241@gmail.com';
const $=id=>document.getElementById(id), app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app),site=doc(db,'store','site');
let state={products:[],categories:['ফুটবল','ক্রিকেট','ব্যাডমিন্টন','জার্সি','বুট','কিডস','অন্যান্য'],settings:{},categoryPhotos:{}},unsubscribe=null;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(t){$('status').textContent=t;}
function upload(input){const url=(input?.value||'').trim();if(!url)return null;try{const u=new URL(url);if(u.protocol!=='https:')throw Error();return u.href;}catch{throw Error('সরাসরি HTTPS ছবির লিংক দিন।')}}
async function save(){await setDoc(site,state);notice('লাইভ সাইটে সংরক্ষণ হয়েছে।');}
function render(){let cats=state.categories;$('pcat').innerHTML=cats.map(c=>`<option>${safe(c)}</option>`).join('');$('count').textContent=state.products.length+'টি';let q=$('filter').value.toLowerCase();$('productList').innerHTML=state.products.filter(p=>(p.name+' '+p.cat).toLowerCase().includes(q)).map(p=>`<div class="item"><img src="${safe(p.image)}"><div><b>${safe(p.name)}</b><small>${safe(p.cat)} • ৳${safe(p.offer||p.price)}</small><small><a href="./?product=${encodeURIComponent(p.id)}" target="_blank">পণ্য লিংক খুলুন</a></small></div><button data-edit="${safe(p.id)}">এডিট</button><button class="light" data-copy="${safe(p.id)}">লিংক কপি</button><button class="light" data-share="${safe(p.id)}">Facebook</button><button class="danger" data-delete="${safe(p.id)}">মুছুন</button></div>`).join('');$('catList').innerHTML=cats.map(c=>`<div class="item"><img src="${safe(state.categoryPhotos[c]||'')}" onerror="this.style.display='none'"><div>${safe(c)}</div><button data-cat-edit="${safe(c)}">ছবি পরিবর্তন</button><button class="danger" data-cat-delete="${safe(c)}">মুছুন</button></div>`).join('');}
function link(id){return new URL('./?product='+encodeURIComponent(id),location.href).href;}
$('loginForm').onsubmit=async e=>{e.preventDefault();try{$('loginError').textContent='লগইন যাচাই হচ্ছে...';if($('email').value.trim()!==ADMIN_USERNAME)throw Error('সঠিক অ্যাডমিন আইডি লিখুন।');const result=await signInWithEmailAndPassword(auth,ADMIN_EMAIL,$('password').value);if(result.user.uid!==ADMIN_UID){await signOut(auth);throw Error('এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।')} $('loginError').textContent='';}catch(err){$('loginError').textContent='লগইন হয়নি: '+(err.code==='auth/invalid-credential'?'পাসওয়ার্ড সঠিক নয়। Firebase-এ পাসওয়ার্ড রিসেট করুন।':err.code==='auth/unauthorized-domain'?'এই ওয়েবসাইটের ডোমেইন Firebase Authentication → Settings → Authorized domains-এ যোগ করুন।':err.message)}};
onAuthStateChanged(auth,user=>{if(user && user.uid!==ADMIN_UID){signOut(auth);user=null;}if(unsubscribe){unsubscribe();unsubscribe=null;}$('login').classList.toggle('hide',!!user);$('dashboard').classList.toggle('hide',!user);if(user){$('signedIn').textContent=user.email;unsubscribe=onSnapshot(site,s=>{if(s.exists())state={...state,...s.data()};else fetch('../initial-data.json').then(r=>r.json()).then(d=>{state={...state,...d};render();fillSettings();});render();fillSettings();},e=>notice('ডেটা পড়া যায়নি: '+e.message));}});
$('logout').onclick=()=>signOut(auth);
document.querySelectorAll('nav [data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav [data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('hide',x.id!==b.dataset.tab));});
$('reset').onclick=()=>{$('productForm').reset();$('pid').value='';$('pfiles').value='';};$('filter').oninput=render;
$('productForm').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;try{
let id=$('pid').value||'p-'+crypto.randomUUID(),old=state.products.find(x=>x.id===id);
let raw=String($('purl').value||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
let images=raw.length?raw.map(x=>upload({value:x})).filter(Boolean):(old?.images||[]);
const files=Array.from($('pfiles').files||[]);
if(files.length){
  if(!auth.currentUser||auth.currentUser.uid!==ADMIN_UID)throw Error('ছবি আপলোডের জন্য অ্যাডমিন লগইন প্রয়োজন।');
  notice('ছবি আপলোড হচ্ছে...'); if(submit)submit.disabled=true;
  for(let i=0;i<files.length;i++){
    const file=files[i];
    if(!file.type.startsWith('image/'))throw Error('শুধু ছবি ফাইল আপলোড করুন।');
    if(file.size>8*1024*1024)throw Error('প্রতি ছবির সর্বোচ্চ সাইজ ৮ MB হতে পারবে।');
    const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`products/${ADMIN_UID}/${id}/${Date.now()}-${i}-${clean}`;
    const target=storageRef(storage,path);
    await uploadBytes(target,file,{contentType:file.type});
    images.push(await getDownloadURL(target));
    notice(`ছবি আপলোড হচ্ছে... ${i+1}/${files.length}`);
  }
}
images=[...new Set(images)];
let image=images[0]||old?.image;if(!image)throw Error('পণ্যের ছবি দিন');
let p={id,name:$('pname').value.trim(),cat:$('pcat').value,price:Number($('pprice').value),offer:Number($('poffer').value)||0,colors:$('pcolors').value.split(',').map(x=>x.trim()).filter(Boolean),stock:$('pstock').value==='true',description:$('pdesc').value.trim(),image,images};
state.products=old?state.products.map(x=>x.id===id?p:x):[p,...state.products];await save();$('reset').click();render()
}catch(err){alert('সংরক্ষণ হয়নি: '+err.message)}finally{if(submit)submit.disabled=false}};
$('productList').onclick=async e=>{let b=e.target.closest('button');if(!b)return;let id=b.dataset.edit||b.dataset.delete||b.dataset.copy||b.dataset.share,p=state.products.find(x=>x.id===id);if(!p)return;if(b.dataset.copy){await navigator.clipboard.writeText(link(id));notice('পণ্যের লিংক কপি হয়েছে');}else if(b.dataset.share){window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(link(id)),'_blank','noopener');}else if(b.dataset.delete){if(confirm('পণ্য মুছে ফেলবেন?')){state.products=state.products.filter(x=>x.id!==id);await save();render();}}else{ $('pid').value=p.id;$('pname').value=p.name;$('pcat').value=p.cat;$('pprice').value=p.price;$('poffer').value=p.offer||0;$('pcolors').value=(p.colors||[]).join(', ');$('pstock').value=String(p.stock!==false);$('pdesc').value=p.description||'';$('purl').value=(p.images&&p.images.length?p.images:[p.image]).filter(x=>String(x).startsWith('https://')).join('\\n');$('productForm').scrollIntoView({behavior:'smooth'});}};
$('catForm').onsubmit=async e=>{e.preventDefault();try{let c=$('catName').value.trim();if(!c||state.categories.includes(c))throw Error('নতুন ও আলাদা নাম দিন');let url=upload($('catFile'));state.categories.push(c);if(url)state.categoryPhotos[c]=url;await save();e.target.reset();render()}catch(err){alert(err.message)}};
$('catList').onclick=async e=>{let b=e.target.closest('button');if(!b)return;let c=b.dataset.catEdit||b.dataset.catDelete;if(b.dataset.catDelete){if(state.products.some(p=>p.cat===c))return alert('এই ক্যাটাগরিতে পণ্য আছে; আগে সরিয়ে নিন');if(confirm('ক্যাটাগরি মুছবেন?')){state.categories=state.categories.filter(x=>x!==c);delete state.categoryPhotos[c];await save();render();}}else{let url=prompt('ক্যাটাগরির নতুন HTTPS ছবির লিংক দিন',state.categoryPhotos[c]||'');if(url!==null){try{state.categoryPhotos[c]=upload({value:url})||'';await save();render()}catch(err){alert(err.message)}}}};
const slideBox=$('slides'),offerBox=$('offers');for(let i=1;i<=10;i++){slideBox.insertAdjacentHTML('beforeend',`<div><label>ব্যানার স্লাইড ${i}</label><input type="url" placeholder="https://.../banner.jpg" id="slide${i}"></div>`);offerBox.insertAdjacentHTML('beforeend',`<div><h3>অফার ${i}</h3><label>শিরোনাম</label><input id="offerTitle${i}"><label>বিবরণ</label><input id="offerDesc${i}"><label>ছবি</label><input type="url" placeholder="https://.../offer.jpg" id="offerFile${i}"></div>`);}
function fillSettings(){let s=state.settings||{};$('shopName').value=s.name||'ইনায়া স্পোর্টস এন্ড গেইমিং';for(let i=1;i<=10;i++){$('offerTitle'+i).value=s['offerTitle'+i]||'';$('offerDesc'+i).value=s['offerDesc'+i]||'';}$('address').value=s.address||'ভাগলপুর, বাজিতপুর, কিশোরগঞ্জ';$('whatsapp').value=s.whatsapp||'8801768487228';$('bkash').value=s.bkash||'01939224475';$('nagad').value=s.nagad||'01768487228';$('logo').value=s.logo||'';$('hero').value=s.hero||'';$('bgColor').value=s.bgColor||'#f4f7f5';$('bgImage').value=s.bgImage||'';for(let i=1;i<=10;i++){$('slide'+i).value=s['heroSlide'+i]||'';$('offerFile'+i).value=s['offer'+i]||'';}}
$('designForm').onsubmit=async e=>{e.preventDefault();try{let s=state.settings||{};s.name=$('shopName').value.trim();s.bgColor=$('bgColor').value||'#f4f7f5';let bgImage=upload($('bgImage'));s.bgImage=bgImage||'';let logo=upload($('logo'));if(logo)s.logo=logo;let hero=upload($('hero'));if(hero){s.hero=hero;s.heroSlide1=hero;}for(let i=1;i<=10;i++){let slide=upload($('slide'+i));if(slide)s['heroSlide'+i]=slide;let offer=upload($('offerFile'+i));if(offer)s['offer'+i]=offer;s['offerTitle'+i]=$('offerTitle'+i).value;s['offerDesc'+i]=$('offerDesc'+i).value;}state.settings=s;await save();}catch(err){alert(err.message)}};
$('contactForm').onsubmit=async e=>{e.preventDefault();state.settings={...state.settings,address:$('address').value,whatsapp:$('whatsapp').value.replace(/[^0-9]/g,''),bkash:$('bkash').value,nagad:$('nagad').value};try{await save()}catch(err){alert(err.message)}};
$('passwordForm').onsubmit=async e=>{e.preventDefault();try{let user=auth.currentUser;await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,$('currentPassword').value));await updatePassword(user,$('newPassword').value);e.target.reset();notice('পাসওয়ার্ড পরিবর্তন হয়েছে')}catch(err){alert(err.message)}};
