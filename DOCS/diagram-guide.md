# Chess Platform - Diagram Guide

## Purpose
This guide outlines the recommended diagrams for presenting the chess platform project in your portfolio and during technical interviews. Each diagram serves a specific purpose and targets different audiences.

---

## Diagram Strategy Overview

**Why Multiple Diagrams?**
- Different audiences need different levels of detail
- Some focus on infrastructure, others on user experience
- Demonstrates breadth of understanding (networking, data flow, UX, costs)
- Makes complex system approachable from multiple angles

**Recommended Set: 3-4 Diagrams Total**

---

## 1. Infrastructure / Networking Diagram

### Purpose
Show the AWS services, VPC architecture, network topology, and security boundaries.

### Target Audience
- Solutions Architects
- Infrastructure Engineers
- DevOps Engineers
- Security-focused interviewers
- Technical hiring managers

### Key Elements to Include

**VPC Structure:**
- VPC CIDR block (10.0.0.0/16)
- Three availability zones (us-east-1a, us-east-1b, us-east-1c)
- Three-tier subnet architecture:
  - Public subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
  - Private app subnets (10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24)
  - Private data subnets (10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24)

**Network Components:**
- Internet Gateway (public tier internet access)
- NAT Gateways x2 (AZ-A and AZ-B with Elastic IPs)
- VPC Gateway Endpoints (DynamoDB, S3)
- VPC Interface Endpoints (ECR API, ECR Docker, CloudWatch Logs, Secrets Manager)

**Compute Layer:**
- Application Load Balancer (distributed across public subnets)
- ECS Cluster (Fargate launch type)
- Fargate Tasks (0.25 vCPU, 512 MB, distributed across private app subnets)
- Auto-scaling configuration (2-8 tasks)

**Data Layer:**
- ElastiCache Redis (Multi-AZ with primary + replica)
- DynamoDB tables (Users, Games History)
- Amazon ECR (container registry)

**External AWS Services:**
- Route 53 (DNS, health checks, DNSSEC)
- ACM (SSL/TLS certificates)
- Amazon Cognito (user authentication)
- Amazon Chime SDK (video chat)
- CloudWatch (monitoring, logs, alarms)
- Secrets Manager (credentials storage)

**Security Groups:**
- ALB Security Group (allow 443, 80 from internet)
- Fargate Task Security Group (allow traffic only from ALB)
- Redis Security Group (allow 6379 only from Fargate)
- VPC Endpoint Security Group (allow 443 from VPC CIDR)

**Visual Design Tips:**
- Use color coding for tiers (green=public, yellow=app, red=data)
- Show AZs side-by-side for visual HA representation
- Use dashed borders for AZs
- Use solid borders for VPC boundary
- Include subnet CIDR blocks on each subnet
- Add icons for AWS services (use official AWS architecture icons if possible)

### Interview Talking Points
- "This shows our three-tier VPC architecture with complete network isolation"
- "Notice the application tier has zero public IPs - only accessible via ALB"
- "We use VPC endpoints to eliminate NAT Gateway costs for AWS service calls"
- "Multi-AZ deployment across all tiers ensures high availability"
- "Security groups enforce least-privilege access at every layer"

---

## 2. Data Flow Diagram

### Purpose
Show how data moves through the system during key operations (authentication, room creation, gameplay, video chat).

### Target Audience
- Software Engineers
- Solutions Architects
- Technical interviewers asking "walk me through how it works"
- Backend-focused roles

### Key Flows to Illustrate

**Flow 1: User Authentication**
```
User Browser
  â†“ [HTTPS]
Route 53 â†’ ALB
  â†“
Fargate Task (Application)
  â†“
Cognito User Pool
  â†“ [JWT Token]
Fargate Task
  â†“ [WebSocket Upgrade]
Browser (Authenticated WebSocket Connection)
```

