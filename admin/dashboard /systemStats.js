import { db } from "../../services/firebaseService.js";
import { ref, set, push, remove } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../../core/stateManager.js";

export const saveLine = () => {
    const id = document.getElementById('admID').value;
    const dbKey = document.getElementById('admDbKey').value;
    const key = dbKey || push(ref(db, 'config/linhas')).key;
    
    if(!id) return alert("Erro: ID é obrigatório");
    
    const data = { 
        id, 
        nome: document.getElementById('admNome').value, 
        via: document.getElementById('admVia').value || "Principal", 
        cor: document.getElementById('admCor').value, 
        company: state.adminSelectedCompany 
    };

    set(ref(db, `config/linhas/${key}`), data).then(() => { 
        alert("Salvo com sucesso!"); 
        clearAdminForm(); 
    });
};

export const deleteLine = (key) => {
    if (confirm("Tem certeza que deseja excluir esta linha?")) {
        remove(ref(db, `config/linhas/${key}`));
    }
};

export const loadLineForEdit = (key) => {
    const c = state.configLinhas[key];
    if (!c) return;
    document.getElementById('admDbKey').value = key;
    document.getElementById('admID').value = c.id;
    document.getElementById('admNome').value = c.nome;
    document.getElementById('admVia').value = c.via;
    document.getElementById('admCor').value = c.cor;
    selectCompany(c.company || 'atlantico');
};

export const selectCompany = (id) => { 
    document.querySelectorAll('.company-option').forEach(e => e.classList.remove('selected')); 
    const opt = document.getElementById('adm-opt-' + id);
    if (opt) opt.classList.add('selected'); 
    updateState('adminSelectedCompany', id);
};

export const randomizeColor = () => {
    document.getElementById('admCor').value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
};

export const clearAdminForm = () => { 
    document.getElementById('admDbKey').value = ""; 
    document.getElementById('admID').value = ""; 
    document.getElementById('admNome').value = ""; 
    document.getElementById('admVia').value = ""; 
};
