# Hierarquia de Acesso do Sistema BusU-Crowd

## Visão Geral
Este documento descreve a hierarquia profissional de acesso implementada nas regras de segurança do Firebase para o sistema BusU-Crowd.

## Níveis de Acesso

### 1. Administrador Master (Nível Máximo)
- **Identificação**: E-mail `jeffersonfbb1997@gmail.com`
- **Privilégios**:
  - Poder absoluto sobre todo o sistema
  - Único capaz de adicionar/remover outros administradores
  - Pode limpar toda a frota de ônibus
  - Pode gerenciar todas as linhas e parâmetros do sistema
  - Pode acessar e modificar qualquer dado de GPS
- **Responsabilidade**: Controle total da lista de administradores

### 2. Corpo Administrativo (Admins)
- **Identificação**: Usuários listados em `config/admins` no Firebase
- **Privilégios**:
  - Pode ver o Monitor Vivo em tempo real
  - Pode gerenciar linhas de ônibus
  - Pode modificar configurações de TTL/Raio do sistema
  - Pode limpar a frota de ônibus
  - Pode acessar e modificar dados de GPS de qualquer usuário
- **Como são adicionados**: Apenas pelo Administrador Master via interface

### 3. Colaboradores (Alunos/Usuários)
- **Identificação**: Qualquer usuário autenticado via Google
- **Privilégios**:
  - Pode ver o mapa em tempo real
  - Pode transmitir seu próprio sinal de GPS
  - Pode visualizar dados públicos do sistema
- **Restrições**:
  - Não pode interferir no sinal de GPS de outros usuários
  - Não pode modificar configurações do sistema
  - Não pode gerenciar linhas ou parâmetros

## Regras de Segurança por Recurso

### `onibus` (Dados de GPS)
- **Leitura**: Pública (`.read`: true)
- **Escrita**:
  - Administrador Master OU Admin autorizado: Pode limpar toda a frota
  - Dono do dado OU Administrador Master OU Admin autorizado: Pode escrever/apagar sinal de GPS específico

### `config/admins` (Lista de Administradores)
- **Leitura**: Apenas usuários autenticados
- **Escrita**: Apenas Administrador Master

### `config/linhas` (Configuração de Linhas)
- **Escrita**: Administrador Master OU Admin autorizado

### `config/parametros` (Parâmetros do Sistema)
- **Escrita**: Administrador Master OU Admin autorizado

## Fluxo de Promoção
1. Administrador Master acessa interface administrativa
2. Adiciona UID do usuário à lista `config/admins`
3. Usuário ganha automaticamente privilégios administrativos
4. Administrador Master pode remover a qualquer momento

## Considerações de Segurança
- O controle da lista de administradores permanece 100% com o e-mail master
- Usuários administrativos não podem promover outros administradores
- Cada nível tem acesso apenas ao necessário para suas funções
- Sistema evita interferência entre sinais de GPS de diferentes usuários

## Implementação Técnica
As regras estão implementadas em `config/firebaseRules.json` e utilizam:
- Verificação por e-mail para Administrador Master
- Verificação por UID na lista de admins para Corpo Administrativo
- Verificação por ownership (UID do usuário) para dados pessoais