**Flow 2: Room Creation & Joining**
```
User A: "Create Room"
  â†“ [WebSocket message]
Fargate Task
  â†“ [Generate random 5-char code]
  â†“ [SET room:{code}]
ElastiCache Redis
  â†“ [Return room code]
User A receives: "K7M2A"

User B: "Join Room with K7M2A"
  â†“ [WebSocket message]
Fargate Task
  â†“ [GET room:K7M2A, add User B]
ElastiCache Redis
  â†“ [Both users ready]
Fargate Task
  â†“ [CreateMeeting API call]
Chime SDK
  â†“ [Return meeting + attendee tokens]
Fargate Task
  â†“ [Broadcast meeting details via WebSocket]
Users A & B (video chat activated)
```

**Flow 3: Chess Game Play**
```
User A: Makes chess move (e2 â†’ e4)
  â†“ [WebSocket: {move: "e2e4"}]
Fargate Task
  â†“ [Validate move with Stockfish engine]
  â†“ [Update game state in Redis]
ElastiCache Redis (active_game.moves[], board_fen, clocks)
  â†“
Fargate Task
  â†“ [Broadcast move to both players via WebSocket]
User A & User B (boards update in real-time)
```

**Flow 4: Game Completion & Persistence**
```
Game End Event (checkmate/resignation/timeout)
  â†“
Fargate Task
  â†“ [Calculate game metadata]
  â†“ [PutItem: game_id, winner, pgn, timestamps]
DynamoDB Games History Table
  â†“
Fargate Task
  â†“ [UpdateItem: user stats (wins/losses)]
DynamoDB Users Table
  â†“
Fargate Task
  â†“ [Clear active_game in Redis]
  â†“ [Add to room's games_played history]
ElastiCache Redis
  â†“
Fargate Task
  â†“ [Broadcast game_ended event via WebSocket]
Users A & B (see result screen, "New Game" button enabled)
```

**Flow 5: Session Lifecycle (60-Minute Room)**
```
Room Created
  â†“ [SET with TTL 3600 seconds]
ElastiCache Redis
  â†“ [Background TTL expiration worker]
After 60 minutes:
  â†“ [DeleteMeeting API call]
Chime SDK (meeting terminated)
  â†“
Fargate Task
  â†“ [Close WebSocket connections]
  â†“ [If game active: save as draw to DynamoDB]
Users A & B (redirected to home page)
```

### Visual Design Tips
- Use sequence diagram style (vertical time axis)
- Number each step (1, 2, 3...)
- Use different colors for different protocols (blue=HTTPS, green=WebSocket, orange=AWS API)
- Include request/response arrows
- Show what data is transmitted (e.g., "JWT token", "room_code", "move: e2e4")
- Annotate with latency where relevant (e.g., "< 200ms")

### Interview Talking Points
- "Notice we validate moves on both client and server - client for UX speed, server for security"
- "Redis stores ephemeral state with TTL, DynamoDB stores permanent history"
- "WebSocket enables real-time bidirectional communication for instant move updates"
- "Chime SDK meeting is created only when both players ready - cost optimization"
- "Two-phase architecture: video room persists while multiple games are played within it"

---

## 3. User Journey / Sequence Diagram

### Purpose
Show the end-to-end user experience with system interactions from a user's perspective.

### Target Audience
- Product Managers
- Non-technical stakeholders
- Interviewers asking "how does the user experience work?"
- Full-stack roles
- Anyone who wants to understand the "why" not just the "how"

### Key Scenarios to Illustrate

**Scenario 1: Complete Game Session (Happy Path)**

