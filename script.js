/* ZenBoostMm User Panel shared JavaScript */

// ===== coins page =====
if (document.body && document.body.dataset.page === "coins") {
(function() {


let auth=window.firebaseAuth,db=window.firebaseDB;
function isFirebaseAvailable(){return auth&&db;}

const menu=document.getElementById('menu');
const menuOverlay=document.getElementById('menuOverlay');
const profileInitial=document.getElementById('profileInitial');
const userName=document.getElementById('userName');
const balanceAmount=document.getElementById('balanceAmount');
const dashboardLink=document.getElementById('dashboardLink');
const boostServiceLink=document.getElementById('boostServiceLink');
const otherServiceLink=document.getElementById('otherServiceLink');
const orderHistoryLink=document.getElementById('orderHistoryLink');
const botPanelLink=document.getElementById('botPanelLink');
const logoutLink=document.getElementById('logoutLink');
const quantityInput=document.getElementById('quantity');
const costInput=document.getElementById('cost');
const kpayBtn=document.getElementById('kpayBtn');
const waveBtn=document.getElementById('waveBtn');
const kpayDetails=document.getElementById('kpayDetails');
const waveDetails=document.getElementById('waveDetails');
const kpayIdInput=document.getElementById('kpayId');
const waveIdInput=document.getElementById('waveId');
const orderBtn=document.getElementById('orderBtn');
const errorMessage=document.getElementById('errorMessage');
const errorText=document.getElementById('errorText');
const loading=document.getElementById('loading');
const searchInput=document.getElementById('searchInput');
const successModal=document.getElementById('successModal');
const orderIdDisplay=document.getElementById('orderIdDisplay');

let currentUser=null;
let userBalance=0.00;
let selectedPayment='kpay';
let currentQuantity=0;
const EXCHANGE_RATE=4500;
const COIN_ORDERS_COLLECTION='coinOrders';
const USERS_COLLECTION='users';
const ORDER_STATUS={PENDING:'pending',PROCESSING:'processing',COMPLETED:'completed'};
const PAYMENT_METHODS={KBZ_PAY:'KBZ Pay',WAVE_PAY:'Wave Pay'};

function toggleMenu(){
  menu.classList.toggle('active');
  menuOverlay.classList.toggle('active');
  document.body.style.overflow=menu.classList.contains('active')?'hidden':'';
}
function closeMenu(){
  menu.classList.remove('active');
  menuOverlay.classList.remove('active');
  document.body.style.overflow='';
}
menuOverlay.addEventListener('click',closeMenu);
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&menu.classList.contains('active'))closeMenu();
});

function getProfileInitial(displayName,email){
  if(displayName&&displayName.trim().length>0)return displayName.trim().charAt(0).toUpperCase();
  if(email&&email.trim().length>0)return email.trim().charAt(0).toUpperCase();
  return "?";
}
function updateBalanceDisplay(){
  balanceAmount.textContent=`$${userBalance.toFixed(2)}`;
}
function loadUserBalance(userId){
  if(!isFirebaseAvailable()){userBalance=0;updateBalanceDisplay();return;}
  db.collection(USERS_COLLECTION).doc(userId).get()
    .then((doc)=>{
      if(doc.exists)userBalance=doc.data().balance||0;
      updateBalanceDisplay();
    }).catch(()=>{userBalance=0;updateBalanceDisplay();});
}
function updateUserProfile(user){
  const displayName=user.displayName||"User";
  const email=user.email||"No email";
  profileInitial.textContent=getProfileInitial(displayName,email);
  userName.textContent=displayName.split(' ')[0];
  currentUser=user;
  loadUserBalance(user.uid);
}

