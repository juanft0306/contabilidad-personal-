// AQUI VOLVEMOS A LOS NOMBRES ANTIGUOS PARA NO ROMPER TUS DATOS GUARDADOS
const ACCOUNTS = {
    BS: { label: 'Bolívares (Bs)', symbol: 'Bs', type: 'fiat' },
    USDT: { label: 'USDT', symbol: 'USDT', type: 'crypto' },
    USD_DIGITAL: { label: 'USD Digital', symbol: '$', type: 'fiat' },
    USD_FISICO: { label: 'USD Físico', symbol: '$', type: 'fiat' },
    EUR_FISICO: { label: 'EUR Físico', symbol: '€', type: 'fiat' }
};

let transactions = JSON.parse(localStorage.getItem('finanzas_data')) || [];
let currentType = 'ingreso';
let editingId = null;

// Manejo de Tasas Cruzadas Manuales
let rates = {
    USD: parseFloat(localStorage.getItem('finanzas_rate_usd')) || 40.00,
    USDT: parseFloat(localStorage.getItem('finanzas_rate_usdt')) || 40.00,
    EUR: parseFloat(localStorage.getItem('finanzas_rate_eur')) || 43.50,
};

window.onload = () => {
    // Cargar inputs de tasas
    document.getElementById('rate-usd').value = rates.USD.toFixed(2);
    document.getElementById('rate-usdt').value = rates.USDT.toFixed(2);
    document.getElementById('rate-eur').value = rates.EUR.toFixed(2);

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('normal-date').value = today;
    document.getElementById('exchange-date').value = today;
    
    const selects = ['normal-currency', 'exchange-currency-from', 'exchange-currency-to', 'filter-currency'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        Object.entries(ACCOUNTS).forEach(([key, acc]) => {
            el.innerHTML += `<option value="${key}">${acc.label}</option>`;
        });
    });
    
    setType('ingreso');
    updateUI();
};

function updateRates() {
    rates.USD = parseFloat(document.getElementById('rate-usd').value) || rates.USD;
    rates.USDT = parseFloat(document.getElementById('rate-usdt').value) || rates.USDT;
    rates.EUR = parseFloat(document.getElementById('rate-eur').value) || rates.EUR;

    localStorage.setItem('finanzas_rate_usd', rates.USD);
    localStorage.setItem('finanzas_rate_usdt', rates.USDT);
    localStorage.setItem('finanzas_rate_eur', rates.EUR);
    
    updateUI();
}

function switchTab(tab) {
    ['form-normal', 'form-intercambio', 'panel-stats'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['tab-normal', 'tab-intercambio', 'tab-stats'].forEach(id => {
        const el = document.getElementById(id);
        el.className = "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all text-slate-400 hover:text-white hover:bg-white/5";
    });

    if (tab === 'normal') {
        document.getElementById('form-normal').classList.remove('hidden');
        document.getElementById('tab-normal').className = "flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all bg-indigo-600 text-white shadow-md";
    } else if (tab === 'intercambio') {
        document.getElementById('form-intercambio').classList.remove('hidden');
        document.getElementById('tab-intercambio').className = "flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all bg-indigo-600 text-white shadow-md";
    } else {
        document.getElementById('panel-stats').classList.remove('hidden');
        document.getElementById('tab-stats').className = "flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all bg-indigo-600 text-white shadow-md";
    }
}

function setType(type) {
    currentType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active', 'ingreso', 'gasto', 'aporte', 'inversion', 'retorno', 'comision', 'ganancia_inv');
    });
    document.getElementById(`btn-${type}`).classList.add('active', type);
}

function handleAddNormal(e) {
    e.preventDefault();
    const txData = {
        id: editingId || Date.now().toString(),
        isExchange: false,
        type: currentType,
        amount: parseFloat(document.getElementById('normal-amount').value),
        currency: document.getElementById('normal-currency').value,
        category: document.getElementById('normal-category').value,
        date: document.getElementById('normal-date').value,
        description: document.getElementById('normal-desc').value,
        isReverted: false
    };

    if (editingId) {
        transactions = transactions.map(tx => tx.id === editingId ? { ...txData, isReverted: tx.isReverted } : tx);
        cancelEdit();
    } else {
        transactions.unshift(txData);
    }
    
    saveAndRender();
    e.target.reset();
    document.getElementById('normal-date').value = new Date().toISOString().split('T')[0];
}

