const fs = require('fs');
const path = './index.html';

let content = fs.readFileSync(path, 'utf8');

// Mapping of corrupted sequences to correct characters
const replacements = [
    // Single ? replacements (likely a single accented character)
    ['USU?RIO', 'USUÁRIO'],
    ['Pr?ximas', 'Próximas'],
    ['Hist?rico', 'Histórico'],
    ['avan?ados', 'avançados'],
    ['Dispon?veis', 'Disponíveis'],
    ['Gest?o', 'Gestão'],
    ['Fict?cios', 'Fictícios'],
    ['Sa?de', 'Saúde'],
    ['Usu?rios', 'Usuários'],
    ['Subt?tulo', 'Subtítulo'],
    ['Tra?ado', 'Traçado'],
    ['Par?metros', 'Parâmetros'],
    ['m?ximo', 'máximo'],
    ['?nibus', 'ônibus'],
    ['Seguran?a', 'Segurança'],
    ['par?metros', 'parâmetros'],
    ['Permiss?es', 'Permissões'],
    ['usu?rio', 'usuário'],
    ['Transmiss?o', 'Transmissão'],
    ['c?digo', 'código'],
    ['padr?o', 'padrão'],
    ['sa?de', 'saúde'],
    // Double ?? replacements (likely two characters, e.g., çõ)
    ['Contribui??es', 'Contribuições'],
    ['Notifica??es', 'Notificações'],
    ['Configura??es', 'Configurações'],
    ['exibi??o', 'exibição'],
    ['Opera??o', 'Operação'],
    ['anima??o', 'animação'],
    ['transi??o', 'transição'],
    ['Inicializa??o', 'Inicialização'],
    // Triple ??? maybe not present
];

for (const [wrong, correct] of replacements) {
    content = content.split(wrong).join(correct);
}

// Write back
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced', replacements.length, 'patterns');