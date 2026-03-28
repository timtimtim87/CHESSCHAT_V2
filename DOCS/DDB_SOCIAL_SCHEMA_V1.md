# DynamoDB Social Schema V1

Last updated: 2026-03-28

## Design choice
- Multi-table design (clear separation by domain):
1. `chesschat-<env>-friendships`
2. `chesschat-<env>-friend-requests`
3. `chesschat-<env>-challenges`
4. `chesschat-<env>-notifications`

## Table 1: Friendships
- PK: `user_id` (S)
- SK: `friend_user_id` (S)
- Attributes: `friend_username`, `friend_display_name`, `created_at`
- GSI: none required for v1 (writes are mirrored both directions)

Access patterns:
- List all friends for a user:
  - `Query PK = user_id`

## Table 2: Friend Requests
- PK: `recipient_user_id` (S)
- SK: `request_id` (S)
- Attributes:
  - `sender_user_id`
  - `sender_username`
  - `recipient_username`
  - `status` (`pending|accepted|declined|canceled`)
  - `created_at`, `updated_at`
- GSI 1: `sender-requests-index`
  - PK: `sender_user_id`
  - SK: `created_at`

Access patterns:
- List all pending received requests for user:
  - `Query PK = recipient_user_id`, filter `status = pending`
- List all pending sent requests for user:
  - `Query GSI sender-requests-index PK = sender_user_id`, filter `status = pending`

## Table 3: Challenges
- PK: `challenge_id` (S)
- SK: none
- Attributes:
  - `challenger_user_id`, `challenger_username`
  - `challenged_user_id`, `challenged_username`
  - `room_code`
  - `status` (`pending|active|accepted|declined|expired|canceled`)
  - `settings` (host-authoritative game settings snapshot)
  - `created_at`, `updated_at`
- GSI 1: `challenger-index`
  - PK: `challenger_user_id`
  - SK: `created_at`
- GSI 2: `challenged-index`
  - PK: `challenged_user_id`
  - SK: `created_at`

Access patterns:
- List pending/active challenges for a user:
  - Query `challenger-index` + `challenged-index` for user, merge results, filter statuses `pending|active|accepted`
- Lookup specific challenge by ID:
  - `GetItem PK = challenge_id`

## Table 4: Notifications
- PK: `user_id` (S)
- SK: `notification_id` (S)
- Attributes:
  - `type` (`friend_request|challenge_received|challenge_accepted|system`)
  - `title`, `message`
  - `read` (bool)
  - `entity_id` (optional request/challenge id)
  - `created_at`, `updated_at`
- GSI: none for v1

Access patterns:
- List notifications for user:
  - `Query PK = user_id` (descending read in app)
- Mark notification read:
  - `UpdateItem PK=user_id SK=notification_id`
