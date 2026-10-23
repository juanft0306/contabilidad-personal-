const ACCOUNTS = {
    BS_BANCO: { label: 'Bs (Banco)', symbol: 'Bs', type: 'fiat', rateToUsd: 'variable' },
    USDT_BINANCE: { label: 'USDT (Binance)', symbol: 'USDT', type: 'crypto', rateToUsd: 1 },
    USD_CASHEA: { label: 'USD (Cashea/Zinli)', symbol: '$', type: 'fiat', rateToUsd: 1 },
    USD_FISICO: { label: 'USD Físico', symbol: '$', type: 'fiat', rateToUsd: 1 },
    EUR_FISICO: { label: 'EUR Físico', symbol: '€', type: 'fiat', rateToUsd: 1.08 }
};

let transactions = JSON.parse(localStorage.getItem('finanzas_data')) || [];
let currentType = 'ingreso';
let editingId = null;

const globalRateInput = document.getElementById('global-rate');
globalRateInput.value = localStorage.getItem('finanzas_rate') || '40.00';
globalRateInput.addEventListener('change', (e) => {
    localStorage.setItem('finanzas_rate', e.target.value);
    updateUI();
});

window.onload = () => {
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

async function fetchAutoRate() {
    try {
        const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv');
        const data = await res.json();
        if(data && data.monitors && data.monitors.usd) {
            globalRateInput.value = data.monitors.usd.price.toFixed(2);
            localStorage.setItem('finanzas_rate', globalRateInput.value);
            updateUI();
        }
    } catch (e) {
        alert("Ajusta el valor manualmente.");
    }
}

function switchTab(tab) {
    ['form-normal', 'form-intercambio', 'panel-stats'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['tab-normal', 'tab-intercambio', 'tab-stats'].forEach(id => {
        document.getElementById(id).classList.remove('bg-slate-700', 'text-white', 'bg-indigo-600');
        document.getElementById(id).classList.add('text-slate-400');
    });

    if (tab === 'normal') {
        document.getElementById('form-normal').classList.remove('hidden');
        document.getElementById('tab-normal').classList.add('bg-slate-700', 'text-white');
    } else if (tab === 'intercambio') {
        document.getElementById('form-intercambio').classList.remove('hidden');
        document.getElementById('tab-intercambio').classList.add('bg-indigo-600', 'text-white');
    } else {
        document.getElementById('panel-stats').classList.remove('hidden');
        document.getElementById('tab-stats').classList.add('bg-slate-700', 'text-white');
    }
}

function setType(type) {
    currentType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active', 'ingreso', 'gasto', 'aporte', 'inversion', 'retorno', 'comision', 'ganancia_inv');
    });
    const activeBtn = document.getElementById(`btn-${type}`);
    activeBtn.classList.add('active', type);
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
    document.getElementById('btn-submit-normal').textContent = 'Guardar';
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
    if (past === 0 && current === 0) return `<span class="text-slate-500">Sin cambios</span>`;
    if (past === 0) return `<span class="text-emerald-400">+100%</span>`;
    const diff = ((current - past) / past) * 100;
    const sign = diff > 0 ? '+' : '';
    const color = diff > 0 ? 'text-emerald-400' : 'text-rose-400';
    return `<span class="${color}">${sign}${diff.toFixed(1)}%</span>`;
}