function handleAddExchange(e) {
    e.preventDefault();
    const txData = {
        id: Date.now().toString(),
        isExchange: true,
        amountFrom: parseFloat(document.getElementById('exchange-amount-from').value),
        currencyFrom: document.getElementById('exchange-currency-from').value,
        amountTo: parseFloat(document.getElementById('exchange-amount-to').value),
        currencyTo: document.getElementById('exchange-currency-to').value,
        date: document.getElementById('exchange-date').value,
        description: document.getElementById('exchange-desc').value,
        isReverted: false
    };

    transactions.unshift(txData);
    saveAndRender();
    e.target.reset();
}

function editTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx || tx.isExchange) return; 
    
    editingId = id;
    switchTab('normal');
    setType(tx.type);
    
    document.getElementById('normal-amount').value = tx.amount;
    document.getElementById('normal-currency').value = tx.currency;
    document.getElementById('normal-category').value = tx.category || 'General';
    document.getElementById('normal-date').value = tx.date;
    document.getElementById('normal-desc').value = tx.description;
    
    document.getElementById('btn-submit-normal').textContent = 'Actualizar';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
}

function cancelEdit() {
    editingId = null;
    document.getElementById('btn-submit-normal').textContent = 'Guardar Movimiento';
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    document.getElementById('form-normal').reset();
}

function toggleRevert(id) {
    transactions = transactions.map(tx => tx.id === id ? { ...tx, isReverted: !tx.isReverted } : tx);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('finanzas_data', JSON.stringify(transactions));
    updateUI();
}

function calcPercentText(current, past) {
    if (past === 0 && current === 0) return `<span class="text-slate-500 font-medium">—</span>`;
    if (past === 0) return `<span class="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded text-xs">+100%</span>`;
    const diff = ((current - past) / past) * 100;
    const sign = diff > 0 ? '+' : '';
    const colorClass = diff > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10';
    return `<span class="${colorClass} px-2 py-0.5 rounded text-xs font-bold">${sign}${diff.toFixed(1)}%</span>`;
}