```
Step 1: User A - Account Creation
- Navigate to chess.yourdomain.com
- Click "Sign Up"
- Enter email, password (12+ chars, complexity requirements)
- Receive verification email
- Click verification link
- Account activated
- Redirected to dashboard

Step 2: User A - Create Room
- Click "Create Room" button
- System generates room code: "K7M2A"
- User sees lobby page with code prominently displayed
- Message: "Waiting for opponent... Share code: K7M2A"
- 60-minute countdown timer visible

Step 3: User B - Join Room
- User B logs in (or signs up)
- Click "Join Room"
- Enters code: "K7M2A"
- Validates room exists and has space

Step 4: Both Users - Video Chat Activation
- System detects both users ready
- Chime SDK meeting created
- Both users redirected to room interface
- Video/audio streams connect
- Users can see and hear each other
- Chess board visible but inactive
- "Start Game" button enabled

Step 5: Starting First Game
- User A clicks "Start Game"
- System randomly assigns colors (User A = White, User B = Black)
- Chess board activates
- 5-minute clocks start for both players
- User A (White) can make first move

Step 6: Game Play
- User A moves pawn e2 â†’ e4 (drag & drop)
- Move validates, board updates for both players
- User A's clock pauses, User B's clock starts
- User B responds with e7 â†’ e5
- Players continue making moves while video chat continues
- Move history visible on side panel
- Captured pieces displayed

Step 7: Game End (Checkmate)
- User A achieves checkmate
- System detects game end
- Result overlay appears: "White wins by checkmate!"
- Final position shown
- Statistics displayed:
  - Total moves: 42
  - Game duration: 8 minutes 34 seconds
  - Time remaining: White 2:15, Black 0:47
- Game saved to match history
- "New Game" button enabled
- Video chat continues

Step 8: Second Game (Rematch)
- User B clicks "New Game"
- Colors automatically swap (User A = Black, User B = White)
- Fresh 5-minute clocks
- Board resets to starting position
- User B (White) makes first move
- Video chat never interrupted

Step 9: Session End
- After 3 games, User A clicks "Leave Room"
- Confirmation: "Leave room? Video chat will end."
- User A disconnects
- User B sees "Opponent left" notification
- User B can wait for reconnection or leave
- Eventually both leave or 60-minute timer expires
- Room terminated, Chime meeting deleted

Step 10: Match History
- User A navigates to "My Games"
- Sees all 3 games from session:
  - Game 1: Win (White, Checkmate)
  - Game 2: Loss (Black, Resignation)
  - Game 3: Win (White, Timeout)
- Can click any game to view move-by-move replay
```

**Scenario 2: Disconnection & Reconnection**

```
Step 1: Game in Progress
- Users A & B playing game, 15 moves deep
- User B's clock: 3:12 remaining

Step 2: User B Disconnects (Network Issue)
- WebSocket connection drops
- User A sees notification: "Opponent disconnected"
- User B's clock continues counting down
- User A can wait or leave

Step 3: User B Reconnects
- User B's browser/network recovers
- User B re-enters room code "K7M2A"
- System validates User B was previous participant
- New WebSocket connection established
- User B rejoins Chime meeting (new attendee token)
- Game state loaded from Redis
- Board shows current position (15 moves)
- User B's clock: 2:47 remaining (lost 25 seconds)
- Game continues normally
- User A sees: "Opponent reconnected"
```

**Scenario 3: Room Expiry**

```
Step 1: 55-Minute Mark
- Warning appears: "Room expires in 5 minutes"
- Users playing 8th game

Step 2: 60-Minute Mark
- Game in progress automatically ends
- Saved as draw to DynamoDB
- Chime meeting terminated
- WebSocket connections closed
- Redis room data deleted (TTL expired)
- Both users redirected to dashboard
- Message: "Room expired - thank you for playing!"
- All 8 games visible in match history
```

### Visual Design Tips
- Use storyboard style (comic strip panels)
- Include screenshots/mockups of UI at each step
- Use stick figures or user icons for User A and User B
- Add speech bubbles for user thoughts ("Great! Code is K7M2A")
- Show system responses in notification boxes
- Include time annotations ("5 seconds later...", "After 15 moves...")
- Use checkmarks âœ“ for completed steps
- Use warning icons âš ï¸ for error states

### Interview Talking Points
- "Notice users can play unlimited games without recreating the room - great UX"
- "Video chat persists between games - reduces friction for casual play"
- "60-minute limit prevents forgotten rooms from accumulating Chime costs"
- "Reconnection allows players to recover from temporary network issues"
- "Simple 5-character room codes make it easy to share with friends"
- "All games persist to DynamoDB so users have permanent match history"

---

## 4. Cost Breakdown Diagram (Optional)

### Purpose
Show understanding of AWS pricing and cost optimization strategies.

### Target Audience
- Hiring managers concerned with cloud costs
- Solutions Architects evaluating cost-effectiveness
- FinOps-minded interviewers

### Key Elements to Include

