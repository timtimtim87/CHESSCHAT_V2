# Chess Platform - Architecture & Implementation Guide

## Project Overview

A real-time chess platform with integrated video chat, built on AWS with three-tier VPC architecture to demonstrate production-grade cloud infrastructure design and Solutions Architect best practices.

---

## Core Features

### Game Experience
- **Standard Chess (8x8)**: Traditional chess with all standard rules
- **5-Minute Time Control**: Each player has 5 minutes total (blitz chess)
- **Room-Based Sessions**: Create or join rooms with simple 5-character codes
- **Sequential Games**: Play multiple games in one video chat session
- **Integrated Video Chat**: Amazon Chime SDK for real-time video/audio during games

### User Management
- User authentication via Amazon Cognito User Pools
- Social login support (Google, Facebook, Amazon, Apple)
- User statistics and match history tracking
- No friends system - connections made via room codes only

### Session Features
- Two-phase room concept: Video chat room (persistent) + Chess games (ephemeral within room)
- Room expires after 60 minutes hard limit
- Automatic reconnection support (rejoin with same code)
- Multiple sequential games per room session
- Game results persist to DynamoDB for history

---

## AWS Architecture

### Three-Tier VPC Design

The application follows a classic three-tier architecture pattern with complete network isolation:

**Tier 1: Presentation Layer (Public Subnets)**
- Application Load Balancer exposed to internet
- NAT Gateways for outbound internet access from private subnets
- One public subnet per Availability Zone

**Tier 2: Application Layer (Private App Subnets)**
- ECS Fargate tasks running application containers
- No public IP addresses - only accessible via ALB
- WebSocket server for real-time game communication
- Chess game logic and move validation
- Chime SDK meeting orchestration
- One private app subnet per Availability Zone

**Tier 3: Data Layer (Private Data Subnets)**
- ElastiCache Redis for active room and game state
- DynamoDB accessed via VPC Gateway Endpoint
- Completely isolated from internet
- One private data subnet per Availability Zone

### Infrastructure Components

#### VPC Configuration
**CIDR Block**: 10.0.0.0/16

**Subnets across 3 Availability Zones:**
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
  - Internet Gateway attached
  - Hosts ALB and NAT Gateways
  
- **Private App Subnets**: 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24
  - Route to NAT Gateway for outbound internet
  - Hosts ECS Fargate tasks (no public IPs)
  
- **Private Data Subnets**: 10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24
  - No internet access (inbound or outbound)
  - VPC Gateway Endpoints only
  - Hosts ElastiCache Redis

**Internet Gateway:**
- Attached to VPC for public subnet internet access
- Enables inbound HTTPS traffic to ALB
- Route: 0.0.0.0/0 â†’ IGW in public subnet route tables

**NAT Gateways:**
- Deploy 2x NAT Gateways (AZ-A and AZ-B) for high availability
- Located in public subnets with Elastic IPs
- Provides outbound internet for private app subnets
- Used for: package downloads, AWS API calls via internet, external integrations
- Route: 0.0.0.0/0 â†’ NAT Gateway in private app subnet route tables
- Optional: Deploy 3rd in AZ-C for full redundancy

**VPC Endpoints (PrivateLink):**
- **Gateway Endpoints** (free):
  - DynamoDB Gateway Endpoint
  - S3 Gateway Endpoint (for ECR image layers)
- **Interface Endpoints** (~$7/month each):
  - ECR API Interface Endpoint
  - ECR Docker Interface Endpoint
  - CloudWatch Logs Interface Endpoint
  - Secrets Manager Interface Endpoint
- Eliminates NAT Gateway data charges for AWS service calls
- Private connectivity without internet traversal

**Security Groups:**
- **ALB Security Group**: Allow 443 from 0.0.0.0/0, allow 80 redirect to 443
- **Fargate Task Security Group**: Allow traffic only from ALB security group
- **Redis Security Group**: Allow 6379 only from Fargate task security group
- **VPC Endpoint Security Groups**: Allow 443 from private subnets

**Network ACLs:**
- Public subnet NACLs: Allow HTTP/HTTPS inbound, ephemeral ports outbound
- Private app subnet NACLs: Allow from public subnets and within VPC
- Private data subnet NACLs: Deny all internet traffic, allow VPC only

**VPC Flow Logs (Optional):**
- Enable on VPC or specific subnets
- Destination: CloudWatch Logs or S3
- Capture: Accepted, rejected, or all traffic
- Retention: 7 days
- Use for: Network troubleshooting, security analysis, traffic patterns

#### Container Services

**Amazon ECR (Elastic Container Registry):**
- Private Docker image repository
- Store application container images
- Lifecycle policies for image cleanup
- Image scanning for vulnerabilities
- IAM-based access control
- Encrypted at rest

**Amazon ECS (Elastic Container Service):**
- Cluster: Fargate launch type (no EC2 instances)
- Task Definitions: Define container specs (image, CPU, memory, ports, env vars)
- Service: Maintains desired task count with auto-scaling
- Service Discovery: Optional for multi-service architectures

**AWS Fargate:**
- Serverless container compute
- Task sizing: 0.25 vCPU, 0.5 GB to start (scalable)
- No instance management
- Pay per task-second
- Automatic patching and security

**ECS Service Auto Scaling:**
- Target tracking: ALB request count per target
- Step scaling: CPU/memory thresholds
- Min tasks: 2, Max tasks: 8
- Scale-out cooldown: 60 seconds
- Scale-in cooldown: 300 seconds

#### Load Balancing

**Application Load Balancer (ALB):**
- Scheme: Internet-facing
- Subnets: All 3 public subnets for HA
- IP address type: IPv4 (or dualstack for IPv6)
- Deletion protection: Enabled

**Target Groups:**
- Target type: IP (for Fargate tasks)
- Protocol: HTTP on port 80 or 443
- Health check: /health endpoint, 30s interval, 3 consecutive failures
- Deregistration delay: 30 seconds for connection draining
- Sticky sessions: Enabled (for WebSocket connections)
- Stickiness duration: 1 hour

**ALB Listeners:**
- HTTPS (443): Forward to target group, attach ACM certificate
- HTTP (80): Redirect to HTTPS
- WebSocket: Automatically supported via HTTP/1.1 upgrade

**Security Features:**
- Security group allows only 80/443 inbound
- TLS policy: ELBSecurityPolicy-TLS-1-2-2017-01 (minimum TLS 1.2)
- Access logs to S3 (optional)
- Connection draining during deployments

#### Data Layer

**Amazon ElastiCache (Redis):**
- Engine version: Redis 6.x or 7.x
- Node type: cache.t4g.micro or cache.t4g.small
- Multi-AZ: Enabled with automatic failover
- Subnet group: Private data subnets
- Parameter group: Custom for TTL configuration
- Encryption: At-rest and in-transit
- AUTH token: Stored in Secrets Manager
- Backup: Daily snapshots, 7-day retention

**Redis Data Structures:**
- Rooms: Hash with room metadata, TTL 60 minutes
- Games: Hash with game state, nested under room
- WebSocket connections: String mapping connection_id to user_id

**Amazon DynamoDB:**
- Billing mode: On-demand (pay per request)
- Encryption: AWS-managed keys (default)
- Point-in-time recovery: Enabled
- Deletion protection: Enabled

**DynamoDB Tables:**
- **Users Table**: PK: user_id, GSI on username
- **Games History Table**: PK: game_id, SK: ended_at, GSI on player IDs

**DynamoDB Global Secondary Indexes:**
- white_player_index: PK: white_player_id, SK: ended_at
- black_player_index: PK: black_player_id, SK: ended_at

#### Identity & Access Management

**Amazon Cognito User Pools:**
- Pool name: chess-platform-users
- Username attributes: Email or username
- Password policy: Min 12 chars, uppercase, lowercase, numbers, symbols
- Email verification: Required
- MFA: Optional (TOTP or SMS)
- Social identity providers: Google, Facebook, Apple, Amazon
- App client: Web app with OAuth 2.0 flows
- Domain: Hosted UI or custom domain

**Cognito App Client Settings:**
- OAuth flows: Authorization code grant
- Scopes: openid, profile, email
- Callback URLs: https://chess.yourdomain.com/callback
- Sign-out URLs: https://chess.yourdomain.com/logout
- Token validity: Access token 1 hour, Refresh token 30 days

**IAM Roles:**

**ECS Task Execution Role:**
- Trust policy: ECS tasks service
- Permissions:
  - ecr:GetAuthorizationToken
  - ecr:BatchCheckLayerAvailability
  - ecr:GetDownloadUrlForLayer
  - ecr:BatchGetImage
  - logs:CreateLogStream
  - logs:PutLogEvents
  - secretsmanager:GetSecretValue

