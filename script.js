const starterProducts = [
 {id:1,name:"Філадельфія",category:"Роли",price:285,weight:300,description:"Лосось, вершковий сир, огірок та рис.",image:"https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80"},
 {id:2,name:"Каліфорнія",category:"Роли",price:245,weight:280,description:"Ніжний рол з авокадо та ікрою тобіко.",image:"https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80"},
 {id:3,name:"Сет Самурай",category:"Сети",price:690,weight:900,description:"Добірка популярних ролів для компанії.",image:"https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80"}
];
const $ = s => document.querySelector(s);
let products = JSON.parse(localStorage.getItem("sushimir_products") || "null") || starterProducts;
let cart = {};
let category = "Усі";
const save = () => localStorage.setItem("sushimir_products", JSON.stringify(products));
const money = n => `${Number(n).toLocaleString("uk-UA")} ₴`;
function renderProducts(){
 const list = products.filter(p=>category==="Усі"||p.category===category);
 $("#products").innerHTML = list.length ? list.map(p=>`<article class="product-card"><div class="product-image"><img src="${escapeAttr(p.image||"")}" alt="${escapeAttr(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80'"><span class="product-category">${escapeHtml(p.category)}</span></div><div class="product-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||"Смачна страва від SUSHI MIR.")}</p><div class="product-meta"><div><span class="weight">${p.weight?`${p.weight} г`:""}</span><div class="price">${money(p.price)}</div></div><button class="add-btn" onclick="addToCart(${p.id})" aria-label="Додати в кошик">+</button></div></div></article>`).join("") : `<div class="empty">У цій категорії поки немає товарів.</div>`;
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function escapeAttr(s=""){return escapeHtml(s);}
function addToCart(id){cart[id]=(cart[id]||0)+1;renderCart();openCart();}
function changeQty(id,delta){cart[id]=(cart[id]||0)+delta;if(cart[id]<=0)delete cart[id];renderCart();}
function removeCart(id){delete cart[id];renderCart();}
function cartRows(){return Object.entries(cart).map(([id,qty])=>({p:products.find(x=>x.id==id),qty})).filter(x=>x.p);}
function total(){return cartRows().reduce((s,x)=>s+x.p.price*x.qty,0);}
function renderCart(){
 const rows=cartRows();
 $("#cartCount").textContent=rows.reduce((s,x)=>s+x.qty,0);
 $("#cartTotal").textContent=money(total());
 $("#modalTotal").textContent=money(total());
 $("#cartItems").innerHTML=rows.length?rows.map(({p,qty})=>`<div class="cart-row"><img src="${escapeAttr(p.image)}" alt=""><div><b>${escapeHtml(p.name)}</b><small>${money(p.price)} ${p.weight?`• ${p.weight} г`:""}</small><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><span>${qty}</span><button onclick="changeQty(${p.id},1)">+</button></div></div><button class="remove" onclick="removeCart(${p.id})">✕</button></div>`).join(""):`<div class="empty">Кошик поки порожній. Додай щось смачненьке 🍣</div>`;
}
function openCart(){$("#cartOverlay").classList.add("show");$("#cartDrawer").classList.add("show");}
function closeCart(){$("#cartOverlay").classList.remove("show");$("#cartDrawer").classList.remove("show");}
$("#cartOpen").onclick=openCart;$("#cartClose").onclick=closeCart;$("#cartOverlay").onclick=closeCart;
$("#checkoutBtn").onclick=()=>{if(!cartRows().length){alert("Спочатку додай товари в кошик.");return;}closeCart();$("#orderModal").classList.add("show");};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.remove("show"));
document.querySelectorAll(".modal-backdrop").forEach(b=>b.addEventListener("click",e=>{if(e.target===b)b.classList.remove("show")}));
$("#orderForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!cartRows().length){alert("Кошик порожній.");return;}
 const form=e.currentTarget;
 const submit=form.querySelector('button[type="submit"]');
 const original=submit.innerHTML;
 submit.disabled=true;submit.textContent="Надсилаємо замовлення...";
 const payload=Object.fromEntries(new FormData(form).entries());
 payload.items=cartRows().map(({p,qty})=>({name:p.name,quantity:qty,price:Number(p.price),weight:Number(p.weight)||0}));
 payload.total=total();
 try{
   const response=await fetch("/.netlify/functions/send-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok) throw new Error(result.error||"Не вдалося надіслати замовлення.");
   cart={};renderCart();form.reset();$("#orderModal").classList.remove("show");
   window.location.href="/success.html";
 }catch(err){
   alert("Не вдалося відправити замовлення. Перевір налаштування Telegram-бота або спробуй ще раз.\n"+err.message);
 }finally{submit.disabled=false;submit.innerHTML=original;}
});
$("#filters").addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(!b)return;category=b.dataset.category;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderProducts();});
$("#adminOpen").onclick=()=>{renderAdmin();$("#adminModal").classList.add("show");};
$("#pImage").addEventListener("change",()=>{$("#pImageUrl").value="";});
$("#productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const file=$("#pImage").files[0];
 let image=$("#pImageUrl").value.trim();
 if(file) image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
 if(!image) image="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80";
 products.push({id:Date.now(),name:$("#pName").value.trim(),category:$("#pCategory").value,price:Number($("#pPrice").value),weight:Number($("#pWeight").value)||0,description:$("#pDescription").value.trim(),image});
 save();e.target.reset();renderProducts();renderAdmin();
});
function renderAdmin(){
 $("#adminProductCount").textContent=`${products.length} товарів`;
 $("#adminProducts").innerHTML=products.length?products.map(p=>`<div class="admin-product"><img src="${escapeAttr(p.image)}" alt=""><div><b>${escapeHtml(p.name)}</b><small>${money(p.price)} · ${p.weight?p.weight+" г":"вага не вказана"} · ${escapeHtml(p.category)}</small></div><button class="delete-btn" onclick="deleteProduct(${p.id})">Видалити</button></div>`).join(""):"<p class='optional'>Товарів ще немає.</p>";
}
function deleteProduct(id){if(!confirm("Видалити цей товар?"))return;products=products.filter(p=>p.id!==id);delete cart[id];save();renderProducts();renderAdmin();renderCart();}
$("#year").textContent=new Date().getFullYear();
renderProducts();renderCart();