**Pie Chart: Monthly Cost Allocation**
- NAT Gateways: $65 (27%)
- Fargate (ECS): $26-35 (11-14%)
- VPC Endpoints: $28 (12%)
- ElastiCache Redis: $22 (9%)
- ALB: $21-26 (9-11%)
- Chime SDK: $5-40 (2-16% - variable)
- DynamoDB: $5-10 (2-4%)
- CloudWatch/Logs: $6-18 (3-7%)
- Route 53/ACM: $1 (0.4%)
- **Total: $181-245/month**

**Bar Chart: Cost Optimization Opportunities**
```
Current Architecture: $245/month
  â†“ Remove 1 NAT Gateway (single AZ): -$32
  â†“ Remove Interface VPC Endpoints: -$28
  â†“ Single-AZ Redis: -$11
  â†“ Fargate Spot pricing: -$18
Optimized Architecture: $156/month
Savings: $89/month (36%)
```

**Trade-offs Table**
| Optimization | Savings | Trade-off |
|--------------|---------|-----------|
| Single NAT Gateway | $32/month | No AZ redundancy for outbound traffic |
| Remove Interface Endpoints | $28/month | Higher NAT data charges, less secure |
| Single-AZ Redis | $11/month | No automatic failover |
| Fargate Spot | $18/month | Tasks may be interrupted |

**Cost Scaling Chart**
```
Light Usage (10 hours/month video):
- Chime SDK: $5
- Total: ~$181/month

Moderate Usage (50 hours/month video):
- Chime SDK: $25
- Total: ~$245/month

Heavy Usage (150 hours/month video):
- Chime SDK: $75
- Total: ~$295/month
```

### Visual Design Tips
- Use actual AWS pricing data (as of Feb 2025)
- Color-code costs by category (compute, networking, storage, services)
- Show percentages and dollar amounts
- Include comparison to "naive" architecture (e.g., all public subnets, no VPC endpoints)
- Add annotations for fixed vs. variable costs

### Interview Talking Points
- "NAT Gateways are our highest fixed cost - I'd monitor data transfer for optimization"
- "VPC endpoints eliminate per-GB NAT charges for AWS API calls - ROI after ~1TB/month"
- "Chime SDK is variable cost - we could add 'Start Video' button to reduce always-on usage"
- "On-demand DynamoDB makes sense for unpredictable traffic - we can switch to provisioned if patterns emerge"
- "We're using reserved capacity where possible (ElastiCache) but keeping compute elastic"

---

## Diagram Tools & Resources

### Recommended Tools
1. **draw.io (diagrams.net)** - Free, browser-based
   - AWS architecture icons built-in
   - Good for infrastructure diagrams
   - Export to PNG, SVG, PDF

2. **Lucidchart** - Professional, collaborative
   - AWS shape libraries
   - Real-time collaboration
   - Integrates with Confluence/Google Drive

3. **Cloudcraft** - 3D AWS diagrams (paid)
   - Isometric 3D view of AWS architecture
   - Auto-calculates costs
   - Very visually appealing

4. **PlantUML** - Code-based diagrams
   - Great for sequence diagrams (data flow)
   - Version control friendly (text files)
   - Can automate generation

5. **Mermaid.js** - Markdown-based diagrams
   - Integrates with documentation
   - Good for sequence diagrams
   - GitHub-friendly

6. **Figma** - Design tool
   - Best for user journey/mockups
   - Prototyping capability
   - Free tier available

### AWS Official Resources
- **AWS Architecture Icons**: https://aws.amazon.com/architecture/icons/
  - Download official SVG/PNG icons for all services
  - Updated regularly with new services
  - Use these for professional appearance

- **AWS Architecture Blog**: https://aws.amazon.com/blogs/architecture/
  - Real-world reference architectures
  - Best practices examples

### Design Best Practices

**Color Coding:**
- Green: Public/Internet-facing
- Yellow/Orange: Application tier
- Red/Pink: Data tier
- Blue: Network components
- Purple: Security/Identity services

**Consistency:**
- Use same icons throughout all diagrams
- Maintain color scheme across diagrams
- Same font family and sizes
- Consistent arrow styles