**ECS Task Role (Application Permissions):**
- Trust policy: ECS tasks service
- Permissions:
  - dynamodb:PutItem (specific tables)
  - dynamodb:GetItem (specific tables)
  - dynamodb:Query (specific tables)
  - dynamodb:UpdateItem (specific tables)
  - elasticache:DescribeCacheClusters
  - chime:CreateMeeting
  - chime:CreateAttendee
  - chime:DeleteMeeting
  - cloudwatch:PutMetricData
- Resource-level permissions only, no wildcards

**AWS Secrets Manager:**
- Store: Redis AUTH token, third-party API keys
- Automatic rotation: Enabled for supported secrets
- Encryption: KMS customer-managed key
- Access: ECS Task Execution Role only
- Versioning: Automatic for rotation

#### Communication Services

**WebSocket Server:**
- Implemented in application container
- Protocol: WSS (WebSocket Secure over TLS)
- Port: 443 via ALB
- Connection management: In-memory or Redis-backed
- Heartbeat interval: 30 seconds
- Reconnection: Client-side automatic retry

**Amazon Chime SDK:**
- Region: Same as application (us-east-1)
- Meeting creation: Server-side via AWS SDK
- Attendee tokens: Generated per participant
- Meeting lifecycle: Tied to room (60 min max)
- Pricing: $0.0017 per attendee-minute
- Features used: Audio, video (screen share optional)
- Client SDK: JavaScript for web browsers

#### Frontend Hosting

**Amazon S3:**
- Bucket name: chess-platform-frontend
- Static website hosting: Enabled (or CloudFront origin)
- Versioning: Enabled
- Encryption: SSE-S3
- Block public access: Disabled (if static hosting) or Enabled (if CloudFront only)
- CORS: Configure for API domain

**Amazon CloudFront (Optional):**
- Origin: S3 bucket or ALB
- Price class: Use only North America and Europe
- Viewer protocol policy: Redirect HTTP to HTTPS
- Alternate domain names: www.chess.yourdomain.com
- SSL certificate: ACM certificate
- Caching: Default TTL 86400s, Max 31536000s
- Compression: Enabled
- Lambda@Edge: Optional for custom headers

#### DNS & Certificates

**Amazon Route 53:**
- Hosted zone: chess.yourdomain.com
- Name servers: Configured at domain registrar
- Alias records: chess.yourdomain.com â†’ ALB (A and AAAA)
- CNAME: www â†’ chess.yourdomain.com
- Health check: HTTPS on ALB, 30s interval
- Query logging: Send to CloudWatch Logs
- DNSSEC: Enabled with KSK and ZSK
- TTL: 300 seconds for A/AAAA records

**AWS Certificate Manager (ACM):**
- Certificate type: Wildcard (*.yourdomain.com)
- Validation: DNS via Route 53
- Key algorithm: RSA 2048
- Renewal: Automatic
- Associated resources: ALB HTTPS listener, CloudFront distribution

#### Monitoring & Observability

**Amazon CloudWatch:**

**Metrics:**
- ECS: CPUUtilization, MemoryUtilization, TaskCount
- ALB: RequestCount, TargetResponseTime, HTTPCode_Target_5XX_Count
- DynamoDB: ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits, ThrottledRequests
- ElastiCache: CPUUtilization, DatabaseMemoryUsagePercentage, Evictions
- NAT Gateway: BytesOutToDestination, PacketsDropCount

**Custom Metrics:**
- Active rooms count
- Active games count
- WebSocket connections
- Chime SDK meetings active
- Games completed per hour

**CloudWatch Logs:**
- Log groups: /ecs/chess-platform/application
- Retention: 30 days
- Encryption: KMS encrypted
- Export to S3: Optional for long-term storage

**CloudWatch Alarms:**
- ECS CPU > 80%: Warning
- ECS CPU > 95%: Critical, trigger scale-out
- ALB 5xx errors > 10 in 5 min: Critical
- DynamoDB throttled requests > 0: Warning
- Daily cost > $10: Budget alert

**CloudWatch Dashboards:**
- Infrastructure dashboard: ALB, ECS, NAT Gateway
- Application dashboard: Rooms, games, connections
- Cost dashboard: Service breakdown, trends

**AWS Budgets:**
- Monthly budget: $250
- Alerts at: 80%, 90%, 100%
- Forecast alert: If projected > $275
- SNS notifications: Email and SMS

**AWS Cost Explorer:**
- Enable cost allocation tags
- Daily cost reports
- Service-level breakdown
- Forecasting: 3-month projection

**AWS CloudTrail (Security & Audit):**
- Trail name: chess-platform-trail
- All regions: Enabled
- Management events: Read and Write
- Data events: S3, DynamoDB (optional)
- Log file validation: Enabled
- S3 bucket: cloudtrail-logs-chess-platform
- Encryption: SSE-S3
- SNS notifications: Optional for real-time alerts

**AWS Config (Optional):**
- Enable recording: All resource types
- Delivery channel: S3 bucket
- SNS topic: Config changes
- Config Rules:
  - required-tags (enforce tagging)
  - encrypted-volumes (ensure EBS encryption)
  - vpc-flow-logs-enabled
  - cloudtrail-enabled

#### Chess Engine

**Stockfish:**
- Version: Latest stable release
- Deployment: Bundled in Docker container
- Communication: UCI (Universal Chess Interface) protocol
- Process management: Spawn per game or connection pool
- Move validation: All moves validated server-side
- Bot difficulty: Adjustable via search depth/time limits
- Resource limits: CPU/memory constraints per instance

---

## User Experience Flows

### Room Creation and Joining

**Creating a Room (User A):**
1. User logs in via Cognito (email/password or social login)
2. Clicks "Create Room" button
3. Backend generates random 5-character room code (A-Z, 0-9): e.g., "K7M2A"
4. Room created in Redis with status "waiting_for_player"
5. User A sees lobby page displaying room code prominently
6. No Chime meeting created yet (cost savings)
7. Message: "Waiting for opponent to join with code: K7M2A"
8. User shares code via external communication (text, Discord, etc.)

**Joining a Room (User B):**
1. User logs in via Cognito
2. Clicks "Join Room" button
3. Enters 5-character room code
4. Backend validates room exists and has space
5. Backend detects both users ready

**Both Users Enter Room Simultaneously:**
1. Backend creates Chime SDK meeting when both users ready
2. Generates attendee tokens for both participants
3. Both users redirected to room interface
4. WebSocket connections established for both
5. Chime SDK initialized on both frontends
6. Video/audio streams activate
7. Both users can see and hear each other
8. Chess board visible but inactive
9. "Start Game" button enabled for both players
10. Room has 60-minute expiry timer visible

### Starting a Chess Game

**Either Player Can Initiate:**
1. User clicks "Start Game" button
2. Frontend sends request via WebSocket
3. Backend validates:
   - Room has exactly 2 connected players
   - No active game currently in progress
4. Backend generates game_id and assigns colors (random or alternating)
5. Game state created in Redis:
   - Initial board position (FEN notation)
   - Empty move history array
   - 5-minute clock for each player (300 seconds)
   - Game status: "in_progress"
6. Backend broadcasts game start to both players
7. Chess board activates
8. Clocks start counting down
9. Player with white pieces can make first move
10. "Start Game" button replaced with "Resign" button
11. Video chat continues throughout

### Playing the Game

**Making Moves:**
1. Player with current turn drags piece or clicks move
2. Frontend validates move locally (chess.js library)
3. If valid, sends move to backend via WebSocket
4. Backend validates move server-side (Stockfish/chess engine)
5. If valid:
   - Updates board state in Redis
   - Deducts time from player's clock
   - Broadcasts move to both players
   - Switches turn
6. Both frontends update board display and clocks
7. Video chat continues - players can talk during game

**Time Management:**
1. Each player has independent countdown timer
2. Time only decrements during player's turn
3. Timer pauses when move is made
4. If player's time reaches 0:
   - Game ends immediately
   - Opponent wins by timeout
   - Follow normal game end flow

**Resignation:**
1. Player clicks "Resign" button
2. Confirmation dialog: "Are you sure you want to resign?"
3. If confirmed, backend processes resignation
4. Opponent wins immediately
5. Follow normal game end flow

### Game Completion

**Possible End Conditions:**
- Checkmate (winner determined by chess rules)
- Resignation (loser explicitly resigns)
- Timeout (player runs out of time)
- Stalemate/Draw (by chess rules or mutual agreement)
- Room expiry (game saved as draw if still in progress)

**End Game Processing:**
1. Backend detects game end condition
2. Calculates game metadata:
   - Winner (or draw)
   - Result reason
   - Total moves played
   - Game duration
   - Time remaining for each player
