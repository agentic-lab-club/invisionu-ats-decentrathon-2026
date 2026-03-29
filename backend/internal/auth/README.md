# OTP Authentication Module

Модуль OTP аутентификации для Golang проекта, мигрированный из TypeScript Directus custom endpoint.

## Функциональность

- ✅ Генерация и отправка OTP кодов через SMS или Telegram по выбору пользователя
- ✅ Верификация OTP и создание пользователей
- ✅ Выдача JWT токенов совместимых с Directus
- ✅ Rate limiting для защиты от злоупотреблений
- ✅ Поддержка тестовых аккаунтов для разработки
- ✅ Поддержка фиксированного OTP кода для специальных пользователей (fix_otp)
- ✅ Автоматическая очистка истекших записей

## API Endpoints

### POST /auth-otp/request
Запрос OTP кода с обязательным выбором канала отправки

**Query Parameters:**
- `channel` (required): Канал отправки OTP
  - `sms` - отправить по SMS
  - `tg` или `telegram` - отправить в Telegram

**Request:**
```json
{
  "phone_number": "+77001234567"
}
```

**Examples:**
```bash
# Отправить OTP по SMS
POST /auth-otp/request?channel=sms
Content-Type: application/json

{"phone_number": "+77001234567"}

# Отправить OTP в Telegram
POST /auth-otp/request?channel=tg
Content-Type: application/json

{"phone_number": "+77001234567"}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Responses:**
```json
{
  "error": "Missing channel query parameter"
}
```

```json
{
  "error": "Invalid channel parameter"
}
```

```json
{
  "error": "sms channel is not configured"
}
```

```json
{
  "error": "telegram channel is not available"
}
```

### POST /auth-otp/login
Верификация OTP и получение токена

**Request:**
```json
{
  "phone_number": "+77001234567",
  "code": "12345"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2024-01-01T12:00:00Z",
  "user": {
    "id": "uuid",
    "phone_number": "+77001234567",
    "role": {
      "id": "uuid",
      "name": "User"
    }
  }
}
```

### GET /auth-otp/health
Проверка состояния сервиса

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0"
}
```

## Конфигурация

Добавьте в `config.local.yaml`:

```yaml
auth:
  jwt_secret: "your-super-secret-jwt-key-here"
  api_token: "your-secure-api-token-64-chars-here"
  test_accounts: "+77001234567:99999,+77009876543:88888"
  default_role_id: "uuid-of-default-user-role"
  fixed_otp_code: "12345"  # Фиксированный код для пользователей с is_fix_otp=true

sms:
  enabled: true
  login: "your_smsc_login"
  api_key: "your_smsc_api_key"
  base_url: "https://smsc.kz/rest/send/"

environment: "development"
```

## Логика отправки OTP по каналам

### SMS канал (`channel=sms`)
1. Требует конфигурации SMS (enabled, login, api_key, base_url)
2. Отправляет OTP код на номер телефона по SMS
3. Если SMS не настроен, возвращает ошибку `"sms channel is not configured"`

### Telegram канал (`channel=tg` или `channel=telegram`)
1. Использует SMSC API с параметром `tg=1` для отправки через Telegram
2. Если Telegram недоступен, возвращает ошибку `"telegram channel is not available"`

## Обработка специальных номеров

### Тестовые аккаунты
```yaml
auth:
  test_accounts: "+77001234567:99999,+77009876543:88888"
```

Для тестовых номеров:
- OTP **не генерируется** и **не отправляется** при запросе
- Код проверяется локально в `VerifyOTP` (сравнивается с указанным кодом)
- Полезно для разработки и автотестов

### Пользователи с фиксированным OTP (fix_otp)
```yaml
auth:
  fixed_otp_code: "12345"
```

Для пользователей с флагом `is_fix_otp=true` в базе:
- OTP **не генерируется** и **не отправляется** при запросе
- Код проверяется локально в `VerifyOTP` (сравнивается с `auth.fixed_otp_code`)
- Требует, чтобы `fixed_otp_code` был настроен в конфиге

### Обычные пользователи
- OTP генерируется и сохраняется в БД (`AUTH_OTP` таблица)
- OTP отправляется по выбранному каналу (SMS или Telegram)
- OTP код действует 5 минут
- После успешной верификации OTP помечается как использованный

## SMS отправка - каналы доставки

## Rate Limiting

- **OTP запросы:** 3 запроса в 60 секунд на номер
- **Попытки входа:** 5 попыток в 300 секунд на номер

При превышении лимитов возвращается HTTP 429 с заголовком `Retry-After`.

## Тестовые аккаунты

Для разработки можно настроить тестовые номера с фиксированными кодами:

```yaml
auth:
  test_accounts: "+77001234567:99999,+77009876543:88888"
```

Для тестовых номеров SMS не отправляется, код проверяется локально.

## Безопасность

- Все OTP коды генерируются криптографически стойким генератором
- JWT токены подписываются HMAC-SHA256
- Rate limiting защищает от брутфорса
- Автоматическая очистка истекших записей
- API защищен токеном авторизации

## Структура базы данных

Используется существующая таблица `AUTH_OTP`.