**Clarity:**
- Don't overcrowd diagrams
- Use whitespace effectively
- Label everything clearly
- Include legends/keys
- Add CIDR blocks on subnets
- Show direction of data flow with arrows

**Accessibility:**
- High contrast colors
- Large enough text (14pt minimum)
- Color-blind friendly palette
- Export in high resolution (300 DPI minimum)

---

## Diagram Usage Strategy

### Portfolio Website
- **Homepage/Project Card**: Infrastructure diagram (thumbnail)
- **Project Detail Page**: All 3-4 diagrams in tabs or accordion
- **Technical Deep-Dive Section**: Data flow + user journey
- **Cost Analysis Section**: Cost breakdown diagram

### GitHub README
- Infrastructure diagram at top (hero image)
- Link to full architecture doc with all diagrams
- Data flow in "How It Works" section

### Interview Preparation
- Print all diagrams on separate pages
- Practice "walking through" each diagram (2-3 min each)
- Prepare answers to questions each diagram might trigger
- Have digital copies ready to screenshare

### Presentation Deck (if needed)
- Slide 1: Project overview + infrastructure diagram
- Slide 2: Data flow diagram with annotations
- Slide 3: User journey (scenario-based)
- Slide 4: Cost breakdown + optimization strategy
- Slide 5: Key learnings and outcomes

---

## Diagram Maintenance Checklist

As you build and iterate on the platform, keep diagrams updated:

- [ ] After each Terraform apply, verify infrastructure diagram matches deployed resources
- [ ] If you add/remove AWS services, update all relevant diagrams
- [ ] If you change subnet CIDRs or security groups, update infrastructure diagram
- [ ] If you modify user flows, update user journey diagram
- [ ] If costs change significantly, update cost breakdown
- [ ] Export all diagrams to version-controlled repository (Git)
- [ ] Keep source files (.drawio, .fig, etc.) not just PNGs
- [ ] Add "Last Updated" date to each diagram
- [ ] Create a changelog for major diagram updates

---

## Quick Reference: Diagram Elevator Pitches

**Infrastructure Diagram:**
"This shows our three-tier VPC architecture across three availability zones in us-east-1. Notice the application tier has zero public IPs - everything goes through the load balancer. We use VPC endpoints to eliminate NAT Gateway costs for AWS API calls, and Redis Multi-AZ provides automatic failover for the session layer."

**Data Flow Diagram:**
"Let me walk you through what happens when a user creates a room. They click 'Create Room,' which sends a WebSocket message to our Fargate tasks. The backend generates a random 5-character code, stores the room in Redis with a 60-minute TTL, and when the second player joins, we create a Chime SDK meeting for video chat. All game state is temporary in Redis, but completed games persist to DynamoDB for match history."

**User Journey Diagram:**
"The user experience is designed around a two-phase session model. First, both players enter a video chat room that lasts up to 60 minutes. Within that room, they can play multiple sequential chess games without ever disconnecting from video. This reduces friction for casual play - friends can chat between games and quickly start rematches. If someone disconnects, they can rejoin with the same room code and resume exactly where they left off."

**Cost Breakdown Diagram:**
"Our baseline cost is around $180-245 per month depending on video chat usage. The biggest fixed cost is NAT Gateways at $65/month - we have two for high availability. We could reduce this to $156/month by making some trade-offs like single NAT Gateway or removing interface VPC endpoints, but I chose to optimize for reliability and security over cost for this production environment."

---

## Conclusion

This diagram strategy provides:
- âœ… **Technical credibility** (infrastructure diagram)
- âœ… **System design depth** (data flow diagram)
- âœ… **User-centric thinking** (user journey diagram)
- âœ… **Business acumen** (cost breakdown diagram)

Together, these diagrams tell a complete story of a production-grade AWS application from multiple perspectives.

**Next Steps:**
1. Create infrastructure diagram using draw.io or Cloudcraft
2. Build data flow diagram using PlantUML or Lucidchart
3. Design user journey using Figma or storyboard format
4. Optional: Add cost breakdown as pie/bar chart
5. Export all to high-resolution images
6. Add to portfolio and GitHub
7. Practice presenting each diagram (2-3 min per diagram)