3. Saves to DynamoDB games_history table
4. Updates user statistics in DynamoDB (wins/losses/draws)
5. Clears active_game from Redis room state
6. Adds game summary to room's game_history array
7. Broadcasts game result to both players
8. Frontend displays result overlay:
   - "White wins by checkmate!"
   - Final board position shown
   - Game statistics displayed
9. "Resign" button replaced with "New Game" button
10. Video chat continues - players can discuss game

### Playing Multiple Games

**Sequential Games in Same Room:**
1. After game ends, either player clicks "New Game"
2. Same flow as "Start Game" (see above)
3. New game_id generated
4. Colors automatically swapped from previous game
5. Fresh 5-minute clocks for both players
6. Board resets to starting position
7. Previous game already saved to DynamoDB
8. Video chat never interrupted
9. Players can play unlimited games until room expires or they leave

**Room Session Benefits:**
- No need to recreate room/share code again
- Continuous video conversation
- Quick rematches
- Multiple games tracked as single session

### Leaving the Room

**Graceful Exit:**
1. Player clicks "Leave Room" button
2. Confirmation if game is active: "Leave active game?"
3. If confirmed:
   - WebSocket connection closes
   - Chime SDK disconnects
   - Player removed from participants list
   
**Single Player Remains:**
- Room stays active with one player
- Remaining player can wait for reconnection
- If active game: disconnected player's clock keeps running
- Disconnected player runs out of time â†’ loses game
- Room expires after 60 minutes regardless

**Both Players Leave:**
- Last player to leave triggers room termination
- Chime meeting deleted via SDK
- Redis room data deleted (or TTL expires)
- If game was active: saved as draw to DynamoDB

**Reconnection Scenario:**
1. Player accidentally disconnects (network issue, browser crash)
2. Room still exists (other player waiting or 60-min expiry not reached)
3. Player re-enters room code
4. Backend validates user was participant
5. New WebSocket connection established
6. Rejoins existing Chime meeting with new attendee token
7. Game state loaded from Redis
8. Player returns to exact game position
9. Clock continues from where it was (may have lost time)

### Room Expiry (60 Minutes)

**Hard Time Limit:**
1. Room created with 60-minute TTL in Redis
2. Frontend shows countdown timer
3. Warning at 55 minutes: "Room expires in 5 minutes"
4. At 60 minutes:
   - Backend terminates Chime meeting
   - If game active: saved as draw
   - Closes all WebSocket connections
   - Deletes Redis room data
   - Both players redirected to home page
   - Message: "Room expired - thank you for playing!"

**Cost Control:**
- Prevents forgotten rooms from accumulating Chime charges
- Forces periodic session cleanup
- Reasonable limit for casual chess games (can play 6-12 games)

---

## Technical Implementation Details

### Two-Phase Session Architecture

**Phase 1: Video Chat Room (Persistent)**
- Created when both users enter room code
- Chime SDK meeting starts immediately
- WebSocket connections established
- Video/audio active
- Room lifetime: up to 60 minutes
- Room ends when both players leave OR 60-minute expiry

**Phase 2: Chess Game (Ephemeral within Room)**
- Either player clicks "Start Game"
- Multiple sequential games possible (not concurrent)
- Each game independent with new game_id
- Game state temporary (Redis or in-memory)
- Final results persist to DynamoDB
- Video chat continues between games

### WebSocket Architecture

**Connection Management:**
- Each user establishes WebSocket on room entry
- ALB sticky sessions route connections to same Fargate task
- Connection ID mapped to user_id in Redis
- Heartbeat every 30 seconds for connection health
- Automatic reconnection on disconnect (client-side retry)

**Message Types:**
```
Room Events:
- join_room: User enters room
- leave_room: User exits room
- participant_joined: Notify other player
- participant_left: Notify other player

Game Events:
- start_game: Initiate new chess game
- make_move: Player makes chess move
- move_made: Broadcast move to both players
- resign: Player resigns current game
- game_ended: Game conclusion with result
- clock_update: Timer synchronization

Connection Events:
- heartbeat: Keep-alive ping
- heartbeat_ack: Server acknowledgment
- reconnected: Player rejoined room
```

**Scaling Considerations:**
- ALB distributes WebSocket connections across Fargate tasks
- Session affinity ensures players stay on same task
- Redis pub/sub for cross-task messaging if needed
- Connection draining during task updates
- Graceful shutdown with 30-second timeout

### Data Modeling

**Redis (Ephemeral Room State):**

Room Object Structure:
```
Key: room:{room_code}
Value: {
  room_code: "K7M2A",
  status: "waiting_for_player" | "both_connected" | "expired",
  created_at: timestamp,
  expires_at: timestamp + 60 minutes,
  
  chime_meeting: {
    meeting_id: "meeting_xyz",
    meeting_data: {...},
    created_at: timestamp
  },
  
  participants: {
    user_a_id: {
      attendee_id: "att_123",
      websocket_connection_id: "conn_abc",
      joined_at: timestamp,
      connected: true,
      last_heartbeat: timestamp
    },
    user_b_id: {
      attendee_id: "att_456",
      websocket_connection_id: "conn_def",
      joined_at: timestamp,
      connected: true,
      last_heartbeat: timestamp
    }
  },
  
  active_game: {
    game_id: "uuid",
    white_player_id: "user_a_id",
    black_player_id: "user_b_id",
    board_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    turn: "white",
    moves: ["e2e4", "e7e5", ...],
    time_white: 295,
    time_black: 300,
    started_at: timestamp,
    last_move_at: timestamp,
    status: "in_progress"
  } OR null,
  
  games_played: [
    {game_id: "uuid1", winner: "white", result: "checkmate"},
    {game_id: "uuid2", winner: "black", result: "resignation"}
  ]
}

TTL: 60 minutes from created_at
```

WebSocket Connection Mapping:
```
Key: ws:{connection_id}
Value: {
  user_id: "user_a_id",
  room_code: "K7M2A",
  connected_at: timestamp
}
TTL: 60 minutes
```

**DynamoDB (Persistent Data):**

Users Table:
```
Primary Key: user_id (Cognito sub)
Attributes:
- username (unique)
- email
- display_name
- total_games
- wins
- losses
- draws
- created_at
- last_login_at
```

Games History Table:
```
Primary Key: game_id (UUID)
Sort Key: ended_at (timestamp)

Attributes:
- room_code
- white_player_id
- black_player_id
- winner ("white" | "black" | "draw")
- result ("checkmate" | "resignation" | "timeout" | "stalemate" | "room_expiry")
- total_moves
- duration_seconds
- pgn_notation (optional)
- time_white_remaining
- time_black_remaining
- ended_at

GSI-1: white_player_id (PK), ended_at (SK)
GSI-2: black_player_id (PK), ended_at (SK)

Purpose: Query match history for specific users
```

### Session Lifecycle Management

**Room Creation (Both Users Join):**
1. User A creates room â†’ lobby page with code
2. User B enters code â†’ both marked ready
3. Backend creates Chime meeting:
   ```
   meeting = await chime.createMeeting({
     ExternalMeetingId: room_code,
     MediaRegion: 'us-east-1',
     Tags: [{Key: 'room_code', Value: room_code}]
   })
   ```
4. Generate attendee tokens for both:
   ```
   attendeeA = await chime.createAttendee({
     MeetingId: meeting.MeetingId,
     ExternalUserId: user_a_id
   })
   attendeeB = await chime.createAttendee({
     MeetingId: meeting.MeetingId,
     ExternalUserId: user_b_id
   })
   ```
5. Store in Redis with room structure above
6. Send meeting details via WebSocket to both
7. Frontend initializes Chime SDK and connects
8. Video chat active, chess board visible but inactive

**Game Start:**
1. Either player clicks "Start Game"
2. Validate no active game exists
3. Generate game_id and assign colors
4. Create game state in Redis active_game field
5. Broadcast game_started event to both players
6. Frontend enables chess board and starts clocks

**Game Play:**
1. Player makes move (frontend validation via chess.js)
2. Send move via WebSocket with timestamp
3. Backend validates move server-side
4. Update board state and clock in Redis
5. Broadcast move_made to both players
6. Repeat until game ends

**Game End:**
1. Detect end condition (checkmate/resignation/timeout/stalemate)
2. Calculate final metadata
3. Write to DynamoDB games_history
4. Update user stats in DynamoDB
5. Clear active_game in Redis (set to null)
6. Append summary to games_played array
7. Broadcast game_ended to both players
8. Frontend shows result, enables "New Game" button

**New Game (Rematch):**
1. Either player clicks "New Game"
2. Same flow as game start (colors swapped)
3. Previous game already in DynamoDB and games_played
4. Fresh clocks and board
5. Video chat never interrupted