function updateUI() {
    let balances = {};
    let stats = { incomes: 0, expenses: 0, shares: 0, adjustments: 0, roi: 0, currentUsdEq: 0 };
    Object.keys(ACCOUNTS).forEach(k => balances[k] = { available: 0, invested: 0 });
    
    const bsRate = parseFloat(globalRateInput.value) || 40;
    const toUSD = (amount, currency) => ACCOUNTS[currency].rateToUsd === 'variable' ? amount / bsRate : amount * ACCOUNTS[currency].rateToUsd;

    // Configuración de fechas para Analytics
    const today = new Date();
    const todayTime = today.getTime();
    const currentMonthStr = today.toISOString().slice(0,7);
    let pastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pastMonthStr = pastMonthDate.toISOString().slice(0,7);
    const dayMs = 86400000;

    let periodStats = {
        thisMonth: { in: 0, out: 0, inv: 0 },
        lastMonth: { in: 0, out: 0, inv: 0 },
        thisWeek: { in: 0, out: 0, inv: 0 },
        lastWeek: { in: 0, out: 0, inv: 0 }
    };

    transactions.forEach(tx => {
        if (tx.isReverted) return;

        const usdValue = toUSD(tx.amount || 0, tx.currency);

        // Variables temporales de tiempo
        const txTime = new Date(tx.date + 'T12:00:00').getTime();
        const daysAgo = (todayTime - txTime) / dayMs;
        const txMonth = tx.date.slice(0, 7);

        // Calcular Analytics de periodos (Ignora intercambios)
        if (!tx.isExchange) {
            const isIncome = tx.type === 'ingreso' || tx.type === 'ganancia_inv';
            const isExpense = tx.type === 'gasto' || tx.type === 'aporte' || tx.type === 'comision';
            
            if (txMonth === currentMonthStr) {
                if (isIncome) periodStats.thisMonth.in += usdValue;
                if (isExpense) periodStats.thisMonth.out += usdValue;
                if (tx.type === 'inversion') periodStats.thisMonth.inv += usdValue;
            } else if (txMonth === pastMonthStr) {
                if (isIncome) periodStats.lastMonth.in += usdValue;
                if (isExpense) periodStats.lastMonth.out += usdValue;
                if (tx.type === 'inversion') periodStats.lastMonth.inv += usdValue;
            }

            if (daysAgo >= 0 && daysAgo <= 7) {
                if (isIncome) periodStats.thisWeek.in += usdValue;
                if (isExpense) periodStats.thisWeek.out += usdValue;
                if (tx.type === 'inversion') periodStats.thisWeek.inv += usdValue;
            } else if (daysAgo > 7 && daysAgo <= 14) {
                if (isIncome) periodStats.lastWeek.in += usdValue;
                if (isExpense) periodStats.lastWeek.out += usdValue;
                if (tx.type === 'inversion') periodStats.lastWeek.inv += usdValue;
            }
        }

        // Lógica Financiera Estándar
        if (tx.isExchange) {
            balances[tx.currencyFrom].available -= tx.amountFrom;
            balances[tx.currencyTo].available += tx.amountTo;
        } else {
            if (tx.type === 'ingreso') {
                balances[tx.currency].available += tx.amount;
                stats.incomes += usdValue;
            } else if (tx.type === 'ganancia_inv') {
                balances[tx.currency].available += tx.amount;
                stats.roi += usdValue; 
                stats.incomes += usdValue; // Sigue siendo un ingreso histórico
            } else if (tx.type === 'gasto') {
                balances[tx.currency].available -= tx.amount;
                stats.expenses += usdValue;
            } else if (tx.type === 'aporte') {
                balances[tx.currency].available -= tx.amount;
                stats.shares += usdValue;
            } else if (tx.type === 'comision') {
                balances[tx.currency].available -= tx.amount;
                stats.adjustments += usdValue;
            } else if (tx.type === 'inversion') {
                balances[tx.currency].available -= tx.amount;
                balances[tx.currency].invested += tx.amount;
            } else if (tx.type === 'retorno') {
                balances[tx.currency].available += tx.amount;
                balances[tx.currency].invested -= tx.amount;
            }
        }
    });

    const container = document.getElementById('balances-container');
    container.innerHTML = '';
    
    Object.keys(balances).forEach(key => {
        stats.currentUsdEq += toUSD(balances[key].available + balances[key].invested, key);
    });

    container.innerHTML += `
        <div class="bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/50 shadow-lg col-span-2 md:col-span-1">
            <h3 class="text-xs text-indigo-300 font-medium mb-1 uppercase">Patrimonio Neto</h3>
            <p class="text-xl font-bold text-white">$${stats.currentUsdEq.toFixed(2)}</p>
        </div>
    `;

    Object.entries(ACCOUNTS).forEach(([key, acc]) => {
        const { available, invested } = balances[key];
        const avColor = available >= 0 ? 'text-emerald-400' : 'text-rose-400';
        container.innerHTML += `
            <div class="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <h3 class="text-xs text-slate-400 font-medium mb-1 truncate">${acc.label}</h3>
                <p class="text-lg font-bold ${avColor}">${acc.symbol} ${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <div class="mt-2 pt-1 border-t border-slate-700 flex justify-between text-xs">
                    <span class="text-slate-500">Inv:</span>
                    <span class="${invested > 0 ? 'text-indigo-400' : 'text-slate-600'}">${acc.symbol} ${invested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        `;
    });

    // Inyectar Analytics
    document.getElementById('monthly-analytics').innerHTML = `
        <div class="flex justify-between items-center"><span class="text-xs text-slate-400">Ingresos vs mes pasado:</span> ${calcPercentText(periodStats.thisMonth.in, periodStats.lastMonth.in)}</div>
        <div class="flex justify-between items-center"><span class="text-xs text-slate-400">Gastos vs mes pasado:</span> ${calcPercentText(periodStats.thisMonth.out, periodStats.lastMonth.out)}</div>
        <div class="flex justify-between items-center"><span class="text-xs text-slate-400">Inversión vs mes pasado:</span> ${calcPercentText(periodStats.thisMonth.inv, periodStats.lastMonth.inv)}</div>
    `;

    document.getElementById('weekly-analytics').innerHTML = `
        <div class="flex justify-between items-center"><span class="text-xs text-slate-400">Ingresos vs semana ant.:</span> ${calcPercentText(periodStats.thisWeek.in, periodStats.lastWeek.in)}</div>
        <div class="flex justify-between items-center"><span class="text-xs text-slate-400">Gastos vs semana ant.:</span> ${calcPercentText(periodStats.thisWeek.out, periodStats.lastWeek.out)}</div>
        <div class="flex justify-between items-center"><span class="text-xs text-slate-400">Inversión vs semana ant.:</span> ${calcPercentText(periodStats.thisWeek.inv, periodStats.lastWeek.inv)}</div>
    `;

    document.getElementById('stat-historical-total').textContent = `$${stats.incomes.toFixed(2)}`;
    document.getElementById('stat-current-wealth').textContent = `$${stats.currentUsdEq.toFixed(2)}`;
    document.getElementById('stat-roi').textContent = `+$${stats.roi.toFixed(2)}`;
    document.getElementById('stat-expenses').textContent = `-$${stats.expenses.toFixed(2)}`;
    document.getElementById('stat-shares').textContent = `-$${stats.shares.toFixed(2)}`;

    // Renderizado de la tabla
    const typeFilter = document.getElementById('filter-type').value;
    const currFilter = document.getElementById('filter-currency').value;
    const txContainer = document.getElementById('transactions-container');
    
    let filtered = transactions.filter(tx => {
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
        return true;
    });

    if (filtered.length === 0) {
        txContainer.innerHTML = `<div class="text-center text-slate-500 py-8">No hay registros que coincidan.</div>`;
    } else {
        txContainer.innerHTML = '';
        filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(tx => {
            const isRev = tx.isReverted;
            let html = '';

            if (tx.isExchange) {
                html = `
                    <div class="p-3 rounded-lg border ${isRev ? 'bg-slate-900/50 opacity-50' : 'bg-slate-900 border-slate-700'} flex items-center justify-between group">
                        <div>
                            <p class="font-medium text-white ${isRev ? 'line-through' : ''}">${tx.description}</p>
                            <div class="flex items-center gap-2 text-xs mt-1">
                                <span class="px-2 py-0.5 bg-slate-700 text-slate-300 rounded"><i data-lucide="arrow-right-left" class="inline w-3 h-3"></i> Canje</span>
                                <span class="text-slate-400">${tx.date}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-right text-sm ${isRev ? 'line-through' : ''}">
                                <div class="text-rose-400">-${tx.amountFrom} ${ACCOUNTS[tx.currencyFrom].symbol}</div>
                                <div class="text-emerald-400">+${tx.amountTo} ${ACCOUNTS[tx.currencyTo].symbol}</div>
                            </div>
                            <button onclick="toggleRevert('${tx.id}')" class="p-1.5 rounded text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"><i data-lucide="${isRev ? 'refresh-cw' : 'ban'}" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            } else {
                const types = {
                    ingreso: { c: 'emerald', t: 'Ingreso', s: '+' },
                    gasto: { c: 'rose', t: 'Gasto', s: '-' },
                    aporte: { c: 'pink', t: 'Aporte', s: '-' },
                    comision: { c: 'slate', t: 'Comisión', s: '-' },
                    inversion: { c: 'indigo', t: 'Inversión', s: '↓' },
                    retorno: { c: 'amber', t: 'Retorno', s: '↑' },
                    ganancia_inv: { c: 'amber', t: 'Ganancia Inv.', s: '+' }
                };
                const prop = types[tx.type];
                
                html = `
                    <div class="p-3 rounded-lg border ${isRev ? 'bg-slate-900/50 opacity-50' : 'bg-slate-900 border-slate-700'} flex items-center justify-between group">
                        <div>
                            <p class="font-medium text-white ${isRev ? 'line-through' : ''}">${tx.description}</p>
                            <div class="flex items-center gap-2 text-xs mt-1">
                                <span class="px-2 py-0.5 bg-${prop.c}-500/20 text-${prop.c}-400 rounded flex items-center gap-1">
                                    ${tx.type === 'aporte' ? '<i data-lucide="heart" class="w-3 h-3"></i>' : ''} ${prop.t}
                                </span>
                                <span class="text-slate-500 hidden sm:inline">${tx.category}</span>
                                <span class="text-slate-400">${tx.date}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="text-right font-bold text-${prop.c}-400 ${isRev ? 'line-through text-slate-500' : ''}">
                                ${prop.s}${tx.amount} <span class="text-xs font-normal text-slate-400">${ACCOUNTS[tx.currency].symbol}</span>
                            </div>
                            <button onclick="editTransaction('${tx.id}')" class="p-1.5 rounded text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                            <button onclick="toggleRevert('${tx.id}')" class="p-1.5 rounded text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="${isRev ? 'refresh-cw' : 'ban'}" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            }
            txContainer.innerHTML += html;
        });
    }
    lucide.createIcons();
}
                  
