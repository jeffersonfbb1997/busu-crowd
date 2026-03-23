const fs = require('fs');
const path = './index.html';

let content = fs.readFileSync(path, 'utf8');

// Mapping of corrupted sequences to correct characters (using actual replacement character �)
const replacements = [
    // Single � replacements
    ['USU�RIO', 'USUÁRIO'],
    ['Pr�ximas', 'Próximas'],
    ['Hist�rico', 'Histórico'],
    ['avan�ados', 'avançados'],
    ['Dispon�veis', 'Disponíveis'],
    ['Gest�o', 'Gestão'],
    ['Fict�cios', 'Fictícios'],
    ['Sa�de', 'Saúde'],
    ['Usu�rios', 'Usuários'],
    ['Subt�tulo', 'Subtítulo'],
    ['Tra�ado', 'Traçado'],
    ['Par�metros', 'Parâmetros'],
    ['m�ximo', 'máximo'],
    ['�nibus', 'ônibus'],
    ['Seguran�a', 'Segurança'],
    ['par�metros', 'parâmetros'],
    ['Permiss�es', 'Permissões'],
    ['usu�rio', 'usuário'],
    ['Transmiss�o', 'Transmissão'],
    ['c�digo', 'código'],
    ['padr�o', 'padrão'],
    ['sa�de', 'saúde'],
    // Double �� replacements
    ['Contribui��es', 'Contribuições'],
    ['Notifica��es', 'Notificações'],
    ['Configura��es', 'Configurações'],
    ['exibi��o', 'exibição'],
    ['Opera��o', 'Operação'],
    ['anima��o', 'animação'],
    ['transi��o', 'transição'],
    ['Inicializa��o', 'Inicialização'],
    ['Verifica��o', 'Verificação'],
    // Additional patterns from later lines
    ['Gest�o de Linhas', 'Gestão de Linhas'],
    ['Gest�o de Rotas', 'Gestão de Rotas'],
    ['Gest�o de Paradas', 'Gestão de Paradas'],
    ['Gest�o de Terminais', 'Gestão de Terminais'],
    ['Opera��o', 'Operação'],
    ['Configura��es do Sistema', 'Configurações do Sistema'],
    ['Configura��es Gerais', 'Configurações Gerais'],
    ['Simular Dados Fict�cios', 'Simular Dados Fictícios'],
    ['Monitoramento de Sa�de', 'Monitoramento de Saúde'],
    ['Usu�rios Transmitindo', 'Usuários Transmitindo'],
    ['Subt�tulo / Via', 'Subtítulo / Via'],
    ['Tra�ado', 'Traçado'],
    ['Configura��es do Sistema', 'Configurações do Sistema'],
    ['Painel de Controle de Par�metros', 'Painel de Controle de Parâmetros'],
    ['Raio m�ximo para exibi��o de �nibus', 'Raio máximo para exibição de ônibus'],
    ['Seguran�a Administrativa', 'Segurança Administrativa'],
    ['par�metros', 'parâmetros'],
    ['Verifica��o de Permiss�es', 'Verificação de Permissões'],
    ['permiss�es do usu�rio atual', 'permissões do usuário atual'],
    ['Transmiss�o de GPS', 'Transmissão de GPS'],
    ['transmiss�o em tempo real', 'transmissão em tempo real'],
    ['Buscar linha por c�digo', 'Buscar linha por código'],
    ['Buscando linhas para transmiss�o GPS', 'Buscando linhas para transmissão GPS'],
    ['Ativar primeiro grupo por padr�o', 'Ativar primeiro grupo por padrão'],
    ['Abre o painel administrativo em tela cheia com anima��o', 'Abre o painel administrativo em tela cheia com animação'],
    ['Oculta a sidebar e o mapa com transi��o', 'Oculta a sidebar e o mapa com transição'],
    ['Ap�s a opacidade zerar', 'Após a opacidade zerar'],
    ['Mostra o painel administrativo com anima��o', 'Mostra o painel administrativo com animação'],
    ['For�ar reflow', 'Forçar reflow'],
    ['Fecha o painel administrativo e retorna ao mapa com anima��o', 'Fecha o painel administrativo e retorna ao mapa com animação'],
    ['Esconde o painel administrativo com anima��o', 'Esconde o painel administrativo com animação'],
    ['Ap�s a transi��o de sa�da', 'Após a transição de saída'],
    ['Remover transi��o ap�s a anima��o', 'Remover transição após a animação'],
    ['Volta � view principal', 'Volta à view principal'],
    ['Inicializa��o: garantir', 'Inicialização: garantir'],
];

for (const [wrong, correct] of replacements) {
    content = content.split(wrong).join(correct);
}

// Write back
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced', replacements.length, 'patterns');