**Player Disconnect (Mid-Game):**
1. WebSocket connection drops (network/browser)
2. Heartbeat timeout detected (>30 seconds no ping)
3. Update participant as disconnected in Redis
4. Notify remaining player via WebSocket
5. Game clock continues counting down for disconnected player
6. If disconnected player's time expires â†’ timeout loss
7. Remaining player can wait indefinitely (up to room expiry)
8. Disconnected player can rejoin with room code:
   - Validate previous participant
   - Create new WebSocket connection
   - Rejoin Chime meeting (new attendee)
   - Load game state from Redis
   - Resume from current position

**Room Termination:**

Both Players Leave:
1. Last player closes WebSocket
2. Backend deletes Chime meeting
3. If active game: save as draw to DynamoDB
4. Delete Redis room data (or let TTL handle)

60-Minute Expiry:
1. Background job or Lambda checks Redis for expired rooms
2. Delete Chime meetings for expired rooms
3. Save any active games as draw
4. Close WebSocket connections
5. Remove from Redis

### Chime SDK Integration

**Meeting Lifecycle:**
- Created when both players ready (not on room creation)
- Meeting ID = External meeting ID (room code)
- Persists entire room session
- Deleted on room termination or expiry
- Cost: $0.0017/attendee-minute Ã— 2 attendees

**Attendee Management:**
- Each participant gets unique attendee token
- Token contains meeting credentials
- Valid for meeting duration
- Reconnection requires new attendee creation

**Frontend Integration:**
```
Steps:
1. Receive meeting + attendee data via WebSocket
2. Initialize MeetingSession:
   const session = new MeetingSession(meetingData, attendeeData)
3. Setup audio/video:
   await session.audioVideo.start()
4. Render video streams in UI
5. Maintain connection until room ends
```

### Chess Engine Integration

**Move Validation:**
- Frontend: chess.js for client-side validation (UX speed)
- Backend: Stockfish UCI for authoritative validation (security)
- Double validation prevents cheating

**Communication:**
- Stockfish runs as subprocess or library binding
- UCI protocol: position/go commands
- Parse move legality from engine response
- Async processing to avoid blocking WebSocket

**Optional Bot Implementation:**
- Same Stockfish engine
- Adjust search depth for difficulty
- Depth 1-5 = beginner, 6-10 = intermediate, 11+ = advanced
- Bot moves generated server-side

---

## Security Considerations

### Network Security (VPC)
- **Three-Tier Isolation**: Public, private app, and private data subnets
- **No Public IPs**: Fargate tasks only accessible via ALB
- **Security Groups**: Least-privilege rules, allow only required ports
  - ALB SG: 443 from internet, 80 redirect
  - Fargate SG: Allow only from ALB SG
  - Redis SG: Allow 6379 only from Fargate SG
- **NACLs**: Subnet-level rules as defense-in-depth
- **VPC Endpoints**: Private connectivity to AWS services (no internet)
- **NAT Gateways**: Controlled outbound internet for app tier only
- **VPC Flow Logs**: Network traffic logging to S3/CloudWatch

### Authentication & Authorization (IAM)
- **Cognito JWT Tokens**: Validate on every API/WebSocket request
- **ECS Task Execution Role**: Minimal permissions (ECR, CloudWatch Logs, Secrets Manager)
- **ECS Task Role**: Scoped to specific DynamoDB tables, Chime SDK, ElastiCache
- **No Wildcard Permissions**: Explicit resource ARNs only
- **Condition Keys**: IP address, VPC, time-based restrictions
- **Resource-Based Policies**: DynamoDB deny unless from VPC endpoint
- **IAM Access Analyzer**: Validate least-privilege policies
- **Secrets Manager**: Store database credentials, API keys (no hardcoding)

### Data Protection
- **Encryption at Rest**: 
  - DynamoDB: AWS-managed encryption keys
  - ElastiCache: Optional encryption (consider for production)
  - S3: SSE-S3 or SSE-KMS
- **Encryption in Transit**: 
  - TLS 1.2+ on ALB (enforce via security policy)
  - WebSocket Secure (WSS) protocol
  - Redis AUTH token authentication
  - VPC endpoints use TLS
- **Secrets Management**: 
  - Cognito handles password hashing (bcrypt)
  - Secrets Manager for third-party credentials
  - Environment variables from Secrets Manager (not plaintext)

### Application Security
- **Input Validation**: Sanitize room codes, usernames, moves
- **Server-Side Move Validation**: Don't trust client chess logic
- **Rate Limiting**: ALB WAF rules to prevent abuse
- **CORS**: Restrict origins to your domain only
- **XSS Protection**: Content Security Policy headers
- **SQL Injection**: N/A (NoSQL DynamoDB, parameterized queries)
- **Session Management**: Short-lived JWT tokens, secure cookies

### Monitoring & Compliance
- **CloudTrail**: Log all API calls for audit
- **VPC Flow Logs**: Network traffic analysis
- **CloudWatch Logs**: Application and access logs
- **AWS Config**: Track resource configuration changes
- **GuardDuty**: Threat detection (optional)
- **Security Hub**: Centralized security findings (optional)

---

## Cost Estimation

### Monthly Infrastructure Costs (Baseline)

**Compute (ECS Fargate):**
- 2-4 tasks running (0.25 vCPU, 0.5 GB each)
- Pricing: $0.04048/vCPU-hour + $0.004445/GB-hour
- Per task: ~$0.012/hour = $8.64/month (24/7)
- 3 tasks average: ~$26/month

**Load Balancing:**
- Application Load Balancer: $16.20/month (fixed)
- LCU charges: ~$5-10/month based on connections
- Total: ~$21-26/month

**Caching:**
- ElastiCache Redis t4g.micro: ~$11/month
- Multi-AZ replication: +$11/month
- Total: ~$22/month

**Storage:**
- DynamoDB: On-demand pricing
  - Write requests: ~$1.25/million
  - Read requests: ~$0.25/million
  - Estimated: $5-10/month for moderate usage
- S3 (frontend assets): ~$1-2/month

**Networking:**
- NAT Gateway: $32.40/month per AZ (fixed)
- NAT Gateway data: $0.045/GB
- 2 NAT Gateways (AZ-A, AZ-B): ~$65/month + data
- VPC Endpoints (Interface): ~$7/month each Ã— 4 = ~$28/month
- Total networking: ~$95-105/month

**DNS & CDN:**
- Route 53 hosted zone: $0.50/month
- Query charges: ~$0.40/month (1M queries)
- ACM certificate: Free
- CloudFront (optional): ~$5-15/month
- Total: ~$1-16/month

**Video Chat (Variable):**
- Chime SDK: $0.0017/attendee-minute
- Example usage:
  - 50 hours/month of 2-person rooms = 6,000 attendee-minutes
  - Cost: 6,000 Ã— $0.0017 = $10.20/month
- Light usage: $5-10/month
- Moderate usage: $20-40/month

**Monitoring & Logs:**
- CloudWatch Logs: ~$2-5/month
- CloudWatch Metrics: ~$1-3/month
- VPC Flow Logs: ~$3-10/month (optional)
- Total: ~$6-18/month

### Total Monthly Cost Breakdown

**Minimum (Low Usage):**
- Compute: $26
- Load Balancer: $21
- Redis: $22
- DynamoDB: $5
- Networking: $95
- DNS: $1
- Chime SDK: $5
- Monitoring: $6
- **Total: ~$181/month**

**Typical (Moderate Usage):**
- Compute: $35 (auto-scaling to 4 tasks occasionally)
- Load Balancer: $26
- Redis: $22
- DynamoDB: $10
- Networking: $105
- DNS/CDN: $10
- Chime SDK: $25
- Monitoring: $12
- **Total: ~$245/month**

**Cost Optimization Strategies:**

1. **NAT Gateway Reduction:**
   - Use only 1 NAT Gateway instead of 2 (removes AZ redundancy)
   - Saves: ~$32/month
   - Trade-off: Single point of failure for outbound internet

2. **VPC Endpoints:**
   - Remove interface endpoints, use NAT Gateway for all AWS API calls
   - Saves: ~$28/month
   - Trade-off: Increased NAT data charges, less secure

3. **ElastiCache Single-AZ:**
   - Remove Multi-AZ replication
   - Saves: ~$11/month
   - Trade-off: No automatic failover

4. **Fargate Spot:**
   - Use Fargate Spot for non-critical tasks (70% discount)
   - Saves: ~$18/month (if 2 of 3 tasks on Spot)
   - Trade-off: Tasks may be interrupted