function setupNavigation(){
  dashboardLink.addEventListener('click',function(){closeMenu();window.location.href='index.html';});
  boostServiceLink.addEventListener('click',function(){closeMenu();window.location.href='smmpanel.html';});
  otherServiceLink.addEventListener('click',function(){closeMenu();window.location.href='service.html';});
  orderHistoryLink.addEventListener('click',function(){closeMenu();window.location.href='history.html';});
  botPanelLink.addEventListener('click',function(){closeMenu();window.location.href='panel.html';});
  logoutLink.addEventListener('click',function(){
    closeMenu();
    if(auth)auth.signOut().then(()=>window.location.href='login.html');
    else window.location.href='login.html';
  });
}
function checkAuthState(){
  if(!isFirebaseAvailable()){
    profileInitial.textContent="O";
    userName.textContent="Offline";
    updateBalanceDisplay();
    setupNavigation();
    initOrderForm();
    return;
  }
  auth.onAuthStateChanged((user)=>{
    if(user){
      updateUserProfile(user);
      setupNavigation();
      initOrderForm();
      setTimeout(()=>{setupOrderStatusListener();},1000);
    }else{
      window.location.href='login.html';
    }
  });
}
function initOrderForm(){
  selectPayment('kpay');
  quantityInput.addEventListener('input',updateCost);
  searchInput.addEventListener('input',function(){searchServices(this.value);});
  quantityInput.addEventListener('paste',function(e){
    e.preventDefault();
    const pastedText=e.clipboardData.getData('text/plain');
    const numericValue=pastedText.replace(/[^0-9.]/g,'');
    const parts=numericValue.split('.');
    let validValue=parts[0];
    if(parts.length>1)validValue+='.'+parts.slice(1).join('').substring(0,2);
    this.value=validValue;
    updateCost();
  });
  quantityInput.addEventListener('keypress',function(e){
    const char=String.fromCharCode(e.keyCode||e.which);
    if(!/[\d.]/.test(char))e.preventDefault();
    if(char==='.'&&this.value.includes('.'))e.preventDefault();
  });
  [kpayIdInput,waveIdInput].forEach(input=>{
    input.addEventListener('input',function(){
      this.value=this.value.replace(/[^0-9]/g,'');
      if(this.value.length>5)this.value=this.value.slice(0,5);
      if(this.value.length===5){
        this.style.borderColor='#10b981';
      }else{
        this.style.borderColor='';
      }
    });
  });
  quantityInput.addEventListener('keydown',function(e){
    if(e.key==='ArrowUp'){
      e.preventDefault();
      let value=parseFloat(this.value)||0;
      value+=1;
      this.value=value;
      updateCost();
    }
    if(e.key==='ArrowDown'){
      e.preventDefault();
      let value=parseFloat(this.value)||0;
      value=Math.max(1,value-1);
      this.value=value;
      updateCost();
    }
  });
}
function updateCost(){
  let value=quantityInput.value.replace(/[^0-9.]/g,'');
  const dots=value.split('.');
  if(dots.length>2)value=dots[0]+'.'+dots.slice(1).join('');
  if(value===''||value==='.'){
    quantityInput.value='';
    costInput.value='';
    currentQuantity=0;
    return;
  }
  const num=parseFloat(value);
  if(isNaN(num)){
    quantityInput.value='';
    costInput.value='';
    currentQuantity=0;
    return;
  }
  quantityInput.value=num;
  currentQuantity=num;
  const cost=num*EXCHANGE_RATE;
  costInput.value=cost.toLocaleString()+' MMK';
}
function selectPayment(method){
  selectedPayment=method;
  if(method==='kpay'){
    kpayBtn.classList.add('active');
    waveBtn.classList.remove('active');
    kpayDetails.classList.remove('hidden');
    waveDetails.classList.add('hidden');
  }else{
    kpayBtn.classList.remove('active');
    waveBtn.classList.add('active');
    kpayDetails.classList.add('hidden');
    waveDetails.classList.remove('hidden');
  }
}
function searchServices(query){
  const cards=document.querySelectorAll('.service-card');
  const queryLower=query.toLowerCase();
  cards.forEach(card=>{
    const text=card.textContent.toLowerCase();
    card.style.display=text.includes(queryLower)?'block':'none';
  });
}
function showError(message){
  errorText.textContent=message;
  errorMessage.classList.add('active');
  setTimeout(()=>{errorMessage.classList.remove('active');},5000);
}
function hideError(){errorMessage.classList.remove('active');}
function showLoading(){
  loading.classList.add('active');
  orderBtn.disabled=true;
  orderBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processing...';
}
function hideLoading(){
  loading.classList.remove('active');
  orderBtn.disabled=false;
  orderBtn.innerHTML='<i class="fas fa-shopping-cart"></i> Order Coins Now';
}
function generateOrderId(){
  return Math.floor(100000+Math.random()*900000).toString();
}
function showSuccessModal(orderId){
  const formattedOrderId=orderId.match(/.{1,3}/g).join(' ');
  orderIdDisplay.textContent=formattedOrderId;
  successModal.classList.add('active');
  document.body.style.overflow='hidden';
}
function closeModal(){
  successModal.classList.remove('active');
  document.body.style.overflow='';
  resetForm();
}
function resetForm(){
  quantityInput.value='';
  costInput.value='';
  kpayIdInput.value='';
  waveIdInput.value='';
  currentQuantity=0;
  hideError();
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&successModal.classList.contains('active'))closeModal();
});
function validateOrderForm(){
  hideError();
  if(!currentQuantity||currentQuantity<=0){
    showError('Please enter a valid quantity (minimum 1 USD)');
    quantityInput.focus();
    return false;
  }
  if(!isFirebaseAvailable()){
    showError('No internet connection. Please check your connection.');
    return false;
  }
  let paymentId='';
  if(selectedPayment==='kpay'){
    paymentId=kpayIdInput.value.trim();
    if(!paymentId||paymentId.length!==5){
      showError('Please enter a valid KBZ Pay ID (5 digits)');
      kpayIdInput.focus();
      return false;
    }
    if(!/^\d{5}$/.test(paymentId)){
      showError('KBZ Pay ID must contain only numbers');
      kpayIdInput.focus();
      return false;
    }
  }else{
    paymentId=waveIdInput.value.trim();
    if(!paymentId||paymentId.length!==5){
      showError('Please enter a valid Wave Pay ID (5 digits)');
      waveIdInput.focus();
      return false;
    }
    if(!/^\d{5}$/.test(paymentId)){
      showError('Wave Pay ID must contain only numbers');
      waveIdInput.focus();
      return false;
    }
  }
  return true;
}
async function placeOrder(){
  if(!validateOrderForm())return;
  const paymentId=selectedPayment==='kpay'?kpayIdInput.value.trim():waveIdInput.value.trim();
  const usdAmount=currentQuantity;
  const mmkAmount=usdAmount*EXCHANGE_RATE;
  const coinsAmount=mmkAmount;
  const orderId=generateOrderId();
  showLoading();
  try{
    const orderData={
      userId:currentUser.uid,
      userEmail:currentUser.email,
      userName:currentUser.displayName||'User',
      orderId:orderId,
      orderType:'coin_purchase',
      quantity:usdAmount,
      cost:mmkAmount,
      coins:coinsAmount,
      paymentMethod:selectedPayment==='kpay'?PAYMENT_METHODS.KBZ_PAY:PAYMENT_METHODS.WAVE_PAY,
      paymentId:paymentId,
      paymentName:selectedPayment==='kpay'?'Chit Thae Oo':'Ma May Tha Zin Phuu',
      paymentNumber:selectedPayment==='kpay'?'09970573598':'09955157391',
      status:ORDER_STATUS.PENDING,
      statusMessage:'Waiting for admin confirmation',
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    const orderRef=await db.collection(COIN_ORDERS_COLLECTION).add(orderData);
    try{
      await db.collection(USERS_COLLECTION).doc(currentUser.uid).update({
        lastOrderId:orderId,
        lastOrderTime:firebase.firestore.FieldValue.serverTimestamp()
      });
    }catch(userError){}
    hideLoading();
    showSuccessModal(orderId);
  }catch(error){
    hideLoading();
    let errorMsg='Failed to place order. ';
    if(error.code==='permission-denied')errorMsg+='Permission denied.';
    else if(error.code==='unavailable')errorMsg+='Network error.';
    else errorMsg+=error.message;
    showError(errorMsg);
  }
}
async function checkOrderLimits(){
  if(!currentUser||!isFirebaseAvailable())return true;
  try{
    const now=new Date();
    const startOfDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const todayOrdersQuery=await db.collection(COIN_ORDERS_COLLECTION)
      .where('userId','==',currentUser.uid)
      .where('createdAt','>=',startOfDay)
      .where('status','in',[ORDER_STATUS.PENDING,ORDER_STATUS.PROCESSING])
      .get();
    const pendingOrdersCount=todayOrdersQuery.size;
    const MAX_PENDING_ORDERS=3;
    const MAX_DAILY_ORDERS=10;
    if(pendingOrdersCount>=MAX_PENDING_ORDERS){
      showError(`You have ${pendingOrdersCount} pending orders. Please wait.`);
      return false;
    }
    if(todayOrdersQuery.size>=MAX_DAILY_ORDERS){
      showError(`Daily order limit reached. Try again tomorrow.`);
      return false;
    }
    return true;
  }catch(error){
    return true;
  }
}
async function placeOrderEnhanced(){
  const canPlaceOrder=await checkOrderLimits();
  if(!canPlaceOrder)return;
  await placeOrder();
}
function setupOrderStatusListener(){
  if(!currentUser||!isFirebaseAvailable())return;
  try{
    const ordersQuery=db.collection(COIN_ORDERS_COLLECTION)
      .where('userId','==',currentUser.uid)
      .where('status','in',[ORDER_STATUS.PENDING,ORDER_STATUS.PROCESSING])
      .orderBy('createdAt','desc')
      .limit(5);
    ordersQuery.onSnapshot((snapshot)=>{},(error)=>{});
  }catch(error){}
}
function initApp(){
  try{
    checkAuthState();
  }catch(error){
    profileInitial.textContent="G";
    userName.textContent="Guest";
    updateBalanceDisplay();
  }
}
window.addEventListener('DOMContentLoaded',initApp);


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== external page =====
if (document.body && document.body.dataset.page === "external") {
(function() {

function navigateTo(page){window.location.href=page;}
function toggleMenu(){
  const menu=document.getElementById("menu");
  menu.style.display=menu.style.display==="block"?"none":"block";
}
async function copyPhoneNumber(){
  const phoneNumber="09686218508";
  const copyBtn=document.getElementById("copyButton");
  const originalText=copyBtn.innerHTML;
  const copySuccess=document.getElementById("copySuccess");
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(phoneNumber);
      showCopySuccess(copyBtn,copySuccess,originalText);
      return;
    }
    const textArea=document.createElement("textarea");
    textArea.value=phoneNumber;
    textArea.style.position="fixed";
    textArea.style.left="-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful=document.execCommand('copy');
    document.body.removeChild(textArea);
    if(successful){showCopySuccess(copyBtn,copySuccess,originalText);}
    else{fallbackCopyMethod(phoneNumber,copyBtn,copySuccess,originalText);}
  }catch(err){
    console.error('Copy failed:',err);
    fallbackCopyMethod(phoneNumber,copyBtn,copySuccess,originalText);
  }
}
function showCopySuccess(copyBtn,copySuccess,originalText){
  copyBtn.innerHTML='<i class="fas fa-check"></i> Copied!';
  copyBtn.disabled=true;
  copySuccess.style.display="flex";
  setTimeout(()=>{copySuccess.style.display="none";},3000);
  setTimeout(()=>{
    copyBtn.innerHTML=originalText;
    copyBtn.disabled=false;
  },2000);
}
function fallbackCopyMethod(text,copyBtn,copySuccess,originalText){
  const confirmed=confirm(`Phone number: ${text}\n\nClick OK to copy.`);
  if(confirmed){
    const textArea=document.createElement("textarea");
    textArea.value=text;
    document.body.appendChild(textArea);
    textArea.select();
    try{document.execCommand('copy');showCopySuccess(copyBtn,copySuccess,originalText);}
    catch(err){alert('Please copy manually: '+text);}
    document.body.removeChild(textArea);
  }
}
document.addEventListener('click',function(event){
  const menu=document.getElementById("menu");
  const menuIcon=document.querySelector('.menu-icon');
  if(menu&&menuIcon&&!menu.contains(event.target)&&!menuIcon.contains(event.target)){
    menu.style.display="none";
  }
});
document.getElementById('phoneNumber').addEventListener('click',function(){
  const range=document.createRange();
  range.selectNodeContents(this);
  const selection=window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
});


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== history page =====
if (document.body && document.body.dataset.page === "history") {
(function() {


const auth=window.firebaseAuth;
const db=window.firebaseDB;

const menu=document.getElementById('menu');
const menuOverlay=document.getElementById('menuOverlay');
const profileInitial=document.getElementById('profileInitial');
const userName=document.getElementById('userName');
const balanceAmount=document.getElementById('balanceAmount');
const dashboardLink=document.getElementById('dashboardLink');
const boostServiceLink=document.getElementById('boostServiceLink');
const otherServiceLink=document.getElementById('otherServiceLink');
const addFundsLink=document.getElementById('addFundsLink');
const botPanelLink=document.getElementById('botPanelLink');
const logoutLink=document.getElementById('logoutLink');
const orderIdSearch=document.getElementById('orderIdSearch');
const statusFilter=document.getElementById('statusFilter');
const searchBtn=document.getElementById('searchBtn');
const resetBtn=document.getElementById('resetBtn');
const ordersTableContainer=document.getElementById('ordersTableContainer');
const loadingState=document.getElementById('loadingState');
const errorState=document.getElementById('errorState');
const emptyState=document.getElementById('emptyState');
const errorTitle=document.getElementById('errorTitle');
const errorMessage=document.getElementById('errorMessage');
const retryBtn=document.getElementById('retryBtn');
const totalOrders=document.getElementById('totalOrders');
const pagination=document.getElementById('pagination');
const prevPage=document.getElementById('prevPage');
const nextPage=document.getElementById('nextPage');
const pageNumbers=document.getElementById('pageNumbers');

let currentUser=null;
let userBalance=0;
let allOrders=[];
let filteredOrders=[];
let currentPage=1;
const ordersPerPage=10;

function toggleMenu(){
  menu.classList.toggle('active');
  menuOverlay.classList.toggle('active');
  document.body.style.overflow=menu.classList.contains('active')?'hidden':'';
}
function closeMenu(){
  menu.classList.remove('active');
  menuOverlay.classList.remove('active');
  document.body.style.overflow='';
}
menuOverlay.addEventListener('click',closeMenu);
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&menu.classList.contains('active'))closeMenu();
});

function updateUserProfile(user){
  if(!user)return;
  currentUser=user;
  let fullName='';
  if(user.displayName){fullName=user.displayName;}
  else if(user.email){
    fullName=user.email.split('@')[0];
    fullName=fullName.replace(/[._-]/g,' ');
    fullName=fullName.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
  }else{fullName="User";}
  profileInitial.textContent=fullName.charAt(0).toUpperCase();
  userName.textContent=fullName;
  userName.title=fullName;
  db.collection('users').doc(user.uid).get().then(doc=>{
    if(doc.exists){
      userBalance=doc.data().balance||0;
      balanceAmount.textContent=`$${userBalance.toFixed(2)}`;
    }
  });
}

function getOrderTime(order){
  if(!order||!order.createdAt)return 0;
  try{
    if(order.createdAt&&typeof order.createdAt.toDate==='function')return order.createdAt.toDate().getTime();
    if(order.createdAt&&order.createdAt.seconds)return order.createdAt.seconds*1000;
    if(order.createdAt instanceof Date)return order.createdAt.getTime();
    return new Date(order.createdAt).getTime();
  }catch(e){return 0;}
}
function formatDate(timestamp){
  if(!timestamp)return 'N/A';
  try{
    let date;
    if(timestamp&&typeof timestamp.toDate==='function')date=timestamp.toDate();
    else if(timestamp&&timestamp.seconds)date=new Date(timestamp.seconds*1000);
    else date=new Date(timestamp);
    if(isNaN(date.getTime()))return 'Invalid Date';
    return date.toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  }catch(e){return 'N/A';}
}
function getStatusBadge(status){
  let statusStr='';
  if(status===null||status===undefined)statusStr='pending';
  else if(typeof status==='string')statusStr=status.toLowerCase().trim();
  else if(typeof status==='number')statusStr=status.toString();
  else statusStr='pending';
  if(statusStr==='completed'||statusStr==='complete'||statusStr==='delivered')return '<span class="status-badge status-completed">Completed</span>';
  if(statusStr==='processing'||statusStr==='in progress'||statusStr==='progress')return '<span class="status-badge status-processing">Processing</span>';
  if(statusStr==='cancelled'||statusStr==='cancel'||statusStr==='canceled')return '<span class="status-badge status-cancelled">Cancelled</span>';
  if(statusStr==='coinadd'||statusStr==='coin_add'||statusStr==='coin')return '<span class="status-badge status-coinadd">Coin Add</span>';
  return '<span class="status-badge status-pending">Pending</span>';
}
function getPaymentMethodDisplay(paymentMethod){
  if(!paymentMethod)return 'N/A';
  const method=String(paymentMethod).toLowerCase();
  if(method.includes('kpay')||method.includes('k pay')||method.includes('kbz'))return 'KBZ Pay';
  if(method.includes('wave'))return 'Wave Pay';
  if(method.includes('credit')||method.includes('card'))return 'Credit Card';
  if(method.includes('paypal'))return 'PayPal';
  return paymentMethod.charAt(0).toUpperCase()+paymentMethod.slice(1);
}

async function loadUserOrders(){
  if(!currentUser)return;
  loadingState.style.display='block';
  emptyState.style.display='none';
  errorState.style.display='none';
  ordersTableContainer.innerHTML='';
  pagination.style.display='none';
  allOrders=[];
  try{
    const collectionsToTry=[
      {name:'orders',type:'Service Order',isCoin:false},
      {name:'coinOrders',type:'💰 Coin Purchase',isCoin:true}
    ];
    for(const coll of collectionsToTry){
      try{
        const snapshot=await db.collection(coll.name).where('userId','==',currentUser.uid).get();
        if(!snapshot.empty){
          snapshot.forEach(doc=>{
            const data=doc.data();
            let orderType='';
            if(coll.isCoin){
              const paymentMethod=data.paymentMethod||data.payment_type||data.method||'N/A';
              orderType=` ${getPaymentMethodDisplay(paymentMethod)}`;
            }else{
              orderType=data.serviceName||data.type||'Service Order';
            }
            let status=data.status||'pending';
            if(coll.isCoin&&status!=='completed'&&status!=='processing'&&status!=='cancelled')status='coinadd';
            allOrders.push({
              id:doc.id,...data,
              orderType:orderType,
              status:status,
              collection:coll.name,
              isCoinOrder:coll.isCoin,
              paymentMethod:data.paymentMethod||data.payment_type||data.method||'N/A'
            });
          });
        }
      }catch(e){}
    }
    allOrders.sort((a,b)=>getOrderTime(b)-getOrderTime(a));
    totalOrders.textContent=allOrders.length;
    if(allOrders.length===0){
      emptyState.style.display='block';
      loadingState.style.display='none';
    }else{
      filteredOrders=[...allOrders];
      renderOrdersTable();
    }
  }catch(error){
    errorTitle.textContent='Error Loading Orders';
    errorMessage.textContent=error.message||'Failed to load orders.';
    errorState.style.display='block';
    loadingState.style.display='none';
  }
}

function renderOrdersTable(){
  loadingState.style.display='none';
  emptyState.style.display='none';
  if(!filteredOrders||filteredOrders.length===0){
    emptyState.style.display='block';
    ordersTableContainer.innerHTML='';
    pagination.style.display='none';
    return;
  }
  const startIdx=(currentPage-1)*ordersPerPage;
  const endIdx=Math.min(startIdx+ordersPerPage,filteredOrders.length);
  const pageOrders=filteredOrders.slice(startIdx,endIdx);
  const totalPages=Math.ceil(filteredOrders.length/ordersPerPage);
  let html='<table class="orders-table"><thead><tr><th>Order ID</th><th>Type</th><th>Quantity</th><th>Link / Details</th><th>Date</th><th>Status</th></tr></thead><tbody>';
  pageOrders.forEach(order=>{
    let orderId='N/A';
    try{
      if(order.orderId)orderId=String(order.orderId);
      else if(order.id)orderId=String(order.id);
      else if(order.order_id)orderId=String(order.order_id);
      if(orderId.length>8)orderId=orderId.substring(0,8).toUpperCase();
    }catch(e){orderId='ERR';}
    let quantity='N/A';
    try{
      if(order.quantity)quantity=order.quantity;
      else if(order.amount)quantity=`$${order.amount}`;
      else if(order.coins)quantity=`${order.coins} coins`;
      else if(order.coinAmount)quantity=`${order.coinAmount} coins`;
      else if(order.price)quantity=`$${order.price}`;
    }catch(e){}
    let link='N/A';
    try{
      if(order.isCoinOrder){
        const paymentId=order.paymentId||order.transactionId||order.reference||'N/A';
        link=`Payment ID: ${paymentId}`;
      }else{
        link=order.link||order.url||order.details||order.note||'N/A';
      }
    }catch(e){}
    const displayLink=String(link).length>30?String(link).substring(0,30)+'...':String(link);
    const time=formatDate(order.createdAt);
    html+='<tr>';
    html+=`<td><strong>${orderId}</strong></td>`;
    html+=`<td>${order.orderType||'Order'}</td>`;
    html+=`<td>${quantity}</td>`;
    html+=`<td title="${link}">${displayLink}</td>`;
    html+=`<td>${time}</td>`;
    html+=`<td>${getStatusBadge(order.status)}</td>`;
    html+='</tr>';
  });
  html+='</tbody></table>';
  ordersTableContainer.innerHTML=html;
  updatePagination(totalPages);
}

function updatePagination(totalPages){
  if(totalPages>1){
    pagination.style.display='flex';
    let pagesHtml='';
    for(let i=1;i<=totalPages;i++){
      if(i===1||i===totalPages||(i>=currentPage-1&&i<=currentPage+1)){
        pagesHtml+=`<span class="page-number ${i===currentPage?'active':''}" data-page="${i}">${i}</span>`;
      }else if(i===currentPage-2||i===currentPage+2){
        pagesHtml+='<span class="page-number">...</span>';
      }
    }
    pageNumbers.innerHTML=pagesHtml;
    document.querySelectorAll('.page-number[data-page]').forEach(el=>{
      el.addEventListener('click',()=>{
        currentPage=parseInt(el.dataset.page);
        renderOrdersTable();
      });
    });
    prevPage.disabled=currentPage===1;
    nextPage.disabled=currentPage===totalPages;
  }else{
    pagination.style.display='none';
  }
}

function applyFilters(){
  const searchTerm=orderIdSearch.value.toLowerCase().trim();
  const statusValue=statusFilter.value;
  if(!allOrders||allOrders.length===0){
    filteredOrders=[];
    totalOrders.textContent='0';
    renderOrdersTable();
    return;
  }
  filteredOrders=allOrders.filter(order=>{
    try{
      let orderIdStr='';
      if(order.orderId)orderIdStr=String(order.orderId);
      else if(order.id)orderIdStr=String(order.id);
      else if(order.order_id)orderIdStr=String(order.order_id);
      const orderIdLower=orderIdStr.toLowerCase();
      const matchesSearch=searchTerm===''||orderIdLower.includes(searchTerm);
      let orderStatus='';
      if(order.status)orderStatus=String(order.status).toLowerCase().trim();
      else orderStatus='pending';
      let matchesStatus=true;
      if(statusValue!=='all'){
        if(statusValue==='coinadd')matchesStatus=order.isCoinOrder===true;
        else if(statusValue==='processing')matchesStatus=['processing','in progress','progress'].includes(orderStatus);
        else if(statusValue==='completed')matchesStatus=['completed','complete','delivered'].includes(orderStatus);
        else if(statusValue==='cancelled')matchesStatus=['cancelled','cancel','canceled'].includes(orderStatus);
        else matchesStatus=(orderStatus===statusValue);
      }
      return matchesSearch&&matchesStatus;
    }catch(error){return false;}
  });
  currentPage=1;
  totalOrders.textContent=filteredOrders.length;
  renderOrdersTable();
}

dashboardLink.onclick=()=>{closeMenu();window.location.href='index.html';};
boostServiceLink.onclick=()=>{closeMenu();window.location.href='smmpanel.html';};
otherServiceLink.onclick=()=>{closeMenu();window.location.href='service.html';};
addFundsLink.onclick=()=>{closeMenu();window.location.href='coins.html';};
botPanelLink.onclick=()=>{closeMenu();window.location.href='panel.html';};
logoutLink.onclick=()=>{closeMenu();auth.signOut().then(()=>window.location.href='login.html');};

searchBtn.onclick=applyFilters;
resetBtn.onclick=()=>{
  orderIdSearch.value='';
  statusFilter.value='all';
  filteredOrders=[...allOrders];
  currentPage=1;
  totalOrders.textContent=allOrders.length;
  renderOrdersTable();
};
retryBtn.onclick=loadUserOrders;
prevPage.onclick=()=>{if(currentPage>1){currentPage--;renderOrdersTable();}};
nextPage.onclick=()=>{
  const totalPages=Math.ceil(filteredOrders.length/ordersPerPage);
  if(currentPage<totalPages){currentPage++;renderOrdersTable();}
};
orderIdSearch.addEventListener('keyup',(e)=>{if(e.key==='Enter')applyFilters();});
statusFilter.addEventListener('change',applyFilters);

auth.onAuthStateChanged(user=>{
  if(user){
    updateUserProfile(user);
    setTimeout(()=>{loadUserOrders();},500);
  }else{
    window.location.href='login.html';
  }
});


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== index page =====
if (document.body && document.body.dataset.page === "index") {
(function() {


const auth=window.firebaseAuth;
const db=window.firebaseDB;
let currentUser=null;
let chatListener=null;
let isAdmin=false;
const ADMIN_EMAILS=['socialxmmadm@gmail.com','admin@socialxmm.com'];
const loadingDiv=document.getElementById('loading');
const header=document.getElementById('header');
const dashboard=document.getElementById('dashboard');
const chatSection=document.getElementById('chatSection');
const menu=document.getElementById('menu');
const errorMessage=document.getElementById('errorMessage');
const errorText=document.getElementById('errorText');
const successMessage=document.getElementById('successMessage');
const successText=document.getElementById('successText');
const confirmModal=document.getElementById('confirmModal');
const chatInput=document.getElementById('chatInput');
const adminChatControl=document.getElementById('adminChatControl');
const adminBadge=document.getElementById('adminBadge');
const userChatInput=document.getElementById('userChatInput');

function showError(message){
  errorText.textContent=message;
  errorMessage.style.display='flex';
  setTimeout(()=>{errorMessage.style.display='none';},5000);
}
function showSuccess(message){
  successText.textContent=message;
  successMessage.style.display='flex';
  setTimeout(()=>{successMessage.style.display='none';},3000);
}
function showConfirmModal(message){
  document.getElementById('confirmText').textContent=message;
  confirmModal.style.display='flex';
}
function hideConfirmModal(){confirmModal.style.display='none';}

function loadChatMessages(){
  if(!currentUser)return;
  if(chatListener){chatListener();chatListener=null;}
  const chatMessagesDiv=document.getElementById('chatMessages');
  chatMessagesDiv.innerHTML='<div style="text-align:center;color:#64748b;padding:20px;">Loading messages...</div>';
  let query;
  if(isAdmin){
    query=db.collection('chats').orderBy('timestamp','asc').limit(100);
  }else{
    query=db.collection('chats').where('userId','==',currentUser.uid).orderBy('timestamp','asc');
  }
  chatListener=query.onSnapshot((snapshot)=>{
    if(!snapshot.empty){
      chatMessagesDiv.innerHTML='';
      snapshot.forEach((doc)=>{addMessageToChat(doc.data());});
      chatMessagesDiv.scrollTop=chatMessagesDiv.scrollHeight;
    }else{
      chatMessagesDiv.innerHTML='<div style="text-align:center;color:#64748b;padding:40px 20px;font-size:14px;">No messages yet. Start a conversation!</div>';
    }
  },(error)=>{
    showError('Failed to load messages: '+error.message);
  });
}
function addMessageToChat(message){
  const chatMessagesDiv=document.getElementById('chatMessages');
  const messageDiv=document.createElement('div');
  messageDiv.className='message '+message.sender;
  const time=message.timestamp?message.timestamp.toDate():new Date();
  const timeString=time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const senderName=message.sender==='user'?'You':'Admin';
  messageDiv.innerHTML=`
    <div class="message-content">
      ${escapeHtml(message.text)}
      ${message.sender==='admin'?'<span class="admin-badge">Admin</span>':''}
    </div>
    <div class="message-time">${senderName} • ${timeString}</div>
  `;
  chatMessagesDiv.appendChild(messageDiv);
  chatMessagesDiv.scrollTop=chatMessagesDiv.scrollHeight;
}
function escapeHtml(unsafe){
  return unsafe.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
async function sendMessage(){
  if(!chatInput.value.trim()){showError('Please type a message');return;}
  if(!currentUser){showError('You must be logged in');return;}
  const messageText=chatInput.value.trim();
  chatInput.value='';
  localStorage.removeItem(`chat_draft_${currentUser.uid}`);
  try{
    await db.collection('chats').add({
      userId:currentUser.uid,
      userEmail:currentUser.email,
      userName:currentUser.displayName||currentUser.email.split('@')[0],
      text:messageText,
      sender:'user',
      timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      read:false,
      replyTo:null
    });
  }catch(error){
    showError('Failed to send message: '+error.message);
    saveMessageToLocal(messageText,'user');
  }
}
async function sendAdminMessage(){
  const adminInput=document.getElementById('adminChatInput');
  if(!adminInput.value.trim()){showError('Please type an admin message');return;}
  if(!currentUser||!isAdmin){showError('Admin access required');return;}
  const messageText=adminInput.value.trim();
  adminInput.value='';
  try{
    await db.collection('chats').add({
      userId:'all_users',
      userEmail:'admin@socialxmm.com',
      userName:'System Admin',
      text:messageText,
      sender:'admin',
      timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      read:false,
      adminId:currentUser.uid,
      adminEmail:currentUser.email
    });
    showSuccess('Admin message sent');
  }catch(error){
    showError('Failed to send admin message: '+error.message);
  }
}
function saveMessageToLocal(message,sender){
  if(!currentUser)return;
  const storageKey=`local_chats_${currentUser.uid}`;
  let localMessages=JSON.parse(localStorage.getItem(storageKey)||'[]');
  localMessages.push({text:message,sender:sender,timestamp:new Date().toISOString(),offline:true});
  localStorage.setItem(storageKey,JSON.stringify(localMessages));
}
function saveDraft(){
  if(!currentUser||!chatInput)return;
  const draft=chatInput.value.trim();
  localStorage.setItem(`chat_draft_${currentUser.uid}`,draft);
}
function loadDraft(){
  if(!currentUser||!chatInput)return;
  const draft=localStorage.getItem(`chat_draft_${currentUser.uid}`);
  if(draft)chatInput.value=draft;
}
function handleChatKeyPress(event){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}
}
function handleAdminKeyPress(event){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAdminMessage();}
}

document.addEventListener('DOMContentLoaded',function(){
  if(typeof firebase==='undefined'){showError('Please check your internet connection.');return;}
  auth.onAuthStateChanged(function(user){
    if(user){
      currentUser=user;
      isAdmin=ADMIN_EMAILS.includes(user.email);
      setTimeout(function(){
        loadingDiv.style.display='none';
        header.style.display='flex';
        dashboard.style.display='grid';
        chatSection.style.display='block';
        const firstLetter=user.email.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent=firstLetter;
        if(isAdmin){
          adminChatControl.classList.add('active');
          adminBadge.style.display='inline-block';
          userChatInput.style.display='flex';
          const adminInput=document.getElementById('adminChatInput');
          adminInput.addEventListener('keypress',handleAdminKeyPress);
        }else{
          adminChatControl.classList.remove('active');
          adminBadge.style.display='none';
        }
        loadUserData(user);
        loadTotalUsers();
        loadAllOrdersCount();
        loadChatMessages();
        loadDraft();
        chatInput.addEventListener('input',saveDraft);
        chatInput.addEventListener('keypress',handleChatKeyPress);
        showSuccess('Welcome to your dashboard!');
      },800);
    }else{
      window.location.href='login.html';
    }
  },function(error){
    showError('Authentication error: '+error.message);
  });
});

async function loadUserData(user){
  try{
    const userDoc=await db.collection('users').doc(user.uid).get();
    if(userDoc.exists){
      const userData=userDoc.data();
      document.getElementById('username').textContent=userData.username||user.email.split('@')[0];
      document.getElementById('userLevel').textContent=userData.level||'New User';
      const balance=userData.balance||0;
      document.getElementById('balanceAmount').textContent=balance.toFixed(2);
      document.getElementById('menuBalance').innerHTML=`<i class="fas fa-wallet"></i> Balance: $${balance.toFixed(2)}`;
    }else{
      await db.collection('users').doc(user.uid).set({
        username:user.email.split('@')[0],
        email:user.email,
        balance:0.00,
        level:'New User',
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        ordersCount:0
      });
      document.getElementById('username').textContent=user.email.split('@')[0];
      document.getElementById('userLevel').textContent='New User';
      document.getElementById('balanceAmount').textContent='0.00';
      document.getElementById('menuBalance').innerHTML=`<i class="fas fa-wallet"></i> Balance: $0.00`;
      showSuccess('Account setup complete!');
    }
  }catch(error){
    showError('Failed to load user data: '+error.message);
    if(currentUser){
      document.getElementById('username').textContent=currentUser.email.split('@')[0];
      document.getElementById('userLevel').textContent='New User';
      document.getElementById('balanceAmount').textContent='0.00';
      document.getElementById('menuBalance').innerHTML=`<i class="fas fa-wallet"></i> Balance: $0.00`;
    }
  }
}
async function loadAllOrdersCount(){
  try{
    const ordersSnapshot=await db.collection('orders').get();
    document.getElementById('ordersCount').textContent=ordersSnapshot.size;
  }catch(error){
    try{
      if(currentUser){
        const userDoc=await db.collection('users').doc(currentUser.uid).get();
        if(userDoc.exists){
          document.getElementById('ordersCount').textContent=userDoc.data().ordersCount||0;
        }
      }
    }catch(e){
      document.getElementById('ordersCount').textContent='0';
    }
  }
}
async function loadTotalUsers(){
  try{
    const usersSnapshot=await db.collection('users').get();
    document.getElementById('usersCount').textContent=usersSnapshot.size;
  }catch(error){
    document.getElementById('usersCount').textContent='0';
  }
}
function toggleMenu(){
  menu.style.display=menu.style.display==='block'?'none':'block';
}
function openPage(pageUrl){
  saveDraft();
  window.location.href=pageUrl;
  menu.style.display='none';
}
function showLogoutConfirm(){
  showConfirmModal('Are you sure you want to logout? You will be redirected to the login page.');
}
async function performLogout(){
  try{
    hideConfirmModal();
    saveDraft();
    if(chatListener){chatListener();chatListener=null;}
    showSuccess('Logging out...');
    await auth.signOut();
    setTimeout(()=>{window.location.href='login.html';},800);
  }catch(error){
    showError('Logout failed: '+error.message);
  }
}
document.addEventListener('click',function(event){
  if(!event.target.closest('.menu')&&!event.target.closest('.menu-btn')){
    menu.style.display='none';
  }
});
errorMessage.addEventListener('click',function(){errorMessage.style.display='none';});
successMessage.addEventListener('click',function(){successMessage.style.display='none';});


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== login page =====
if (document.body && document.body.dataset.page === "login") {
(function() {


const auth = window.firebaseAuth;

function navigateTo(page){window.location.href=page;}
function toggleMenu(){
  const menu=document.getElementById("menu");
  menu.style.display=menu.style.display==="block"?"none":"block";
}
function togglePassword(id){
  const input=document.getElementById(id);
  const toggle=input.nextElementSibling;
  if(input.type==="password"){input.type="text";toggle.textContent="Hide";}
  else{input.type="password";toggle.textContent="Show";}
}
document.addEventListener('click',function(event){
  const menu=document.getElementById("menu");
  const menuIcon=document.querySelector('.menu-icon');
  if(!menu.contains(event.target)&&!menuIcon.contains(event.target)){
    menu.style.display="none";
  }
});
document.getElementById('loginForm').addEventListener('submit',function(e){
  e.preventDefault();
  const email=document.getElementById('email').value;
  const password=document.getElementById('password').value;
  const errorMessage=document.getElementById('errorMessage');
  const successMessage=document.getElementById('successMessage');
  const loading=document.getElementById('loading');
  errorMessage.style.display='none';
  successMessage.style.display='none';
  loading.style.display='block';
  auth.signInWithEmailAndPassword(email,password)
    .then((userCredential)=>{
      loading.style.display='none';
      successMessage.innerHTML='<i class="fas fa-check-circle"></i> Login successful! Redirecting...';
      successMessage.style.display='flex';
      if(email==='admin@email.com'){
        setTimeout(()=>{navigateTo('admin.html');},1200);
      }else{
        setTimeout(()=>{navigateTo('index.html');},1200);
      }
    })
    .catch((error)=>{
      loading.style.display='none';
      let msg='Login failed. Please check your credentials.';
      switch(error.code){
        case 'auth/user-not-found':msg='Account not found. Please sign up first.';break;
        case 'auth/wrong-password':msg='Incorrect password. Please try again.';break;
        case 'auth/invalid-email':msg='Invalid email format.';break;
        case 'auth/user-disabled':msg='This account has been disabled.';break;
      }
      errorMessage.innerHTML='<i class="fas fa-exclamation-circle"></i> '+msg;
      errorMessage.style.display='flex';
    });
});
auth.onAuthStateChanged((user)=>{if(user){console.log('User already logged in:',user.email);}});


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== panel page =====
if (document.body && document.body.dataset.page === "panel") {
(function() {

try{}catch(e){console.error("Firebase init error:",e);}
const auth=window.firebaseAuth;
const db=window.firebaseDB;

const menu=document.getElementById('menu');
const menuOverlay=document.getElementById('menuOverlay');
const profileInitial=document.getElementById('profileInitial');
const userName=document.getElementById('userName');
const balanceAmount=document.getElementById('balanceAmount');
const dashboardLink=document.getElementById('dashboardLink');
const boostServiceLink=document.getElementById('boostServiceLink');
const otherServiceLink=document.getElementById('otherServiceLink');
const addFundsLink=document.getElementById('addFundsLink');
const orderHistoryLink=document.getElementById('orderHistoryLink');
const logoutLink=document.getElementById('logoutLink');

let currentUser=null;
let userBalance=0.00;

function toggleMenu(){
  menu.classList.toggle('active');
  menuOverlay.classList.toggle('active');
  document.body.style.overflow=menu.classList.contains('active')?'hidden':'';
}
function closeMenu(){
  menu.classList.remove('active');
  menuOverlay.classList.remove('active');
  document.body.style.overflow='';
}
menuOverlay.addEventListener('click',closeMenu);
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&menu.classList.contains('active'))closeMenu();
});

function getProfileInitial(displayName,email){
  if(displayName&&displayName.trim().length>0)return displayName.trim().charAt(0).toUpperCase();
  if(email&&email.trim().length>0)return email.trim().charAt(0).toUpperCase();
  return "?";
}
function updateBalanceDisplay(){
  balanceAmount.textContent=`$${userBalance.toFixed(2)}`;
}
function loadUserBalance(userId){
  if(!db)return;
  db.collection('users').doc(userId).get()
    .then((doc)=>{
      if(doc.exists){
        const data=doc.data();
        userBalance=data.balance||data.dollars||0;
      }else{
        db.collection('users').doc(userId).set({
          balance:0,
          email:currentUser.email,
          displayName:currentUser.displayName||"User",
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        }).then(()=>{userBalance=0;});
      }
      updateBalanceDisplay();
    })
    .catch((error)=>{
      userBalance=0;
      updateBalanceDisplay();
    });
}
function updateUserProfile(user){
  const displayName=user.displayName||"User";
  const email=user.email||"No email";
  profileInitial.textContent=getProfileInitial(displayName,email);
  userName.textContent=displayName.split(' ')[0];
  currentUser=user;
  loadUserBalance(user.uid);
}
function setupNavigation(){
  dashboardLink.addEventListener('click',function(){closeMenu();window.location.href='index.html';});
  boostServiceLink.addEventListener('click',function(){closeMenu();window.location.href='smmpanel.html';});
  otherServiceLink.addEventListener('click',function(){closeMenu();window.location.href='service.html';});
  addFundsLink.addEventListener('click',function(){closeMenu();window.location.href='coins.html';});
  orderHistoryLink.addEventListener('click',function(){closeMenu();window.location.href='history.html';});
  logoutLink.addEventListener('click',function(){
    closeMenu();
    auth.signOut().then(()=>window.location.href='login.html').catch(()=>alert('Logout failed.'));
  });
}
function checkAuthState(){
  auth.onAuthStateChanged((user)=>{
    if(user){
      updateUserProfile(user);
      setupNavigation();
    }else{
      window.location.href='index.html';
    }
  });
}
function initApp(){
  try{checkAuthState();}
  catch(error){
    profileInitial.textContent="G";
    userName.textContent="Guest";
    updateBalanceDisplay();
  }
}
window.addEventListener('DOMContentLoaded',initApp);


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== password page =====
if (document.body && document.body.dataset.page === "password") {
(function() {


const auth = window.firebaseAuth;

function navigateTo(page){window.location.href=page;}
function toggleMenu(){
  const menu=document.getElementById("menu");
  menu.style.display=menu.style.display==="block"?"none":"block";
}
document.addEventListener('click',function(event){
  const menu=document.getElementById("menu");
  const menuIcon=document.querySelector('.menu-icon');
  if(!menu.contains(event.target)&&!menuIcon.contains(event.target)){
    menu.style.display="none";
  }
});
document.getElementById('forgotForm').addEventListener('submit',function(e){
  e.preventDefault();
  const email=document.getElementById('email').value.trim();
  const errorMessage=document.getElementById('errorMessage');
  const successMessage=document.getElementById('successMessage');
  const loading=document.getElementById('loading');
  errorMessage.style.display='none';
  successMessage.style.display='none';
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email)){
    errorMessage.innerHTML='<i class="fas fa-exclamation-circle"></i> Please enter a valid email address.';
    errorMessage.style.display='flex';
    return;
  }
  loading.style.display='block';
  auth.sendPasswordResetEmail(email)
    .then(()=>{
      loading.style.display='none';
      successMessage.innerHTML=`
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>Password reset email sent!</strong><br><br>
          We've sent a password reset link to <strong>${email}</strong>.<br>
          Please check your inbox and follow the instructions.<br><br>
          <a href="login.html">Return to Login →</a>
        </div>
      `;
      successMessage.style.display='flex';
      document.getElementById('forgotForm').reset();
      setTimeout(()=>{successMessage.style.display='none';},10000);
    })
    .catch((error)=>{
      loading.style.display='none';
      let msg='Error: '+error.message+'. Please try again.';
      switch(error.code){
        case 'auth/user-not-found':msg='No account found with this email address.';break;
        case 'auth/invalid-email':msg='Invalid email address format.';break;
        case 'auth/too-many-requests':msg='Too many requests. Please try again later.';break;
        case 'auth/network-request-failed':msg='Network error. Please check your internet connection.';break;
      }
      errorMessage.innerHTML='<i class="fas fa-exclamation-circle"></i> '+msg;
      errorMessage.style.display='flex';
      setTimeout(()=>{errorMessage.style.display='none';},5000);
    });
});
auth.onAuthStateChanged((user)=>{
  if(user){
    const successMessage=document.getElementById('successMessage');
    successMessage.innerHTML=`
      <i class="fas fa-info-circle"></i>
      <div>
        You are already logged in as <strong>${user.email}</strong>.<br>
        <a href="index.html">Go to Dashboard →</a>
      </div>
    `;
    successMessage.style.display='flex';
    document.getElementById('email').value=user.email;
  }
});
window.onload=function(){document.getElementById('email').focus();};


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}


// ===== register page =====
if (document.body && document.body.dataset.page === "register") {
(function() {


const auth = window.firebaseAuth;

function navigateTo(page){window.location.href=page;}
function toggleMenu(){
  const menu=document.getElementById("menu");
  menu.style.display=menu.style.display==="block"?"none":"block";
}
function togglePassword(id){
  const input=document.getElementById(id);
  const toggle=input.nextElementSibling;
  if(input.type==="password"){input.type="text";toggle.textContent="Hide";}
  else{input.type="password";toggle.textContent="Show";}
}
document.addEventListener('click',function(event){
  const menu=document.getElementById("menu");
  const menuIcon=document.querySelector('.menu-icon');
  if(!menu.contains(event.target)&&!menuIcon.contains(event.target)){
    menu.style.display="none";
  }
});
document.getElementById('signupForm').addEventListener('submit',function(e){
  e.preventDefault();
  const fullName=document.getElementById('fullName').value;
  const email=document.getElementById('email').value;
  const password=document.getElementById('password').value;
  const confirmPassword=document.getElementById('confirmPassword').value;
  const errorMessage=document.getElementById('errorMessage');
  const successMessage=document.getElementById('successMessage');
  const loading=document.getElementById('loading');
  errorMessage.style.display='none';
  successMessage.style.display='none';
  loading.style.display='block';
  if(password.length<6){
    loading.style.display='none';
    errorMessage.innerHTML='<i class="fas fa-exclamation-circle"></i> Password must be at least 6 characters long.';
    errorMessage.style.display='flex';
    return;
  }
  if(password!==confirmPassword){
    loading.style.display='none';
    errorMessage.innerHTML='<i class="fas fa-exclamation-circle"></i> Passwords do not match.';
    errorMessage.style.display='flex';
    return;
  }
  auth.createUserWithEmailAndPassword(email,password)
    .then((userCredential)=>{
      const user=userCredential.user;
      return user.updateProfile({displayName:fullName}).then(()=>{
        loading.style.display='none';
        successMessage.innerHTML='<i class="fas fa-check-circle"></i> Account created successfully! Redirecting...';
        successMessage.style.display='flex';
        setTimeout(()=>{navigateTo('index.html');},2500);
      });
    })
    .catch((error)=>{
      loading.style.display='none';
      let msg='Account creation failed. Please try again.';
      switch(error.code){
        case 'auth/email-already-in-use':msg='This email is already registered. Please login instead.';break;
        case 'auth/invalid-email':msg='Invalid email format.';break;
        case 'auth/operation-not-allowed':msg='Email/password accounts are not enabled.';break;
        case 'auth/weak-password':msg='Password is too weak. Please choose a stronger password.';break;
      }
      errorMessage.innerHTML='<i class="fas fa-exclamation-circle"></i> '+msg;
      errorMessage.style.display='flex';
    });
});
auth.onAuthStateChanged((user)=>{if(user){console.log('User already logged in:',user.email);}});


// Handle both normal and dynamically-created controls.
// This replaces inline onclick without breaking buttons rendered later by JS.
document.addEventListener('click', function(event) {
  const target = event.target.closest('[data-onclick]');
  if (!target) return;
  const action = target.getAttribute('data-onclick');
  if (!action) return;
  if (target.tagName === 'A' && target.getAttribute('href') === '#') {
    event.preventDefault();
  }
  try {
    eval(action);
  } catch (err) {
    console.error('Button action failed:', action, err);
  }
});
})();
}