function updateUI() {
    let balances = {};
    let stats = { incomes: 0, expenses: 0, shares: 0, adjustments: 0, roi: 0, currentUsdEq: 0 };
    Object.keys(ACCOUNTS).forEach(k => balances[k] = { available: 0, invested: 0 });
    
    // Convertir todo a valor USD usando las tasas cruzadas
    const toUSD = (amount, currency) => {
        if (!ACCOUNTS[currency]) return 0; // Proteccion si hay datos raros guardados
        
        if (currency === 'BS') return amount / rates.USD;
        if (currency === 'USDT') return (amount * rates.USDT) / rates.USD;
        if (currency === 'EUR_FISICO') return (amount * rates.EUR) / rates.USD;
        
        // Aplica para USD_FISICO y USD_DIGITAL
        return amount;
    };

    const today = new Date();
    const todayTime = today.getTime();
    const currentMonthStr = today.toISOString().slice(0,7);
    let pastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pastMonthStr = pastMonthDate.toISOString().slice(0,7);
    const dayMs = 86400000;

    let pStats = {
        tm: { in: 0, out: 0, inv: 0 }, lm: { in: 0, out: 0, inv: 0 },
        tw: { in: 0, out: 0, inv: 0 }, lw: { in: 0, out: 0, inv: 0 }
    };

    transactions.forEach(tx => {
        if (tx.isReverted) return;
        
        // Si hay una moneda que fue borrada y existe en memoria, ignorar la operacion para no crashear
        if (tx.isExchange && (!ACCOUNTS[tx.currencyFrom] || !ACCOUNTS[tx.currencyTo])) return;
        if (!tx.isExchange && !ACCOUNTS[tx.currency]) return;

        const usdValue = toUSD(tx.amount || 0, tx.currency);
        const txTime = new Date(tx.date + 'T12:00:00').getTime();
        const daysAgo = (todayTime - txTime) / dayMs;
        const txMonth = tx.date.slice(0, 7);

        if (!tx.isExchange) {
            const isInc = tx.type === 'ingreso' || tx.type === 'ganancia_inv';
            const isExp = tx.type === 'gasto' || tx.type === 'aporte' || tx.type === 'comision';
            
            if (txMonth === currentMonthStr) {
                if (isInc) pStats.tm.in += usdValue;
                if (isExp) pStats.tm.out += usdValue;
                if (tx.type === 'inversion') pStats.tm.inv += usdValue;
            } else if (txMonth === pastMonthStr) {
                if (isInc) pStats.lm.in += usdValue;
                if (isExp) pStats.lm.out += usdValue;
                if (tx.type === 'inversion') pStats.lm.inv += usdValue;
            }

            if (daysAgo >= 0 && daysAgo <= 7) {
                if (isInc) pStats.tw.in += usdValue;
                if (isExp) pStats.tw.out += usdValue;
                if (tx.type === 'inversion') pStats.tw.inv += usdValue;
            } else if (daysAgo > 7 && daysAgo <= 14) {
                if (isInc) pStats.lw.in += usdValue;
                if (isExp) pStats.lw.out += usdValue;
                if (tx.type === 'inversion') pStats.lw.inv += usdValue;
            }
        }

        if (tx.isExchange) {
            balances[tx.currencyFrom].available -= tx.amountFrom;
            balances[tx.currencyTo].available += tx.amountTo;
        } else {
            if (tx.type === 'ingreso') { balances[tx.currency].available += tx.amount; stats.incomes += usdValue; } 
            else if (tx.type === 'ganancia_inv') { balances[tx.currency].available += tx.amount; stats.roi += usdValue; stats.incomes += usdValue; } 
            else if (tx.type === 'gasto') { balances[tx.currency].available -= tx.amount; stats.expenses += usdValue; } 
            else if (tx.type === 'aporte') { balances[tx.currency].available -= tx.amount; stats.shares += usdValue; } 
            else if (tx.type === 'comision') { balances[tx.currency].available -= tx.amount; stats.adjustments += usdValue; } 
            else if (tx.type === 'inversion') { balances[tx.currency].available -= tx.amount; balances[tx.currency].invested += tx.amount; } 
            else if (tx.type === 'retorno') { balances[tx.currency].available += tx.amount; balances[tx.currency].invested -= tx.amount; }
        }
    });

    const container = document.getElementById('balances-container');
    container.innerHTML = '';
    
    Object.keys(balances).forEach(key => stats.currentUsdEq += toUSD(balances[key].available + balances[key].invested, key));

    container.innerHTML += `
        <div class="bg-gradient-to-br from-indigo-900/80 to-indigo-800/40 p-5 rounded-2xl border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.15)] col-span-2 md:col-span-1 flex flex-col justify-center relative overflow-hidden">
            <div class="absolute top-0 right-0 p-3 opacity-20"><i data-lucide="wallet" class="w-12 h-12"></i></div>
            <h3 class="text-xs text-indigo-300 font-bold mb-1 uppercase tracking-widest relative z-10">Capital Neto</h3>
            <p class="text-2xl font-black text-white relative z-10">$${stats.currentUsdEq.toFixed(2)}</p>
        </div>
    `;

    Object.entries(ACCOUNTS).forEach(([key, acc]) => {
        const { available, invested } = balances[key];
        const avColor = available >= 0 ? 'text-emerald-400' : 'text-rose-400';
        container.innerHTML += `
            <div class="bg-white/[0.03] backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <h3 class="text-xs text-slate-400 font-bold mb-2 truncate tracking-wide">${acc.label}</h3>
                <p class="text-xl font-bold ${avColor} drop-shadow-sm">${acc.symbol} ${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <div class="mt-3 pt-2 border-t border-white/5 flex justify-between items-center">
                    <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Inv</span>
                    <span class="text-xs font-semibold ${invested > 0 ? 'text-indigo-400' : 'text-slate-600'}">${acc.symbol} ${invested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        `;
    });

    document.getElementById('monthly-analytics').innerHTML = `
        <div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"><span class="text-sm font-medium text-slate-300">Ingresos</span> ${calcPercentText(pStats.tm.in, pStats.lm.in)}</div>
        <div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"><span class="text-sm font-medium text-slate-300">Gastos</span> ${calcPercentText(pStats.tm.out, pStats.lm.out)}</div>
        <div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"><span class="text-sm font-medium text-slate-300">Inversión Activa</span> ${calcPercentText(pStats.tm.inv, pStats.lm.inv)}</div>
    `;

    document.getElementById('weekly-analytics').innerHTML = `
        <div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"><span class="text-sm font-medium text-slate-300">Ingresos</span> ${calcPercentText(pStats.tw.in, pStats.lw.in)}</div>
        <div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"><span class="text-sm font-medium text-slate-300">Gastos</span> ${calcPercentText(pStats.tw.out, pStats.lw.out)}</div>
        <div class="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors"><span class="text-sm font-medium text-slate-300">Inversión Activa</span> ${calcPercentText(pStats.tw.inv, pStats.lw.inv)}</div>
    `;

    document.getElementById('stat-historical-total').textContent = `$${stats.incomes.toFixed(2)}`;
    document.getElementById('stat-current-wealth').textContent = `$${stats.currentUsdEq.toFixed(2)}`;
    document.getElementById('stat-roi').textContent = `+$${stats.roi.toFixed(2)}`;
    document.getElementById('stat-expenses').textContent = `-$${stats.expenses.toFixed(2)}`;
    document.getElementById('stat-shares').textContent = `-$${stats.shares.toFixed(2)}`;

    const typeFilter = document.getElementById('filter-type').value;
    const currFilter = document.getElementById('filter-currency').value;
    const descFilter = document.getElementById('filter-desc').value.toLowerCase().trim();
    const txContainer = document.getElementById('transactions-container');
    const filterSummary = document.getElementById('filter-summary');
    const filterSumIn = document.getElementById('filter-sum-in');
    const filterSumOut = document.getElementById('filter-sum-out');
    
    let filteredIn = 0;
    let filteredOut = 0;

    let filtered = transactions.filter(tx => {
        // Ignorar monedas viejas que ya no existan en ACCOUNTS para que no rompa el filtro
        if (tx.isExchange && (!ACCOUNTS[tx.currencyFrom] || !ACCOUNTS[tx.currencyTo])) return false;
        if (!tx.isExchange && !ACCOUNTS[tx.currency]) return false;

        if (typeFilter !== 'all') {
            if (typeFilter === 'exchange' && !tx.isExchange) return false;
            if (typeFilter !== 'exchange' && (tx.isExchange || tx.type !== typeFilter)) return false;
        }
        if (currFilter !== 'all') {
            if (tx.isExchange) {
                if (tx.currencyFrom !== currFilter && tx.currencyTo !== currFilter) return false;
            } else {
                if (tx.currency !== currFilter) return false;
            }
        }
        if (descFilter) {
            if (!tx.description.toLowerCase().includes(descFilter) && !(tx.category && tx.category.toLowerCase().includes(descFilter))) return false;
        }
        return true;
    });

    filtered.forEach(tx => {
        if (tx.isReverted || tx.isExchange) return; 

        const usdVal = toUSD(tx.amount || 0, tx.currency);
        const isInc = tx.type === 'ingreso' || tx.type === 'ganancia_inv' || tx.type === 'retorno';
        const isExp = tx.type === 'gasto' || tx.type === 'aporte' || tx.type === 'comision' || tx.type === 'inversion';

        if (isInc) filteredIn += usdVal;
        if (isExp) filteredOut += usdVal;
    });

    if (descFilter !== '' || typeFilter !== 'all' || currFilter !== 'all') {
        filterSummary.classList.remove('hidden');
        filterSumIn.textContent = `+$${filteredIn.toFixed(2)}`;
        filterSumOut.textContent = `-$${filteredOut.toFixed(2)}`;
    } else {
        filterSummary.classList.add('hidden');
    }

    if (filtered.length === 0) {
        txContainer.innerHTML = `<div class="text-center text-slate-500 py-12 flex flex-col items-center"><i data-lucide="ghost" class="w-12 h-12 mb-3 opacity-20"></i><p class="font-medium text-sm">Sin registros</p></div>`;
    } else {
        txContainer.innerHTML = '';
        filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(tx => {
            const isRev = tx.isReverted;
            let html = '';

            if (tx.isExchange) {
                html = `
                    <div class="p-4 rounded-xl border ${isRev ? 'bg-black/20 opacity-40 border-transparent' : 'bg-white/[0.03] border-white/5 hover:border-white/10'} hover:scale-[1.01] transition-all flex items-center justify-between group">
                        <div>
                            <p class="font-semibold text-white ${isRev ? 'line-through' : ''}">${tx.description}</p>
                            <div class="flex items-center gap-2 text-xs mt-1.5">
                                <span class="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-md font-medium"><i data-lucide="arrow-right-left" class="inline w-3 h-3 mr-1"></i>Canje</span>
                                <span class="text-slate-500 font-medium">${tx.date}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="text-right text-sm font-semibold ${isRev ? 'line-through' : ''}">
                                <div class="text-rose-400">-${tx.amountFrom} ${ACCOUNTS[tx.currencyFrom].symbol}</div>
                                <div class="text-emerald-400">+${tx.amountTo} ${ACCOUNTS[tx.currencyTo].symbol}</div>
                            </div>
                            <button onclick="toggleRevert('${tx.id}')" class="p-2 rounded-lg text-slate-400 bg-black/20 hover:text-white hover:bg-black/40 transition-colors"><i data-lucide="${isRev ? 'refresh-cw' : 'ban'}" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            } else {
                const types = {
                    ingreso: { c: 'emerald', t: 'Ingreso', s: '+' },
                    gasto: { c: 'rose', t: 'Gasto', s: '-' },
                    aporte: { c: 'pink', t: 'Aporte', s: '-' },
                    comision: { c: 'slate', t: 'Ajuste', s: '-' },
                    inversion: { c: 'indigo', t: 'Inversión', s: '↓' },
                    retorno: { c: 'amber', t: 'Retorno', s: '↑' },
                    ganancia_inv: { c: 'amber', t: 'Rentabilidad', s: '+' }
                };
                const prop = types[tx.type];
                
                html = `
                    <div class="p-4 rounded-xl border ${isRev ? 'bg-black/20 opacity-40 border-transparent' : 'bg-white/[0.03] border-white/5 hover:border-white/10'} hover:scale-[1.01] transition-all flex items-center justify-between group">
                        <div>
                            <p class="font-semibold text-white ${isRev ? 'line-through' : ''}">${tx.description}</p>
                            <div class="flex items-center gap-2 text-xs mt-1.5">
                                <span class="px-2 py-1 bg-${prop.c}-500/10 text-${prop.c}-400 rounded-md font-bold tracking-wide flex items-center gap-1">
                                    ${tx.type === 'aporte' ? '<i data-lucide="heart" class="w-3 h-3"></i>' : ''} ${prop.t}
                                </span>
                                <span class="text-slate-500 font-medium hidden sm:inline px-2 border-l border-slate-700">${tx.category}</span>
                                <span class="text-slate-500 font-medium px-2 border-l border-slate-700">${tx.date}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-right font-black text-${prop.c}-400 text-lg ${isRev ? 'line-through text-slate-600' : ''}">
                                ${prop.s}${tx.amount} <span class="text-xs font-semibold opacity-70 ml-0.5">${ACCOUNTS[tx.currency].symbol}</span>
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="editTransaction('${tx.id}')" class="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                                <button onclick="toggleRevert('${tx.id}')" class="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"><i data-lucide="${isRev ? 'refresh-cw' : 'ban'}" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                    </div>`;
            }
            txContainer.innerHTML += html;
        });
    }
    lucide.createIcons();
}
                 