5. **S3 + Lambda Instead of Fargate:**
   - Static site on S3 + API Gateway + Lambda
   - Saves on Fargate but adds Lambda complexity
   - Trade-off: Harder to manage WebSocket at scale

6. **Reduce Chime SDK Usage:**
   - Add "Start Video" button instead of auto-start
   - Only create meeting when explicitly requested
   - Potential savings: 30-50% of Chime costs

**Optimized Architecture Cost:**
- Single NAT Gateway: -$32
- No interface endpoints: -$28  
- Single-AZ Redis: -$11
- Fargate Spot: -$18
- **Optimized Total: ~$156/month**

### Cost Allocation Tags

**Tag all resources:**
```
Project: chess-platform
Environment: production
Tier: presentation | application | data
Component: alb | fargate | redis | dynamodb | nat | etc.
ManagedBy: terraform
CostCenter: personal
```

**Enable in Billing Console:**
- Activate user-defined cost allocation tags
- View costs by tag in Cost Explorer
- Set up budget alerts by tag

### Budget Alerts

**AWS Budgets Configuration:**
- Monthly budget: $250
- Alert at 80% ($200): Email notification
- Alert at 90% ($225): Email + SMS
- Alert at 100% ($250): Email + SMS + stop resources?
- Forecast alert: If projected to exceed $275

**CloudWatch Billing Alarms:**
- Daily spend alarm: $10/day
- Chime SDK alarm: $50/month
- NAT Gateway data alarm: Unusual spike detection

---

## Development Workflow

### Local Development
- Docker Compose for local container testing
- LocalStack for AWS service emulation
- Mock Cognito for authentication testing
- Local Redis container for caching
- Fairy-Stockfish binary installed locally

### CI/CD Pipeline
- GitHub Actions or CodePipeline
- Automated Docker image builds
- Push to Amazon ECR (Elastic Container Registry)
- ECS service updates with new task definitions
- Blue/green deployments for zero downtime
- Automated rollback on health check failures

### Testing Strategy
- Unit tests for game logic and move validation
- Integration tests for WebSocket communication
- Load testing for concurrent game sessions
- Chime SDK integration testing
- DynamoDB query performance testing
- End-to-end tests for critical user flows

---

## Route 53 & DNS Best Practices

### Hosted Zone Configuration

**Domain Setup:**
- Register domain (e.g., `chess.yourdomain.com`) via Route 53 or external registrar
- Create Route 53 public hosted zone
- Update domain's nameservers to Route 53 NS records
- Hosted zone cost: $0.50/month

**DNS Records:**

A Record (Alias to ALB):
```
Name: chess.yourdomain.com
Type: A
Alias: Yes
Alias Target: dualstack.chess-alb-1234567890.us-east-1.elb.amazonaws.com
Routing Policy: Simple
Evaluate Target Health: Yes
```

AAAA Record (IPv6 Support):
```
Name: chess.yourdomain.com
Type: AAAA
Alias: Yes
Alias Target: dualstack.chess-alb-1234567890.us-east-1.elb.amazonaws.com
```

CNAME for www (Optional):
```
Name: www.chess.yourdomain.com
Type: CNAME
Value: chess.yourdomain.com
TTL: 300
```

**Why Alias Records Over CNAME:**
- No query charges for Alias records (CNAME records are charged)
- Can be used at zone apex (naked domain)
- Automatically resolves to multiple ALB IP addresses
- Built-in health check integration
- Supports IPv4 (A) and IPv6 (AAAA)

### Health Checks

**ALB Health Check Configuration:**
```
Name: chess-alb-health-check
Protocol: HTTPS
Domain: chess.yourdomain.com
Path: /health
Port: 443
Interval: 30 seconds
Failure Threshold: 3 consecutive failures
Health Checkers: Multiple AWS regions
```

**CloudWatch Integration:**
- Create CloudWatch alarm from health check
- Alarm state: ALARM when health check fails
- SNS topic notification: Email/SMS when ALB unhealthy
- Can trigger auto-remediation Lambda function

**Advanced Routing (Future):**
- Implement failover routing to backup region
- Weighted routing for blue/green deployments
- Latency-based routing if multi-region
- Geolocation routing for global users

### SSL/TLS Certificate (ACM)

**Certificate Request:**
1. Request wildcard certificate: `*.yourdomain.com`
2. Validation method: DNS validation (recommended)
3. Route 53 auto-creates CNAME validation record
4. Certificate issued within minutes
5. Auto-renewal 60 days before expiry

**ALB HTTPS Listener:**
- Port 443 listener
- Attach ACM certificate
- Security policy: ELBSecurityPolicy-TLS-1-2-2017-01 (minimum TLS 1.2)
- Redirect HTTP (port 80) to HTTPS (port 443)

### DNS Security

**DNSSEC Signing:**
```
Steps:
1. Enable DNSSEC signing on hosted zone
2. Route 53 generates KSK and ZSK keys
3. Add DS record to parent domain registrar
4. Validates chain of trust
5. Protects against DNS spoofing and cache poisoning
```

**Benefits:**
- Cryptographic verification of DNS responses
- Prevents man-in-the-middle attacks
- Industry best practice for production domains

**Query Logging:**
```
Configuration:
- Enable query logging on hosted zone
- Destination: CloudWatch Logs group
- Log retention: 30 days
- Logs contain:
  - Query name (e.g., chess.yourdomain.com)
  - Query type (A, AAAA, CNAME)
  - Response code
  - Edge location
  - Timestamp
```

**Analysis Use Cases:**
- Geographic distribution of users
- Most common query types
- Detect DNS-based attacks
- Traffic patterns over time
- Athena queries for deep analysis

**Route 53 Resolver DNS Firewall (Optional):**
- Block malicious domains
- Prevent DNS exfiltration
- Custom domain lists
- AWS Managed Domain Lists

### Traffic Policies (Advanced)

**Visual Policy Editor:**
- Version control for DNS configurations
- Complex routing logic without code
- Policy can be applied to multiple records
- Supports:
  - Weighted routing (A/B testing)
  - Latency-based (multi-region)
  - Geolocation (country-specific)
  - Failover (primary/secondary)

**Example Blue/Green Deployment:**
```
Traffic Policy:
- 90% traffic â†’ ALB-Blue (current version)
- 10% traffic â†’ ALB-Green (new version)
- Gradually shift to 100% Green
- Rollback instantly if issues detected
```

### DNS Best Practices Summary

1. **Use Alias Records**: Free queries, zone apex support
2. **Enable Health Checks**: Automatic failover, monitoring
3. **Implement DNSSEC**: Security against spoofing
4. **Query Logging**: Troubleshooting and analytics
5. **Short TTLs**: 300 seconds for A records (faster updates)
6. **Wildcard Certificates**: Cover all subdomains
7. **Redirect HTTP to HTTPS**: Force secure connections
8. **Multi-Region Failover**: Route 53 failover policies (future)

---

## Monitoring & Observability

### CloudWatch Dashboards

**Infrastructure Dashboard:**
- ALB metrics: Request count, latency, 4xx/5xx errors, target health
- ECS metrics: CPU utilization, memory utilization, task count
- NAT Gateway: Bytes processed, packets dropped, connection count
- VPC Flow Logs: Rejected packets, top talkers

**Application Dashboard:**
- Active rooms (custom metric)
- Active games (custom metric)
- WebSocket connections (custom metric)
- Average game duration (custom metric)
- Games completed per hour (custom metric)
- Room creation rate (custom metric)

**Data Layer Dashboard:**
- DynamoDB: Read/write capacity consumed, throttled requests, latency
- ElastiCache: CPU utilization, memory usage, evictions, cache hit ratio
- Redis connections, commands processed per second

**Video Chat Dashboard:**
- Chime SDK meetings active (custom metric)
- Total attendee-minutes (cost tracking)
- Meeting creation rate
- Meeting duration distribution

**Cost Dashboard:**
- Daily spend by service (Cost Explorer API)
- Month-to-date vs budget
- Chime SDK usage and projected cost
- NAT Gateway data transfer costs
- Forecasted monthly total

### Alerting Thresholds
- ECS CPU > 80% for 5 minutes (warning)
- ECS CPU > 95% for 5 minutes (critical - scale up)
- ECS Memory > 85% for 5 minutes (warning)
- ECS Memory > 95% for 5 minutes (critical - scale up)
- ALB 5xx errors > 10 in 5 minutes (critical)
- ALB 4xx errors > 100 in 5 minutes (warning)
- ALB unhealthy target count > 0 for 2 minutes (critical)
- DynamoDB throttled requests > 0 (warning)
- DynamoDB system errors > 0 (critical)
- ElastiCache CPU > 90% for 10 minutes (critical)
- ElastiCache evictions > 1000 in 5 minutes (warning)
- ElastiCache memory > 95% (critical)
- NAT Gateway packet drop count > 100 (warning)
- Daily cost > $10 (budget alert)
- Monthly forecasted cost > $250 (budget alert)
- Chime SDK cost > $50/month (budget alert)

