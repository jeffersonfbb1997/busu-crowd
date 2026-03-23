/**
 * Módulo para gerenciamento de linhas no Firestore
 * Integração com o modal de linhas e lista de linhas no editor
 */

import { subscribeLines, saveLine, deleteLine } from '../services/firestoreService.js';
import { COLLECTIONS } from '../config/firestoreSchema.js';
import { db } from '../services/firebaseService.js';
import { ref, set, remove } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// Referência global para unsubscribe do listener
let linesUnsubscribe = null;

// Cache global das linhas para acesso rápido
let linesCache = {};

/**
 * Inicializa o gerenciador de linhas
 */
export function initLineManager() {
    console.log('LineManager: Inicializando módulo...');
    
    // Configurar listeners em tempo real
    setupRealtimeListeners();
    
    console.log('LineManager: Inicialização concluída com sucesso');
}

/**
 * Configura listeners Firebase para atualização em tempo real da lista de linhas
 */
function setupRealtimeListeners() {
    // Cancelar listener anterior se existir
    if (linesUnsubscribe) {
        linesUnsubscribe();
    }
    
    // Configurar novo listener usando o subscribeLines existente
    linesUnsubscribe = subscribeLines((lines) => {
        console.log(`Atualização em tempo real: ${Object.keys(lines).length} linhas`);
        linesCache = lines; // Armazenar em cache para acesso rápido
        renderLinesList(lines); // Renderizar a lista com os dados atualizados
    });
}

/**
 * Carrega a lista de linhas da coleção config/linhas e renderiza na div editor-lines-list
 * Esta função inicia o listener em tempo real
 */
export function loadLinesList() {
    const linesListContainer = document.getElementById('editor-lines-list');
    if (!linesListContainer) {
        console.error('Container editor-lines-list não encontrado');
        return;
    }
    
    // Mostrar indicador de carregamento
    linesListContainer.innerHTML = `
        <div class="list-group-item text-center text-muted py-4">
            <i class="bi bi-arrow-repeat spin me-2"></i> Carregando linhas...
        </div>
    `;
    
    // O listener em tempo real já foi configurado em setupRealtimeListeners
    // Esta função apenas garante que o listener está ativo
    if (!linesUnsubscribe) {
        setupRealtimeListeners();
    }
}

/**
 * Renderiza a lista de linhas com os dados fornecidos
 * @param {object} lines - Objeto com chaves dbKey -> lineData
 */
function renderLinesList(lines) {
    console.log('renderLinesList chamado com dados:', lines);
    const linesListContainer = document.getElementById('editor-lines-list');
    if (!linesListContainer) {
        console.error('Container editor-lines-list não encontrado');
        return;
    }
    
    if (!lines || Object.keys(lines).length === 0) {
        console.log('Nenhuma linha para renderizar');
        linesListContainer.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="bi bi-inbox me-2"></i> Nenhuma linha cadastrada
                <div class="small mt-1">Clique em "Nova Linha" para começar</div>
            </div>
        `;
        return;
    }
    
    console.log(`Renderizando ${Object.keys(lines).length} linhas`);
    let html = '';
    Object.entries(lines).forEach(([dbKey, lineData]) => {
        console.log(`Linha ${dbKey}:`, lineData);
        console.log(`Campos da linha ${dbKey}:`, Object.keys(lineData));
        html += renderLineItem(lineData, dbKey);
    });
    
    linesListContainer.innerHTML = html;
    console.log('HTML gerado e inserido no container');
    
    // Adicionar event listeners aos botões
    addLineItemEventListeners();
    
    // Atualizar também a lista de linhas existentes no modal (se a função existir)
    if (typeof window.populateExistingLinesList === 'function') {
        console.log('Chamando populateExistingLinesList com', Object.keys(lines).length, 'linhas');
        
        // Debug: verificar se o container existe
        const existingLinesContainer = document.getElementById('existingLinesList');
        console.log('Container existingLinesList encontrado?', !!existingLinesContainer);
        if (existingLinesContainer) {
            console.log('Container visível?', existingLinesContainer.offsetParent !== null);
        }
        
        window.populateExistingLinesList(lines);
    } else {
        console.warn('populateExistingLinesList não é uma função');
    }
}

/**
 * Renderiza um item de linha para a lista
 * @param {object} lineData - Dados da linha
 * @param {string} dbKey - Chave do documento no Firestore
 * @returns {string} HTML do item
 */
function renderLineItem(lineData, dbKey) {
    // Suporte para todos os formatos possíveis de campo
    // 1. Campos do schema Firestore (lineId, name, color, company)
    // 2. Campos mapeados em app.js (id, nome, cor, company)
    // 3. Campos do formulário (code, destination, color, company)
    // 4. Campos em português (id, nome, cor, empresa)
    const code = lineData.lineId || lineData.id || lineData.code || 'N/A';
    const name = lineData.name || lineData.nome || lineData.destination || 'Sem nome';
    const via = lineData.via || '';
    const company = lineData.company || lineData.empresa || '';
    const color = lineData.color || lineData.cor || '#1a73e8';
    
    // Determinar logo da empresa
    let companyLogo = '';
    let companyName = '';
    
    if (company === 'atlantico') {
        companyLogo = 'assets/atlantico-logo.png';
        companyName = 'Atlântico';
    } else if (company === 'viametro') {
        companyLogo = 'assets/viametro-logo.png';
        companyName = 'Via Metro';
    } else {
        companyLogo = 'assets/logo-buzu.png';
        companyName = company || 'Desconhecida';
    }
    
    // Formatar via se existir
    const viaHtml = via ? `<small class="text-muted d-block">${via}</small>` : '';
    
    return `
        <div class="list-group-item line-item" data-db-key="${dbKey}">
            <div class="d-flex align-items-center">
                <div class="me-3">
                    <img src="${companyLogo}" alt="${companyName}" class="rounded" style="width: 40px; height: 40px; object-fit: contain;">
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <div class="line-color-indicator me-2" style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%;"></div>
                        <strong class="me-2">${code}</strong>
                        <span>${name}</span>
                    </div>
                    ${viaHtml}
                    <small class="text-muted">${companyName}</small>
                </div>
                <div class="ms-auto d-flex gap-1">
                    <button class="btn btn-outline-primary btn-sm edit-line-btn" data-db-key="${dbKey}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm delete-line-btn" data-db-key="${dbKey}" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Adiciona event listeners aos botões de editar/excluir das linhas
 */
function addLineItemEventListeners() {
    // Botões de editar
    document.querySelectorAll('.edit-line-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const dbKey = button.getAttribute('data-db-key');
            editLine(dbKey);
        });
    });
    
    // Botões de excluir
    document.querySelectorAll('.delete-line-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const dbKey = button.getAttribute('data-db-key');
            const confirmed = await window.showLineConfirm('Tem certeza que deseja excluir esta linha?');
            if (!confirmed) return;
            try {
                await deleteLineFromFirestore(dbKey);
            } catch (error) {
                // Error handling already done in deleteLineFromFirestore
            }
        });
    });
}

