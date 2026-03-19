# Teste da Infraestrutura de Dados do BusU-Crowd

## Visão Geral
Este documento descreve os testes para verificar a implementação completa da infraestrutura de dados do sistema BusU-Crowd.

## Componentes Implementados

### 1. Sistema de Parâmetros Dinâmicos
- **Arquivo**: `services/parametersService.js`
- **Funcionalidade**: Listener para `config/parametros` no Firebase
- **Variáveis atualizadas**: `systemTTL` e `systemRadius` no state global
- **Teste**: Verificar se os valores são carregados do Firebase e atualizados em tempo real

### 2. Coletor de GPS Aprimorado
- **Arquivo**: `modules/gps/gpsCollector.js`
- **Funcionalidade**: Estrutura de dados refinada com:
  - Coordenadas arredondadas para 6 casas decimais
  - Velocidade em km/h
  - Precisão (acc) em metros
  - Direção (heading)
  - Timestamp atual
- **Teste**: Verificar se os dados são enviados corretamente para o Firebase

### 3. Motor de Processamento de Dados Brutos
- **Arquivo**: `modules/buses/dataProcessor.js`
- **Funcionalidade**: Processamento de dados brutos para o monitor administrativo
- **Extrai**: ID do usuário, chave da linha, velocidade, precisão, atraso de pacote
- **Teste**: Verificar se os dados são processados corretamente e as estatísticas são calculadas

### 4. Monitor Administrativo
- **Arquivo**: `admin/dashboard/liveMonitor.js`
- **Funcionalidade**: Interface para visualização de todos os sinais do sistema
- **Exibe**: Todos os sinais sem filtro de distância
- **Teste**: Verificar se a interface é atualizada com dados processados

### 5. Painel de Configurações do Sistema
- **Arquivo**: `core/app.js` (funções) + `index.html` (interface)
- **Funcionalidade**: Sincronização de parâmetros com Firebase
- **Recursos**: Inputs para TTL e Raio, validação de admin, salvamento
- **Teste**: Verificar se os parâmetros podem ser alterados por administradores

### 6. Limpeza de Segurança Master
- **Arquivo**: `services/parametersService.js` + `modules/buses/busRenderer.js`
- **Funcionalidade**: Limpeza imediata de marcadores expirados quando TTL muda
- **Teste**: Verificar se os marcadores são removidos quando excedem o novo TTL

## Testes Práticos

### Teste 1: Carregamento de Parâmetros
1. Acesse o Firebase Console
2. Adicione dados em `config/parametros`: `{ "ttl": 60, "radius": 10 }`
3. Recarregue a aplicação
4. Verifique se `state.systemTTL` é 60000ms e `state.systemRadius` é 10km

### Teste 2: Coleta de GPS
1. Faça login com Google
2. Selecione uma linha e inicie transmissão de GPS
3. Verifique no Firebase se os dados são salvos em `onibus/[linha]/[uid]`
4. Confirme a estrutura: `{ lat, lng, speed, acc, heading, timestamp }`

### Teste 3: Processamento de Dados
1. Com vários usuários transmitindo GPS
2. Acesse o monitor administrativo (`view-admin-settings`)
3. Verifique se os dados são processados e exibidos
4. Confirme as estatísticas: total de sinais, usuários ativos, sinais expirados

### Teste 4: Alteração de Parâmetros
1. Faça login como administrador (master admin ou admin listado)
2. Acesse Configurações do Sistema
3. Altere TTL para 30 segundos e Raio para 3km
4. Clique em SALVAR PARÂMETROS
5. Verifique no Firebase se os valores foram atualizados
6. Confirme se a aplicação reflete os novos valores

### Teste 5: Limpeza de Segurança
1. Com alguns sinais ativos no sistema
2. Altere o TTL para um valor muito baixo (ex: 10 segundos)
3. Execute a limpeza forçada
4. Verifique se os marcadores expirados são removidos do mapa

## Validação de Segurança

### Acesso Administrativo
- **Master Admin** (`jeffersonfbb1997@gmail.com`): Pode alterar parâmetros
- **Admins Listados** (`config/admins`): Podem alterar parâmetros
- **Usuários Comuns**: Não podem alterar parâmetros
- **Teste**: Tentar salvar parâmetros com usuário não-admin deve falhar

### Regras do Firebase
- **Leitura**: Pública para todos os dados
- **Escrita em `config/parametros`**: Apenas admins
- **Escrita em `onibus`**: Dono do dado ou admin
- **Teste**: Verificar se as regras estão aplicadas no Firebase Console

## Integração com Sistema Existente

### Mapa e Renderização
- **Arquivos atualizados**: `modules/buses/busRenderer.js`, `modules/buses/busManager.js`
- **Alterações**: Uso de `state.systemTTL` em vez de valor fixo 45000
- **Teste**: Verificar se os ônibus são renderizados corretamente com TTL dinâmico

### Interface do Usuário
- **Bottom Card**: Exibe raio atual do sistema
- **Admin Entry**: Mostrado apenas para administradores
- **Teste**: Verificar se a UI reflete os parâmetros atuais do sistema

## Próximos Passos

### 1. Monitoramento Contínuo
- Adicionar logs de alterações de parâmetros
- Monitorar performance do processamento de dados
- Implementar alertas para anomalias

### 2. Melhorias de UI
- Gráficos em tempo real no monitor administrativo
- Histórico de alterações de parâmetros
- Dashboard com métricas avançadas

### 3. Escalabilidade
- Otimização do processamento para grande volume de dados
- Cache de parâmetros para reduzir chamadas ao Firebase
- Sistema de filas para processamento assíncrono

## Conclusão
A infraestrutura de dados foi completamente implementada com:
- Parâmetros dinâmicos carregados do Firebase
- Coleta de GPS aprimorada com estrutura de dados rica
- Processamento de dados brutos para monitoramento administrativo
- Interface de configurações sincronizada com Firebase
- Sistema de limpeza de segurança para TTL dinâmicos
- Integração completa com o sistema existente de renderização de mapa

Todos os componentes seguem as melhores práticas de engenharia de software e estão prontos para produção.