### Logging Strategy
- Application logs to CloudWatch Logs
- Structured JSON logging format
- Log groups per service component
- Retention policy: 30 days for debugging
- Log insights queries for troubleshooting
- Error aggregation and alerting

---

## Scaling Roadmap

### Phase 1: Initial Launch (Current Design)
- 2-4 Fargate tasks across 3 AZs
- Manual scaling adjustments
- Basic CloudWatch monitoring
- Single region (us-east-1)
- Private/limited access for testing

### Phase 2: Public Beta
- Auto-scaling policies based on metrics
- Enhanced CloudWatch dashboards
- Cost optimization review
- User feedback collection
- Performance tuning

### Phase 3: Production Scale
- Increased Fargate task count
- ElastiCache Redis cluster mode for scaling
- DynamoDB provisioned capacity with auto-scaling (if cost-effective)
- WAF for DDoS protection
- Consider multi-region for global users

### Future Enhancements
- **Bot Opponents**: AI chess bots with adjustable difficulty
- **Spectator Mode**: Watch live games in progress
- **Tournament System**: Bracket-based competitions
- **Game Analysis**: Post-game engine analysis with best moves
- **Puzzle Mode**: Daily chess puzzles
- **Time Control Variants**: Blitz (3min), rapid (10min), classical (30min)
- **Rating System**: ELO-based player rankings
- **Achievements**: Badges and milestones
- **Mobile App**: Native iOS/Android with Chime SDK
- **Replay Functionality**: Review past games move-by-move
- **Custom Board Themes**: Personalization options
- **Friend System**: Add back with optimized implementation
- **Private Tournaments**: Invite-only competitions

---

## Portfolio Presentation

### Technical Skills Demonstrated

**AWS Services:**
- VPC (three-tier architecture, multi-AZ)
- ECS with Fargate launch type
- Application Load Balancer
- Auto Scaling (ECS Service auto-scaling)
- ElastiCache (Redis)
- DynamoDB (NoSQL with GSIs)
- Cognito User Pools
- Chime SDK
- S3 & CloudFront
- Route 53 (DNS, health checks, DNSSEC)
- ACM (SSL/TLS certificates)
- CloudWatch (metrics, logs, alarms, dashboards)
- VPC Endpoints (Gateway and Interface)
- NAT Gateway
- Secrets Manager
- AWS Budgets
- IAM (roles, policies, least privilege)
- ECR (container registry)
- CloudTrail (audit logging)
- AWS Config (compliance tracking)

**Infrastructure as Code:**
- Terraform (modular design, remote state, workspaces)
- Module-based architecture
- State management with S3 and DynamoDB locking
- Multi-environment deployments (dev/staging/production)
- Version control for infrastructure
- GitOps workflow
- Resource tagging strategy

**Architecture Patterns:**
- Three-tier VPC design (presentation, application, data)
- Multi-AZ high availability
- Serverless containers (Fargate)
- Real-time WebSocket communication
- Video conferencing integration
- NoSQL data modeling with access patterns
- Ephemeral vs persistent data strategies
- Session lifecycle management
- Caching with TTL expiration
- Load balancing with sticky sessions
- Zero-trust network security
- Infrastructure observability
- Disaster recovery planning

**Software Engineering:**
- Docker containerization
- WebSocket protocol implementation
- Chess engine integration (Stockfish UCI)
- Real-time multiplayer state synchronization
- User authentication flows (Cognito)
- Video chat integration (Chime SDK WebRTC)
- Session lifecycle management
- Time-based game mechanics
- Structured logging and observability
- Responsive web UI
- Infrastructure as Code (Terraform)

### Interview Talking Points

**Infrastructure as Code with Terraform:**
Explain modular Terraform design with separate modules for VPC, ECS, ALB, data layer. Discuss remote state management in S3 with DynamoDB locking for team collaboration. Highlight multi-environment strategy (dev/staging/production) using workspaces and variable files. Emphasize reproducibilityâ€”entire infrastructure can be rebuilt from code, eliminating configuration drift.

**Three-Tier VPC Architecture:**
Explain subnet segregation strategy (public for ALB/NAT, private app for Fargate with no public IPs, private data for Redis with zero internet access). Discuss security groups enforcing least-privilege access, VPC endpoints eliminating NAT costs for AWS services, and how multi-AZ deployment provides HA without sacrificing security.

**Network Security:**
Walk through defense-in-depth approach: Internet Gateway only in public subnets, application tier completely isolated behind ALB, data tier with no internet route, NACLs as subnet-level firewall, security groups as instance-level firewall. Emphasize zero-trust principles and how VPC Flow Logs provide network visibility.

**Container Orchestration:**
Describe ECS Fargate auto-scaling based on ALB request metrics, how tasks distribute across AZs for HA, connection draining during deployments to prevent dropped WebSocket connections. Explain task execution role vs task role separation, ECR image lifecycle policies, and blue/green deployment capability.

**Session Management:**
Describe two-phase room architecture where video chat room persists while multiple chess games are played sequentially. Explain WebSocket connection handling with ALB sticky sessions, Redis for ephemeral state with TTL, DynamoDB for persistent history, and Chime SDK lifecycle tied to room (not individual games).

**Cost Optimization:**
Demonstrate understanding of AWS pricing: Fargate pay-per-use, NAT Gateway data charges vs VPC endpoint savings, DynamoDB on-demand vs provisioned capacity, Chime SDK per-minute billing. Discuss trade-offs and how resource tagging enables cost allocation by environment/tier/component. Show actual Cost Explorer analysis.

**Scalability & Resilience:**
Explain Fargate auto-scaling based on ALB request count, how tasks distribute across AZs, connection draining during deployments, ElastiCache Multi-AZ for automatic failover, and DynamoDB's built-in HA. Discuss how stateless application tier (state in Redis) enables horizontal scaling without session affinity complexity.

**Route 53 Best Practices:**
Detail Alias records over CNAMEs for cost savings, health checks integrated with CloudWatch alarms, DNSSEC for DNS security, query logging for analytics, and potential future use of weighted routing for blue/green deployments or latency-based routing for multi-region.

**Real-World Operational Experience:**
Emphasize this runs in production with real users, generating actual metrics, costs, and operational learnings. Discuss specific incidents like debugging WebSocket disconnections, optimizing Redis TTL values, analyzing Chime SDK usage patterns, and responding to CloudWatch alarms. Show CloudWatch dashboards with real traffic.

**IAM Security:**
Walk through separate roles for ECS Task Execution (pull images, write logs) vs ECS Task Role (application permissions). Explain resource-level permissions on DynamoDB tables, no wildcard actions, VPC endpoint policies restricting service access, and Secrets Manager for credential rotation. Demonstrate least-privilege principle.

**Disaster Recovery:**
Explain backup strategy: DynamoDB point-in-time recovery, ElastiCache daily snapshots, Terraform state versioning in S3. Discuss RTO/RPO targets and recovery procedures. Emphasize that entire infrastructure is defined in Terraformâ€”can rebuild from scratch in under 30 minutes if entire region fails.

---

## Infrastructure as Code with Terraform

### Terraform Project Structure

```
chess-platform-terraform/
â”œâ”€â”€ modules/
â”‚   â”œâ”€â”€ vpc/
â”‚   â”‚   â”œâ”€â”€ main.tf
â”‚   â”‚   â”œâ”€â”€ variables.tf
â”‚   â”‚   â”œâ”€â”€ outputs.tf
â”‚   â”‚   â””â”€â”€ README.md
â”‚   â”œâ”€â”€ ecs/
â”‚   â”‚   â”œâ”€â”€ main.tf
â”‚   â”‚   â”œâ”€â”€ variables.tf
â”‚   â”‚   â”œâ”€â”€ outputs.tf
â”‚   â”‚   â””â”€â”€ README.md
â”‚   â”œâ”€â”€ alb/
â”‚   â”œâ”€â”€ elasticache/
â”‚   â”œâ”€â”€ dynamodb/
â”‚   â”œâ”€â”€ cognito/
â”‚   â”œâ”€â”€ route53/
â”‚   â””â”€â”€ monitoring/
â”œâ”€â”€ main.tf
â”œâ”€â”€ variables.tf
â”œâ”€â”€ outputs.tf
â”œâ”€â”€ providers.tf
â”œâ”€â”€ backend.tf
â”œâ”€â”€ terraform.tfvars
â””â”€â”€ versions.tf
```

