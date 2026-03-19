# Teste das Regras do Firebase

## Objetivo
Verificar se as regras de segurança do Firebase estão corretamente integradas com o sistema de autenticação.

## Cenários de Teste

### 1. Administrador Master (jeffersonfbb1997@gmail.com)
- **Acesso esperado**: Total
- **Recursos permitidos**:
  - Adicionar/remover administradores (`config/admins`)
  - Gerenciar linhas (`config/linhas`)
  - Configurar parâmetros (`config/parametros`)
  - Limpar frota de ônibus (`onibus`)
  - Modificar qualquer sinal de GPS (`onibus/$linha/$usuario`)

### 2. Administrador Listado (UID em `config/admins`)
- **Acesso esperado**: Administrativo
- **Recursos permitidos**:
  - Gerenciar linhas (`config/linhas`)
  - Configurar parâmetros (`config/parametros`)
  - Limpar frota de ônibus (`onibus`)
  - Modificar qualquer sinal de GPS (`onibus/$linha/$usuario`)
- **Recursos NEGADOS**:
  - Adicionar/remover administradores (`config/admins`)

### 3. Usuário Autenticado (Colaborador)
- **Acesso esperado**: Básico
- **Recursos permitidos**:
  - Ler todos os dados (`.read`: true)
  - Escrever seu próprio sinal de GPS (`onibus/$linha/$seuUID`)
- **Recursos NEGADOS**:
  - Modificar sinais de GPS de outros usuários
  - Acessar configurações administrativas

### 4. Usuário Não Autenticado
- **Acesso esperado**: Somente leitura
- **Recursos permitidos**:
  - Ler todos os dados (`.read`: true)
- **Recursos NEGADOS**:
  - Qualquer escrita no sistema

## Verificação da Implementação

### Funções Adicionadas ao `authService.js`

1. **`isUserAdmin(user)`**:
   - Verifica se o usuário é admin master (por e-mail)
   - Verifica se o usuário está listado em `config/admins`
   - Retorna `Promise<boolean>`

2. **`isUserMasterAdmin(user)`**:
   - Verifica se o usuário é admin master (apenas por e-mail)
   - Retorna `boolean`

### Alterações no `core/app.js`

1. **Importação atualizada**:
   ```javascript
   import { login, logout, subscribeToAuthChanges, isUserAdmin } from '../services/authService.js';
   ```

2. **Função `handleAuthChange` atualizada**:
   - Agora é `async function`
   - Usa `await isUserAdmin(u)` para verificar privilégios
   - Mostra/oculta entrada administrativa conforme resultado

## Próximos Passos

1. **Interface de Administração**:
   - Criar interface para admin master gerenciar lista de admins
   - Adicionar/remover UIDs de `config/admins`

2. **Testes Práticos**:
   - Testar login com diferentes tipos de usuários
   - Verificar se as regras do Firebase bloqueiam acessos não autorizados
   - Validar que admin listados têm acesso administrativo

3. **Monitoramento**:
   - Adicionar logs de tentativas de acesso não autorizado
   - Monitorar uso dos privilégios administrativos

## Arquivos Criados/Modificados

1. `config/firebaseRules.json` - Regras de segurança do Firebase
2. `config/accessHierarchy.md` - Documentação da hierarquia de acesso
3. `services/authService.js` - Funções de verificação de admin
4. `core/app.js` - Integração com sistema de autenticação

## Notas Importantes

- As regras do Firebase são aplicadas no servidor, não no cliente
- A verificação no cliente (`isUserAdmin`) é apenas para UI/UX
- A segurança real é garantida pelas regras do Firebase Realtime Database
- O admin master deve manter o controle da lista de administradores
- Usuários administrativos não podem promover outros administradores