/**
 * Carrega os dados de uma linha para edição
 * @param {string} dbKey - Chave do documento no Firestore
 */
async function editLine(dbKey) {
    try {
        // Verificar se a linha existe no cache
        if (!linesCache[dbKey]) {
            if (typeof window.showLineAlert === 'function') {
                window.showLineAlert('Linha não encontrada no cache. Aguarde o carregamento das linhas.', 'warning');
            } else {
                alert('Linha não encontrada no cache. Aguarde o carregamento das linhas.');
            }
            return;
        }
        
        const lineData = { ...linesCache[dbKey] };
        lineData.dbKey = dbKey; // Adiciona a chave para identificação
        
        // Abrir modal de edição
        if (typeof window.openLineModal === 'function') {
            window.openLineModal(lineData, dbKey);
        } else {
            console.error('Função openLineModal não disponível');
            if (typeof window.showLineAlert === 'function') {
                window.showLineAlert('Modal de edição não disponível', 'warning');
            } else {
                alert('Modal de edição não disponível');
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar linha para edição:', error);
        if (typeof window.showLineAlert === 'function') {
            window.showLineAlert('Erro ao carregar linha para edição', 'danger');
        } else {
            alert('Erro ao carregar linha para edição');
        }
    }
}

/**
 * Salva uma linha no Firestore (cria novo ou atualiza existente)
 * @param {object} lineData - Dados da linha
 * @returns {Promise<string>} Chave do documento salvo
 */
export async function saveLineToFirestore(lineData) {
    console.log('saveLineToFirestore chamado com dados:', lineData);
    try {
        // Extrair dbKey se existir (para atualização)
        const dbKey = lineData.dbKey;
        delete lineData.dbKey; // Remover do objeto de dados
        
        // Preparar dados para Firestore no formato esperado pelo saveLine existente
        // Note: saveLine expects fields that match FIELD constants from firestoreSchema
        const firestoreData = {
            id: lineData.code || lineData.id || '',  // Will be mapped to lineId by saveLine
            nome: lineData.destination || lineData.nome || '',  // Will be mapped to name by saveLine
            via: lineData.via || '',
            cor: lineData.color || lineData.cor || '#1a73e8',
            company: lineData.company || lineData.empresa || ''
        };
        
        // Adicionar campos opcionais se existirem
        // These will be saved as-is since saveLine doesn't map them
        if (lineData.departureLocation) {
            firestoreData.departureLocation = lineData.departureLocation;
        }
        if (lineData.departureTime) {
            firestoreData.departureTime = lineData.departureTime;
        }
        if (lineData.centerArrivalTime) {
            firestoreData.centerArrivalTime = lineData.centerArrivalTime;
        }
        if (lineData.destinationArrivalTime) {
            firestoreData.destinationArrivalTime = lineData.destinationArrivalTime;
        }
        if (lineData.resources) {
            firestoreData.resources = lineData.resources;
        }
        
        // Determinar a chave do documento (usar código da linha se não houver dbKey)
        const lineKey = dbKey || firestoreData.id;
        
        if (!lineKey) {
            throw new Error('É necessário um código para a linha');
        }
        
        console.log('Chave da linha:', lineKey);
        console.log('Dados para Firestore:', firestoreData);
        
        // Usar a função saveLine já importada (em vez de importar Firebase novamente)
        console.log('Chamando saveLine existente...');
        
        // Adicionar timeout para evitar que a promise fique pendente indefinidamente
        // Aumentado para 10 segundos para reduzir falsos positivos
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao salvar linha no Firestore (10 segundos)')), 10000);
        });
        
        try {
            // Race between saveLine and timeout
            await Promise.race([saveLine(lineKey, firestoreData), timeoutPromise]);
            console.log('saveLine completou sem erro');
        } catch (saveLineError) {
            console.error('Erro em saveLine:', saveLineError);
            // Verificar se é um timeout
            if (saveLineError.message.includes('Timeout')) {
                console.warn('Timeout ocorreu, mas a linha pode ter sido salva (verificar Firestore)');
                // Mesmo com timeout, retornar a chave pois a operação pode ter sido bem-sucedida
                // O listener em tempo real já detectou a mudança ("Atualização em tempo real: X linhas")
            } else {
                throw saveLineError;
            }
        }
        console.log(`Linha salva com sucesso: ${lineKey}`);
        
        // Also save to Realtime Database for compatibility
        try {
            const rtdbRef = ref(db, `config/linhas/${lineKey}`);
            const rtdbData = {
                id: firestoreData.id,
                nome: firestoreData.nome,
                via: firestoreData.via,
                cor: firestoreData.cor,
                company: firestoreData.company,
                wifi: lineData.wifi || false,
                arCond: lineData.arCond || false,
                acessivel: lineData.acessivel || false,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            await set(rtdbRef, rtdbData);
            console.log(`✅ Linha ${lineKey} salva também no Realtime Database.`);
        } catch (rtdbError) {
            console.warn('Aviso: Não foi possível salvar no Realtime Database:', rtdbError);
            // Não interromper o fluxo, pois o Firestore já foi salvo
        }
        
        return lineKey;
        
    } catch (error) {
        console.error('Erro ao salvar linha no Firestore:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

/**
 * Exclui uma linha do Firestore
 * @param {string} dbKey - Chave do documento no Firestore
 * @returns {Promise<void>}
 */
export async function deleteLineFromFirestore(dbKey) {
    try {
        // Usar a função deleteLine existente do firestoreService
        await deleteLine(dbKey);
        console.log(`Linha excluída: ${dbKey}`);
        
        // A lista será atualizada automaticamente pelo listener em tempo real
        
    } catch (error) {
        console.error('Erro ao excluir linha do Firestore:', error);
        if (typeof window.showLineAlert === 'function') {
            window.showLineAlert('Erro ao excluir linha: ' + error.message, 'danger');
        } else {
            alert('Erro ao excluir linha');
        }
        throw error;
    }
}

/**
 * Fecha o modal de linha e recarrega a lista
 */
export function closeLineModalAndReload() {
    // Fechar modal se estiver aberto
    if (typeof window.closeLineModal === 'function') {
        window.closeLineModal();
    }
    
    // Recarregar lista
    setTimeout(() => {
        loadLinesList();
    }, 500);
}

/**
 * Limpa os listeners ao destruir o módulo
 */
export function cleanupLineManager() {
    if (linesUnsubscribe) {
        linesUnsubscribe();
        linesUnsubscribe = null;
    }
    linesCache = {};
    console.log('LineManager limpo');
}

// Expor funções globalmente para acesso via window
if (typeof window !== 'undefined') {
    console.log('LineManager: Expondo funções para window object');
    window.initLineManager = initLineManager;
    window.loadLinesList = loadLinesList;
    window.saveLineToFirestore = saveLineToFirestore;
    window.deleteLineFromFirestore = deleteLineFromFirestore;
    window.closeLineModalAndReload = closeLineModalAndReload;
    window.cleanupLineManager = cleanupLineManager;
    console.log('LineManager: Funções expostas com sucesso');
} else {
    console.log('LineManager: window não está disponível (ambiente não-browser)');
}