### Terraform Module Organization

**VPC Module:**
- Creates VPC with 10.0.0.0/16 CIDR
- 9 subnets across 3 AZs (public, private app, private data)
- Internet Gateway
- 2 NAT Gateways with Elastic IPs
- Route tables for each tier
- Security groups (ALB, Fargate, Redis, VPC endpoints)
- Network ACLs
- VPC Gateway Endpoints (DynamoDB, S3)
- VPC Interface Endpoints (ECR, CloudWatch, Secrets Manager)
- VPC Flow Logs to CloudWatch

**ECS Module:**
- ECS Cluster (Fargate)
- ECR repository with lifecycle policies
- Task definition with container specs
- ECS Service with desired count
- Service auto-scaling policies
- Task execution role
- Task role with application permissions
- CloudWatch log groups

**ALB Module:**
- Application Load Balancer
- Target groups with health checks
- HTTPS listener with ACM certificate
- HTTP listener with redirect to HTTPS
- Sticky sessions configuration
- Security group rules

**ElastiCache Module:**
- Redis cluster (Multi-AZ)
- Subnet group in private data subnets
- Parameter group with TTL config
- Security group
- AUTH token stored in Secrets Manager

**DynamoDB Module:**
- Users table with GSI on username
- Games History table with GSIs on player IDs
- Point-in-time recovery enabled
- Deletion protection enabled
- On-demand billing mode

**Cognito Module:**
- User pool with password policies
- User pool domain
- App client with OAuth settings
- Identity providers (Google, Facebook, Apple, Amazon)
- MFA configuration

**Route 53 Module:**
- Hosted zone
- A record (Alias to ALB)
- AAAA record for IPv6
- Health check on ALB
- Query logging to CloudWatch
- DNSSEC signing

**Monitoring Module:**
- CloudWatch dashboards
- CloudWatch alarms
- SNS topics for notifications
- Budgets with alerts
- Cost allocation tags

### Terraform State Management

**Remote State Backend:**
- S3 bucket: chess-platform-terraform-state
- Bucket versioning enabled
- Bucket encryption (SSE-S3 or KMS)
- DynamoDB table for state locking: terraform-state-lock
- State file: terraform.tfstate

**State Configuration:**
```
backend.tf:
- S3 backend with encryption
- DynamoDB for locking
- Key: terraform.tfstate
```

### Terraform Variables

**Required Variables:**
- aws_region (e.g., us-east-1)
- project_name (chess-platform)
- domain_name (chess.yourdomain.com)
- vpc_cidr (10.0.0.0/16)
- availability_zones (list of 3 AZs)

**Optional Variables:**
- fargate_cpu (default: 256)
- fargate_memory (default: 512)
- fargate_desired_count (default: 2)
- redis_node_type (default: cache.t4g.micro)
- enable_multi_az_redis (default: true)
- enable_cloudfront (default: false)
- enable_vpc_flow_logs (default: true)

**Secrets (from AWS Secrets Manager or .tfvars.secret):**
- cognito_google_client_id
- cognito_google_client_secret
- cognito_facebook_app_id
- cognito_facebook_app_secret

### Terraform Outputs

**Network Outputs:**
- vpc_id
- public_subnet_ids
- private_app_subnet_ids
- private_data_subnet_ids
- nat_gateway_ids

**Compute Outputs:**
- ecs_cluster_id
- ecs_service_name
- ecr_repository_url
- fargate_task_definition_arn

**Load Balancer Outputs:**
- alb_dns_name
- alb_zone_id
- target_group_arn

**Data Outputs:**
- dynamodb_users_table_name
- dynamodb_games_table_name
- redis_endpoint
- redis_port

**Identity Outputs:**
- cognito_user_pool_id
- cognito_user_pool_arn
- cognito_app_client_id

**DNS Outputs:**
- route53_zone_id
- domain_name
- name_servers

### Resource Tagging Strategy

**All Resources Tagged With:**
```
tags = {
  Project     = "chess-platform"
  ManagedBy   = "terraform"
  CostCenter  = "personal"
  Tier        = "presentation" | "application" | "data"
  Component   = "alb" | "ecs" | "redis" | "dynamodb" | etc.
}
```

**Cost Allocation Tags Enabled:**
- Project
- Tier
- Component

### Terraform Workflow

**Initial Setup:**
1. Configure AWS credentials
2. Initialize Terraform: `terraform init`
3. Review plan: `terraform plan`
4. Apply: `terraform apply`

**Infrastructure Updates:**
1. Make changes to .tf files
2. Format: `terraform fmt -recursive`
3. Validate: `terraform validate`
4. Plan: `terraform plan -out=tfplan`
5. Review plan output carefully
6. Apply: `terraform apply tfplan`

**Teardown:**
1. Disable deletion protection on critical resources (manual step)
2. Destroy: `terraform destroy`
3. Confirm destruction

### Terraform Best Practices Applied

**Module Design:**
- Single responsibility per module
- Reusable across environments
- Clear input/output contracts
- README documentation per module

**State Management:**
- Remote state in S3 with versioning
- State locking with DynamoDB
- Separate state per environment
- Never commit state files to Git

**Security:**
- No hardcoded credentials
- Secrets from AWS Secrets Manager
- Least-privilege IAM roles
- Encrypted state files

**Version Control:**
- All .tf files in Git
- .gitignore for .terraform/, *.tfstate, *.tfvars.secret
- Semantic versioning for modules
- Branch protection on main/production

**Testing:**
- terraform validate before apply
- terraform plan review
- Apply to dev environment first
- Promote to staging, then production

**Documentation:**
- README per module explaining purpose
- Variable descriptions
- Output descriptions
- Architecture diagrams in repo

### CI/CD Integration (Optional)

**GitHub Actions Workflow:**
- Trigger on pull request to main
- Run terraform fmt check
- Run terraform validate
- Run terraform plan (post as PR comment)
- Manual approval required for apply
- terraform apply on merge to main

**Pipeline Stages:**
1. Lint and format check
2. Security scanning (tfsec, checkov)
3. Plan generation
4. Manual approval gate
5. Apply to environment
6. Smoke tests
7. Rollback capability

### Terraform Providers

**Required Providers:**
- hashicorp/aws (~> 5.0)
- hashicorp/random (~> 3.0)
- hashicorp/archive (~> 2.0) (for Lambda if added later)

**Provider Configuration:**
- Region specified via variable
- Default tags applied to all resources
- Assume role for production deployments (optional)

### State File Structure

**Organized by Module:**
- module.vpc
- module.ecs
- module.alb
- module.elasticache
- module.dynamodb
- module.cognito
- module.route53
- module.monitoring

**Resource Naming Convention:**
- chess-platform-{resource-type}-{identifier}
- Example: chess-platform-alb-main
- Example: chess-platform-ecs-cluster

### Terraform Plan Checklist

**Before Every Apply:**
- [ ] Reviewed all resource creations
- [ ] Reviewed all resource modifications
- [ ] Reviewed all resource deletions
- [ ] Verified no unexpected changes
- [ ] Checked cost implications
- [ ] Reviewed security group changes
- [ ] Verified IAM role changes are least-privilege
- [ ] Checked for accidental public exposure
- [ ] Confirmed state lock acquired

### Disaster Recovery with Terraform

**State File Backup:**
- S3 versioning enabled (retrieve previous state)
- State file stored in multiple regions (S3 replication)
- Manual backups before major changes

**Infrastructure Rebuild:**
- All infrastructure defined as code
- Can recreate entire stack from Terraform
- Import existing resources if needed
- State file is source of truth

**Rollback Strategy:**
- Keep previous terraform plan outputs
- Revert .tf files to previous Git commit
- Apply previous known-good configuration
- State file rollback via S3 versioning if needed

---

## Getting Started

### Prerequisites
- AWS account with appropriate IAM permissions (AdministratorAccess for initial setup)
- Domain name registered (Route 53 or external registrar)
- Terraform installed (version 1.5+)
- AWS CLI configured with credentials
- Git for version control
- Docker installed locally for application container builds
- Node.js/Python development environment
- Basic understanding of chess rules and notation

### Terraform Infrastructure Setup

**Phase 1: Terraform Initialization**
1. Clone or create Terraform repository
2. Configure AWS credentials (AWS CLI or environment variables)
3. Create S3 bucket for Terraform state (manual or bootstrap script)
4. Create DynamoDB table for state locking (terraform-state-lock)
5. Configure backend.tf with S3 bucket details
6. Create terraform.tfvars with environment-specific values
7. Store secrets in AWS Secrets Manager
8. Initialize Terraform: `terraform init`

**Phase 2: Network Infrastructure**
1. Apply VPC module: Creates VPC, subnets, IGW, NAT Gateways, route tables
2. Verify: 9 subnets created across 3 AZs
3. Verify: Security groups created with proper rules
4. Verify: VPC endpoints created (Gateway and Interface)
5. Check VPC Flow Logs are enabled
6. Review route tables for each tier

**Phase 3: Data Layer**
1. Apply DynamoDB module: Users and Games History tables with GSIs
2. Apply ElastiCache module: Multi-AZ Redis cluster
3. Verify: DynamoDB point-in-time recovery enabled
4. Verify: ElastiCache endpoint accessible from private app subnets
5. Store Redis AUTH token in Secrets Manager

**Phase 4: Identity & Access**
1. Apply Cognito module: User pool, app client, identity providers
2. Configure social login providers (Google, Facebook, etc.)
3. Verify: User pool domain created
4. Test: User registration and login flow

**Phase 5: Container Infrastructure**
1. Apply ECR module: Container registry created
2. Build Docker image locally
3. Tag image for ECR
4. Push to ECR repository
5. Apply ECS module: Cluster, task definition, service
6. Verify: Fargate tasks running across AZs

**Phase 6: Load Balancing**
1. Apply ACM module: Request SSL certificate
2. Validate certificate via DNS (automatic with Route 53)
3. Apply ALB module: ALB, target groups, listeners
4. Verify: ALB health checks passing
5. Verify: HTTPS listener with certificate attached
6. Verify: HTTP redirects to HTTPS

**Phase 7: DNS**
1. Apply Route 53 module: Hosted zone, records, health checks
2. Update domain registrar nameservers (if external)
3. Verify: DNS resolution working
4. Verify: HTTPS accessible at custom domain
5. Enable DNSSEC signing
6. Enable query logging

**Phase 8: Monitoring**
1. Apply monitoring module: CloudWatch dashboards, alarms, budgets
2. Configure SNS topics for alarm notifications
3. Set up budget alerts
4. Verify: Logs flowing to CloudWatch
5. Test: Trigger test alarm

**Phase 9: Application Deployment**
1. Update ECS task definition with final container image
2. Deploy new task revision
3. Monitor: ECS service deployment in CloudWatch
4. Verify: Application accessible via domain
5. Test: User registration, room creation, video chat, chess game

**Phase 10: Final Validation**
1. End-to-end testing: Complete user journey
2. Load testing: Multiple concurrent rooms/games
3. Security review: Verify no public IPs on app tier, security groups correct
4. Cost review: Check actual vs estimated costs
5. Documentation: Update architecture diagrams with actual resource IDs

### Terraform Apply Strategy

**Initial Deployment:**
```bash
# Set AWS region
export AWS_REGION=us-east-1

# Initialize
terraform init

# Plan
terraform plan -out=tfplan

# Review plan carefully
# Check resource count, changes, cost implications

# Apply
terraform apply tfplan
```

**Incremental Updates:**
```bash
# Pull latest code
git pull

# Format
terraform fmt -recursive

# Validate
terraform validate

# Plan with output
terraform plan -out=tfplan

# Review diff
# Only proceed if changes are expected

# Apply
terraform apply tfplan
```

### Manual Steps (Not in Terraform)

**Post-Terraform Configuration:**
1. **Cognito Social Providers**: Configure OAuth apps in Google/Facebook developer consoles
2. **Domain DNS**: Update nameservers at domain registrar (if not Route 53)
3. **Chime SDK**: Verify permissions for meeting creation
4. **Application Secrets**: Store any additional API keys in Secrets Manager
5. **Docker Image**: Build and push initial application image to ECR
6. **Testing Accounts**: Create test users in Cognito for validation

### Development Workflow

**Local Development:**
1. Run application locally with Docker Compose
2. Mock AWS services (LocalStack) or use development environment
3. Test game logic, WebSocket connections, Chime SDK integration

**CI/CD Pipeline:**
1. Push code to Git repository
2. GitHub Actions triggers build
3. Run tests (unit, integration)
4. Build Docker image
5. Push to ECR
6. Update ECS task definition
7. Deploy new revision to ECS service
8. Monitor deployment
9. Smoke tests
10. Rollback if failures detected

**Infrastructure Changes:**
1. Create feature branch
2. Modify Terraform code
3. Run terraform plan locally
4. Create pull request
5. Automated checks run (fmt, validate, plan)
6. Team review
7. Merge to main
8. Terraform apply via CI/CD

### Cost Monitoring Setup

**AWS Budgets Configuration:**
1. Navigate to AWS Budgets console
2. Create monthly budget: $250
3. Alert thresholds: 80%, 90%, 100%
4. Email notifications
5. Optional: SNS for SMS alerts

**Cost Allocation Tags:**
1. Activate cost allocation tags in Billing console
2. Enable: Project, Tier, Component
3. Wait 24 hours for tags to appear in Cost Explorer

**Daily Cost Review:**
1. Check Cost Explorer dashboard
2. Review by service
3. Review by tag (Project, Tier)
4. Identify unexpected costs
5. Adjust budget alerts if needed

### Backup and Disaster Recovery

**Automated Backups:**
- DynamoDB: Point-in-time recovery (automated)
- ElastiCache: Daily snapshots at 3 AM UTC
- Terraform state: S3 versioning enabled
- Application code: Git repository

**Manual Backup Tasks:**
1. Export DynamoDB tables periodically (monthly)
2. Download Terraform state file (before major changes)
3. Document any manual configurations
4. Screenshot CloudWatch dashboards

**Recovery Procedures:**
1. Infrastructure recovery: `terraform apply` from state
2. DynamoDB recovery: Point-in-time restore to specific timestamp
3. Redis recovery: Restore from latest snapshot
4. Application recovery: Deploy previous ECR image tag

### Security Hardening Checklist

**Post-Deployment Security Review:**
- [ ] No EC2 instances have public IPs (app tier in private subnets)
- [ ] Security groups follow least-privilege (only required ports)
- [ ] IAM roles have minimal permissions (no wildcards)
- [ ] Secrets stored in Secrets Manager (not environment variables)
- [ ] SSL/TLS enforced everywhere (ALB HTTPS, Redis encryption)
- [ ] VPC Flow Logs enabled for network monitoring
- [ ] CloudTrail enabled for API audit logging
- [ ] MFA enabled on root account
- [ ] DynamoDB encryption at rest enabled
- [ ] S3 buckets have encryption and versioning
- [ ] No hardcoded credentials in code or Terraform
- [ ] Budget alerts configured to prevent runaway costs

### Monitoring and Alerts Configuration

**CloudWatch Alarms to Create:**
1. ECS CPU > 80% for 5 minutes
2. ECS Memory > 85% for 5 minutes
3. ALB 5xx errors > 10 in 5 minutes
4. ALB unhealthy targets > 0 for 2 minutes
5. DynamoDB throttled requests > 0
6. Redis CPU > 90% for 10 minutes
7. NAT Gateway packet drops > 100
8. Daily cost > $10

**SNS Topic Configuration:**
1. Create SNS topic: chess-platform-alerts
2. Subscribe with email address
3. Confirm subscription
4. Attach to all critical alarms

**Dashboard Setup:**
1. Import pre-built dashboard JSON (from Terraform)
2. Pin to CloudWatch favorites
3. Set up mobile app for monitoring
4. Review dashboard daily during initial deployment

---

## Conclusion

This chess platform is a production-grade AWS application built on three-tier VPC architecture with complete network isolation, multi-AZ high availability, and comprehensive security controls. The infrastructure leverages modern cloud-native patterns including serverless containers (Fargate), managed caching (ElastiCache), NoSQL database (DynamoDB), and real-time video communication (Chime SDK).

The two-phase session model separates persistent video chat rooms from ephemeral chess games, allowing multiple sequential games within a single video session. State management is split between Redis (temporary room/game state with TTL) and DynamoDB (persistent user data and match history), optimizing for both performance and cost.

All infrastructure is defined as code using Terraform with modular design, enabling reproducible deployments and infrastructure versioning. Comprehensive monitoring via CloudWatch provides visibility into application performance, infrastructure health, and costs.

Key technical implementations:
- **Network Security**: Three-tier VPC with zero public IPs on application tier, VPC endpoints for AWS service access
- **High Availability**: Multi-AZ deployment across all tiers, automatic failover for Redis, ALB health checks
- **Scalability**: Fargate auto-scaling based on demand, stateless application design
- **Cost Management**: Resource tagging, budget alerts, on-demand pricing where appropriate
- **Operational Excellence**: Structured logging, metric-based alarms, disaster recovery procedures

The platform demonstrates end-to-end cloud architecture from network design through application deployment, security hardening, monitoring, and ongoing operations.